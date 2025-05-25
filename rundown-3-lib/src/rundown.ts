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

/*  internal dependencies  */
import pkg                         from "../../package.json" with { type: "json" }
import templateFonts               from "../../rundown-2-rnd/dst-stage1/rundown-fonts.css?raw"
import templateHTML                from "../../rundown-2-rnd/dst-stage1/rundown.html?raw"
import templateCSS                 from "../../rundown-2-rnd/dst-stage1/rundown.css?raw"
import templateJS                  from "../../rundown-2-rnd/dst-stage2/rundown.umd.js?raw"
import shapeFlow                   from "../../rundown-2-rnd/dst-stage1/rundown-shape-flow.svg?raw"
import iconSVG                     from "../../rundown-2-rnd/dst-stage1/rundown-icon.svg?raw"
import logoSVG                     from "../../rundown-2-rnd/dst-stage1/rundown-logo.svg?raw"

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

                "p[style-name='R211: Speaker']     => div.rundown-speaker:fresh",

                "p[style-name='R311: Part']        => div.rundown-part:fresh",
                "p[style-name='R312: State']       => div.rundown-state:fresh",
                "p[style-name='R313: Control']     => div.rundown-control:fresh",
                "p[style-name='R314: Display']     => div.rundown-display:fresh",
                "p[style-name='R315: Hint']        => div.rundown-hint:fresh",

                "p[style-name='R316: OList1']      => ol > li:fresh",
                "p[style-name='R317: OList2']      => ol|ul > li > ol > li:fresh",
                "p[style-name='R318: UList1']      => ul > li:fresh",
                "p[style-name='R319: UList2']      => ul|ol > li > ul > li:fresh",

                "r[style-name='R321: Emphasis']    => span.rundown-emphasis",
                "r[style-name='R322: KeyWord']     => span.rundown-keyword",
                "r[style-name='R323: KeyMessage']  => span.rundown-keymessage",
                "r[style-name='R324: Info']        => span.rundown-info"
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

        /*  post-adjust HTML: remove empty list items
            (which still can contain whitespace text nodes)  */
        $("li").each((i, node) => {
            const hasNonTextContent = Array.from(node.childNodes).some((node) =>
                !(node.nodeType === 3 /* Node.TEXT_NODE */ && /^\s*$/.test(node.nodeValue)))
            if (!hasNonTextContent)
                $(node).remove()
        })

        /*  post-adjust HTML: mark ghost bullet points
            (i.e. bullets points at level-1 which immedidately contain level-2 ones
            and which get generated when a paragraph style is between level-2 styles)  */
        $("li:has(> ul, > ol)").each((i, node) => {
            const hasTextContent = Array.from(node.childNodes).some((node) =>
                node.nodeType === 3 /* Node.TEXT_NODE */ && /\S/.test(node.nodeValue))
            if (!hasTextContent)
                $(node).addClass("rundown-ghost")
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
                .replace(/(\s+)-(\s+)/g, "$1&mdash;$2")
                .replace(/à/g, "<span class=\"rundown-arrow\">&rarr;</span>")
                .replace(/--*&gt;/g, "<span class=\"rundown-arrow\">&rarr;</span>")
                .replace(/\.\.\./g, "<span class=\"rundown-ellipsis\">&hellip;</span>")
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
        $2("li, p").each((i, el) => {
            const hasTextContent = Array.from(el.childNodes).some((node) =>
                node.nodeType === 3 /* Node.TEXT_NODE */ && /\S/.test(node.nodeValue))
            const childs = $2("*:not(.rundown-chat, .rundown-info, .rundown-control)", el)
            if (!hasTextContent && childs.length === 0)
                $2(el).addClass("disabled")
        })
        $2(".rundown-chunk").each((i, el) => {
            const childs = $2("*:not(.rundown-description):not(.rundown-control):not(.rundown-chat)", el)
            if (childs.length === 0)
                $2(el).addClass("disabled")
            const childs2 = $2("> *:not(.disabled)", el)
            if (childs2.length === 0)
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
        $2(".rundown-state").each((i, el) => {
            $2(el).wrap($2("<div class=\"rundown-state-marker\"></div>"))
        })
        output = $2("html > body").html()!

        /*  wrap generated HTML into stand-alone web page  */
        output = templateHTML
            .replace(/@header@/g,       `generated by Rundown ${pkg.version}`)
            .replace(/@fonts@/g,        () => templateFonts)
            .replace(/@template-css@/g, () => templateCSS)
            .replace(/@template-js@/g,  () => templateJS)
            .replace(/@shape-flow@/g,   () => shapeFlow)
            .replace(/@icon@/g,         () => `data:image/svg+xml,${encodeURIComponent(iconSVG)}`)
            .replace(/@logo@/g,         () => logoSVG)
            .replace(/@content@/g,      () => output)

        return output
    }
}

