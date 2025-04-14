/*
**  Rundown - Generate Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import path              from "node:path"
import * as Vite         from "vite"
import VuePlugin         from "@vitejs/plugin-vue"
import YAMLPlugin        from "@rollup/plugin-yaml"
import { nodePolyfills } from "vite-plugin-node-polyfills"
import SvgLoader         from "vite-svg-loader"
import { viteZip }       from "vite-plugin-zip-file"
import { mkdirp }        from "mkdirp"

await mkdirp("dst-stage2")

export default Vite.defineConfig(({ command, mode }) => ({
    logLevel: "info",
    base: "",
    root: "src",
    assetsInclude: [ "index.yaml" ],
    plugins: [
        VuePlugin(),
        YAMLPlugin(),
        SvgLoader(),
        nodePolyfills({
            include: [ "events", "stream", "path", "fs" ],
            globals: { Buffer: true }
        }),
        viteZip({
            folderPath: path.join(__dirname, "../dst-stage1"),
            outPath:    path.join(__dirname, "../dst-stage2"),
            zipName:    "rundown.zip",
            withoutMainFolder: true
        })
    ],
    css: {
        devSourcemap: mode === "development"
    },
    build: {
        target:                 "es2022",
        outDir:                 "../dst-stage1",
        assetsDir:              "",
        emptyOutDir:            (mode === "production"),
        chunkSizeWarningLimit:  8000,
        assetsInlineLimit:      0,
        sourcemap:              (mode === "development"),
        minify:                 (mode === "production"),
        reportCompressedSize:   (mode === "production"),
        rollupOptions: {
            input: "src/index.html",
            output: {
                entryFileNames: "[name].js",
                chunkFileNames: "[name]-[hash:8].js",
                assetFileNames: (assetInfo) => {
                    let spec = "[name]-[hash:8].[ext]"
                    if (assetInfo.names[0] === "sample.docx")
                        spec = "template.docx"
                    else if (assetInfo.names[0] === "index.yaml")
                        spec = "index.yaml"
                    return spec
                }
            },
            onwarn: (entry, next) => {
                if (entry.message.match(/node_modules.+Use of eval in/))
                    return
                else
                    return next(entry)
            }
        }
    }
}))

