/*
**  Rundown - Render Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
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

/*  base class with the shared bridge plugin behavior  */
export abstract class RundownPluginBase extends EventEmitter {
    /*  shared internal state  */
    protected id                                = ""
    protected active                            = -1
    protected mode: RundownMode                 = { locked: false, debug: false }
    protected lastState: RundownState | null    = null
    protected args: { [ key: string ]: string } = {}

    /*  INTERNAL: execute a single command (plugin-specific)  */
    protected abstract executeCommand (name: string, value: string | number | boolean, reverse: boolean): void

    /*  INTERNAL: optionally condense a state before replaying it  */
    protected condenseState (state: RundownState): RundownState {
        return state
    }

    /*  INTERNAL: process commands in forward direction  */
    protected processForwardCommands (state: RundownState) {
        let m: RegExpMatchArray | null
        for (let i = this.active + 1; i <= state.active && i < state.kv.length; i++) {
            if (!state.kv[i])
                continue
            for (const key of Object.keys(state.kv[i])) {
                if ((m = key.match(/^([^:]+):(.+)$/)) !== null) {
                    const [ , prefix, name ] = m
                    const value = state.kv[i][key]
                    if (prefix === this.args.prefix)
                        this.executeCommand(name, value, false)
                }
            }
        }
    }

    /*  INTERNAL: process commands in backward direction  */
    protected processBackwardCommands (state: RundownState) {
        let m: RegExpMatchArray | null
        for (let i = this.active - 1; i >= state.active && i >= 0; i--) {
            if (!state.kv[i])
                continue
            for (const key of Object.keys(state.kv[i]).reverse()) {
                if ((m = key.match(/^([^:]+):(.+)$/)) !== null) {
                    const [ , prefix, name ] = m
                    const value = state.kv[i][key]
                    if (prefix === this.args.prefix)
                        this.executeCommand(name, value, true)
                }
            }
        }
    }

    /*  reflect current Rundown state  */
    async reflectState (state: RundownState) {
        if (state.id !== this.id) {
            this.id = state.id
            this.active = -1
        }
        this.lastState = state
        if (this.mode.locked && state.active !== this.active) {
            if (state.active > this.active)
                this.processForwardCommands(state)
            else if (state.active < this.active)
                this.processBackwardCommands(state)
            this.active = state.active
        }
    }

    /*  reflect current Rundown mode  */
    async reflectMode (data: RundownMode) {
        let changed = false
        if (this.mode.locked !== data.locked) {
            this.mode.locked = data.locked
            changed = true
            if (data.locked && this.lastState !== null)
                await this.reflectState(this.condenseState(this.lastState))
        }
        if (this.mode.debug !== data.debug) {
            this.mode.debug  = data.debug
            changed = true
        }
        if (changed)
            this.emit("mode-changed")
    }
}
