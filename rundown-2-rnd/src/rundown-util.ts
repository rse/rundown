/*
**  Rundown - Render Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  external dependencies  */
import { DateTime }          from "luxon"
import * as anime            from "animejs"

/*  internal dependencies  */
import type { RundownState } from "./rundown-state"

/*  logging utility class  */
export class RundownUtil {
    /*  internal state  */
    private raiseErrorTimer: ReturnType<typeof setTimeout> | null = null

    /*  object construction  */
    constructor (
        private state: RundownState
    ) {}

    /*  raise an error message  */
    raiseError (msg: string) {
        /*  update error text in DOM  */
        const el = document.querySelector(".error-text")
        if (el === null)
            return
        el.innerHTML = msg

        /*  keep existing error message or raise new one  */
        if (this.raiseErrorTimer !== null) {
            clearTimeout(this.raiseErrorTimer)
            this.raiseErrorTimer = null
        }
        else {
            anime.animate(".overlay8", {
                opacity:   [ 0, 1 ],
                ease:      "outSine",
                duration:  1000
            })
        }

        /*  close error message after some time  */
        this.raiseErrorTimer = setTimeout(() => {
            this.raiseErrorTimer = null
            anime.animate(".overlay8", {
                opacity:  [ 1, 0 ],
                ease:     "outSine",
                duration: 1000
            })
        }, 4000)
    }

    /*  log a message  */
    log (level: string, msg: string, data: { [ key: string ]: any } | null = null) {
        const timestamp = DateTime.now().toFormat("yyyy-MM-dd HH:mm:ss.SSS")
        let epilog = ""
        if (data !== null) {
            epilog = ` (${Object.keys(data)
                .map((key) => key + ": " + JSON.stringify(data[key]))
                .join(", ")
            })`
        }
        if (level === "error") {
            console.error(`${timestamp} [ERROR] ${msg}${epilog}`)
            this.raiseError(msg)
        }
        else if (level === "warning")
            console.warn(`${timestamp} [WARNING] ${msg}${epilog}`)
        else if (level === "info")
            console.info(`${timestamp} [INFO] ${msg}${epilog}`)
        else if (level === "debug" && this.state.debug)
            console.log(`${timestamp} [DEBUG] ${msg}${epilog}`)
    }

    /*  find closest element by distance  */
    findClosestElement (elements: Element[], pivot: number) {
        const min = { element: null, distance: Number.MAX_VALUE } as
            { element: Element | null, distance: number }
        for (const element of elements) {
            const rect = element.getBoundingClientRect()
            const distance1 = Math.abs(pivot - rect.top)
            const distance2 = Math.abs(pivot - (rect.top + rect.height))
            if (min.distance > distance1) {
                min.distance = distance1
                min.element  = element
            }
            if (min.distance > distance2) {
                min.distance = distance2
                min.element  = element
            }
        }
        return min
    }
}
