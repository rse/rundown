/*
**  Rundown - Generate Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  external requirements  */
const CLIio   = require("cli-io")
const yargs   = require("yargs")
const mammoth = require("@shy1118/mammoth")
const cheerio = require("cheerio")
const pkg     = require("./package")

/*  establish asynchronous environment  */
;(async () => {
    /*  parse command-line arguments  */
    const args = yargs()
        /* eslint @stylistic/indent: off */
        .usage(
            "Usage: $0 " +
            "[-h|--help] " +
            "[-V|--version] " +
            "[-v|--verbose <level>] " +
            "[-e|--extract <css-selector-chain>] " +
            "[-f|--format qprompt|autocue] " +
            "[-o|--output <output-file>|-] " +
            "<input-file>|-"
        )
        .help("h").alias("h", "help").default("h", false)
            .describe("h", "show usage help")
        .boolean("V").alias("V", "version").default("V", false)
            .describe("V", "show program version information")
        .string("v").nargs("v", 1).alias("v", "log-level").default("v", "warning")
            .describe("v", "level for verbose logging ('none', 'error', 'warning', 'info', 'debug')")
        .string("e").nargs("e", 1).alias("e", "extract").default("e", "table:last tr:gt(0) td:last")
            .describe("e", "input extraction via CSS selector chain")
        .string("f").nargs("f", 1).alias("f", "format").default("f", "qprompt")
            .describe("f", "output format ('autocue', 'qprompt')")
        .string("o").nargs("o", 1).alias("o", "output").default("o", "-")
            .describe("o", "output file")
        .version(false)
        .strict()
        .showHelpOnFail(true)
        .demand(0)
        .parse(process.argv.slice(2))

    /*  short-circuit version request  */
    if (args.version) {
        process.stderr.write(`${pkg.name} ${pkg.version} <${pkg.homepage}>\n`)
        process.stderr.write(`${pkg.description}\n`)
        process.stderr.write(`Copyright (c) 2023-2024 ${pkg.author.name} <${pkg.author.url}>\n`)
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
    const input = await cli.input(args._[0], { encoding: null })

    /*  convert DOCX to HTML  */
    const result = await mammoth.convertToHtml({ buffer: input }, {
        styleMap: [],
        includeEmbeddedStyleMap: true,
        includeDefaultStyleMap:  true,
        ignoreEmptyParagraphs:   true
    })

    /*  wrap HTML to be proper document  */
    const html = `<!DOCTYPE html><html><head></head><body>${result.value}</body></html>`

    /*  load HTML document  */
    const $ = cheerio.load(html)

    /*  post-adjust HTML  */
    $("img").remove()
    $("span, mark").each((i, node) => {
        if (Object.keys(node.attribs).length === 0)
            $(node).replaceWith($(node).contents())
    })
    $("*[style]").each((i, node) => {
        $(node).css("line-height", "")
        $(node).css("font-size", "")
        $(node).css("font-family", "")
        if ($(node).css("background-color") === "#FF0000")
            $(node).css("background-color", "red")
        if ($(node).css("color") === "#FF0000")
            $(node).css("color", "red")
        if ($(node).css("background-color") && !$(node).css("color"))
            $(node).css("color", "black")
        if (Object.keys($(node).css()).length === 0)
            $(node).removeAttr("style")
    })
    $("p, span, mark").each((i, node) => {
        if ($(node).contents().length === 0)
            $(node).remove()
    })
    $("a").each((i, node) => {
        if ($(node).contents().length === 0)
            $(node).remove()
    })

    /*  extract information from HTML via recursive CSS selector chaining  */
    const extract = (entries, base, selectors) => {
        if (selectors.length === 0)
            entries.push(base)
        else
            for (const sub of $(base).find(selectors[0]))
                extract(entries, sub, selectors.slice(1))
    }
    const selectors = args.extract.split(/\s+/)
    const entries = []
    extract(entries, $.root(), selectors)

    /*  generate output  */
    let output = ""
    if (args.format === "qprompt") {
        /*
         *  ==== QPROMPT (HTML) ====
         */
        const convert = (nodes) => {
            return $(nodes).html()
                .replace(/à/g, "&rarr;")
                .replace(/-&gt;/g, "&rarr;")
        }
        let n = 1
        for (const entry of entries) {
            output +=
                "<div class=\"story\">\n" +
                `   <div class="story-head">[${n++}]</div>\n` +
                `   ${convert(entry)}\n` +
                "</div>\n"
        }
        output = `
            <style type="text/css">
                html, body {
                    margin: 0;
                    padding: 0;
                }
                body {
                    margin: 50px;
                    background-color: #000000;
                    color: #ffffff;
                    font-family: "Calibri", sans-serif;
                    font-size: 24pt;
                    line-height: 120%;
                }
                .story {
                    margin-bottom: 20px;
                }
                .story .story-head {
                    background-color: #336699;
                    color: #ffffff;
                    width: calc(100% - 10px);
                    padding-left: 10px;
                }
                p {
                    margin-top: 16px;
                }
                li {
                    margin-top: 8px;
                }
                mark {
                    background-color: inherit;
                    color: inherit;
                }
            </style>
            ${output}
        `
        output = `<!DOCTYPE html><head></head><html><body>${output}</body></html>`
    }
    else if (args.format === "autocue") {
        /*
         *  ==== AUTOCUE (XML) ====
         */
    }
    else
        throw new Error("invalid output format")

    /*  write output  */
    cli.log("info", `writing output "${args.output}"`)
    await cli.output(args.output, output)

    /*  die gracefully  */
    process.exit(0)
})().catch((err) => {
    /*  catch fatal run-time errors  */
    process.stderr.write(`rundown: ERROR: ${err}\n`)
    process.exit(1)
})

