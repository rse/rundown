/*
**  Rundown - Generate Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import path               from "node:path"
import * as Vite          from "vite"
import YAMLPlugin         from "@rollup/plugin-yaml"
import { viteStaticCopy } from "vite-plugin-static-copy"
import { node }           from "@liuli-util/vite-plugin-node"
import { tscPlugin }      from "@wroud/vite-plugin-tsc"

export default Vite.defineConfig(({ command, mode }) => ({
    logLevel: "info",
    appType: "custom",
    base: "",
    root: "",
    plugins: [
        tscPlugin({
            tscArgs: [ "--project", "etc/tsc.json" ],
            packageManager: "npx",
            prebuild: true
        }),
        node({
            entry:  "dst-stage1/rundown.js",
            outDir: "dst-stage2",
            formats: [ "cjs" ],
            shims:  false
        })
    ],
    build: {
        target:                 "node20",
        outDir:                 "dst",
        assetsDir:              "",
        emptyOutDir:            (mode === "production"),
        chunkSizeWarningLimit:  5000,
        assetsInlineLimit:      0,
        sourcemap:              (mode === "development"),
        minify:                 false,
        reportCompressedSize:   (mode === "production"),
        rollupOptions: {
            input: "dst-stage1/rundown.js",
            output: {
                entryFileNames: "[name].js",
                chunkFileNames: "[name]-[hash:8].js",
                assetFileNames: (assetInfo) => "[name]-[hash:8].[ext]"
            }
        }
    }
}))

