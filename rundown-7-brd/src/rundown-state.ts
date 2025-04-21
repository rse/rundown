/*
**  Rundown - Render Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import * as arktype from "arktype"

export type RundownState = {
    id:     string
    active: number
    kv:     Array<{ [ key: string ]: string | number | boolean }>
}

export const RundownStateSchema = arktype.type({
    id:     "string",
    active: "number",
    kv:     arktype.type({ "[ string ]": "string | number | boolean" }).array()
})
