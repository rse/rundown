/*
**  Rundown - Render Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import { EventEmitter } from "node:events"

import { type RundownState, type RundownMode } from "./rundown-state"

export interface RundownPlugin extends EventEmitter {
    configure     (args: { [ key: string ]: string }): void
    connect       (): Promise<void>
    disconnect    (): Promise<void>
    reflectState  (state: RundownState): Promise<void>
    reflectMode   (mode:  RundownMode):  Promise<void>
}
