/*
**  Rundown - Render Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  external dependencies  */
import * as anime            from "animejs"

/*  internal dependencies  */
import { RundownState }      from "./rundown-state"
import { RundownUtil }       from "./rundown-util"
import { RundownAutoScroll } from "./rundown-autoscroll"
import { RundownWebSocket }  from "./rundown-websocket"

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

/*  controls management class  */
export class RundownControls {
    windowScrollY = 0

    private adjustSpeedTimer: ReturnType<typeof setTimeout> | null = null
    private fontSize      = 120
    private lineHeight    = 125
    private delta         = 0

    constructor (
        private state:      RundownState,
        private util:       RundownUtil,
        private autoscroll: RundownAutoScroll,
        private websocket:  RundownWebSocket
    ) {}

    /*  adjust scrolling speed  */
    adjustSpeed (target: number) {
        if (this.adjustSpeedTimer !== null)
            clearTimeout(this.adjustSpeedTimer)
        if (   (target === 0 && this.state.speed > 0)
            || (target !== 0 && this.state.speed > target)) {
            this.state.paused = false
            this.state.speed--
            this.adjustSpeedTimer = setTimeout(() => this.adjustSpeed(target), 100)
        }
        else if ((target === 0 && this.state.speed < 0)
            || (target !== 0 && this.state.speed < target)) {
            this.state.paused = false
            this.state.speed++
            this.adjustSpeedTimer = setTimeout(() => this.adjustSpeed(target), 100)
        }
        else if (target === 0)
            this.state.paused = true
    }

    /*  generic helper for scrolling to sibling elements  */
    scrollToSibling (selector: string, direction: "up" | "down") {
        const elements = Array.from(document.querySelectorAll(selector))
        const pivot = this.state.view.h / 2
        const min = findClosestElement(elements, pivot)
        if (min.element !== null) {
            let i = elements.findIndex((el) => el === min.element)
            if (direction === "up" && i > 0)
                i--
            else if (direction === "down" && i < elements.length - 1)
                i++
            const element = elements[i]
            const rect = element.getBoundingClientRect()
            const delta = rect.top - (this.state.view.h / 2)
            this.state.paused = true
            this.state.speed = 0
            this.windowScrollY = window.scrollY + delta
            window.scroll({ top: window.scrollY + delta, behavior: "smooth" })
        }
    }

    /*  scroll to previous/next sibling section upwards/downwards  */
    scrollToSiblingSection (direction: "up" | "down") {
        this.scrollToSibling(".rundown-section:not(.disabled)", direction)
    }

    /*  scroll to previous/next sibling chunk upwards/downwards  */
    scrollToSiblingChunk (direction: "up" | "down") {
        this.scrollToSibling(".rundown-chunk:not(.disabled)", direction)
    }

    /*  initialize keyboard controls  */
    initializeKeyboardListeners () {
        document.addEventListener("keydown", (event: KeyboardEvent) => {
            if (event.key === " ") {
                event.preventDefault()
                if (!this.state.paused) {
                    this.state.speedBeforePause = this.state.speed
                    this.adjustSpeed(0)
                }
                else
                    this.adjustSpeed(this.state.speedBeforePause)
            }
            else if (event.key === "Escape" || (event.altKey && event.key === "ArrowUp")) {
                event.preventDefault()
                this.state.speedBeforePause = 0
                this.adjustSpeed(0)
            }
            else if (event.key === "ArrowDown" || event.key === "w") {
                event.preventDefault()
                if (this.state.paused) this.state.paused = false
                this.state.speed -= 1
                if (this.state.speed < -10) this.state.speed = -10
            }
            else if (event.key === "ArrowUp" || event.key === "s") {
                event.preventDefault()
                if (this.state.paused) this.state.paused = false
                this.state.speed += 1
                if (this.state.speed > 10) this.state.speed = 10
            }
            else if (event.key === "1" || event.key === "t") {
                this.state.paused = true
                this.state.speed = 0
                if (!this.state.locked)
                    window.scroll({ top: 0, behavior: "smooth" })
            }
            else if (event.key === "2" || event.key === "b") {
                this.state.paused = true
                this.state.speed = 0
                if (!this.state.locked)
                    window.scroll({ top: this.state.content.h, behavior: "smooth" })
            }
            else if ((event.shiftKey && event.key === "PageUp")
                || (event.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD && event.key === "1")) {
                event.preventDefault()
                if (!this.state.locked)
                    this.scrollToSiblingSection("up")
            }
            else if ((event.shiftKey && event.key === "PageDown")
                || (event.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD && event.key === "2")) {
                event.preventDefault()
                if (!this.state.locked)
                    this.scrollToSiblingSection("down")
            }
            else if (event.key === "ArrowLeft" || event.key === "PageUp") {
                event.preventDefault()
                if (!this.state.locked)
                    this.scrollToSiblingChunk("up")
            }
            else if (event.key === "ArrowRight" || event.key === "PageDown") {
                event.preventDefault()
                if (!this.state.locked)
                    this.scrollToSiblingChunk("down")
            }
            else if (event.altKey && event.key === "-") {
                this.lineHeight -= 5
                if (this.lineHeight < 105) this.lineHeight = 105
                const content = document.querySelector("body > .content")! as HTMLDivElement
                content.style.lineHeight = `${this.lineHeight}%`
            }
            else if (event.altKey && event.key === "+") {
                this.lineHeight += 5
                if (this.lineHeight > 145) this.lineHeight = 145
                const content = document.querySelector("body > .content")! as HTMLDivElement
                content.style.lineHeight = `${this.lineHeight}%`
            }
            else if (event.altKey && event.key === "0") {
                this.lineHeight = 125
                const content = document.querySelector("body > .content")! as HTMLDivElement
                content.style.lineHeight = `${this.lineHeight}%`
            }
            else if (event.key === "-") {
                this.fontSize -= 10
                if (this.fontSize < 90) this.fontSize = 90
                const content = document.querySelector("body > .content")! as HTMLDivElement
                content.style.fontSize = `${this.fontSize}%`
            }
            else if (event.key === "+") {
                this.fontSize += 10
                if (this.fontSize > 180) this.fontSize = 180
                const content = document.querySelector("body > .content")! as HTMLDivElement
                content.style.fontSize = `${this.fontSize}%`
            }
            else if (event.key === "0") {
                this.fontSize = 120
                const content = document.querySelector("body > .content")! as HTMLDivElement
                content.style.fontSize = `${this.fontSize}%`
            }
            else if (event.key === "D") {
                this.state.debug = !this.state.debug
                const content = document.querySelector("body > .content")! as HTMLDivElement
                if (this.state.debug && !content.classList.contains("debug"))
                    content.classList.add("debug")
                else if (!this.state.debug && content.classList.contains("debug"))
                    content.classList.remove("debug")
                if (this.state.options.get("live") === "yes") {
                    this.util.log("debug", `mode change: sending (locked: ${this.state.locked}, debug: ${this.state.debug})`)
                    this.websocket.send({ event: "MODE", data: { locked: this.state.locked, debug: this.state.debug } })
                }
            }
            else if (event.key === "l") {
                this.state.locked = !this.state.locked
                const content = document.querySelector("body")! as HTMLBodyElement
                if (this.state.locked && !content.classList.contains("locked"))
                    content.classList.add("locked")
                else if (!this.state.locked && content.classList.contains("locked"))
                    content.classList.remove("locked")
                if (this.state.options.get("live") === "yes") {
                    this.util.log("debug", `mode change: sending (locked: ${this.state.locked}, debug: ${this.state.debug})`)
                    this.websocket.send({ event: "MODE", data: { locked: this.state.locked, debug: this.state.debug } })
                }
            }
            else if (event.key === "a")
                this.autoscroll.toggle()
        })
    }

    /*  initialize auto-scroll loop  */
    initializeAutoScroll () {
        this.windowScrollY = window.scrollY
        const doAutoScroll = () => {
            if (!this.state.paused && this.state.speed !== 0) {
                if (   (Math.sign(this.state.speed) < 0 && window.scrollY <= 0)
                    || (Math.sign(this.state.speed) > 0 && Math.abs(window.scrollY - this.state.content.h) < 0.5)) {
                    this.state.paused = true
                    this.state.speed  = 0
                }
                else {
                    if (this.windowScrollY !== window.scrollY)
                        this.delta -= window.scrollY - this.windowScrollY
                    this.delta += Math.sign(this.state.speed) * 0.20 * Math.pow(Math.abs(this.state.speed), 1.5)
                    this.windowScrollY = window.scrollY
                    window.scroll({ top: window.scrollY + this.delta })
                }
            }
            window.requestAnimationFrame(doAutoScroll)
        }
        window.requestAnimationFrame(doAutoScroll)
    }

    /*  initialize exit button  */
    initializeExitButton () {
        if (this.state.options.get("with-exit") !== "yes")
            return
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
}
