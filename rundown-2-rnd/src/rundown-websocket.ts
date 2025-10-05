/*
**  Rundown - Render Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  external dependencies  */
import ReconnectingWebSocket from "@opensumi/reconnecting-websocket"
import axios                 from "axios"
import * as anime            from "animejs"

/*  internal dependencies  */
import { RundownState }      from "./rundown-state"
import { RundownUtil }       from "./rundown-util"
import { RundownAutoScroll } from "./rundown-autoscroll"
import { RundownRendering }  from "./rundown-rendering"

/*  WebSocket communication management class  */
export class RundownWebSocket {
    private ws: ReconnectingWebSocket | undefined
    private wsSendQueue: string[] = []
    private sendQueueInterval: ReturnType<typeof setInterval> | null = null
    private rendering!: RundownRendering

    constructor (
        private state:      RundownState,
        private util:       RundownUtil,
        private autoscroll: RundownAutoScroll
    ) {}

    /*  receive circular references  */
    provideCircRefs (rendering: RundownRendering) {
        this.rendering = rendering
    }

    /*  connect to WebSocket server  */
    public connect () {
        if (this.state.options.get("live") !== "yes")
            return

        /*  determine server URL  */
        let url = document.location.href
        url = url.replace(/#.+$/, "")
        url = url.replace(/\/[^/]*$/, "")
        url = url + "/events"

        /*  connect to server  */
        this.ws = new ReconnectingWebSocket(url, [], {
            reconnectionDelayGrowFactor: 1.3,
            maxReconnectionDelay:        4000,
            minReconnectionDelay:        1000,
            connectionTimeout:           4000,
            minUptime:                   5000
        })

        /*  observe events  */
        this.ws.addEventListener("open", (ev) => {
            this.util.log("debug", "WebSocket connection opened")
            if (this.ws !== undefined) {
                this.ws.send(JSON.stringify({ event: "SUBSCRIBE" }))
                this.ws.send(JSON.stringify({
                    event: "MODE",
                    data: { locked: this.state.locked, debug: this.state.debug }
                }))
            }
            this.rendering.resetState()
            this.rendering.tickOnce()
        })
        this.ws.addEventListener("close", (ev) => {
            this.util.log("debug", "WebSocket connection closed")
        })
        this.ws.addEventListener("error", (ev) => {
            this.util.log("error", `WebSocket connection error: ${ev.message ?? "(unknown reason)"}`)
        })
        this.ws.addEventListener("message", (ev) => {
            (async () => {
                const event = JSON.parse(ev.data)
                if (event?.event === "RELOAD") {
                    await this.handleReload()
                }
                else if (event?.event === "TRANSCRIPT" && typeof event.transcript === "string") {
                    if (this.state.autoscroll)
                        this.autoscroll.autoscrollReceive(event.transcript as string, true)
                }
            })().catch((err) => {
                const msg = err instanceof Error ? err.message : String(err)
                this.util.log("error", `WebSocket message handler failed: ${msg}`)
            })
        })

        /*  initialize WebSocket send queue processor  */
        this.sendQueueInterval = setInterval(() => {
            if (this.ws === undefined || this.ws.readyState !== ReconnectingWebSocket.OPEN)
                return
            while (this.wsSendQueue.length > 0) {
                const msg = this.wsSendQueue.shift()!
                this.ws.send(msg)
            }
        }, 200)
    }

    /*  disconnect from WebSocket server  */
    public disconnect () {
        if (this.sendQueueInterval !== null) {
            clearInterval(this.sendQueueInterval)
            this.sendQueueInterval = null
        }
        if (this.ws !== undefined) {
            this.ws.close()
            this.ws = undefined
        }
    }

    /*  send a message to the WebSocket server  */
    public send (message: any) {
        this.wsSendQueue.push(JSON.stringify(message))
    }

    /*  handle document reload event  */
    private async handleReload () {
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
            url = url.replace(/#.*$/, "")
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
                this.rendering.tickOnce()
                setTimeout(() => {
                    /*  hide overlay and update once again  */
                    hideOverlay()
                    this.rendering.tickOnce()
                }, 1000)
            }, 10)
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            this.util.log("error", `document reload failed: ${msg}`)
            hideOverlay()
        }
    }

    /*  send state update to server  */
    public sendStateUpdate (data: any) {
        this.send({ event: "STATE", data })
    }

    /*  send mode update to server  */
    public sendModeUpdate (locked: boolean, debug: boolean) {
        this.util.log("debug", `mode change: sending (locked: ${locked}, debug: ${debug})`)
        this.send({ event: "MODE", data: { locked, debug } })
    }
}
