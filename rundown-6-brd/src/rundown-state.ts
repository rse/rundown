/*
**  Rundown - Render Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import * as arktype from "arktype"

export const RundownStateSchema = arktype.type({
    id:     "string",
    active: "number",
    kv:     arktype.type({ "[ string ]": "string | number | boolean" }).array()
})
export type RundownState = typeof RundownStateSchema.infer

export const RundownModeSchema = arktype.type({
    locked: "boolean",
    debug:  "boolean"
})
export type RundownMode = typeof RundownModeSchema.infer

