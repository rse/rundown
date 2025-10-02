/*
**  Rundown - Render Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  external dependencies  */
import CLIio                       from "cli-io"
import yargs                       from "yargs"
import ReconnectingWebSocket       from "@opensumi/reconnecting-websocket"
import * as arktype                from "arktype"

/*  internal dependencies  */
// @ts-ignore
import pkgJSON                     from "../../package.json?raw" with { type: "json" }
import { RundownStateSchema, RundownModeSchema } from "./rundown-state"
import { type RundownPlugin }      from "./rundown-plugin"
import { RundownPluginPPT }        from "./rundown-plugin-ppt"

/*  establish asynchronous environment  */
;(async () => {
    /*  parse command-line arguments  */
    const args = await yargs()
        /* eslint @stylistic/indent: off */
        .usage(
            "Usage: $0 " +
            "[-h|--help] " +
            "[-V|--version] " +
            "[-v|--verbose <level>] " +
            "[-r|--rundown ws://<ip-address>:<tcp-port>] " +
            "[-p|--plugin <id>:[prefix=<prefix>,][<key>=<value>[,<key>=<value>[,...]]]]"
        )
        .help("h").alias("h", "help").default("h", false)
            .describe("h", "show usage help")
        .boolean("V").alias("V", "version").default("V", false)
            .describe("V", "show program version information")
        .string("v").nargs("v", 1).alias("v", "log-level").default("v", "warning")
            .describe("v", "level for verbose logging ('none', 'error', 'warning', 'info', 'debug')")
        .string("r").nargs("r", 1).alias("r", "rundown").default("r", "ws://127.0.0.1:8888/events")
            .describe("r", "remote HTTP/Websocket connect URL of Rundown CLI")
        .option("plugin", {
            type:    "string",
            array:   true,
            nargs:   1,
            alias:   "p",
            default: [],
            description: "use one or more bridge plugins"
        })
        .version(false)
        .strict()
        .showHelpOnFail(true)
        .demand(0)
        .parse(process.argv.slice(2))

    /*  short-circuit version request  */
    if (args.version) {
        const pkg = JSON.parse(pkgJSON)
        process.stderr.write(`Rundown Bridge ${pkg.version} <${pkg.homepage}>\n`)
        process.stderr.write(`Copyright (c) 2023-2025 ${pkg.author.name} <${pkg.author.url}>\n`)
        process.stderr.write(`Licensed under ${pkg.license} <http://spdx.org/licenses/${pkg.license}.html>\n`)
        process.exit(0)
    }

    /*  establish CLI environment  */
    const cli = new CLIio({
        encoding:  "utf8",
        logLevel:  args.logLevel,
        logTime:   true,
        logPrefix: "rundown"
    })

    /*  handle uncaught exceptions  */
    process.on("uncaughtException", async (err: Error) => {
        cli.log("error", `process crashed with a fatal error: ${err}: ${err.stack}`)
        process.exit(1)
    })
    process.on("unhandledRejection", async (reason, promise) => {
        if (reason instanceof Error)
            cli.log("error", `promise rejection not handled: ${reason.message}: ${reason.stack}`)
        else
            cli.log("error", `promise rejection not handled: ${reason}`)
        process.exit(1)
    })

    /*  log program information  */
    const pkg = JSON.parse(pkgJSON)
    cli.log("info", `starting Rundown Bridge ${pkg.version}\n`)

    /*  establish bridge plugins  */
    const plugins = {
        "ppt": { make: () => new RundownPluginPPT(), ref: [] }
    } as {
        [ key: string ]: {
            make: () => RundownPlugin,
            ref:  Array<RundownPlugin>
        }
    }
    if (args.plugin.length === 0)
        throw new Error("no bridge plugins selected")
    for (const spec of args.plugin) {
        const m1 = spec.match(/^(.+?):(.+)$/)
        if (m1 === null)
            throw new Error(`invalid plugin specification: "${spec}"`)
        const [ , id, kvs ] = m1
        if (!Object.keys(plugins).find((_) => _ === id))
            throw new Error(`invalid plugin with id "${id}"`)
        const m2 = kvs.matchAll(/\b([a-z][a-zA-Z0-9:-]+)(?:=(?:"((?:\\.|[^"])*)"|([^,]+)))?,?/g)
        if (m2 === null)
            throw new Error(`invalid plugin specification: "${spec}"`)
        const kv: { [ key: string ]: string } = { prefix: id }
        for (const m of m2) {
            const key = m[1]
            const val = m[2] ?? m[3]
            kv[key] = val
        }
        cli.log("info", `establishing plugin "${id}": ${JSON.stringify(kv)}`)
        const plugin = plugins[id as keyof typeof plugins].make()
        plugins[id as keyof typeof plugins].ref.push(plugin)
        plugin.on("log", (level, msg) => {
            cli.log(level, msg)
        })
        plugin.configure(kv)
        await plugin.connect()
    }

    /*  connect to Rundown CLI  */
    cli.log("info", `Rundown WebSocket: connecting to ${args.rundown}`)
    const ws = new ReconnectingWebSocket(args.rundown!, [], {
        reconnectionDelayGrowFactor: 1.3,
        maxReconnectionDelay:        4000,
        minReconnectionDelay:        1000,
        connectionTimeout:           4000,
        minUptime:                   5000
    })
    ws.addEventListener("error", (ev) => {
        cli.log("error", `Rundown WebSocket: error: ${ev.message}`)
    })
    ws.addEventListener("open", (ev) => {
        cli.log("info", "Rundown WebSocket: connected")
        ws.send(JSON.stringify({ event: "SUBSCRIBE" }))
    })
    ws.addEventListener("close", (ev) => {
        cli.log("info", "Rundown WebSocket: disconnected")
    })
    ws.addEventListener("message", (ev) => {
        (async () => {
            let data: any
            try {
                data = JSON.parse(ev.data)
            }
            catch (err) {
                cli.log("error", `Rundown WebSocket: invalid JSON message: ${err}`)
                return
            }
            const payloadValidator = arktype.type({ event: "string", "data": "object" })
            const payload = payloadValidator(data)
            if (payload instanceof arktype.type.errors) {
                cli.log("error", `Rundown WebSocket: invalid message: ${payload.summary}`)
                return
            }
            if (payload.event === "STATE") {
                const data = RundownStateSchema(payload.data)
                if (data instanceof arktype.type.errors) {
                    cli.log("error", `Rundown WebSocket: invalid data: ${data.summary}`)
                    return
                }
                const kv = data.kv.map((kv, i) =>
                    `${i}: <${Object.keys(kv).map((k) => `${k}=${kv[k]}`).join(" ")}>`
                ).join(", ")
                cli.log("info", `Rundown WebSocket: state change: [${data.id}]: ` +
                    `active=${data.active} kv={ ${kv} }`)
                for (const id of Object.keys(plugins))
                    for (const ref of plugins[id].ref)
                        await ref.reflectState(data)
            }
            else if (payload.event === "MODE") {
                const data = RundownModeSchema(payload.data)
                if (data instanceof arktype.type.errors) {
                    cli.log("error", `Rundown WebSocket: invalid data: ${data.summary}`)
                    return
                }
                cli.log("info", `Rundown WebSocket: mode change: locked=${data.locked} debug=${data.debug}`)
                for (const id of Object.keys(plugins))
                    for (const ref of plugins[id].ref)
                        await ref.reflectMode(data)
            }
        })()
    })

    /*  await graceful shutdown  */
    let shuttingDown = false
    const shutdown = async (signal: string) => {
        if (shuttingDown)
            return
        shuttingDown = true
        cli.log("warning", `received signal ${signal} -- shutting down service`)
        for (const id of Object.keys(plugins))
            for (const ref of plugins[id].ref)
                await ref.disconnect()
        cli.log("info", `Rundown WebSocket: disconnecting from ${args.rundown}`)
        ws.close()
        process.exit(1)
    }
    for (const signal of [ "SIGINT", "SIGTERM" ])
        process.on(signal, () => { shutdown(signal) })
})().catch((err) => {
    /*  catch fatal run-time errors  */
    process.stderr.write(`rundown: ERROR: ${err}\n`)
    process.exit(1)
})

