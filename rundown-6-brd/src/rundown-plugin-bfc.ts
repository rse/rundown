/*
**  Rundown - Render Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import OSC from "osc-js"

/*  import internal dependencies  */
import { RundownPlugin, RundownPluginBase } from "./rundown-plugin"

/*  internal coordinates for pressing a button  */
type Coord = {
    page:   string
    row:    string
    column: string
}

/*  the Rundown bridge to Bitfocus Companion  */
export class RundownPluginBFC extends RundownPluginBase implements RundownPlugin {
    /*  internal state  */
    private osc: OSC | undefined = undefined
    private aliases              = new Map<string, Array<Coord>>()
    private commandQueue         = Promise.resolve()

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

    /*  INTERNAL: parse coordinates  */
    private parseCoord (coord: string): Coord {
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

    /*  INTERNAL: enqueue a single command for strictly sequential execution  */
    protected executeCommand (name: string, value: string | number | boolean, reverse: boolean) {
        this.commandQueue = this.commandQueue
            .then(() => this.executeCommandNow(name, value, reverse))
            .catch((err) => {
                const message = err instanceof Error ? err.message : String(err)
                this.emit("log", "error", `Bitfocus Companion: [${this.args.prefix}]: ` +
                    `command "${name}" failed: ${message}`)
            })
    }

    /*  INTERNAL: execute a single command  */
    private async executeCommandNow (name: string, value: string | number | boolean, reverse: boolean) {
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
}
