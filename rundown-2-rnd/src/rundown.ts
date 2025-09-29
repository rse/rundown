/*
**  Rundown - Render Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import ReconnectingWebSocket from "@opensumi/reconnecting-websocket"
import axios                 from "axios"
import * as anime            from "animejs"

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
document.addEventListener("DOMContentLoaded", () => {
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
    const view    = { w: 0, h: 0 }
    const content = { w: 0, h: 0, scrollX: 0, scrollY: 0 }
    let stateLast = -1
    let stateLastSent = -1
    let stateTimer: ReturnType<typeof setTimeout> | null = null
    let stateLastScrollY = -1
    let debug = false
    let ws: ReconnectingWebSocket | undefined
    let locked = false
    let paused = false
    let speed = 0
    let delta = 0

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

    /*  update the rendering  */
    const updateRendering = () => {
        /*  ensure we can scroll to the content top and bottom
            with the focus-point still in the middle of the viewport  */
        document.body.style.marginTop    = `${view.h / 2}px`
        document.body.style.marginBottom = `${view.h / 2}px`

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
                                data.kv.push(stateStack[j].kv)
                            data.active = i
                            if (debug)
                                console.log(`[DEBUG]: state change: detected (active: #${data.active})`)
                            if (stateTimer !== null)
                                clearTimeout(stateTimer)
                            stateTimer = setTimeout(() => {
                                stateTimer = null
                                if (stateLastSent !== data.active) {
                                    stateLastSent = data.active
                                    if (debug)
                                        console.log(`[DEBUG]: state change: sending (active: #${data.active})`)
                                    wsSendQueue.push(JSON.stringify({ event: "STATE", data }))
                                }
                                else {
                                    if (debug)
                                        console.log(`[DEBUG]: state change: suppressed (active: #${data.active})`)
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
                if (debug)
                    console.log(`[DEBUG]: mode change: sending (locked: ${locked}, debug: #${debug})`)
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
                if (debug)
                    console.log(`[DEBUG]: mode change: sending (locked: ${locked}, debug: #${debug})`)
                wsSendQueue.push(JSON.stringify({ event: "MODE", data: { locked, debug } }))
            }
        }
    })

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
            if (debug)
                console.log("[DEBUG]: WebSocket connection opened")
            if (ws !== undefined) {
                ws.send(JSON.stringify({ event: "SUBSCRIBE" }))
                ws.send(JSON.stringify({ event: "MODE", data: { locked, debug } }))
            }
            stateLast = -1
            tickOnce()
        })
        ws.addEventListener("close", (ev) => {
            if (debug)
                console.log("[DEBUG]: WebSocket connection closed")
        })
        ws.addEventListener("error", (ev) => {
            console.error(`[ERROR]: WebSocket connection error: ${ev.message}`)
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
                        console.error(`[ERROR]: document reload failed: ${msg}`)
                        hideOverlay()
                    }
                }
            })().catch((err) => {
                const msg = err instanceof Error ? err.message : String(err)
                console.error(`[ERROR]: WebSocket message handler failed: ${msg}`)
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

