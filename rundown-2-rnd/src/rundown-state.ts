/*
**  Rundown - Render Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  central state management class  */
export class RundownState {
    /*  runtime modes and settings  */
    debug                = false
    locked               = false
    autoscroll           = false
    paused               = false
    speed                = 0
    speedBeforePause     = 0

    /*  configuration options  */
    options              = new Map<string, string>()

    constructor () {
        /*  parse configuration options from URL hash  */
        for (const opt of document.location.hash.replace(/^#/, "").split("&")) {
            let m
            if ((m = opt.match(/^(.+?)=(.+)$/)) !== null)
                this.options.set(m[1], m[2])
            else
                this.options.set(opt, "yes")
        }
    }
}
