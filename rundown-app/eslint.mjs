/*
**  Rundown - Generate Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import pluginJs      from "@eslint/js"
import pluginStd     from "neostandard"
import pluginN       from "eslint-plugin-n"
import pluginImport  from "eslint-plugin-import"
import pluginPromise from "eslint-plugin-promise"
import globals       from "globals"

export default [
    pluginJs.configs.recommended,
    ...pluginStd({
        ignores: pluginStd.resolveIgnoresFromGitignore()
    }),
    {
        plugins: {
            "n":       pluginN,
            "import":  pluginImport,
            "promise": pluginPromise
        },
        files:   [ "**/*.{js,mjs,cjs}" ],
        ignores: [ "dst/" ],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType:  "module",
            parserOptions: {
                ecmaFeatures: {
                    jsx: false
                }
            },
            globals: {
                ...globals.node,
                ...globals.commonjs,
                jQuery:  true,
                config:  true,
                rundown: true,
                app:     true
            }
        },
        rules: {
            "curly":                                  "off",
            "require-atomic-updates":                 "off",
            "dot-notation":                           "off",
            "no-labels":                              "off",
            "no-void":                                "off",

            "@stylistic/indent":                      [ "error", 4, { SwitchCase: 1 } ],
            "@stylistic/linebreak-style":             [ "error", "unix" ],
            "@stylistic/semi":                        [ "error", "never" ],
            "@stylistic/operator-linebreak":          [ "error", "after", { overrides: { "&&": "before", "||": "before", ":": "after" } } ],
            "@stylistic/brace-style":                 [ "error", "stroustrup", { allowSingleLine: true } ],
            "@stylistic/quotes":                      [ "error", "double" ],

            "@stylistic/no-multi-spaces":             "off",
            "@stylistic/no-multi-spaces":             "off",
            "@stylistic/no-multiple-empty-lines":     "off",
            "@stylistic/key-spacing":                 "off",
            "@stylistic/object-property-newline":     "off",
            "@stylistic/space-in-parens":             "off",
            "@stylisticarray-bracket-spacing":        "off",
            "@stylistic/lines-between-class-members": "off",
            "@stylistic/array-bracket-spacing":       "off"
        }
    }
]

