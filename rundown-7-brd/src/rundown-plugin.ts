/*
**  Rundown - Render Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import { EventEmitter }      from "node:events"
import { type RundownState } from "./rundown-state"

export interface RundownPlugin extends EventEmitter {
    configure  (args: { [ key: string ]: string }): void
    connect    (): Promise<void>
    disconnect (): Promise<void>
    reflect    (state: RundownState): Promise<void>
}
