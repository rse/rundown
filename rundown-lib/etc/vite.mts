/*
**  Rundown - Generate Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import fs                    from "node:fs"
import * as Vite             from "vite"
import { tscPlugin }         from "@wroud/vite-plugin-tsc"
import dts                   from "vite-plugin-dts"
import { viteStaticCopy }    from "vite-plugin-static-copy"
import { viteSingleFile }    from "vite-plugin-singlefile"
import { nodePolyfills }     from "vite-plugin-node-polyfills"
import runTask               from "@m5nv/vite-plugin-run-task"
import inlineAssets          from "inline-assets"
import { mkdirp }            from "mkdirp"

const formats = process.env.VITE_BUILD_FORMATS ?? "esm"

export default Vite.defineConfig(({ command, mode }) => ({
    logLevel: "info",
    appType:  "custom",
    base:     "",
    root:     "",
    plugins: [
        runTask({
            watch: [],
            async task (context, event) {
                const input  = "src/rundown-fonts.css"
                const outdir = "dst-stage1"
                const output = "rundown-fonts.css"
                let content = await fs.promises.readFile(input, "utf8")
                content = inlineAssets("", input, content, {
                    verbose: true,
                    htmlmin: false,
                    cssmin:  false,
                    jsmin:   false,
                    pattern: [ ".+" ],
                    purge:   false
                })
                await mkdirp(outdir)
                await fs.promises.writeFile(`${outdir}/${output}`, content, "utf8")
            }
        }),
        viteStaticCopy({
            hook: "buildStart",
            targets: [ {
                src: [ "src/rundown-template.{css,html}", "src/rundown-shape-flow.svg", "src/app-icon.svg" ],
                dest: "../dst-stage1/",
                overwrite: true
            } ],
            silent: false
        }),
        tscPlugin({
            tscArgs:        [ "--project", "etc/tsc.json" ],
            packageManager: "npx",
            prebuild:       true
        }),
        ...(formats === "umd" ? [ nodePolyfills() ] : []),
        viteSingleFile()
    ],
    build: {
        lib: {
            entry:    "dst-stage1/rundown.js",
            formats:  formats.split(","),
            name:     "Rundown",
            fileName: (format) => `rundown.${format === "es" ? "esm" : format}.js`
        },
        target:                 "es2020",
        outDir:                 "dst-stage2",
        assetsDir:              "",
        emptyOutDir:            (mode === "production") && formats !== "umd",
        chunkSizeWarningLimit:  5000,
        assetsInlineLimit:      0,
        sourcemap:              (mode === "development"),
        minify:                 false,
        reportCompressedSize:   (mode === "production"),
        rollupOptions: {
            external: formats === "umd" ? [] : [
                "eventemitter2",
                "@shy1118/mammoth",
                "cheerio",
                "domhandler",
                "os",
                "fs",
                "path"
            ],
            onwarn (warning, warn) {
                if (warning.message.match(/annotation that Rollup cannot interpret/))
                    return
                if (warning.message.match(/Use of eval.*?is strongly discouraged/))
                    return
                warn(warning)
            }
        }
    }
}))

