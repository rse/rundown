/*
**  Rundown - Generate Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

document.addEventListener("DOMContentLoaded", () => {
    const doc = { w: 0, h: 0, scrollX: 0, scrollY: 0 }
    const vp  = { w: 0, h: 0 }

    const updateRendering = () => {
        const pivot = vp.h / 2

        document.body.style.marginTop = `${vp.h / 2}px`
        document.body.style.marginBottom = `${vp.h / 2}px`

        const sections = document.querySelectorAll(".rundown-section:not(.disabled)")
        if (sections.length === 0)
            return
        let min = { section: null, chunk: null, distance: Number.MAX_VALUE } as
            { section: Element | null, chunk: Element | null, distance: number }
        let i = 1
        for (const section of sections) {
            const sec = section.getBoundingClientRect()
            const part = section.querySelector(".rundown-part-tab") as HTMLElement
            if (part !== null) {
                const pt = part.getBoundingClientRect()
                if (!(sec.top + sec.height < 0 || sec.top > vp.h)) {
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
                where.innerHTML = `${(doc.scrollY / doc.h * 100).toFixed(0)}%`
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

        const chunks = document.querySelectorAll(".rundown-chunk:not(.disabled)")
        if (chunks.length === 0)
            return
        min = { section: null, chunk: null, distance: Number.MAX_VALUE }
        for (const chunk of chunks) {
            const chk     = chunk.getBoundingClientRect()
            const speaker = chunk.querySelector(".rundown-speaker") as HTMLElement
            if (speaker !== null) {
                const spk = speaker.getBoundingClientRect()
                if (!(chk.top + chk.height < 0 || chk.top > vp.h)) {
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

    let ticking = false
    const tickOnce = () => {
        vp.w        = document.documentElement.clientWidth
        vp.h        = document.documentElement.clientHeight
        const box   = document.documentElement.getBoundingClientRect()
        doc.w       = box.width
        doc.h       = box.height - vp.h
        doc.scrollX = window.scrollX
        doc.scrollY = window.scrollY
        if (!ticking) {
            window.requestAnimationFrame(() => {
                updateRendering()
                ticking = false
            })
            ticking = true
        }
    }
    document.addEventListener("scroll", (event) => {
        tickOnce()
    })
    window.addEventListener("resize", (event) => {
        tickOnce()
    })

    tickOnce()

    let paused = false
    let speed = 0
    let fontSize = 20
    const doAutoScroll = () => {
        if (!paused && speed !== 0) {
            const delta = Math.sign(speed) * 0.50 * Math.pow(Math.abs(speed), 1.5)
            if (   (delta < 0 && window.scrollY > 0)
                || (delta > 0 && window.scrollY < document.body.scrollHeight))
                window.scroll({ top: window.scrollY + delta })
            else
                speed = 0
        }
        window.requestAnimationFrame(doAutoScroll)
    }
    window.requestAnimationFrame(doAutoScroll)
    document.addEventListener("keydown", (event) => {
        if (event.code === "Space" || event.code === "ArrowLeft" || event.code === "ArrowRight") {
            paused = !paused
            event.preventDefault()
        }
        else if (event.code === "ArrowDown" || event.key === "w") {
            if (paused) paused = false
            speed -= 1
            if (speed < -10) speed = -10
            event.preventDefault()
        }
        else if (event.code === "ArrowUp" || event.key === "s") {
            if (paused) paused = false
            speed += 1.0
            if (speed > 10) speed = 10
            event.preventDefault()
        }
        else if (event.key === "-") {
            fontSize -= 0.25
            if (fontSize < 15) fontSize = 15
            document.documentElement.style.fontSize = `${fontSize}pt`
        }
        else if (event.key === "+") {
            fontSize += 0.25
            if (fontSize > 25) fontSize = 25
            document.documentElement.style.fontSize = `${fontSize}pt`
        }
        else if (event.key === "0") {
            fontSize = 20
            document.documentElement.style.fontSize = `${fontSize}pt`
        }
    })

    const ws = new ReconnectingWebSocket(document.location.href + "events", [], {
        reconnectionDelayGrowFactor: 1.3,
        maxReconnectionDelay:        4000,
        minReconnectionDelay:        1000,
        connectionTimeout:           4000,
        minUptime:                   5000
    })
    ws.addEventListener("open", (ev: Event) => {
        ws.send(JSON.stringify({ event: "SUBSCRIBE" }))
    })
    ws.addEventListener("message", (ev: MessageEvent) => {
        const event = JSON.parse(ev.data)
        if (event?.event === "RELOAD") {
            console.log("RELOADING")
            window.location.reload()
        }
    })
})

