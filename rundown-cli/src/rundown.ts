/*
**  Rundown - Generate Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  external dependencies  */
import CLIio                       from "cli-io"
import yargs                       from "yargs"
import Rundown                     from "rundown-lib"

/*  internal dependencies  */
// @ts-ignore
import pkgJSON                     from "../package.json?raw" with { type: "json" }

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
        .string("e").nargs("e", 1).alias("e", "extract").default("e", "table:last tr:gt(0) td:nth-last-child(-n+2)")
            .describe("e", "input extraction via CSS selector chain")
        .string("o").nargs("o", 1).alias("o", "output").default("o", "-")
            .describe("o", "output file")
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

    /*  read input file  */
    if (args._.length !== 1)
        throw new Error("missing input file")
    cli.log("info", `reading input "${args._[0]}"`)
    const input = await cli.input(args._[0] as string, { encoding: null })

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
    cli.log("info", `writing output "${args.output}"`)
    await cli.output(args.output!, output)

    /*  die gracefully  */
    process.exit(0)
})().catch((err) => {
    /*  catch fatal run-time errors  */
    process.stderr.write(`rundown: ERROR: ${err}\n`)
    process.exit(1)
})

