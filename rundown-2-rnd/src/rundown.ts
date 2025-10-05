/*
**  Rundown - Render Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  internal dependencies  */
import { RundownState }      from "./rundown-state"
import { RundownUtil }       from "./rundown-util"
import { RundownAutoScroll } from "./rundown-autoscroll"
import { RundownRendering }  from "./rundown-rendering"
import { RundownControls }   from "./rundown-controls"
import { RundownWebSocket }  from "./rundown-websocket"

/*  await the DOM...  */
document.addEventListener("DOMContentLoaded", async () => {
    /*  construct all modules  */
    const state      = new RundownState()
    const util       = new RundownUtil()
    const autoscroll = new RundownAutoScroll()
    const websocket  = new RundownWebSocket()
    const controls   = new RundownControls()
    const rendering  = new RundownRendering()

    /*  provide inter-module references  */
    util      .references({ state                                                   })
    autoscroll.references({ state, util,             rendering, controls            })
    websocket .references({ state, util, autoscroll, rendering                      })
    controls  .references({ state, util, autoscroll, rendering,           websocket })
    rendering .references({ state, util, autoscroll,            controls, websocket })

    /*  initialize auto-scrolling  */
    autoscroll.initializeWordSequence()

    /*  initialize rendering  */
    rendering.initializeEventListeners()

    /*  initialize controls  */
    controls.initializeKeyboardListeners()
    controls.initializeAutoScroll()
    controls.initializeExitButton()

    /*  connect WebSocket  */
    websocket.connect()
}, { once: true })
