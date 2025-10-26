/*
**  Rundown - Render Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import { EventEmitter } from "node:events"
import OSC              from "osc-js"

/*  import internal dependencies  */
import { type RundownState, type RundownMode } from "./rundown-state"
import { RundownPlugin }                       from "./rundown-plugin"

/*  internal coordinates for pressing a button  */
type Coord = {
    page:   string
    row:    string
    column: string
}

/*  the Rundown bridge to Bitfocus Companion  */
export class RundownPluginBFC extends EventEmitter implements RundownPlugin {
    /*  internal state  */
    private id                                = ""
    private active                            = -1
    private osc: OSC | undefined              = undefined
    private mode: RundownMode                 = { locked: false, debug: false }
    private args: { [ key: string ]: string } = {}
    private aliases                           = new Map<string, Array<Coord>>()
    private lastState: RundownState | null    = null

    /*  configure plugin  */
    configure (args: { [ key: string ]: string }) {
        if (!( typeof args["prefix"] === "string"
            && typeof args["connect"] === "string"))
            throw new Error("invalid arguments")
        this.args = { ...this.args, ...args }

        /*  parse optional aliases  */
        if (typeof args["alias"] === "string") {
            const aliasEntries = args["alias"].split(/\s*;\s*/)
            for (const entry of aliasEntries) {
                const m = entry.match(/^([^:]+):(.+)$/)
                if (m) {
                    const [ , alias, coords ] = m
                    const coordList = coords.split(/\s*\+\s*/)
                    const coordListParsed = coordList.map((coord) => this.parseCoord(coord))
                    this.aliases.set(alias, coordListParsed)
                }
            }
        }
    }

    /*  parse coordinates  */
    private parseCoord = (coord: string): Coord => {
        const m = coord.match(/^(\d+)\/(\d+)\/(\d+)$/)
        if (m === null)
            throw new Error(`invalid coordinates: ${coord}`)
        const [ , page, row, column ] = m
        return { page, row, column }
    }

    /*  connect to Bitfocus Companion  */
    async connect () {
        this.emit("log", "info", `Bitfocus Companion: [${this.args.prefix}]: ` +
            `connecting to UDP/OSC: ${this.args["connect"]}`)
        this.osc = new OSC({ plugin: new OSC.DatagramPlugin({ type: "udp4" }) })
    }

    /*  disconnect from Bitfocus Companion  */
    async disconnect () {
        this.emit("log", "info", `Bitfocus Companion: [${this.args.prefix}]: ` +
            `disconnecting from UDP/OSC: ${this.args["connect"]}`)
        this.osc?.close()
    }

    /*  INTERNAL: send an OSC message  */
    private send (
        message: string | string[],
        ...args: Array<ConstructorParameters<typeof OSC.Message>[1]>
    ) {
        if (!this.osc)
            throw new Error("still not connected")
        const url = new URL(this.args["connect"])
        this.emit("log", "info", `Bitfocus Companion: [${this.args.prefix}]: sending OSC command: ` +
            `"${message}" [${args.join(", ")}]`)
        const msg = args.length > 0 ?
            new OSC.Message(message, ...args) :
            new OSC.Message(message)
        this.osc.send(msg, {
            host: url.hostname,
            port: url.port
        })
    }

    /*  INTERNAL: execute a single command  */
    private async executeCommand (name: string, value: string | number | boolean, reverse: boolean) {
        let coords: Array<Coord> = []

        /*  dispatch according to command  */
        if (name === "press") {
            /*  directly press button with page/row/column coordinates  */
            if (typeof value !== "string") {
                this.emit("log", "error", `Bitfocus Companion: [${this.args.prefix}]: ` +
                    `press command requires string value, got: ${typeof value}`)
                return
            }
            try {
                const coord = this.parseCoord(value)
                coords = [ coord ]
            }
            catch (err) {
                this.emit("log", "error", `Bitfocus Companion: [${this.args.prefix}]: ` +
                    `invalid button coordinates: "${value}"`)
                return
            }
        }
        else {
            /*  indirectly press button(s) through aliased coordinates  */
            const aliasCoords = this.aliases.get(name)
            if (aliasCoords === undefined) {
                this.emit("log", "error", `Bitfocus Companion: [${this.args.prefix}]: ` +
                    `unknown alias: "${name}"`)
                return
            }
            coords = aliasCoords
        }

        /*  send OSC message(s) to press button(s)  */
        for (const coord of coords) {
            /*  send OSC press command to Bitfocus Companion  */
            this.emit("log", "info", `Bitfocus Companion: [${this.args.prefix}]: ` +
                `press button: page=${coord.page} row=${coord.row} column=${coord.column}`)
            this.send(`/location/${coord.page}/${coord.row}/${coord.column}/press`)

            /*  give Bitfocus Companion some time to operate between button presses  */
            await new Promise((resolve, _reject) => setTimeout(resolve, 50))
        }
    }

    /*  INTERNAL: process commands in forward direction  */
    private processForwardCommands (state: RundownState) {
        let m: RegExpMatchArray | null
        for (let i = this.active + 1; i <= state.active && i < state.kv.length; i++) {
            if (!state.kv[i])
                continue
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
        for (let i = this.active - 1; i >= state.active && i >= 0; i--) {
            if (!state.kv[i] || i >= state.kv.length)
                continue
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

    /*  reflect current Rundown state  */
    async reflectState (state: RundownState) {
        if (state.id !== this.id) {
            this.id = state.id
            this.active = -1
        }
        this.lastState = state
        if (this.mode.locked && state.active !== this.active) {
            if (state.active > this.active)
                this.processForwardCommands(state)
            else if (state.active < this.active)
                this.processBackwardCommands(state)
            this.active = state.active
        }
    }

    /*  reflect current Rundown mode  */
    async reflectMode (data: RundownMode) {
        let changed = false
        if (this.mode.locked !== data.locked) {
            this.mode.locked = data.locked
            changed = true
            if (data.locked && this.lastState !== null)
                this.reflectState(this.lastState)
        }
        if (this.mode.debug !== data.debug) {
            this.mode.debug  = data.debug
            changed = true
        }
        if (changed)
            this.emit("mode-changed")
    }
}
