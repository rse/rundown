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
import { RundownRendering }  from "./rundown-rendering"

/*  controls management class  */
export class RundownControls {
    /*  references  */
    state!:      RundownState
    util!:       RundownUtil
    autoscroll!: RundownAutoScroll
    websocket!:  RundownWebSocket
    rendering!:  RundownRendering

    /*  set references  */
    references (refs: {
        state:      RundownState,
        util:       RundownUtil,
        autoscroll: RundownAutoScroll,
        websocket:  RundownWebSocket,
        rendering:  RundownRendering
    }) {
        this.state      = refs.state
        this.util       = refs.util
        this.autoscroll = refs.autoscroll
        this.websocket  = refs.websocket
        this.rendering  = refs.rendering
    }

    /*  internal state  */
    windowScrollY = 0

    private adjustSpeedTimer: ReturnType<typeof setTimeout> | null = null
    private fontSize      = 120
    private lineHeight    = 125
    private delta         = 0

    /*  cached DOM references  */
    private contentElement: HTMLDivElement  | null = null
    private bodyElement:    HTMLBodyElement | null = null

    /*  clear cached DOM references  */
    clearCache () {
        this.contentElement = null
        this.bodyElement    = null
    }

    /*  get cached content element  */
    private getContentElement (): HTMLDivElement {
        if (this.contentElement === null)
            this.contentElement = document.querySelector("body > .content")! as HTMLDivElement
        return this.contentElement
    }

    /*  get cached body element  */
    private getBodyElement (): HTMLBodyElement {
        if (this.bodyElement === null)
            this.bodyElement = document.querySelector("body")! as HTMLBodyElement
        return this.bodyElement
    }

    /*  adjust font size  */
    private adjustFontSize (delta: number) {
        this.fontSize += delta
        if (this.fontSize < 90)  this.fontSize = 90
        if (this.fontSize > 180) this.fontSize = 180
        const content = this.getContentElement()
        content.style.fontSize = `${this.fontSize}%`
    }

    /*  adjust line height  */
    private adjustLineHeight (delta: number) {
        this.lineHeight += delta
        if (this.lineHeight < 105) this.lineHeight = 105
        if (this.lineHeight > 145) this.lineHeight = 145
        const content = this.getContentElement()
        content.style.lineHeight = `${this.lineHeight}%`
    }

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

    /*  helper function for performing smooth scrolling to target position  */
    private performScroll (position: number) {
        this.state.paused = true
        this.state.speed  = 0
        this.windowScrollY = position
        window.scroll({ top: position, behavior: "smooth" })
    }

    /*  helper function for scrolling to sibling element  */
    private scrollToSibling (
        selector: string,
        direction: "up" | "down",
        isNearStart: (element: Element, rect: DOMRect, pivot: number) => boolean
    ) {
        /*  find the relevant DOM elements  */
        const elements = Array.from(document.querySelectorAll(selector))
        if (elements.length === 0)
            return

        /*  determine closest element to our pivot position  */
        const pivot = this.rendering.view.h / 2
        const min = this.util.findClosestElement(elements, pivot)
        if (min.element === null)
            return

        /*  determine index and boundary of closest element  */
        const currentEl    = min.element
        const currentIndex = elements.findIndex((el) => el === currentEl)
        const currentRect  = currentEl.getBoundingClientRect()

        /*  dispatch according to the direction...  */
        if (direction === "down") {
            /*  scrolling down  */
            if (currentIndex === elements.length - 1)
                /*  already at last element, go to end of document  */
                this.performScroll(this.rendering.content.h)
            else {
                /*  go to start of next element  */
                const element = elements[currentIndex + 1]
                const rect    = element.getBoundingClientRect()
                const delta   = rect.top - pivot
                this.performScroll(window.scrollY + delta)
            }
        }
        else {
            /*  scrolling up  */
            if (currentIndex > 0 && isNearStart(currentEl, currentRect, pivot)) {
                /*  within threshold of start of element,
                    so go to start of previous element  */
                const element = elements[currentIndex - 1]
                const rect    = element.getBoundingClientRect()
                const delta   = rect.top - pivot
                this.performScroll(window.scrollY + delta)
            }
            else {
                /*  not within threshold of start of element,
                    so just go to beginning of current element  */
                const delta = currentRect.top - pivot
                this.performScroll(window.scrollY + delta)
            }
        }
    }

    /*  scroll to previous/next sibling section upwards/downwards  */
    scrollToSiblingSection (direction: "up" | "down") {
        this.scrollToSibling(
            ".rundown-section:not(.disabled)",
            direction,
            (element, rect, pivot) => {
                /*  check if pivot is within top 10px of section start or its first chunk  */
                const distanceFromSectionTop = pivot - rect.top
                if (distanceFromSectionTop >= 0 && distanceFromSectionTop < 10)
                    return true
                const firstChunk = element.querySelector(".rundown-chunk:not(.disabled)")
                if (firstChunk !== null) {
                    const firstChunkRect = firstChunk.getBoundingClientRect()
                    const distanceFromChunkTop = pivot - firstChunkRect.top
                    if (distanceFromChunkTop >= 0 && distanceFromChunkTop < 10)
                        return true
                }
                return false
            }
        )
    }

    /*  scroll to previous/next sibling chunk upwards/downwards  */
    scrollToSiblingChunk (direction: "up" | "down") {
        this.scrollToSibling(
            ".rundown-chunk:not(.disabled)",
            direction,
            (element, rect, pivot) => {
                /*  check if chunk start is near the pivot  */
                return Math.abs(pivot - rect.top) < 10
            }
        )
    }

    /*  initialize module  */
    initialize () {
        this.initializeKeyboardListeners()
        this.initializeAutoScroll()
        this.initializeExitButton()
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
                    window.scroll({ top: this.rendering.content.h, behavior: "smooth" })
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
            else if (event.altKey && event.key === "-")
                this.adjustLineHeight(-5)
            else if (event.altKey && event.key === "+")
                this.adjustLineHeight(+5)
            else if (event.altKey && event.key === "0")
                this.adjustLineHeight(125 - this.lineHeight)
            else if (event.key === "-")
                this.adjustFontSize(-10)
            else if (event.key === "+")
                this.adjustFontSize(+10)
            else if (event.key === "0")
                this.adjustFontSize(120 - this.fontSize)
            else if (event.key === "D") {
                this.state.debug = !this.state.debug
                const content = this.getContentElement()
                this.util.toggleClass(content, "debug", this.state.debug)
                if (this.state.options.get("live") === "yes")
                    this.websocket.sendModeUpdate(this.state.locked, this.state.debug)
            }
            else if (event.key === "l") {
                this.state.locked = !this.state.locked
                const body = this.getBodyElement()
                this.util.toggleClass(body, "locked", this.state.locked)
                if (this.state.options.get("live") === "yes")
                    this.websocket.sendModeUpdate(this.state.locked, this.state.debug)
            }
            else if (event.key === "a")
                this.autoscroll.toggle()
            else if (event.key === "A")
                this.autoscroll.switchLanguage()
        })
    }

    /*  initialize auto-scroll loop  */
    initializeAutoScroll () {
        this.windowScrollY = window.scrollY
        const doAutoScroll = () => {
            if (!this.state.paused && this.state.speed !== 0) {
                if (   (Math.sign(this.state.speed) < 0 && window.scrollY <= 0)
                    || (Math.sign(this.state.speed) > 0 && Math.abs(window.scrollY - this.rendering.content.h) < 0.5)) {
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
