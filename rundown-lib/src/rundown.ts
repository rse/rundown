/*
**  Rundown - Render Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  external dependencies  */
import EventEmitter                from "eventemitter2"
import mammoth                     from "@shy1118/mammoth"
import * as cheerio                from "cheerio"
import type { BasicAcceptedElems } from "cheerio"
import type { AnyNode }            from "domhandler"
import * as CSSO                   from "csso"
import * as SVGO                   from "svgo"
import { minify }                  from "terser"

/*  internal dependencies  */
import pkg                         from "../../package.json" with { type: "json" }
import templateFonts               from "./rundown-fonts.css?raw"
import templateHTML                from "./rundown-template.html?raw"
import templateCSS                 from "./rundown-template.css?raw"
import templateJS                  from "./rundown-template.js?raw"
import reconnectingWebSockets      from "@opensumi/reconnecting-websocket/dist/reconnecting-websocket-iife.js?raw"
import axios                       from "../node_modules/axios/dist/axios.js?raw"
import animejs                     from "../node_modules/animejs/lib/anime.iife.js?raw"
import shapeFlow                   from "./rundown-shape-flow.svg?raw"
import iconSVG                     from "./app-icon.svg?raw"
import logoSVG                     from "./rundown-logo.svg?raw"

/*  the library API  */
export default class Rundown extends EventEmitter {
    async convert (input: Buffer | ArrayBuffer, selector: string) {
        /*  convert DOCX to HTML  */
        const source = {} as any
        if (input instanceof Buffer)
            source.buffer = input
        else if (input instanceof ArrayBuffer)
            source.arrayBuffer = input
        const result = await mammoth.convertToHtml(source, {
            styleMap: [
                "r[style-name='R121: Enforce']     => span.rundown-control-enforce",
                "r[style-name='R122: Toggle']      => span.rundown-control-toggle",
                "r[style-name='R123: Select']      => span.rundown-control-select",
                "r[style-name='R124: Apply']       => span.rundown-control-apply",
                "r[style-name='R125: Automate']    => span.rundown-control-automate",

                "p[style-name='R211: Speaker']     => div.rundown-speaker",

                "p[style-name='R311: Part']        => div.rundown-part",
                "p[style-name='R312: Chat']        => div.rundown-chat",
                "p[style-name='R313: Control']     => div.rundown-control",
                "p[style-name='R314: Hint']        => div.rundown-hint",
                "p[style-name='R315: Description'] => div.rundown-description",

                /* the following have to be left out for Mammoth to do the right thing  */
                /*
                "p[style-name='R316: OList1']      => ol",
                "p[style-name='R317: OList2']      => ol",
                "p[style-name='R318: UList1']      => ul",
                "p[style-name='R319: UList2']      => ul",
                */

                "r[style-name='R321: Emphasis']    => span.rundown-emphasis",
                "r[style-name='R322: KeyWord']     => span.rundown-keyword",
                "r[style-name='R323: KeyMessage']  => span.rundown-keymessage",

            ],
            includeEmbeddedStyleMap: true,
            includeDefaultStyleMap:  true,
            ignoreEmptyParagraphs:   true
        })
        if (result.messages.length > 0)
            for (const message of result.messages)
                if (!message.message.match(/Unrecognised run style: 'normaltextrun'/))
                    this.emit(message.type === "warning" ? "warning" : "error", `mammoth: ${message.message}`)

        /*  wrap HTML to be a proper document  */
        const html = `<!DOCTYPE html>
            <html>
                <head>
                </head>
                <body>
                    ${result.value}
                </body>
            </html>`

        /*  load HTML document  */
        const $ = cheerio.load(html)

        /*  post-adjust HTML: remove all images  */
        $("img").remove()

        /*  post-adjust HTML: remove "just space" spans  */
        $("span").each((i, node) => {
            if ($(node).contents().toString() === "&nbsp;")
                $(node).remove()
        })

        /*  post-adjust HTML: reduce style attributes  */
        $("*[style]").each((i, node) => {
            /*  remove some attributes at all  */
            $(node).css("font-size", "")
            $(node).css("font-family", "")
            $(node).css("line-height", "")
            $(node).css("background-color", "")
            $(node).css("color", "")

            /*  remove finally empty "style" attribute  */
            if (Object.keys($(node).css() ?? {}).length === 0)
                $(node).removeAttr("style")
        })

        /*  post-adjust HTML: replace dumb containers  */
        $("span, mark").each((i, node) => {
            if (Object.keys(node.attribs).length === 0)
                $(node).replaceWith($(node).contents())
        })

        /*  post-adjust HTML: replace empty containers  */
        $("span, mark, em, strong, a, p").each((i, node) => {
            if ($(node).contents().length === 0)
                $(node).remove()
        })

        /*  extract information from HTML via recursive CSS selector chaining  */
        const extract = (
            entries:   BasicAcceptedElems<AnyNode>[],
            base:      BasicAcceptedElems<AnyNode>,
            selectors: string[]
        ) => {
            if (selectors.length === 0)
                entries.push(base)
            else
                for (const sub of $(base).find(selectors[0]))
                    extract(entries, sub, selectors.slice(1))
        }
        const selectors = (selector ?? "").split(/\s+/)
        const entries: BasicAcceptedElems<AnyNode>[] = []
        extract(entries, $.root(), selectors)

        /*  generate output  */
        let output = ""
        const convert = (nodes: BasicAcceptedElems<AnyNode>) => {
            return ($(nodes).html() ?? "")
                .replace(/à/g, "&rarr;")
                .replace(/-&gt;/g, "&rarr;")
        }
        output += "<div class=\"rundown-section\">"
        output += "<div class=\"rundown-chunk\">"
        let openSection = true
        let openChunk   = true
        for (const entry of entries) {
            const html = convert(entry)
            if (html.match(/<div class="rundown-part">/)) {
                if (openChunk)
                    output += "</div>"
                if (openSection)
                    output += "</div>"
                output +=
                    "<div class=\"rundown-section\">"
                openSection = true
                output += "<div class=\"rundown-part-tab\">" +
                    "<div class=\"rundown-part-tab-what\">0/0</div>" +
                    "<div class=\"rundown-part-tab-where\">0%</div>" +
                    "</div>"
                output += "<div class=\"rundown-chunk\">"
                openChunk = true
                output += html
            }
            else if (html.match(/<div class="rundown-speaker">/)) {
                if (openChunk)
                    output += "</div>"
                output +=
                    "<div class=\"rundown-chunk\">"
                openChunk = true
                output += html
            }
            else
                output += html
        }
        if (openChunk)
            output += "</div>"
        if (openSection)
            output += "</div>"

        /*  post-adjust generated HTML  */
        const $2 = cheerio.load(output)
        $2(".rundown-chunk").each((i, el) => {
            const childs = $2("*:not(.rundown-description):not(.rundown-control):not(.rundown-chat)", el)
            if (childs.length === 0)
                $2(el).addClass("disabled")
            const speaker = $2(".rundown-speaker", el)
            if (speaker.length === 0)
                $2(el).addClass("autonomous")
        })
        $2(".rundown-section").each((i, el) => {
            const childs = $2(".rundown-chunk:not(.disabled)", el)
            if (childs.length === 0)
                $2(el).addClass("disabled")
        })
        output = $2("html > body").html()!

        /*  prepare assets  */
        const css = CSSO.minify(templateCSS, {
            restructure: false,
            sourceMap:   false
        }).css
        const fonts = CSSO.minify(templateFonts, {
            restructure: false,
            sourceMap:   false
        }).css
        const svg = SVGO.optimize(shapeFlow, {}).data
        const svg2 = SVGO.optimize(iconSVG, {}).data
        const svg3 = SVGO.optimize(logoSVG, {}).data
        const iconUrl = `data:image/svg+xml,${encodeURIComponent(svg2)}`
        const jsInput = reconnectingWebSockets + ";\n" +
            axios + ";\n" +
            animejs + ";\n" +
            templateJS
        const js = (await minify(jsInput, {
            mangle: false
        })).code!

        /*  wrap generated HTML into stand-alone web page  */
        output = templateHTML
            .replace(/@header@/g,       `generated by Rundown ${pkg.version}`)
            .replace(/@fonts@/g,        fonts)
            .replace(/@template-css@/g, css)
            .replace(/@template-js@/g,  js)
            .replace(/@shape-flow@/g,   svg)
            .replace(/@icon@/g,         iconUrl)
            .replace(/@logo@/g,         svg3)
            .replace(/@content@/g,      output)

        return output
    }
}

