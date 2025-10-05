/*
**  Rundown - Render Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  external dependencies  */
import { DateTime }          from "luxon"

/*  internal dependencies  */
import type { RundownState } from "./rundown-state"

/*  logging utility class  */
export class RundownUtil {
    constructor (
        private state: RundownState
    ) {}

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
        if (level === "error")
            console.error(`${timestamp} [ERROR] ${msg}${epilog}`)
        else if (level === "warning")
            console.warn(`${timestamp} [WARNING] ${msg}${epilog}`)
        else if (level === "info")
            console.info(`${timestamp} [INFO] ${msg}${epilog}`)
        else if (level === "debug" && this.state.debug)
            console.log(`${timestamp} [DEBUG] ${msg}${epilog}`)
    }
}
