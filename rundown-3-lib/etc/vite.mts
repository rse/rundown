/*
**  Rundown - Render Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import fs                    from "node:fs"
import * as Vite             from "vite"
import { tscPlugin }         from "@wroud/vite-plugin-tsc"
import { viteStaticCopy }    from "vite-plugin-static-copy"
import { viteSingleFile }    from "vite-plugin-singlefile"
import { nodePolyfills }     from "vite-plugin-node-polyfills"

const formats = process.env.VITE_BUILD_FORMATS ?? "esm"

export default Vite.defineConfig(({ command, mode }) => ({
    logLevel: "info",
    appType:  "custom",
    base:     "",
    root:     "",
    plugins: [
        tscPlugin({
            tscArgs:        [ "--project", "etc/tsc.json", ...(mode === "development" ? [ "--sourceMap" ] : []) ],
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
        target:                 "es2022",
        outDir:                 "dst-stage2",
        assetsDir:              "",
        emptyOutDir:            (mode === "production") && formats !== "umd",
        chunkSizeWarningLimit:  5000,
        assetsInlineLimit:      0,
        sourcemap:              (mode === "development"),
        minify:                 (mode === "production"),
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

