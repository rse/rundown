/*
**  Rundown - Render Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  external dependencies  */
import * as anime          from "animejs"
import { diceCoefficient } from "dice-coefficient"
import { doubleMetaphone } from "double-metaphone"

/*  internal dependencies  */
import { RundownState }     from "./rundown-state"
import { RundownUtil }      from "./rundown-util"
import { RundownControls }  from "./rundown-controls"
import { RundownRendering } from "./rundown-rendering"

/*  auto-scroll management class  */
export class RundownAutoScroll {
    /*  internal state  */
    private s2t:                 SpeechRecognition | null              = null
    private autoscrollInterval:  ReturnType<typeof setInterval> | null = null
    private autoscrollAnimation: anime.JSAnimation | null              = null
    private controls!:           RundownControls
    private rendering!:          RundownRendering

    /*  word sequence for autoscroll feature  */
    private wordSeq: Array<{
        index:       number,
        word:        string,
        punctuation: boolean,
        node:        HTMLSpanElement,
        spoken:      "none" | "intermediate" | "final",
        visible:     boolean,
    }> = []

    /*  last spoken word index  */
    private lastSpokenIndex = -1

    /*  object construction  */
    constructor (
        private state: RundownState,
        private util:  RundownUtil
    ) {}

    /*  receive circular references  */
    provideCircRefs (controls: RundownControls, rendering: RundownRendering) {
        this.controls  = controls
        this.rendering = rendering
    }

    /*  initialize word sequence for autoscroll tracking  */
    initializeWordSequence () {
        if (this.state.options.get("autoscroll") !== "yes")
            return

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
                if (textNode.textContent === null)
                    continue
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
                    const i = this.wordSeq.length
                    this.wordSeq.push({ index: i, word, punctuation, node, spoken: "none", visible: false })
                }
                textNode.replaceWith(fragment)
            }
        }
    }

    /*  helper function for determining string similarity  */
    private similarity (s1: string, s2: string) {
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

    /*  helper function for fuzzy word matching  */
    private fuzzyWordMatch (
        spokenWords:   string[],
        prompterWords: string[],
        startIdx             = 0,
        minMatchWordsPercent = 0.6,
        minSimilarityPercent = 0.7
    ) {
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
                    if (this.similarity(spokenWord, prompterWords[j]) > minSimilarityPercent) {
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

    /*  update visibility of all words  */
    updateWordVisibility () {
        if (this.state.options.get("autoscroll") !== "yes")
            return

        for (const item of this.wordSeq) {
            const word = item.node.getBoundingClientRect()
            item.visible = (word.top >= 0 && word.bottom <= this.rendering.view.h)
            if (item.visible)
                item.node.classList.add("rundown-word-visible")
            else
                item.node.classList.remove("rundown-word-visible")
        }
    }

    /*  initialize speech-to-text recognition  */
    initializeSpeechRecognition () {
        /*  determine SpeechRecognition API  */
        const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition
        if (this.state.options.get("autoscroll") !== "yes" || SpeechRecognition === undefined)
            return

        const lang = this.state.options.get("lang") ?? "en-US"

        /*  establish speech-to-text facility of Chromium browsers  */
        this.s2t = new SpeechRecognition()
        this.s2t.continuous      = true
        this.s2t.interimResults  = true
        this.s2t.maxAlternatives = 1
        this.s2t.lang            = lang

        /*  catch errors  */
        this.s2t.addEventListener("error", (event) => {
            this.util.log("error", `speech-to-text: ${event.error}`)
        })

        /*  observe audio/sound/speech start/end  */
        this.s2t.addEventListener("audiostart", (event) => {
            this.util.log("debug", "speech-to-text: AUDIO start")
        })
        this.s2t.addEventListener("audioend", (event) => {
            this.util.log("debug", "speech-to-text: AUDIO end")
        })
        this.s2t.addEventListener("soundstart", (event) => {
            this.util.log("debug", "speech-to-text: SOUND start")
        })
        this.s2t.addEventListener("soundend", (event) => {
            this.util.log("debug", "speech-to-text: SOUND end")
        })
        this.s2t.addEventListener("speechstart", (event) => {
            this.util.log("debug", "speech-to-text: SPEECH start")
        })
        this.s2t.addEventListener("speechend", (event) => {
            this.util.log("debug", "speech-to-text: SPEECH end")
        })

        /*  observe engine start/end  */
        this.s2t.addEventListener("start", (event) => {
            this.util.log("debug", "speech-to-text: ENGINE start")
        })
        this.s2t.addEventListener("end", (event) => {
            this.util.log("debug", "speech-to-text: ENGINE end")
            if (this.state.autoscroll && this.s2t !== null) {
                this.util.log("debug", "speech-to-text: ENGINE restart")
                this.s2t.start()
            }
        })

        /*  retrieve speech-to-text results  */
        this.s2t.addEventListener("result", (event) => {
            const lastResult = event.results[event.results.length - 1]
            const text = lastResult[0].transcript.trim()
            if (text !== "") {
                if (!lastResult.isFinal) {
                    this.util.log("debug", `speech-to-text: recognized INTERIM text: "${text}"`)
                    this.autoscrollReceive(text, false)
                }
                else {
                    this.util.log("debug", `speech-to-text: recognized FINAL text: "${text}"`)
                    this.autoscrollReceive(text, true)
                }
            }
        })
        this.s2t.addEventListener("nomatch", (event) => {
            this.util.log("debug", "speech-to-text: recognized NO text")
        })
    }

    /*  start speech recognition  */
    start () {
        if (this.s2t === null)
            return
        this.util.log("debug", "start speech-to-text engine")
        this.s2t.start()
    }

    /*  stop speech recognition  */
    stop () {
        if (this.s2t === null)
            return
        this.util.log("debug", "stop speech-to-text engine")
        this.s2t.stop()
    }

    /*  toggle autoscroll mode  */
    toggle () {
        if (this.state.options.get("autoscroll") !== "yes")
            return
        if (this.s2t === null)
            return
        this.util.log("debug", "toggle speech-to-text engine")

        /*  toggle runtime option  */
        this.state.autoscroll = !this.state.autoscroll

        /*  animate autoscroll indicator  */
        if (this.state.autoscroll) {
            anime.animate(".overlay7", {
                opacity: { from: 0.0, to: 1.0 },
                ease: "outSine",
                duration: 100
            })
            this.autoscrollAnimation = anime.animate(".overlay7", {
                scale: [ 1.0, 1.1, 1.0 ],
                ease: "easeInOutSine",
                duration: 1000,
                loop: true
            })
        }
        else {
            if (this.autoscrollAnimation !== null) {
                this.autoscrollAnimation.pause()
                this.autoscrollAnimation = null
            }
            anime.animate(".overlay7", {
                opacity: { from: 1.0, to: 0.0 },
                ease: "inSine",
                duration: 100
            })
        }

        /*  reset the state  */
        for (const item of this.wordSeq) {
            item.node.classList.remove("rundown-word-spoken-intermediate")
            item.node.classList.remove("rundown-word-spoken-final")
            item.spoken = "none"
        }
        this.lastSpokenIndex = -1

        /*  clear any pending intervals  */
        if (this.autoscrollInterval !== null) {
            clearInterval(this.autoscrollInterval)
            this.autoscrollInterval = null
        }

        /*  toggle auto-scrolling  */
        this.state.speedBeforePause = 0
        this.controls.adjustSpeed(0)

        /*  toggle speech-to-text  */
        if (this.s2t !== null) {
            if (this.state.autoscroll)
                this.start()
            else
                this.stop()
        }
    }

    /*  receive a transcript for auto-scrolling  */
    autoscrollReceive (transcript: string, final = true) {
        /*  determine transcript words  */
        const words = transcript.split(/([A-Za-z]+)/)
            .filter((word) => word.match(/^[A-Za-z]+$/))

        /*  determine currently visible and still not spoken words  */
        const visibleNonPunct = this.wordSeq.filter((word) => word.visible && !word.punctuation)
        const visibleSpoken   = visibleNonPunct.map((word) => word.spoken)
        const k               = visibleSpoken.reverse().findIndex((spoken) => spoken === "final")
        const j               = (k !== -1 ? Math.max(0, visibleSpoken.length - k) : 0)
        const visibleIndex    = visibleNonPunct.map((word) => word.index).slice(j)
        const visibleWords    = visibleNonPunct.map((word) => word.word ).slice(j)

        /*  perform a fuzzy match of the transcript words in the visible words  */
        const idx = this.fuzzyWordMatch(words, visibleWords, 0)
        if (idx !== -1) {
            const index = visibleIndex[idx]

            /*  mark all words spoken up to and including the last fuzzy matched word  */
            for (let i = 0; i <= index; i++) {
                const item = this.wordSeq[i]
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

            /*  clear remaining intermediate results when final transcript arrives  */
            if (final) {
                for (let i = index + 1; i < this.wordSeq.length; i++) {
                    const item = this.wordSeq[i]
                    if (item.spoken === "intermediate") {
                        item.node.classList.remove("rundown-word-spoken-intermediate")
                        item.spoken = "none"
                    }
                }
            }

            /*  find last spoken word (the above could have re-matched words)  */
            let lastWord: typeof this.wordSeq[0] | undefined
            for (let i = this.wordSeq.length - 1; i >= 0; i--) {
                if (this.wordSeq[i].spoken !== "none") {
                    lastWord = this.wordSeq[i]
                    break
                }
            }
            if (lastWord !== undefined) {
                /*  check if new words were spoken  */
                const newWordsSpoken = (lastWord.index !== this.lastSpokenIndex)
                this.lastSpokenIndex = lastWord.index

                /*  helper function to calculate speed based on distance  */
                const calculateSpeed = (distance: number) => {
                    const relativeDistance = Math.abs(distance) / (this.rendering.view.h / 4)
                    return Math.sign(distance) * Math.max(-10, Math.min(10,
                        Math.round(relativeDistance * 10)))
                }

                /*  adjust scrolling if new words were spoken  */
                if (newWordsSpoken) {
                    const lastSpokenWord = lastWord.node
                    const rect     = lastSpokenWord.getBoundingClientRect()
                    const pivot    = (this.rendering.view.h / 2) - rect.height
                    const distance = rect.bottom - pivot

                    /*  adjust scrolling speed based on distance from center  */
                    this.controls.adjustSpeed(calculateSpeed(distance))

                    /*  clear previous interval  */
                    if (this.autoscrollInterval !== null) {
                        clearInterval(this.autoscrollInterval)
                        this.autoscrollInterval = null
                    }

                    /*  start continuous centering interval  */
                    this.autoscrollInterval = setInterval(() => {
                        if (!this.state.autoscroll || this.state.paused)
                            return
                        if (this.lastSpokenIndex >= 0) {
                            const lastSpokenWord = this.wordSeq[this.lastSpokenIndex].node
                            const rect     = lastSpokenWord.getBoundingClientRect()
                            const pivot    = (this.rendering.view.h / 2) - rect.height
                            const distance = rect.bottom - pivot

                            /*  adjust scrolling speed based on distance from center  */
                            if (Math.abs(distance) > (rect.height / 2))
                                this.controls.adjustSpeed(calculateSpeed(distance))
                            else {
                                if (this.autoscrollInterval !== null) {
                                    clearInterval(this.autoscrollInterval)
                                    this.autoscrollInterval = null
                                }
                                this.controls.adjustSpeed(0)
                            }
                        }
                    }, 50)
                }
            }
        }
    }
}
