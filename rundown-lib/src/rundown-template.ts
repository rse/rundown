/*
**  Rundown - Generate Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

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

    /*  update the rendering  */
    const updateRendering = () => {
        /*  ensure we can scroll to the content top and bottom
            with the focus-point still in the middle of the viewport  */
        document.body.style.marginTop    = `${view.h / 2}px`
        document.body.style.marginBottom = `${view.h / 2}px`

        /*  determine all visible rundown section  */
        const sections = document.querySelectorAll(".rundown-section:not(.disabled)")

        /*  adjust the position of the moving part tab (right-hand side)  */
        let min = { section: null, chunk: null, distance: Number.MAX_VALUE } as
            { section: Element | null, chunk: Element | null, distance: number }
        const pivot = view.h / 2
        let i = 1
        for (const section of sections) {
            const sec  = section.getBoundingClientRect()
            const part = section.querySelector(".rundown-part-tab") as HTMLElement
            if (part !== null) {
                const pt = part.getBoundingClientRect()
                if (!(sec.top + sec.height < 0 || sec.top > view.h)) {
                    let y = 0
                    if (sec.top > pivot - (pt.height / 2))
                        y = 0
                    else if (sec.top + sec.height < pivot + (pt.height / 2))
                        y = sec.height - pt.height
                    else
                        y = (pivot - (pt.height / 2)) - sec.top
                    part.style.top = `calc(${y}px - 0.25rem)`
                }
            }
            const distance1 = Math.abs(pivot - sec.top)
            const distance2 = Math.abs(pivot - (sec.top + sec.height))
            if (min.distance > distance1) {
                min.distance = distance1
                min.section  = section
            }
            if (min.distance > distance2) {
                min.distance = distance2
                min.section  = section
            }
            if (part !== null) {
                const what  = part.querySelector(".rundown-part-tab-what")!
                const where = part.querySelector(".rundown-part-tab-where")!
                what.innerHTML  = `${i++}/${sections.length}`
                where.innerHTML = `${(content.scrollY / content.h * 100).toFixed(0)}%`
            }
        }
        if (min.section !== null) {
            for (const section of sections) {
                if (section === min.section && !section.classList.contains("active"))
                    section.classList.add("active")
                else if (section !== min.section && section.classList.contains("active"))
                    section.classList.remove("active")
            }
        }

        /*  determine all rundown chunks  */
        const chunks = document.querySelectorAll(".rundown-chunk:not(.disabled)")

        /*  calculate the position of the moving speaker tab (left-hand side)  */
        min = { section: null, chunk: null, distance: Number.MAX_VALUE }
        for (const chunk of chunks) {
            const chk     = chunk.getBoundingClientRect()
            const speaker = chunk.querySelector(".rundown-speaker") as HTMLElement
            if (speaker !== null) {
                const spk = speaker.getBoundingClientRect()
                if (!(chk.top + chk.height < 0 || chk.top > view.h)) {
                    let y = 0
                    if (chk.top > pivot - (spk.height / 2))
                        y = 0
                    else if (chk.top + chk.height < pivot + (spk.height / 2))
                        y = chk.height - spk.height
                    else
                        y = (pivot - (spk.height / 2)) - chk.top
                    speaker.style.top = `calc(${y}px - 0.25rem)`
                }
            }
            const distance1 = Math.abs(pivot - chk.top)
            const distance2 = Math.abs(pivot - (chk.top + chk.height))
            if (min.distance > distance1) {
                min.distance = distance1
                min.chunk    = chunk
            }
            if (min.distance > distance2) {
                min.distance = distance2
                min.chunk    = chunk
            }
        }
        if (min.chunk !== null) {
            for (const chunk of chunks) {
                if (chunk === min.chunk && !chunk.classList.contains("active"))
                    chunk.classList.add("active")
                else if (chunk !== min.chunk && chunk.classList.contains("active"))
                    chunk.classList.remove("active")
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
    document.addEventListener("scroll", (event: Event) => { tickOnce() })
    window.addEventListener("resize",   (event: Event) => { tickOnce() })
    tickOnce()

    /*  perform the auto-scrolling
        (notice: window.scroll needs a delta of at least 0.5px to operate)  */
    let paused = false
    let speed = 0
    let carry = 0
    const doAutoScroll = () => {
        if (!paused && speed !== 0) {
            if (   (Math.sign(speed) < 0 && window.scrollY <= 0)
                || (Math.sign(speed) > 0 && Math.abs(window.scrollY - content.h) < 0.5)) {
                paused = true
                speed  = 0
            }
            else {
                const diff = Math.sign(speed) * 0.20 * Math.pow(Math.abs(speed), 1.5)
                let delta = diff + carry
                if (Math.abs(delta) < 0.50) {
                    carry += diff
                    delta = 0
                }
                else
                    carry = 0
                if (delta !== 0)
                    window.scroll({ top: window.scrollY + delta })
            }
        }
        window.requestAnimationFrame(doAutoScroll)
    }
    window.requestAnimationFrame(doAutoScroll)

    /*  scroll to previous/next sibling section upwards/downwards  */
    const scrollToSiblingSection = (direction: "up" | "down") => {
        const sections = document.querySelectorAll(".rundown-section:not(.disabled)")
        const min = { section: null, distance: Number.MAX_VALUE } as
            { section: Element | null, distance: number }
        const pivot = view.h / 2
        for (const section of sections) {
            const sec = section.getBoundingClientRect()
            const distance1 = Math.abs(pivot - sec.top)
            const distance2 = Math.abs(pivot - (sec.top + sec.height))
            if (min.distance > distance1) {
                min.distance = distance1
                min.section  = section
            }
            if (min.distance > distance2) {
                min.distance = distance2
                min.section  = section
            }
        }
        if (min.section !== null) {
            const sectionsArray = Array.from(sections)
            let i = sectionsArray.findIndex((chk) => chk === min.section)
            if (direction === "up" && i > 0)
                i--
            else if (direction === "down" && i < sectionsArray.length - 1)
                i++
            const section = sectionsArray[i]
            const bb = section.getBoundingClientRect()
            const delta = bb.top - (view.h / 2)
            paused = true
            speed = 0
            window.scroll({ top: window.scrollY + delta, behavior: "smooth" })
        }
    }

    /*  scroll to previous/next sibling chunk upwards/downwards  */
    const scrollToSiblingChunk = (direction: "up" | "down") => {
        const chunks = document.querySelectorAll(".rundown-chunk:not(.disabled)")
        const min = { chunk: null, distance: Number.MAX_VALUE } as
            { chunk: Element | null, distance: number }
        const pivot = view.h / 2
        for (const chunk of chunks) {
            const chk     = chunk.getBoundingClientRect()
            const distance1 = Math.abs(pivot - chk.top)
            const distance2 = Math.abs(pivot - (chk.top + chk.height))
            if (min.distance > distance1) {
                min.distance = distance1
                min.chunk    = chunk
            }
            if (min.distance > distance2) {
                min.distance = distance2
                min.chunk    = chunk
            }
        }
        if (min.chunk !== null) {
            const chunksArray = Array.from(chunks)
            let i = chunksArray.findIndex((chk) => chk === min.chunk)
            if (direction === "up" && i > 0)
                i--
            else if (direction === "down" && i < chunksArray.length - 1)
                i++
            const chunk = chunksArray[i]
            const chk = chunk.getBoundingClientRect()
            const delta = chk.top - (view.h / 2)
            paused = true
            speed = 0
            window.scroll({ top: window.scrollY + delta, behavior: "smooth" })
        }
    }

    /*  allow the scrolling and rendering to be controlled  */
    let fontSize   = 120
    let lineHeight = 125
    document.addEventListener("keydown", (event: KeyboardEvent) => {
        if (event.code === "Space") {
            event.preventDefault()
            paused = !paused
        }
        else if (event.code === "Escape" || (event.altKey && event.code === "ArrowUp")) {
            event.preventDefault()
            paused = !paused
            speed = 0
        }
        else if (event.code === "ArrowDown" || event.key === "w") {
            event.preventDefault()
            if (paused) paused = false
            speed -= 1
            if (speed < -10) speed = -10
        }
        else if (event.code === "ArrowUp" || event.key === "s") {
            event.preventDefault()
            if (paused) paused = false
            speed += 1
            if (speed > 10) speed = 10
        }
        else if (event.key === "1" || event.key === "t") {
            paused = true
            speed = 0
            window.scroll({ top: 0, behavior: "smooth" })
        }
        else if (event.key === "2" || event.key === "b") {
            paused = true
            speed = 0
            window.scroll({ top: content.h, behavior: "smooth" })
        }
        else if ((event.shiftKey && event.code === "PageUp") || event.code === "Numpad1") {
            event.preventDefault()
            scrollToSiblingSection("up")
        }
        else if ((event.shiftKey && event.code === "PageDown") || event.code === "Numpad2") {
            event.preventDefault()
            scrollToSiblingSection("down")
        }
        else if (event.code === "ArrowLeft" || event.code === "PageUp") {
            event.preventDefault()
            scrollToSiblingChunk("up")
        }
        else if (event.code === "ArrowRight" || event.code === "PageDown") {
            event.preventDefault()
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
    })

    /*  connect to the origin server to get notified of document changes  */
    if (options.get("live") === "yes") {
        let url = document.location.href
        url = url.replace(/#.+$/, "")
        url = url.replace(/\/[^/]*$/, "")
        url = url + "/events"
        const ws = new ReconnectingWebSocket(url, [], {
            reconnectionDelayGrowFactor: 1.3,
            maxReconnectionDelay:        4000,
            minReconnectionDelay:        1000,
            connectionTimeout:           4000,
            minUptime:                   5000
        })
        ws.addEventListener("open", (ev: Event) => {
            ws.send(JSON.stringify({ event: "SUBSCRIBE" }))
        })
        ws.addEventListener("message", async (ev: MessageEvent) => {
            const event = JSON.parse(ev.data)
            if (event?.event === "RELOAD") {
                /*  show overlay  */
                const overlay = document.querySelector(".overlay4")
                anime.animate(".overlay4", {
                    opacity: { from: 0.0, to: 1.0 },
                    ease: "outSine",
                    duration: 250,
                    onBegin: () => {
                        overlay!.classList.add("active")
                    }
                })

                /*  fetch new content  */
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
                        /*  hide overlay  */
                        anime.animate(".overlay4", {
                            opacity: { from: 1.0, to: 0.0 },
                            ease: "inSine",
                            duration: 250,
                            onComplete: () => {
                                overlay!.classList.remove("active")
                            }
                        })

                        /*  update once again  */
                        tickOnce()
                    }, 1000)
                }, 10)
            }
        })
    }

    /*  optionally provide a pseudo exit functionality by just reloading
        the current page, which for Rundown-Web is some sort of an exit
        back to the menu  */
    if (options.get("with-exit") === "yes") {
        const overlay = document.querySelector(".overlay5")!
        overlay.addEventListener("mouseenter", (ev: Event) => {
            anime.animate(".overlay5", {
                opacity: { from: 0.0, to: 1.0 },
                ease: "outSine",
                duration: 100
            })
        })
        overlay.addEventListener("mouseleave", (ev: Event) => {
            anime.animate(".overlay5", {
                opacity: { from: 1.0, to: 0.0 },
                ease: "inSine",
                duration: 100
            })
        })
        overlay.addEventListener("click", (ev: Event) => {
            console.log("click")
            window.location.reload()
        })
    }
}, { once: true })

