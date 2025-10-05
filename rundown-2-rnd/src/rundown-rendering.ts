/*
**  Rundown - Render Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import { RundownState }      from "./rundown-state"
import { RundownUtil }       from "./rundown-util"
import { RundownAutoScroll } from "./rundown-autoscroll"
import { RundownWebSocket }  from "./rundown-websocket"
import { RundownControls }   from "./rundown-controls"

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

/*  rendering engine management class  */
export class RundownRendering {
    private ticking = false

    /*  state tracking for live mode  */
    private stateLast        = -1
    private stateLastSent    = -1
    private stateLastScrollY = -1
    private stateTimer:      ReturnType<typeof setTimeout> | null = null

    constructor (
        private state:      RundownState,
        private util:       RundownUtil,
        private autoscroll: RundownAutoScroll,
        private websocket:  RundownWebSocket,
        private controls:   RundownControls
    ) {}

    /*  reset state  */
    resetState () {
        this.stateLast = -1
    }

    /*  update the rendering  */
    updateRendering () {
        /*  ensure we can scroll to the content top and bottom
            with the focus-point still in the middle of the viewport  */
        document.body.style.marginTop    = `${this.state.view.h / 2}px`
        document.body.style.marginBottom = `${this.state.view.h / 2}px`

        /*  update visibility of all words  */
        this.autoscroll.updateWordVisibility()

        /*  determine all visible rundown section  */
        const sections = Array.from(document.querySelectorAll(".rundown-section:not(.disabled)"))

        /*  adjust the position of the moving part tab (right-hand side)  */
        const pivot = this.state.view.h / 2
        let i = 1
        for (const section of sections) {
            const sec  = section.getBoundingClientRect()
            const part = section.querySelector(".rundown-part-tab") as HTMLElement | null
            if (part !== null) {
                const pt = part.getBoundingClientRect()
                if (!(sec.top + sec.height < 0 || sec.top > this.state.view.h)) {
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
                const rawPercent = this.state.content.h > 0 ? (this.state.content.scrollY / this.state.content.h * 100) : 0
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
                if (!(chk.top + chk.height < 0 || chk.top > this.state.view.h)) {
                    const y = calculateYPos(chk, spk, pivot)
                    speaker.style.top = `calc(${y}px - 0.25rem)`
                }
            }
        }
        const closestChunk = findClosestElement(chunks, pivot)
        updateActiveElement(chunks, closestChunk.element)

        /*  optionally support live state emission  */
        if (this.state.options.get("live") === "yes") {
            /*  determine all invisible state information  */
            const states = document.querySelectorAll(".rundown-state")
            const stateStack: Array<{ pos: number, kv: { [ key: string ]: string | number | boolean } }> =
                [ { pos: Number.MIN_SAFE_INTEGER, kv: {} } ]
            for (const state of states) {
                const bb = state.getBoundingClientRect()
                const text = (state as HTMLSpanElement).innerText
                const kv: { [ key: string ]: string | number | boolean } = {}
                const matches = text.matchAll(/\b([a-zA-Z][a-zA-Z0-9:-]*)(?:=(?:"([^"]*)"|(\\S+)))?\b/g)
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
                if (this.state.locked) {
                    if (window.scrollY < this.stateLastScrollY) {
                        for (let i = 0; i < stateStack.length; i++) {
                            if (pivot > stateStack[i].pos && (pivot - stateStack[i].pos) < 20) {
                                this.state.paused = true
                                this.state.speed = 0
                                window.scrollTo({ top: this.stateLastScrollY })
                                break
                            }
                        }
                    }
                    this.stateLastScrollY = window.scrollY
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
                        if (this.stateLast !== i) {
                            this.stateLast = i
                            const data: { active: number, kv: Array<{ [ key: string ]: string | number | boolean }> } =
                                { active: -1, kv: [] }
                            for (let j = 0; j < stateStack.length; j++)
                                if (Object.keys(stateStack[j].kv).length > 0)
                                    data.kv.push(stateStack[j].kv)
                            data.active = i
                            this.util.log("debug", `state change: detected (active: #${data.active})`)
                            if (this.stateTimer !== null)
                                clearTimeout(this.stateTimer)
                            this.stateTimer = setTimeout(() => {
                                this.stateTimer = null
                                if (this.stateLastSent !== data.active) {
                                    this.stateLastSent = data.active
                                    this.util.log("debug", `state change: sending (active: #${data.active})`)
                                    this.websocket.send({ event: "STATE", data })
                                }
                                else {
                                    this.util.log("debug", `state change: suppressed (active: #${data.active})`)
                                }
                            }, 800)
                        }
                        break
                    }
                }
            }
        }
    }

    /*  update state once  */
    tickOnce () {
        /*  determine viewport size  */
        this.state.view.w = document.documentElement.clientWidth
        this.state.view.h = document.documentElement.clientHeight

        /*  determine content size  */
        const box = document.documentElement.getBoundingClientRect()
        this.state.content.w = box.width
        this.state.content.h = box.height - this.state.view.h /* re-compensate for out extra margins */

        /*  determine content scroll position  */
        this.state.content.scrollX = window.scrollX
        this.state.content.scrollY = window.scrollY

        /*  update rendering (on next rendering possibility)  */
        if (!this.ticking) {
            window.requestAnimationFrame(() => {
                this.updateRendering()
                this.ticking = false
            })
            this.ticking = true
        }
    }

    /*  initialize scroll and resize event listeners  */
    initializeEventListeners () {
        document.addEventListener("wheel", (event: WheelEvent) => {
            if (this.state.locked)
                event.preventDefault()
        }, { passive: false })
        document.addEventListener("scroll", (event: Event) => {
            if (this.state.speed === 0)
                this.controls.windowScrollY = window.scrollY
            this.tickOnce()
        })
        window.addEventListener("resize", (event: Event) => {
            if (this.state.speed === 0)
                this.controls.windowScrollY = window.scrollY
            this.tickOnce()
        })
        this.tickOnce()
    }
}
