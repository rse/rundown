/*
**  Rundown - Generate Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import * as Vite          from "vite"
import { tscPlugin }      from "@wroud/vite-plugin-tsc"
import nodeExternals      from "rollup-plugin-node-externals"
import arraybuffer        from "vite-plugin-arraybuffer"

export default Vite.defineConfig(({ command, mode }) => ({
    logLevel: "info",
    appType: "custom",
    base: "",
    root: "",
    plugins: [
        arraybuffer(),
        tscPlugin({
            tscArgs: [ "--project", "etc/tsc.json" ],
            packageManager: "npx" as "npm",
            prebuild: true
        }),
        nodeExternals({
            builtins: true,
            devDeps:  false,
            deps:     false,
            optDeps:  false,
            peerDeps: false
        })
    ],
    resolve: {
        mainFields: [ "module", "jsnext:main", "jsnext" ],
        conditions: [ "node" ],
    },
    build: {
        lib: {
            entry:    "dst-stage1/rundown.js",
            formats:  [ "cjs" ],
            name:     "Rundown",
            fileName: () => "rundown.js"
        },
        target:                 "esnext",
        outDir:                 "dst-stage2",
        assetsDir:              "",
        emptyOutDir:            (mode === "production"),
        chunkSizeWarningLimit:  5000,
        assetsInlineLimit:      0,
        sourcemap:              (mode === "development"),
        minify:                 false,
        reportCompressedSize:   (mode === "production"),
        rollupOptions: {
            onwarn (warning, warn) {
                if (warning.message.match(/Use of eval.*?is strongly discouraged/))
                    return
                warn(warning)
            }
        }
    }
}))

