/*
**  Rundown - Render Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import { EventEmitter }       from "node:events"
import OSC                    from "osc-js"

/*  import internal dependencies  */
import { type RundownState }  from "./rundown-state"
import { RundownPlugin }      from "./rundown-plugin"

/*  the Rundown bridge to PowerPoint OSCPoint  */
export class RundownPluginPPT extends EventEmitter implements RundownPlugin {
    /*  internal state  */
    private oscR: OSC | undefined
    private oscS: OSC | undefined
    private pptState = {
        name:   "none",
        state:  "unknown",
        slide:  0,
        slides: 0,
        build:  0,
        builds: 0
    }
    private args: { [ key: string ]: string } = {}
    private commandQueue: Promise<void> = Promise.resolve()
    private commands = {
        /*  action: start slide-show  */
        "start": {
            reverse: "end",
            absolute: true,
            action: async (...args: any[]) => {
                if (this.pptState.state !== "running") {
                    this.emit("log", "info", `PowerPoint OSCPoint: [${this.args.prefix}]: ` +
                        "start slide-show")
                    this.send("/oscpoint/slideshow/start/current")
                    await this.awaitState("slideshow is running (again)",
                        () => this.pptState.state === "running", 2000)
                }
                else
                    this.emit("log", "info", `PowerPoint OSCPoint: [${this.args.prefix}]: ` +
                        "start slide-show (already reached)")
            }
        },

        /*  action: end slide-show  */
        "end": {
            reverse: "start",
            absolute: true,
            action: async (...args: any[]) => {
                if (this.pptState.state === "running") {
                    this.emit("log", "info", `PowerPoint OSCPoint: [${this.args.prefix}]: ` +
                        "end slide-show")
                    this.send("/oscpoint/slideshow/end")
                    await this.awaitState("slideshow is no longer running",
                        () => this.pptState.state !== "running", 2000)
                }
                else
                    this.emit("log", "info", `PowerPoint OSCPoint: [${this.args.prefix}]: ` +
                        "end slide-show (already reached)")
            }
        },

        /*  action: goto next slide (build)  */
        "next": {
            reverse: "prev",
            absolute: false,
            action: async (...args: any[]) => {
                if (this.pptState.builds > 0 && this.pptState.build < this.pptState.builds) {
                    /*  advance to next slide build of current slide  */
                    const build = this.pptState.build + 1
                    this.emit("log", "info", `PowerPoint OSCPoint: [${this.args.prefix}]: ` +
                        `goto next slide build (#${build}) of current slide`)
                    this.send("/oscpoint/next")
                    for (let i = 0; i < 10; i++) {
                        this.send("/oscpoint/feedbacks/refresh")
                        await new Promise((resolve) => setTimeout(resolve, 1000))
                        if (this.pptState.build === build)
                            break
                    }
                    await this.awaitState(`slide build #${build} of current slide is selected`,
                        () => this.pptState.build === build, 1000)
                }
                else if (this.pptState.slide < this.pptState.slides) {
                    /*  advance to next slide  */
                    const slide = this.pptState.slide + 1
                    this.emit("log", "info", `PowerPoint OSCPoint: [${this.args.prefix}]: ` +
                        `goto next slide (#${slide})`)
                    this.send("/oscpoint/next")
                    await this.awaitState(`slide #${slide} is selected`,
                        () => this.pptState.slide === slide, 8000)
                }
                else
                    this.emit("log", "info", `PowerPoint OSCPoint: [${this.args.prefix}]: ` +
                        "goto next slide (already reached: already on last slide)")
            }
        },

        /*  action: goto previous build/slide  */
        "prev": {
            reverse: "next",
            absolute: false,
            action: async (...args: any[]) => {
                if (this.pptState.builds > 0 && this.pptState.build > 0) {
                    const build = this.pptState.build - 1
                    this.emit("log", "info", `PowerPoint OSCPoint: [${this.args.prefix}]: ` +
                        `goto previous slide build (#${build}) of current slide`)
                    this.send("/oscpoint/previous")
                    if (build === 0) {
                        /*  FIXME: OSCPoint has a bug and does never go back to build 0 again  */
                        await new Promise((resolve) => setTimeout(resolve, 4000))
                        this.pptState.build = 0
                    }
                    else {
                        for (let i = 0; i < 10; i++) {
                            this.send("/oscpoint/feedbacks/refresh")
                            await new Promise((resolve) => setTimeout(resolve, 1000))
                            if (this.pptState.build === build)
                                break
                        }
                        await this.awaitState(`slide build #${build} of current slide is selected`,
                            () => this.pptState.build === build, 1000)
                    }
                }
                else if (this.pptState.slide > 1) {
                    const slide = this.pptState.slide - 1
                    this.emit("log", "info", `PowerPoint OSCPoint: [${this.args.prefix}]: ` +
                        `goto previous slide (#${slide})`)
                    this.send("/oscpoint/previous")
                    await this.awaitState(`slide #${slide} is selected`,
                        () => this.pptState.slide === slide, 8000)
                }
                else
                    this.emit("log", "info", `PowerPoint OSCPoint: [${this.args.prefix}]: ` +
                        "goto previous slide (already reached: already on first slide)")
            }
        },

        /*  action: goto particular slide  */
        "goto": {
            reverse: "",
            absolute: true,
            action: async (...args: any[]) => {
                const slide = args.length === 1 ? Number(args[0]) : 1
                if (this.pptState.slide !== slide) {
                    this.emit("log", "info", `PowerPoint OSCPoint: [${this.args.prefix}]: ` +
                        `goto particular slide #${slide}`)
                    this.send("/oscpoint/goto/slide", slide)
                    await this.awaitState(`slide ${slide} is selected`,
                        () => this.pptState.slide === slide, 8000)
                }
                else
                    this.emit("log", "info", `PowerPoint OSCPoint: [${this.args.prefix}]: ` +
                        `goto particular slide #${slide} (already reached)`)
            }
        },

        /*  action: toggle black screen display  */
        "black": {
            reverse: "black",
            absolute: false,
            action: async (...args: any[]) => {
                this.emit("log", "info", `PowerPoint OSCPoint: [${this.args.prefix}]: ` +
                    "toggle black screen display")
                this.send("/oscpoint/slideshow/black")
            }
        }
    } as {
        [ command: string ]: {
            reverse: string,
            absolute: boolean,
            action: (...args: any[]) => void
        }
    }
    private id = ""
    private active = 0

    /*  configure plugin  */
    configure (args: { [ key: string ]: string }) {
        if (!( typeof args["prefix"] === "string"
            && typeof args["connect"] === "string"
            && typeof args["listen"]  === "string"))
            throw new Error("invalid arguments")
        this.args = { ...this.args, ...args }
    }

    /*  connect to PowerPoint OSCPoint  */
    async connect () {
        this.emit("log", "info", `PowerPoint OSCPoint: [${this.args.prefix}]: ` +
            `connecting to UDP/OSC: ${this.args["connect"]}`)
        this.emit("log", "info", `PowerPoint OSCPoint: [${this.args.prefix}]: ` +
            `listening to UDP/OSC: ${this.args["listen"]}`)
        this.oscS = new OSC({ plugin: new OSC.DatagramPlugin({ type: "udp4" }) })
        this.oscR = new OSC({ plugin: new OSC.DatagramPlugin({ type: "udp4" }) })

        /*  track PowerPoint state  */
        this.oscR.on("/oscpoint/presentation/name", (message: OSC.Message) => {
            if (typeof message.args[0] !== "string")
                return
            this.pptState.name = message.args[0]
            this.emit("log", "info", `PowerPoint OSCPoint: [${this.args.prefix}]: received state: ` +
                `name="${this.pptState.name}"`)
        })
        this.oscR.on("/oscpoint/slideshow/state", (message: OSC.Message) => {
            if (typeof message.args[0] !== "string")
                return
            this.pptState.state = message.args[0]
            this.emit("log", "info", `PowerPoint OSCPoint: [${this.args.prefix}]: received state: ` +
                `state="${this.pptState.state}"`)
        })
        this.oscR.on("/oscpoint/slideshow/currentslide", (message: OSC.Message) => {
            if (typeof message.args[0] !== "number")
                return
            this.pptState.slide = message.args[0]
            this.emit("log", "info", `PowerPoint OSCPoint: [${this.args.prefix}]: received state: ` +
                `slide="${this.pptState.slide}"`)
        })
        this.oscR.on("/oscpoint/presentation/slides/count/visible", (message: OSC.Message) => {
            if (typeof message.args[0] !== "number")
                return
            this.pptState.slides = message.args[0]
            this.emit("log", "info", `PowerPoint OSCPoint: [${this.args.prefix}]: received state: ` +
                `slides="${this.pptState.slides}"`)
        })
        this.oscR.on("/oscpoint/slideshow/builds/position", (message: OSC.Message) => {
            if (typeof message.args[0] !== "number")
                return
            this.pptState.build = message.args[0]
            this.emit("log", "info", `PowerPoint OSCPoint: [${this.args.prefix}]: received state: ` +
                `build="${this.pptState.build}"`)
        })
        this.oscR.on("/oscpoint/slideshow/builds/count", (message: OSC.Message) => {
            if (typeof message.args[0] !== "number")
                return
            this.pptState.builds = message.args[0]
            this.emit("log", "info", `PowerPoint OSCPoint: [${this.args.prefix}]: received state: ` +
                `builds="${this.pptState.builds}"`)
        })
        this.oscR.on("/oscpoint/v2/event", (message: OSC.Message) => {
            if (typeof message.args[0] !== "string")
                return
            const event = message.args[0]
            if (event === "slideshow_begin" || event === "slideshow_end")
                this.send("/oscpoint/feedbacks/refresh")
        })
        /*
        this.oscR.on("*", (message: OSC.Message) => {
            this.emit("log", "info", `PowerPoint OSCPoint: [${this.args.prefix}]: message: ` +
                `message="${JSON.stringify(message)}"`)
        })
        */
        const url2 = new URL(this.args["listen"])
        this.oscR.open({
            host: url2.hostname,
            port: url2.port
        })
        this.send("/oscpoint/feedbacks/refresh")
    }

    /*  disconnect from PowerPoint OSCPoint  */
    async disconnect () {
        this.emit("log", "info", `PowerPoint OSCPoint: [${this.args.prefix}]: ` +
            `disconnecting from UDP/OSC: ${this.args["connect"]}`)
        this.oscR?.close()
        this.oscS?.close()
    }

    /*  INTERNAL: send an OSC message  */
    private send (message: string | string[], ...args: Array<ConstructorParameters<typeof OSC.Message>[1]>) {
        if (!this.oscS)
            throw new Error("still not connected")
        const url = new URL(this.args["connect"])
        this.emit("log", "info", `PowerPoint OSCPoint: [${this.args.prefix}]: sending OSC command: ` +
            `"${message}" [${args.join(", ")}]`)
        const msg = args.length > 0 ?
            new OSC.Message(message, ...args) :
            new OSC.Message(message)
        this.oscS.send(msg, {
            host: url.hostname,
            port: url.port
        })
    }

    /*  INTERNAL: wait until a state is reached  */
    private awaitState (state: string, predicate: () => boolean, timeout = 4000) {
        return new Promise<boolean>((resolve, reject) => {
            let timer1: ReturnType<typeof setTimeout>  | null = null
            let timer2: ReturnType<typeof setInterval> | null = null
            const cleanup = () => {
                if (timer1 !== null) {
                    clearTimeout(timer1)
                    timer1 = null
                }
                if (timer2 !== null) {
                    clearInterval(timer2)
                    timer2 = null
                }
            }
            timer1 = setTimeout(() => {
                cleanup()
                this.emit("log", "warning", `PowerPoint OSCPoint: [${this.args.prefix}]: ` +
                    `timeout after ${timeout}ms awaiting ${state}`)
                resolve(false)
            }, timeout)
            timer2 = setInterval(() => {
                if (predicate()) {
                    cleanup()
                    resolve(true)
                }
            }, 50)
        })
    }

    /*  INTERNAL: process commands in forward direction  */
    private processForwardCommands (state: RundownState) {
        let m: RegExpMatchArray | null
        for (let i = this.active + 1; i <= state.active; i++) {
            for (const key of Object.keys(state.kv[i])) {
                if ((m = key.match(/^([^:]+):(.+)$/)) !== null) {
                    const [ , prefix, name ] = m
                    const value = state.kv[i][key]
                    if (prefix === this.args.prefix)
                        this.executeCommand(name, value, false)
                }
            }
        }
    }

    /*  INTERNAL: process commands in backward direction  */
    private processBackwardCommands (state: RundownState) {
        let m: RegExpMatchArray | null
        for (let i = this.active - 1; i >= state.active; i--) {
            for (const key of Object.keys(state.kv[i]).reverse()) {
                if ((m = key.match(/^([^:]+):(.+)$/)) !== null) {
                    const [ , prefix, name ] = m
                    const value = state.kv[i][key]
                    if (prefix === this.args.prefix)
                        this.executeCommand(name, value, true)
                }
            }
        }
    }

    /*  INTERNAL: execute a single command  */
    private executeCommand (name: string, value: string | number | boolean, reverse: boolean) {
        const names = Object.keys(this.commands) as Array<keyof typeof this.commands>
        if (!names.find((_) => _ === name)) {
            this.emit("log", "warning", `PowerPoint OSCPoint: [${this.args.prefix}]: ` +
                `invalid command "${name}"`)
            return
        }
        let command = this.commands[name]
        let commandName = name
        if (reverse && command.reverse !== "") {
            commandName = command.reverse
            command = this.commands[commandName]
        }
        this.emit("log", "info", `PowerPoint OSCPoint: [${this.args.prefix}]: ` +
            `execute command "${commandName}"`)
        this.commandQueue = this.commandQueue
            .then(() => command.action(value))
            .catch((err) => {
                const message = err instanceof Error ? err.message : String(err)
                this.emit("log", "error", `PowerPoint OSCPoint: [${this.args.prefix}]: ` +
                    `command "${commandName}" failed: ${message}`)
            })
    }

    /*  reflect current Rundown state  */
    async reflect (state: RundownState) {
        if (state.id !== this.id) {
            this.id = state.id
            this.active = 0
        }
        if (state.active !== this.active) {
            if (state.active > this.active)
                this.processForwardCommands(state)
            else if (state.active < this.active)
                this.processBackwardCommands(state)
            this.active = state.active
        }
    }
}
