/*
**  Rundown - Render Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  external dependencies  */
import fs                          from "node:fs"
import streamConsumers             from "node:stream/consumers"
import CLIio                       from "cli-io"
import yargs                       from "yargs"
import chokidar                    from "chokidar"
import tmp                         from "tmp"
import * as HAPI                   from "@hapi/hapi"
import Boom                        from "@hapi/boom"
import Inert                       from "@hapi/inert"
import HAPIWebSocket               from "hapi-plugin-websocket"
import HAPITraffic                 from "hapi-plugin-traffic"
import yauzl                       from "yauzl"
import mimeTypes                   from "mime-types"
import * as arktype                from "arktype"
import objectHash                  from "object-hash"

/*  internal dependencies  */
import Rundown                     from "../../rundown-3-lib"
import RundownWeb                  from "../../rundown-4-web/dst-stage2/rundown.zip?arraybuffer"

/*  internal dependencies (special case)  */
// @ts-ignore
import pkgJSON                     from "../../package.json?raw" with { type: "json" }

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
            "[-a|--http-addr <ip-address>] " +
            "[-p|--http-port <tcp-port>] " +
            "[-m|--mode cmd|web|web-ui] " +
            "[<input-file>|-|<input-directory>]"
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
        .string("m").alias("m", "mode").default("m", "cmd")
            .describe("m", "mode of operation (\"cmd\", \"web\", or \"web-ui\")")
        .version(false)
        .strict()
        .showHelpOnFail(true)
        .demand(0)
        .parse(process.argv.slice(2))

    /*  short-circuit version request  */
    if (args.version) {
        const pkg = JSON.parse(pkgJSON)
        process.stderr.write(`Rundown ${pkg.version} <${pkg.homepage}>\n`)
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

    /*  helper function for displaying package information  */
    const displayPackageInfo = () => {
        const pkg = JSON.parse(pkgJSON)
        cli.log("info", `Rundown ${pkg.version} <${pkg.homepage}>\n`)
        cli.log("info", `Copyright (c) 2023-2025 ${pkg.author.name} <${pkg.author.url}>\n`)
        cli.log("info", `Licensed under ${pkg.license} <http://spdx.org/licenses/${pkg.license}.html>\n`)
    }

    /*  helper function for converting a single file  */
    const convertDocument = async (inputFile: string, outputFile: string) => {
        /*  read input file  */
        cli.log("info", `reading input "${inputFile}"`)
        let input: Buffer
        if (inputFile === "-")
            input = await streamConsumers.buffer(process.stdin)
        else
            input = await fs.promises.readFile(inputFile, { encoding: null })

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
        if (outputFile === "-") {
            await new Promise<void>((resolve, reject) => {
                process.stdout.write(output, (err) => {
                    if (err) reject(err)
                    else     resolve()
                })
            })
        }
        else {
            await fs.promises.writeFile(outputFile, output, {
                encoding: null, mode: 0o666, flag: "w"
            })
        }
    }

    /*  establish REST/WebSocket service  */
    const establishServer = async (addr: string, port: number) => {
        cli.log("info", `starting HTTP/Websocket service under ${addr}:${port}`)
        const server = new HAPI.Server({ address: addr, port })
        await server.register({ plugin: Inert })
        await server.register({ plugin: HAPITraffic })

        /*  hook into network service for logging  */
        server.events.on("response", (request: HAPI.Request) => {
            const traffic = request.traffic()
            let protocol = `HTTP/${request.raw.req.httpVersion}`
            if (typeof request.websocket === "function") {
                const ws = request.websocket()
                if (ws.mode === "websocket") {
                    const wsVersion = (ws.ws as any).protocolVersion ??
                        request.headers["sec-websocket-version"] ?? "13?"
                    protocol = `WebSocket/${wsVersion}+${protocol}`
                }
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
        return server
    }

    /*  gracefully shutdown process and REST/WebSocket service  */
    const onShutdownServer = (server: HAPI.Server) => {
        /*  await graceful shutdown  */
        let shuttingDown = false
        const shutdown = async (signal: string) => {
            if (shuttingDown)
                return
            shuttingDown = true
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

        /*  handle uncaught exceptions  */
        process.on("uncaughtException", async (err: Error) => {
            cli.log("warning", `process crashed with a fatal error: ${err} ${err.stack}`)
            process.exit(1)
        })

        /*  handle unhandled promise rejections  */
        process.on("unhandledRejection", async (reason, promise) => {
            if (reason instanceof Error)
                cli.log("error", `promise rejection not handled: ${reason.message}: ${reason.stack}`)
            else
                cli.log("error", `promise rejection not handled: ${reason}`)
            process.exit(1)
        })
    }

    /*  determine run-time mode  */
    if (args.mode === "cmd") {
        /*  ==== MODE 1: command-line, file one-shot conversion ====  */

        /*  sanity check CLI arguments  */
        if (args._.length !== 1)
            throw new Error("missing input file")
        const inputPath = args._[0] as string
        if (inputPath !== "-") {
            const stats = await fs.promises.stat(inputPath).catch(() => {
                throw new Error(`input path not found: ${inputPath}`)
            })
            if (stats.isDirectory())
                throw new Error(`input path is a directory: ${inputPath}`)
        }

        /*  one-shot conversion  */
        await convertDocument(inputPath, args.output!)

        /*  die gracefully  */
        process.exit(0)
    }
    else if (args.mode === "web") {
        /*  ==== MODE 2: web interface, directory watch based conversion ====  */

        /*  sanity check CLI arguments  */
        if (args._.length !== 1)
            throw new Error("missing input file or directory")
        const inputPath = args._[0] as string
        if (inputPath === "-")
            throw new Error("web operation mode does not support stdin as input")
        await fs.promises.stat(inputPath).catch(() => {
            throw new Error(`input path not found: ${inputPath}`)
        })

        /*  show program information  */
        displayPackageInfo()

        /*  establish REST/WebSocket service  */
        const server = await establishServer(args.httpAddr!, args.httpPort!)

        /*  add Websocket support  */
        await server.register({ plugin: HAPIWebSocket })

        /*  serve WebSocket connections  */
        const wsPeers = new Map<string, wsPeerInfo>()
        const wsLastMsg = new Map<string, string>()
        server.route({
            method: "POST",
            path:   "/events",
            options: {
                plugins: {
                    websocket: {
                        only: true,
                        autoping: 30 * 1000,

                        /*  on WebSocket connection open  */
                        connect: (wsArgs: Record<string, any>) => {
                            const ctx: wsPeerCtx = wsArgs.ctx
                            const ws:  WebSocket = wsArgs.ws
                            const id = `${wsArgs.req.socket.remoteAddress}:${wsArgs.req.socket.remotePort}`
                            ctx.id = id
                            wsPeers.set(id, { ctx, ws })
                            cli.log("info", `HAPI: WebSocket: connect: remote=${id}`)
                        },

                        /*  on WebSocket connection close  */
                        disconnect: (wsArgs: Record<string, any>) => {
                            const ctx: wsPeerCtx = wsArgs.ctx
                            const id = ctx.id
                            wsPeers.delete(id)
                            cli.log("info", `HAPI: WebSocket: disconnect: remote=${id}`)
                        }
                    }
                }
            },
            handler: (request: HAPI.Request, h: HAPI.ResponseToolkit) => {
                /*  on WebSocket message transfer  */
                const { ctx, ws } = request.websocket()

                const payloadValidator = arktype.type({
                    event:   "string",
                    "data?": "unknown"
                })
                const payload = payloadValidator(request.payload)
                if (payload instanceof arktype.type.errors)
                    return Boom.badRequest(`invalid request: ${payload.summary}`)

                /*  emit message to all other clients  */
                const wsSend = (type: string, msg: string) => {
                    wsLastMsg.set(type, msg)
                    for (const [ id, info ] of wsPeers.entries()) {
                        if (ctx.id !== id) {
                            cli.log("info", `WebSocket: notify ${type} change: peer="${id}" msg=${msg}`)
                            info.ws.send(msg)
                        }
                    }
                }

                if (payload.event === "SUBSCRIBE") {
                    /*  send out last state messages  */
                    for (const msg of wsLastMsg.values())
                        ws.send(msg)
                }
                else if (payload.event === "STATE" && typeof payload.data === "object") {
                    /*  validate request  */
                    const dataValidator = arktype.type({
                        active: "number",
                        kv: arktype.type({
                            "[ string ]": "string | number | boolean"
                        }).array()
                    })
                    const data = dataValidator(payload.data)
                    if (data instanceof arktype.type.errors)
                        return Boom.badRequest(`invalid request: ${data.summary}`)

                    /*  construct message to be emitted  */
                    const msg = JSON.stringify({
                        event: "STATE",
                        data: {
                            id:     objectHash(data.kv),
                            active: data.active,
                            kv:     data.kv
                        }
                    })

                    /*  emit message to all other clients  */
                    wsSend("STATE", msg)
                }
                else if (payload.event === "MODE" && typeof payload.data === "object") {
                    /*  validate request  */
                    const dataValidator = arktype.type({
                        locked: "boolean",
                        debug:  "boolean"
                    })
                    const data = dataValidator(payload.data)
                    if (data instanceof arktype.type.errors)
                        return Boom.badRequest(`invalid request: ${data.summary}`)

                    /*  construct message to be emitted  */
                    const msg = JSON.stringify({ event: "MODE", data })

                    /*  emit message to all other clients  */
                    wsSend("MODE", msg)
                }
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
        const updateDeliveryOnce = async () => {
            const clonedFiles = new Map(files)
            if (clonedFiles.size === 0)
                return
            const filesSorted = Array.from(clonedFiles.keys()).sort((a, b) => {
                const statA = clonedFiles.get(a) as fs.Stats
                const statB = clonedFiles.get(b) as fs.Stats
                return (statB.mtime as Date).getTime() - (statA.mtime as Date).getTime()
            })
            const modifiedFile = filesSorted[0]
            const modifiedTime = (clonedFiles.get(modifiedFile)!.mtime as Date).getTime()
            if (modifiedFile !== convertedFile || modifiedTime > convertedTime) {
                await convertDocument(modifiedFile, tmpfile)
                convertedFile = modifiedFile
                convertedTime = modifiedTime
                notifyClient("RELOAD")
            }
        }
        let updateDeliveryTimer: ReturnType<typeof setTimeout> | null = null
        const updateDelivery = () => {
            if (updateDeliveryTimer !== null)
                clearTimeout(updateDeliveryTimer)
            updateDeliveryTimer = setTimeout(() => {
                updateDeliveryTimer = null
                updateDeliveryOnce().catch((err) => {
                    const reason = err instanceof Error ? err.message : String(err)
                    cli.log("error", `failed to convert and refresh Rundown document: ${reason}`)
                })
            }, 500)
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
            awaitWriteFinish: {
                stabilityThreshold: 2000,
                pollInterval: 300
            },
            atomic: 2000,
            alwaysStat: true,
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
        const unlinkTimers = new Map<string, ReturnType<typeof setTimeout>>()
        watcher.on("add", (path: string, stats?: fs.Stats) => {
            if (stats === undefined)
                return
            if (unlinkTimers.has(path)) {
                clearTimeout(unlinkTimers.get(path))
                unlinkTimers.delete(path)
            }
            files.set(path, stats)
            updateDelivery()
        })
        watcher.on("change", (path: string, stats?: fs.Stats) => {
            if (stats === undefined)
                return
            if (unlinkTimers.has(path)) {
                clearTimeout(unlinkTimers.get(path))
                unlinkTimers.delete(path)
            }
            files.set(path, stats)
            updateDelivery()
        })
        watcher.on("unlink", (path: string) => {
            if (unlinkTimers.has(path)) {
                clearTimeout(unlinkTimers.get(path))
                unlinkTimers.delete(path)
            }
            unlinkTimers.set(path, setTimeout(() => {
                files.delete(path)
                updateDelivery()
            }, 2000))
        })

        /*  start REST/Websocket service  */
        await server.start()
        cli.log("info", `connect your browser to the URL: http://${args.httpAddr}:${args.httpPort}/#live`)
        onShutdownServer(server)
    }
    else if (args.mode === "web-ui") {
        /*  ==== MODE 3: web interface, interactive conversion ====  */

        /*  sanity check CLI arguments  */
        if (args._.length !== 0)
            throw new Error("too many arguments")

        /*  show program information  */
        displayPackageInfo()

        /*  establish REST/WebSocket service  */
        const server = await establishServer(args.httpAddr!, args.httpPort!)

        /*  parse the entire ZIP file  */
        cli.log("info", "loading Rundown Web into memory")
        const data = new Map<string, { type: string, content: Buffer }>()
        await new Promise<void>((resolve, reject) => {
            yauzl.fromBuffer(Buffer.from(RundownWeb), { lazyEntries: true }, (err, zipfile) => {
                if (err)
                    reject(err)
                else {
                    zipfile.on("error", (err) => {
                        reject(err)
                    })
                    zipfile.on("end", () => {
                        resolve()
                    })
                    zipfile.on("entry", async (entry) => {
                        zipfile.openReadStream(entry, async (err, readStream) => {
                            if (err) {
                                reject(err)
                                return
                            }
                            if (!readStream) {
                                reject(new Error(`failed to open ZIP entry stream for "${entry.fileName}"`))
                                return
                            }
                            try {
                                const type    = mimeTypes.lookup(entry.fileName) || "application/octet-stream"
                                const content = await streamConsumers.buffer(readStream)
                                data.set(entry.fileName, { type, content })
                                cli.log("info", `loaded Rundown Web file: "${entry.fileName}" (${type})`)
                                zipfile.readEntry()
                            }
                            catch (err) {
                                reject(err instanceof Error ? err : new Error(String(err)))
                            }
                        })
                    })
                    zipfile.readEntry()
                }
            })
        })

        /*  serve HTML content  */
        server.route({
            method: "GET",
            path: "/{filename*}",
            handler: async (req: HAPI.Request, h: HAPI.ResponseToolkit) => {
                /*  determine path  */
                let filename = req.params.filename
                if (filename === "")
                    filename = "index.html"

                /*  lookup data entry  */
                const entry = data.get(filename)
                if (entry === undefined)
                    return Boom.notFound(`no such file: ${filename}`)

                /*  send data entry as response  */
                return h.response(entry.content).type(entry.type)
            }
        })

        /*  start Web service  */
        await server.start()
        cli.log("info", `connect your browser to the URL: http://${args.httpAddr}:${args.httpPort}/`)
        onShutdownServer(server)
    }
    else
        throw new Error(`invalid operation mode: ${args.mode}`)
})().catch((err) => {
    /*  catch fatal run-time errors  */
    process.stderr.write(`rundown: ERROR: ${err}\n`)
    process.exit(1)
})

