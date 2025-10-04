/*
**  Rundown - Render Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import ReconnectingWebSocket from "@opensumi/reconnecting-websocket"
import axios                 from "axios"
import * as anime            from "animejs"
import { diceCoefficient }   from "dice-coefficient"
import { doubleMetaphone }   from "double-metaphone"
import { DateTime }          from "luxon"

/*  helper function for determining string similarity  */
const similarity = (s1: string, s2: string) => {
    /*  compare only lower-case variants  */
    s1 = s1.toLowerCase()
    s2 = s2.toLowerCase()

    /*  compare by word character similarity  */
    let similar = diceCoefficient(s1, s2)
    if (similar > 0.50 && similar < 0.70) {
        /*  compare by word phonetic similarity (pronunciation)  */
        const dm1 = doubleMetaphone(s1)
        const dm2 = doubleMetaphone(s2)
        if (dm1[0] === dm2[0])
            similar = 0.80 /* primary pronunciation matched */
        else if (dm1[1] === dm2[1])
            similar = 0.70 /* alternative pronunciation matched */
    }
    return similar
}

/*  configuration for fuzzy word matching  */
const minMatchWordsPercent = 0.6
const minSimilarityPercent = 0.7

/*  helper function for fuzzy word matching  */
const fuzzyWordMatch = (spokenWords: string[], prompterWords: string[], startIdx = 0) => {
    /*  determine minimum words which have to match  */
    const minMatchWords = Math.max(1, Math.floor(spokenWords.length * minMatchWordsPercent))

    /*  iterate over all words in the prompter word list...  */
    for (let i = startIdx; i < prompterWords.length - spokenWords.length + 1; i++) {
        /*  check how many words match (order preserved, gaps allowed)  */
        let textIdx = i
        let matches = 0
        for (const spokenWord of spokenWords) {
            /*  look ahead within reasonable window  */
            for (let j = textIdx; j < Math.min(textIdx + 4, prompterWords.length); j++) {
                if (similarity(spokenWord, prompterWords[j]) > minSimilarityPercent) {
                    matches++
                    textIdx = j
                    break
                }
            }
        }
        if (matches >= minMatchWords)
            return textIdx
    }
    return -1
}

/*  helper function to calculate tab position  */
const calculateYPos = (container: DOMRect, box: DOMRect, pivot: number): number => {
    if (container.top > pivot - (box.height / 2))
        return 0
    else if (container.top + container.height < pivot + (box.height / 2))
        return container.height - box.height
    else
        return (pivot - (box.height / 2)) - container.top
}

/*  helper function to find closest element by distance  */
const findClosestElement = (elements: Element[], pivot: number) => {
    const min = { element: null, distance: Number.MAX_VALUE } as
        { element: Element | null, distance: number }
    for (const element of elements) {
        const rect = element.getBoundingClientRect()
        const distance1 = Math.abs(pivot - rect.top)
        const distance2 = Math.abs(pivot - (rect.top + rect.height))
        if (min.distance > distance1) {
            min.distance = distance1
            min.element  = element
        }
        if (min.distance > distance2) {
            min.distance = distance2
            min.element  = element
        }
    }
    return min
}

/*  helper function to update active element in a list of elements  */
const updateActiveElement = (elements: Element[], closestElement: Element | null) => {
    if (closestElement === null)
        return
    for (const element of elements) {
        if (element === closestElement && !element.classList.contains("active"))
            element.classList.add("active")
        else if (element !== closestElement && element.classList.contains("active"))
            element.classList.remove("active")
    }
}

/*  await the DOM...  */
document.addEventListener("DOMContentLoaded", async () => {
    /*  determine dynamic configuration options  */
    const options = new Map<string, string>()
    for (const opt of document.location.hash.replace(/^#/, "").split("&")) {
        let m
        if ((m = opt.match(/^(.+?)=(.+)$/)) !== null)
            options.set(m[1], m[2])
        else
            options.set(opt, "yes")
    }

    /*  internal state  */
    const view               = { w: 0, h: 0 }
    const content            = { w: 0, h: 0, scrollX: 0, scrollY: 0 }
    let stateLast            = -1
    let stateLastSent        = -1
    let stateTimer:          ReturnType<typeof setTimeout> | null = null
    let stateLastScrollY     = -1
    let debug                = false
    let locked               = false
    let autoscroll           = false
    let paused               = false
    let speed                = 0
    let delta                = 0
    let ws:                  ReconnectingWebSocket | undefined
    let autoscrollInterval:  ReturnType<typeof setInterval> | null = null
    let lastSpokenIndex      = -1
    let autoscrollAnimation: anime.JSAnimation | null = null

    /*  helper function for convenient console logging  */
    const log = (level: string, msg: string, data: { [ key: string ]: any } | null = null) => {
        const timestamp = DateTime.now().toFormat("yyyy-MM-dd HH:mm:ss.SSS")
        let epilog = ""
        if (data !== null) {
            epilog = ` (${Object.keys(data)
                .map((key) => key + ": " + JSON.stringify(data[key]))
                .join(", ")
            })`
        }
        if (level === "error")
            console.error(`${timestamp} [ERROR] ${msg}${epilog}`)
        else if (level === "warning")
            console.warn(`${timestamp} [WARNING] ${msg}${epilog}`)
        else if (level === "info")
            console.info(`${timestamp} [INFO] ${msg}${epilog}`)
        else if (level === "debug" && debug)
            console.log(`${timestamp} [DEBUG] ${msg}${epilog}`)
    }

    /*  WebSocket send queue
        (for messages potentially queued because connection had to be still (re-)established)  */
    const wsSendQueue: string[] = []
    setInterval(() => {
        if (ws === undefined || ws.readyState !== ReconnectingWebSocket.OPEN)
            return
        while (wsSendQueue.length > 0) {
            const msg = wsSendQueue.shift()!
            ws.send(msg)
        }
    }, 200)

    /*  optionally wrap all text words  */
    const wordSeq: Array<{
        index:       number,
        word:        string,
        punctuation: boolean,
        node:        HTMLSpanElement,
        spoken:      "none" | "intermediate" | "final",
        visible:     boolean,
    }> = []
    if (options.get("autoscroll") === "yes") {
        const chunks = Array.from(document.querySelectorAll(".rundown-chunk:not(.disabled)"))
        for (const chunk of chunks) {
            /*  discover all DOM text nodes below the chunk node which are spoken  */
            const walker = document.createTreeWalker(chunk, NodeFilter.SHOW_TEXT, (node: Node) => {
                let current = node.parentElement
                while (current !== null) {
                    if (   current.classList.contains("rundown-speaker")
                        || current.classList.contains("rundown-part")
                        || current.classList.contains("rundown-state")
                        || current.classList.contains("rundown-state-marker")
                        || current.classList.contains("rundown-chat")
                        || current.classList.contains("rundown-control")
                        || current.classList.contains("rundown-hint")
                        || current.classList.contains("rundown-info")
                        || current.classList.contains("rundown-display"))
                        return NodeFilter.FILTER_REJECT
                    current = current.parentElement
                }
                return NodeFilter.FILTER_ACCEPT
            })
            const textNodes: Text[] = []
            let node: Text | null
            while ((node = walker.nextNode() as Text) !== null)
                if (node.textContent?.trim())
                    textNodes.push(node)

            /*  iterate over all found text nodes and wrap them into word elements  */
            for (const textNode of textNodes) {
                const words = textNode.textContent.split(/([A-Za-z]+)/)
                const fragment = document.createDocumentFragment()
                for (const word of words) {
                    /*  wrap word with HTML "span" element  */
                    const node = document.createElement("span")
                    node.textContent = word
                    let punctuation = false
                    if (word.match(/^[A-Za-z]+$/))
                        node.className = "rundown-word"
                    else {
                        node.className = "rundown-word-other"
                        punctuation = true
                    }
                    fragment.appendChild(node)

                    /*  add word to index  */
                    const i = wordSeq.length
                    wordSeq.push({ index: i, word, punctuation, node, spoken: "none", visible: false })
                }
                textNode.replaceWith(fragment)
            }
        }
    }

    /*  update the rendering  */
    const updateRendering = () => {
        /*  ensure we can scroll to the content top and bottom
            with the focus-point still in the middle of the viewport  */
        document.body.style.marginTop    = `${view.h / 2}px`
        document.body.style.marginBottom = `${view.h / 2}px`

        /*  determine visibility of all words  */
        if (options.get("autoscroll") === "yes") {
            for (const item of wordSeq) {
                const word = item.node.getBoundingClientRect()
                item.visible = (word.top >= 0 && word.bottom <= view.h)
                if (item.visible)
                    item.node.classList.add("rundown-word-visible")
                else
                    item.node.classList.remove("rundown-word-visible")
            }
        }

        /*  determine all visible rundown section  */
        const sections = Array.from(document.querySelectorAll(".rundown-section:not(.disabled)"))

        /*  adjust the position of the moving part tab (right-hand side)  */
        const pivot = view.h / 2
        let i = 1
        for (const section of sections) {
            const sec  = section.getBoundingClientRect()
            const part = section.querySelector(".rundown-part-tab") as HTMLElement | null
            if (part !== null) {
                const pt = part.getBoundingClientRect()
                if (!(sec.top + sec.height < 0 || sec.top > view.h)) {
                    const y = calculateYPos(sec, pt, pivot)
                    part.style.top = `calc(${y}px - 0.25rem)`
                }
            }
            if (part !== null) {
                /*  update "what" of tab  */
                const what = part.querySelector(".rundown-part-tab-what") as HTMLElement | null
                if (what !== null)
                    what.innerHTML = `${i++}/${sections.length}`

                /*  update "where" of tab  */
                const rawPercent = content.h > 0 ? (content.scrollY / content.h * 100) : 0
                const percent = Math.max(0, Math.min(100, rawPercent))
                const where = part.querySelector(".rundown-part-tab-where") as HTMLElement | null
                if (where !== null)
                    where.innerHTML = `${percent.toFixed(0)}%`
            }
        }
        const closestSection = findClosestElement(sections, pivot)
        updateActiveElement(sections, closestSection.element)

        /*  determine all rundown chunks  */
        const chunks = Array.from(document.querySelectorAll(".rundown-chunk:not(.disabled)"))

        /*  calculate the position of the moving speaker tab (left-hand side)  */
        for (const chunk of chunks) {
            const chk     = chunk.getBoundingClientRect()
            const speaker = chunk.querySelector(".rundown-speaker") as HTMLElement
            if (speaker !== null) {
                const spk = speaker.getBoundingClientRect()
                if (!(chk.top + chk.height < 0 || chk.top > view.h)) {
                    const y = calculateYPos(chk, spk, pivot)
                    speaker.style.top = `calc(${y}px - 0.25rem)`
                }
            }
        }
        const closestChunk = findClosestElement(chunks, pivot)
        updateActiveElement(chunks, closestChunk.element)

        /*  optionally support live state emission  */
        if (options.get("live") === "yes") {
            /*  determine all invisible state information  */
            const states = document.querySelectorAll(".rundown-state")
            const stateStack: Array<{ pos: number, kv: { [ key: string ]: string | number | boolean } }> =
                [ { pos: Number.MIN_SAFE_INTEGER, kv: {} } ]
            for (const state of states) {
                const bb = state.getBoundingClientRect()
                const text = (state as HTMLSpanElement).innerText
                const kv: { [ key: string ]: string | number | boolean } = {}
                const matches = text.matchAll(/\b([a-zA-Z][a-zA-Z0-9:-]*)(?:=(?:"([^"]*)"|(\S+)))?\b/g)
                for (const match of matches) {
                    const key = match[1]
                    const val = match[2] ?? match[3] ?? undefined
                    if (val === undefined)
                        kv[key] = true
                    else if (val.match(/^[0-9]+$/))
                        kv[key] = parseInt(val)
                    else if (val.match(/^(?:[0-9]+\.[0-9]*|[0-9]*\.[0-9]+)$/))
                        kv[key] = parseFloat(val)
                    else
                        kv[key] = val
                }
                stateStack.push({ pos: bb.top + (bb.height / 2), kv })
            }

            /*  track state changes  */
            if (stateStack.length > 1) {
                /*  under a locked situation, prevent from scroll backwards over a state  */
                if (locked) {
                    if (window.scrollY < stateLastScrollY) {
                        for (let i = 0; i < stateStack.length; i++) {
                            if (pivot > stateStack[i].pos && (pivot - stateStack[i].pos) < 20) {
                                paused = true
                                speed = 0
                                window.scrollTo({ top: stateLastScrollY })
                                break
                            }
                        }
                    }
                    stateLastScrollY = window.scrollY
                }

                /*  determine which state is currently active  */
                for (let i = 0; i < stateStack.length; i++) {
                    if (   (i === 0 && i < stateStack.length - 1
                            && pivot < stateStack[i + 1].pos)
                        || ((i > 0 && i < stateStack.length - 1)
                            && pivot >= stateStack[i].pos
                            && pivot < stateStack[i + 1].pos)
                        || (i === stateStack.length - 1
                            && pivot >= stateStack[i].pos)) {
                        if (stateLast !== i) {
                            stateLast = i
                            const data: { active: number, kv: Array<{ [ key: string ]: string | number | boolean }> } =
                                { active: -1, kv: [] }
                            for (let j = 0; j < stateStack.length; j++)
                                if (Object.keys(stateStack[j].kv).length > 0)
                                    data.kv.push(stateStack[j].kv)
                            data.active = i
                            log("debug", `state change: detected (active: #${data.active})`)
                            if (stateTimer !== null)
                                clearTimeout(stateTimer)
                            stateTimer = setTimeout(() => {
                                stateTimer = null
                                if (stateLastSent !== data.active) {
                                    stateLastSent = data.active
                                    log("debug", `state change: sending (active: #${data.active})`)
                                    wsSendQueue.push(JSON.stringify({ event: "STATE", data }))
                                }
                                else {
                                    log("debug", `state change: suppressed (active: #${data.active})`)
                                }
                            }, 800)
                        }
                        break
                    }
                }
            }
        }
    }

    /*  update state once initially and on every scroll and resize event  */
    let ticking = false
    const tickOnce = () => {
        /*  determine viewport size  */
        view.w      = document.documentElement.clientWidth
        view.h      = document.documentElement.clientHeight

        /*  determine content size  */
        const box   = document.documentElement.getBoundingClientRect()
        content.w   = box.width
        content.h   = box.height - view.h /* re-compensate for out extra margins */

        /*  determine content scroll position  */
        content.scrollX = window.scrollX
        content.scrollY = window.scrollY

        /*  update rendering (on next rendering possibility)  */
        if (!ticking) {
            window.requestAnimationFrame(() => {
                updateRendering()
                ticking = false
            })
            ticking = true
        }
    }
    document.addEventListener("wheel", (event: WheelEvent) => {
        if (locked)
            event.preventDefault()
    }, { passive: false })
    document.addEventListener("scroll", (event: Event) => {
        if (speed === 0)
            windowScrollY = window.scrollY
        tickOnce()
    })
    window.addEventListener("resize", (event: Event) => {
        if (speed === 0)
            windowScrollY = window.scrollY
        tickOnce()
    })
    tickOnce()

    /*  perform the auto-scrolling
        (notice: window.scroll needs a delta of at least 0.5px to operate)  */
    let windowScrollY = window.scrollY
    const doAutoScroll = () => {
        if (!paused && speed !== 0) {
            if (   (Math.sign(speed) < 0 && window.scrollY <= 0)
                || (Math.sign(speed) > 0 && Math.abs(window.scrollY - content.h) < 0.5)) {
                paused = true
                speed  = 0
            }
            else {
                if (windowScrollY !== window.scrollY)
                    delta -= window.scrollY - windowScrollY
                delta += Math.sign(speed) * 0.20 * Math.pow(Math.abs(speed), 1.5)
                windowScrollY = window.scrollY
                window.scroll({ top: window.scrollY + delta })
            }
        }
        window.requestAnimationFrame(doAutoScroll)
    }
    window.requestAnimationFrame(doAutoScroll)

    /*  generic helper for scrolling to sibling elements  */
    const scrollToSibling = (selector: string, direction: "up" | "down") => {
        const elements = Array.from(document.querySelectorAll(selector))
        const pivot = view.h / 2
        const min = findClosestElement(elements, pivot)
        if (min.element !== null) {
            let i = elements.findIndex((el) => el === min.element)
            if (direction === "up" && i > 0)
                i--
            else if (direction === "down" && i < elements.length - 1)
                i++
            const element = elements[i]
            const rect = element.getBoundingClientRect()
            const delta = rect.top - (view.h / 2)
            paused = true
            speed = 0
            windowScrollY = window.scrollY + delta
            window.scroll({ top: window.scrollY + delta, behavior: "smooth" })
        }
    }

    /*  scroll to previous/next sibling section upwards/downwards  */
    const scrollToSiblingSection = (direction: "up" | "down") =>
        scrollToSibling(".rundown-section:not(.disabled)", direction)

    /*  scroll to previous/next sibling chunk upwards/downwards  */
    const scrollToSiblingChunk = (direction: "up" | "down") =>
        scrollToSibling(".rundown-chunk:not(.disabled)", direction)

    /*  allow the scrolling and rendering to be controlled  */
    let fontSize   = 120
    let lineHeight = 125
    let speedBeforePause = 0
    let adjustSpeedTimer: ReturnType<typeof setTimeout> | null = null
    const adjustSpeed = (target: number) => {
        if (adjustSpeedTimer !== null)
            clearTimeout(adjustSpeedTimer)
        if (   (target === 0 && speed > 0)
            || (target !== 0 && speed > target)) {
            paused = false
            speed--
            adjustSpeedTimer = setTimeout(() => adjustSpeed(target), 100)
        }
        else if ((target === 0 && speed < 0)
            || (target !== 0 && speed < target)) {
            paused = false
            speed++
            adjustSpeedTimer = setTimeout(() => adjustSpeed(target), 100)
        }
        else if (target === 0)
            paused = true
    }
    document.addEventListener("keydown", (event: KeyboardEvent) => {
        if (event.key === " ") {
            event.preventDefault()
            if (!paused) {
                speedBeforePause = speed
                adjustSpeed(0)
            }
            else
                adjustSpeed(speedBeforePause)
        }
        else if (event.key === "Escape" || (event.altKey && event.key === "ArrowUp")) {
            event.preventDefault()
            speedBeforePause = 0
            adjustSpeed(0)
        }
        else if (event.key === "ArrowDown" || event.key === "w") {
            event.preventDefault()
            if (paused) paused = false
            speed -= 1
            if (speed < -10) speed = -10
        }
        else if (event.key === "ArrowUp" || event.key === "s") {
            event.preventDefault()
            if (paused) paused = false
            speed += 1
            if (speed > 10) speed = 10
        }
        else if (event.key === "1" || event.key === "t") {
            paused = true
            speed = 0
            if (!locked)
                window.scroll({ top: 0, behavior: "smooth" })
        }
        else if (event.key === "2" || event.key === "b") {
            paused = true
            speed = 0
            if (!locked)
                window.scroll({ top: content.h, behavior: "smooth" })
        }
        else if ((event.shiftKey && event.key === "PageUp")
            || (event.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD && event.key === "1")) {
            event.preventDefault()
            if (!locked)
                scrollToSiblingSection("up")
        }
        else if ((event.shiftKey && event.key === "PageDown")
            || (event.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD && event.key === "2")) {
            event.preventDefault()
            if (!locked)
                scrollToSiblingSection("down")
        }
        else if (event.key === "ArrowLeft" || event.key === "PageUp") {
            event.preventDefault()
            if (!locked)
                scrollToSiblingChunk("up")
        }
        else if (event.key === "ArrowRight" || event.key === "PageDown") {
            event.preventDefault()
            if (!locked)
                scrollToSiblingChunk("down")
        }
        else if (event.altKey && event.key === "-") {
            lineHeight -= 5
            if (lineHeight < 105) lineHeight = 105
            const content = document.querySelector("body > .content")! as HTMLDivElement
            content.style.lineHeight = `${lineHeight}%`
        }
        else if (event.altKey && event.key === "+") {
            lineHeight += 5
            if (lineHeight > 145) lineHeight = 145
            const content = document.querySelector("body > .content")! as HTMLDivElement
            content.style.lineHeight = `${lineHeight}%`
        }
        else if (event.altKey && event.key === "0") {
            lineHeight = 125
            const content = document.querySelector("body > .content")! as HTMLDivElement
            content.style.lineHeight = `${lineHeight}%`
        }
        else if (event.key === "-") {
            fontSize -= 10
            if (fontSize < 90) fontSize = 90
            const content = document.querySelector("body > .content")! as HTMLDivElement
            content.style.fontSize = `${fontSize}%`
        }
        else if (event.key === "+") {
            fontSize += 10
            if (fontSize > 180) fontSize = 180
            const content = document.querySelector("body > .content")! as HTMLDivElement
            content.style.fontSize = `${fontSize}%`
        }
        else if (event.key === "0") {
            fontSize = 120
            const content = document.querySelector("body > .content")! as HTMLDivElement
            content.style.fontSize = `${fontSize}%`
        }
        else if (event.key === "D") {
            debug = !debug
            const content = document.querySelector("body > .content")! as HTMLDivElement
            if (debug && !content.classList.contains("debug"))
                content.classList.add("debug")
            else if (!debug && content.classList.contains("debug"))
                content.classList.remove("debug")
            if (options.get("live") === "yes") {
                log("debug", `mode change: sending (locked: ${locked}, debug: #${debug})`)
                wsSendQueue.push(JSON.stringify({ event: "MODE", data: { locked, debug } }))
            }
        }
        else if (event.key === "l") {
            locked = !locked
            const content = document.querySelector("body")! as HTMLBodyElement
            if (locked && !content.classList.contains("locked"))
                content.classList.add("locked")
            else if (!locked && content.classList.contains("locked"))
                content.classList.remove("locked")
            if (options.get("live") === "yes") {
                log("debug", `mode change: sending (locked: ${locked}, debug: #${debug})`)
                wsSendQueue.push(JSON.stringify({ event: "MODE", data: { locked, debug } }))
            }
        }
        else if (event.key === "a") {
            if (options.get("autoscroll") === "yes" && SpeechRecognition !== undefined) {
                /*  toggle runtime option  */
                autoscroll = !autoscroll

                /*  animate autoscroll indicator  */
                if (autoscroll) {
                    anime.animate(".overlay7", {
                        opacity: { from: 0.0, to: 1.0 },
                        ease: "outSine",
                        duration: 100
                    })
                    autoscrollAnimation = anime.animate(".overlay7", {
                        scale: [ 1.0, 1.1, 1.0 ],
                        ease: "easeInOutSine",
                        duration: 1000,
                        loop: true
                    })
                }
                else {
                    if (autoscrollAnimation !== null) {
                        autoscrollAnimation.pause()
                        autoscrollAnimation = null
                    }
                    anime.animate(".overlay7", {
                        opacity: { from: 1.0, to: 0.0 },
                        ease: "inSine",
                        duration: 100
                    })
                }

                /*  reset the state  */
                for (const item of wordSeq) {
                    item.node.classList.remove("rundown-word-spoken-intermediate")
                    item.node.classList.remove("rundown-word-spoken-final")
                    item.spoken = "none"
                }
                lastSpokenIndex = -1

                /*  clear any pending intervals  */
                if (autoscrollInterval !== null) {
                    clearInterval(autoscrollInterval)
                    autoscrollInterval = null
                }

                /*  toggle auto-scrolling  */
                speedBeforePause = 0
                adjustSpeed(0)

                /*  toggle speech-to-text  */
                if (s2t !== null) {
                    if (autoscroll) {
                        log("debug", "start speech-to-text engine")
                        s2t.start()
                    }
                    else {
                        log("debug", "stop speech-to-text engine")
                        s2t.stop()
                    }
                }
            }
        }
    })

    /*  receive a transcript for auto-scrolling  */
    const autoscrollReceive = (transcript: string, final = true) => {
        /*  determine transcript words  */
        const words = transcript.split(/([A-Za-z]+)/)
            .filter((word) => word.match(/^[A-Za-z]+$/))

        /*  determine currently visible and still not spoken words  */
        const visibleNonPunct = wordSeq.filter((word) => word.visible && !word.punctuation)
        const visibleSpoken   = visibleNonPunct.map((word) => word.spoken)
        const k               = visibleSpoken.reverse().findIndex((spoken) => spoken === "final")
        const j               = (k !== -1 ? Math.max(0, visibleSpoken.length - k) : 0)
        const visibleIndex    = visibleNonPunct.map((word) => word.index).slice(j)
        const visibleWords    = visibleNonPunct.map((word) => word.word ).slice(j)

        /*  perform a fuzzy match of the transcript words in the visible words  */
        const idx = fuzzyWordMatch(words, visibleWords, 0)
        if (idx !== -1) {
            const index = visibleIndex[idx]

            /*  mark all words spoken up to and including the last fuzzy matched word  */
            for (let i = 0; i <= index; i++) {
                const item = wordSeq[i]
                if (item.spoken === "none") {
                    item.node.classList.add(final ?
                        "rundown-word-spoken-final" : "rundown-word-spoken-intermediate")
                    item.spoken = final ? "final" : "intermediate"
                }
                else if (item.spoken === "intermediate" && final) {
                    item.node.classList.remove("rundown-word-spoken-intermediate")
                    item.node.classList.add("rundown-word-spoken-final")
                    item.spoken = "final"
                }
            }

            /*  find last spoken word (the above could have re-matched words)  */
            let lastWord: typeof wordSeq[0] | undefined
            for (let i = wordSeq.length - 1; i >= 0; i--) {
                if (wordSeq[i].spoken !== "none") {
                    lastWord = wordSeq[i]
                    break
                }
            }
            if (lastWord !== undefined) {
                /*  check if new words were spoken  */
                const newWordsSpoken = (lastWord.index !== lastSpokenIndex)
                lastSpokenIndex = lastWord.index

                /*  adjust scrolling if new words were spoken  */
                if (newWordsSpoken) {
                    const lastSpokenWord = lastWord.node
                    const rect     = lastSpokenWord.getBoundingClientRect()
                    const pivot    = (view.h / 2) - rect.height
                    const distance = rect.bottom - pivot

                    /*  adjust scrolling speed based on distance from center  */
                    const relativeDistance = Math.abs(distance) / (view.h / 4)
                    const speed = Math.sign(distance) * Math.max(-10, Math.min(10,
                        Math.round(relativeDistance * 10)))
                    adjustSpeed(speed)

                    /*  clear previous interval  */
                    if (autoscrollInterval !== null) {
                        clearInterval(autoscrollInterval)
                        autoscrollInterval = null
                    }

                    /*  start continuous centering interval  */
                    autoscrollInterval = setInterval(() => {
                        if (!autoscroll || paused)
                            return
                        if (lastSpokenIndex >= 0) {
                            const lastSpokenWord = wordSeq[lastSpokenIndex].node
                            const rect     = lastSpokenWord.getBoundingClientRect()
                            const pivot    = (view.h / 2) - rect.height
                            const distance = rect.bottom - pivot

                            /*  adjust scrolling speed based on distance from center  */
                            if (Math.abs(distance) > (rect.height / 2)) {
                                const relativeDistance = Math.abs(distance) / (view.h / 4)
                                const speed = Math.sign(distance) * Math.max(-10, Math.min(10,
                                    Math.round(relativeDistance * 10)))
                                adjustSpeed(speed)
                            }
                            else {
                                if (autoscrollInterval !== null) {
                                    clearInterval(autoscrollInterval)
                                    autoscrollInterval = null
                                }
                                adjustSpeed(0)
                            }
                        }
                    }, 50)
                }
            }
        }
    }

    /*  optionally perform local speech-to-text transcription for autoscrolling  */
    let s2t: SpeechRecognition | null = null
    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (options.get("autoscroll") === "yes" && SpeechRecognition !== undefined) {
        const lang = options.get("lang") ?? "en-US"

        /*  establish speech-to-text facility of Chromium browsers  */
        s2t = new SpeechRecognition()
        s2t.continuous      = true
        s2t.interimResults  = true
        s2t.maxAlternatives = 1
        s2t.lang            = lang

        /*  catch errors  */
        s2t.addEventListener("error", (event) => {
            log("error", `speech-to-text: ${event.error}`)
        })

        /*  observe audio/sound/speech start/end  */
        s2t.addEventListener("audiostart", (event) => {
            log("debug", "speech-to-text: AUDIO start")
        })
        s2t.addEventListener("audioend", (event) => {
            log("debug", "speech-to-text: AUDIO end")
        })
        s2t.addEventListener("soundstart", (event) => {
            log("debug", "speech-to-text: SOUND start")
        })
        s2t.addEventListener("soundend", (event) => {
            log("debug", "speech-to-text: SOUND end")
        })
        s2t.addEventListener("speechstart", (event) => {
            log("debug", "speech-to-text: SPEECH start")
        })
        s2t.addEventListener("speechend", (event) => {
            log("debug", "speech-to-text: SPEECH end")
        })

        /*  observe engine start/end  */
        s2t.addEventListener("start", (event) => {
            log("debug", "speech-to-text: ENGINE start")
        })
        s2t.addEventListener("end", (event) => {
            log("debug", "speech-to-text: ENGINE end")
            if (autoscroll && s2t !== null) {
                log("debug", "speech-to-text: ENGINE restart")
                s2t.start()
            }
        })

        /*  retrieve speech-to-text results  */
        s2t.addEventListener("result", (event) => {
            const lastResult = event.results[event.results.length - 1]
            const text = lastResult[0].transcript.trim()
            if (text !== "") {
                if (!lastResult.isFinal) {
                    log("debug", `speech-to-text: recognized INTERIM text: "${text}"`)
                    autoscrollReceive(text, false)
                }
                else {
                    log("debug", `speech-to-text: recognized FINAL text: "${text}"`)
                    autoscrollReceive(text, true)
                }
            }
        })
        s2t.addEventListener("nomatch", (event) => {
            log("debug", "speech-to-text: recognized NO text")
        })
    }

    /*  connect to the origin server to get notified of document changes  */
    if (options.get("live") === "yes") {
        let url = document.location.href
        url = url.replace(/#.+$/, "")
        url = url.replace(/\/[^/]*$/, "")
        url = url + "/events"
        ws = new ReconnectingWebSocket(url, [], {
            reconnectionDelayGrowFactor: 1.3,
            maxReconnectionDelay:        4000,
            minReconnectionDelay:        1000,
            connectionTimeout:           4000,
            minUptime:                   5000
        })
        ws.addEventListener("open", (ev) => {
            log("debug", "WebSocket connection opened")
            if (ws !== undefined) {
                ws.send(JSON.stringify({ event: "SUBSCRIBE" }))
                ws.send(JSON.stringify({ event: "MODE", data: { locked, debug } }))
            }
            stateLast = -1
            tickOnce()
        })
        ws.addEventListener("close", (ev) => {
            log("debug", "WebSocket connection closed")
        })
        ws.addEventListener("error", (ev) => {
            log("error", `WebSocket connection error: ${ev.message}`)
        })
        ws.addEventListener("message", (ev) => {
            (async () => {
                const event = JSON.parse(ev.data)
                if (event?.event === "RELOAD") {
                    /*  show overlay  */
                    const overlay = document.querySelector(".overlay5")
                    anime.animate(".overlay5", {
                        opacity: { from: 0.0, to: 1.0 },
                        ease: "outSine",
                        duration: 250,
                        onBegin: () => {
                            overlay!.classList.add("active")
                        }
                    })

                    /*  hide overlay (later again)  */
                    const hideOverlay = () => {
                        anime.animate(".overlay5", {
                            opacity: { from: 1.0, to: 0.0 },
                            ease: "inSine",
                            duration: 250,
                            onComplete: () => {
                                overlay!.classList.remove("active")
                            }
                        })
                    }

                    /*  fetch new content  */
                    try {
                        let url = document.location.href
                        url = url.replace(/#live$/, "")
                        const response = await axios({
                            method: "GET",
                            url,
                            responseType: "document"
                        })

                        /*  update content  */
                        const contentOld = document.querySelector(".content")!
                        const contentNew = response.data.querySelector(".content")!
                        contentOld.innerHTML = contentNew.innerHTML

                        /*  update once  */
                        setTimeout(() => {
                            tickOnce()
                            setTimeout(() => {
                                /*  hide overlay and update once again  */
                                hideOverlay()
                                tickOnce()
                            }, 1000)
                        }, 10)
                    }
                    catch (err) {
                        const msg = err instanceof Error ? err.message : String(err)
                        log("error", `document reload failed: ${msg}`)
                        hideOverlay()
                    }
                }
                else if (event?.event === "TRANSCRIPT" && typeof event.transcript === "string") {
                    if (options.get("autoscroll") === "yes" && autoscroll)
                        autoscrollReceive(event.transcript as string, true)
                }
            })().catch((err) => {
                const msg = err instanceof Error ? err.message : String(err)
                log("error", `WebSocket message handler failed: ${msg}`)
            })
        })
    }

    /*  optionally provide a pseudo exit functionality by just reloading
        the current page, which for Rundown-Web is some sort of an exit
        back to the menu  */
    if (options.get("with-exit") === "yes") {
        const overlay = document.querySelector(".overlay6")!
        overlay.addEventListener("mouseenter", (ev: Event) => {
            anime.animate(".overlay6", {
                opacity: { from: 0.0, to: 1.0 },
                ease: "outSine",
                duration: 100
            })
        })
        overlay.addEventListener("mouseleave", (ev: Event) => {
            anime.animate(".overlay6", {
                opacity: { from: 1.0, to: 0.0 },
                ease: "inSine",
                duration: 100
            })
        })
        overlay.addEventListener("click", (ev: Event) => {
            window.location.reload()
        })
    }
}, { once: true })

