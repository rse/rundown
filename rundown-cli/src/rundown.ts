/*
**  Rundown - Generate Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  external dependencies  */
import fs                          from "node:fs"
import CLIio                       from "cli-io"
import yargs                       from "yargs"
import chokidar                    from "chokidar"
import tmp                         from "tmp"
import * as HAPI                   from "@hapi/hapi"
import Inert                       from "@hapi/inert"
import HAPIWebSocket               from "hapi-plugin-websocket"
import HAPITraffic                 from "hapi-plugin-traffic"
import Rundown                     from "rundown-lib"

/*  internal dependencies  */
// @ts-ignore
import pkgJSON                     from "../package.json?raw" with { type: "json" }

/*  internal Websocket information  */
type wsPeerCtx  = { id: string }
type wsPeerInfo = { ctx: wsPeerCtx, ws: WebSocket }

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
            "[-e|--extract <css-selector-chain>] " +
            "[-o|--output <output-file>|-] " +
            "<input-file>|-"
        )
        .help("h").alias("h", "help").default("h", false)
            .describe("h", "show usage help")
        .boolean("V").alias("V", "version").default("V", false)
            .describe("V", "show program version information")
        .string("v").nargs("v", 1).alias("v", "log-level").default("v", "warning")
            .describe("v", "level for verbose logging ('none', 'error', 'warning', 'info', 'debug')")
        .string("e").nargs("e", 1).alias("e", "extract").default("e", "table:has(tr:first-child:has(*:contains('Control/Video'))) tr:gt(0) td:nth-last-child(-n+2)")
            .describe("e", "input extraction via CSS selector chain")
        .string("o").nargs("o", 1).alias("o", "output").default("o", "-")
            .describe("o", "output file")
        .string("a").nargs("a", 1).alias("a", "http-addr").default("a", "0.0.0.0")
            .describe("a", "HTTP/Websocket listen IP address")
        .number("p").nargs("p", 1).alias("p", "http-port").default("p", 8888)
            .describe("p", "HTTP/Websocket listen TCP port")
        .version(false)
        .strict()
        .showHelpOnFail(true)
        .demand(0)
        .parse(process.argv.slice(2))

    /*  short-circuit version request  */
    if (args.version) {
        const pkg = JSON.parse(pkgJSON)
        process.stderr.write(`${pkg.name} ${pkg.version} <${pkg.homepage}>\n`)
        process.stderr.write(`${pkg.description}\n`)
        process.stderr.write(`Copyright (c) 2023-2025 ${pkg.author.name} <${pkg.author.url}>\n`)
        process.stderr.write(`Licensed under ${pkg.license} <http://spdx.org/licenses/${pkg.license}.html>\n`)
        process.exit(0)
    }

    /*  establish CLI environment  */
    const cli = new CLIio({
        encoding:  "utf8",
        logLevel:  args.logLevel,
        logTime:   false,
        logPrefix: "rundown"
    })

    /*  sanity check situation  */
    if (args._.length !== 1)
        throw new Error("missing input file or directory")
    const inputPath = args._[0] as string

    /*  helper function for converting a single file  */
    const convertDocument = async (inputFile: string, outputFile: string) => {
        /*  read input file  */
        cli.log("info", `reading input "${inputFile}"`)
        const input = await cli.input(inputFile, { encoding: null })

        /*  convert DOCX to HTML  */
        const rundown = new Rundown()
        rundown.on("warning", (message: string) => {
            cli.log("warning", message)
        })
        rundown.on("error", (message: string) => {
            cli.log("error", message)
        })
        const output = await rundown.convert(input, args.extract!)

        /*  write output  */
        cli.log("info", `writing output "${outputFile}"`)
        await cli.output(outputFile, output)
    }

    /*  determine run-time mode  */
    const stats = await fs.promises.stat(inputPath).catch((err: Error) => {
        throw new Error(`input file or directory not exists: ${err}`)
    })
    if (stats.isDirectory()) {
        /*  ==== MODE 1: directory watch mode ====  */

        /*  establish REST/WebSocket service  */
        cli.log("info", `starting HTTP/Websocket service under ${args.httpAddr}:${args.httpPort}`)
        const server = new HAPI.Server({
            address: args.httpAddr,
            port:    args.httpPort
        })
        await server.register({ plugin: Inert })
        await server.register({ plugin: HAPITraffic })
        await server.register({ plugin: HAPIWebSocket })

        /*  hook into network service for logging  */
        server.events.on("response", (request: HAPI.Request) => {
            const traffic = request.traffic()
            let protocol = `HTTP/${request.raw.req.httpVersion}`
            const ws = request.websocket()
            if (ws.mode === "websocket") {
                const wsVersion = (ws.ws as any).protocolVersion ??
                    request.headers["sec-websocket-version"] ?? "13?"
                protocol = `WebSocket/${wsVersion}+${protocol}`
            }
            const msg =
                "remote="   + request.info.remoteAddress + ", " +
                "method="   + request.method.toUpperCase() + ", " +
                "url="      + request.url.pathname + ", " +
                "protocol=" + protocol + ", " +
                "response=" + ("statusCode" in request.response ? request.response.statusCode : "<unknown>") + ", " +
                "recv="     + traffic.recvPayload + "/" + traffic.recvRaw + ", " +
                "sent="     + traffic.sentPayload + "/" + traffic.sentRaw + ", " +
                "duration=" + traffic.timeDuration
            cli.log("info", `HAPI: HTTP: request: ${msg}`)
        })
        server.events.on({ name: "request", channels: [ "error" ] }, (request: HAPI.Request, event: HAPI.RequestEvent, tags: { [key: string]: true }) => {
            if (event.error instanceof Error)
                cli.log("error", `HAPI: HTTP: request-error: ${event.error.message}`)
            else
                cli.log("error", `HAPI: HTTP: request-error: ${event.error}`)
        })
        server.events.on("log", (event: HAPI.LogEvent, tags: { [key: string]: true }) => {
            if (tags.error) {
                const err = event.error
                if (err instanceof Error)
                    cli.log("info", `HAPI: log: ${err.message}`)
                else
                    cli.log("info", `HAPI: log: ${err}`)
            }
        })

        /*  serve WebSocket connections  */
        const wsPeers = new Map<string, wsPeerInfo>()
        server.route({
            method: "POST",
            path:   "/events",
            options: {
                plugins: {
                    websocket: {
                        only: true,
                        autoping: 30 * 1000,

                        /*  on WebSocket connection open  */
                        connect: (args: any) => {
                            const ctx: wsPeerCtx            = args.ctx
                            const ws:  WebSocket            = args.ws
                            const id = `${args.req.socket.remoteAddress}:${args.req.socket.remotePort}`
                            ctx.id = id
                            wsPeers.set(id, { ctx, ws })
                            cli.log("info", `HAPI: WebSocket: connect: remote=${id}`)
                        },

                        /*  on WebSocket connection close  */
                        disconnect: (args: any) => {
                            const ctx: wsPeerCtx = args.ctx
                            const id = ctx.id
                            wsPeers.delete(id)
                            cli.log("info", `HAPI: WebSocket: disconnect: remote=${id}`)
                        }
                    }
                }
            },
            handler: (request: HAPI.Request, h: HAPI.ResponseToolkit) => {
                return h.response().code(204)
            }
        })

        /*  notify connected client  */
        const notifyClient = (event: string) => {
            const msg = JSON.stringify({ event })
            for (const [ id, info ] of wsPeers.entries()) {
                cli.log("info", `WebSocket: notify client: peer="${id}" msg=${msg}`)
                info.ws.send(msg)
            }
        }

        /*  internal state  */
        const files = new Map<string, fs.Stats>()
        let convertedFile = ""
        let convertedTime = 0
        const tmpfile = tmp.tmpNameSync({ prefix: "rundown-", postfix: ".html" })
        tmp.setGracefulCleanup()

        /*  update result delivery  */
        const updateDelivery = async () => {
            const filesSorted = Array.from(files.keys()).sort((a, b) => {
                const statA = files.get(a) as fs.Stats
                const statB = files.get(b) as fs.Stats
                return (statB.mtime as Date).getTime() - (statA.mtime as Date).getTime()
            })
            const modifiedFile = filesSorted[0]
            const modifiedTime = (files.get(modifiedFile)!.mtime as Date).getTime()
            if (modifiedFile !== convertedFile || modifiedTime > convertedTime) {
                convertedFile = modifiedFile
                convertedTime = modifiedTime
                await convertDocument(modifiedFile, tmpfile)
                notifyClient("RELOAD")
            }
        }

        /*  serve HTML content  */
        server.route({
            method: "GET",
            path: "/",
            options: {
                auth: false
            },
            handler: async (req: HAPI.Request, h: HAPI.ResponseToolkit) => {
                return h.file(tmpfile, { confine: false })
            }
        })

        /*  watch for directory changes  */
        const watcher = chokidar.watch(inputPath, {
            persistent: true,
            awaitWriteFinish: true,
            atomic: true,
            ignored: (file: string, stat?: fs.Stats) => {
                if (file.match(/(?:^~\$|\/~\$)/) !== null)
                    return true
                if (stat && !stat.isDirectory() && file.match(/\.docx$/) === null)
                    return true
                return false
            },
            interval: 300,
            binaryInterval: 300
        })
        watcher.on("add", (path: string, stats?: fs.Stats) => {
            files.set(path, stats!)
            updateDelivery()
        })
        watcher.on("change", (path: string, stats?: fs.Stats) => {
            files.set(path, stats!)
            updateDelivery()
        })
        watcher.on("unlink", (path: string) => {
            files.delete(path)
            updateDelivery()
        })

        /*  start REST/Websocket service  */
        await server.start()
        cli.log("info", `connect your browser to the URL: http://${args.httpAddr}:${args.httpPort}/#live`)

        /*  await graceful shutdown  */
        const shutdown = async (signal: string) => {
            cli.log("warning", `received signal ${signal} -- shutting down service`)
            await server.stop()
            process.exit(1)
        }
        process.on("SIGINT", () => {
            shutdown("SIGINT")
        })
        process.on("SIGTERM", () => {
            shutdown("SIGTERM")
        })
    }
    else {
        /*  ==== MODE 2: file single-shot mode ====  */

        await convertDocument(inputPath, args.output!)
        process.exit(0)
    }
})().catch((err) => {
    /*  catch fatal run-time errors  */
    process.stderr.write(`rundown: ERROR: ${err}\n`)
    process.exit(1)
})

