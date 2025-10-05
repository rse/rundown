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
    util.state           = state
    autoscroll.state     = state
    autoscroll.util      = util
    autoscroll.controls  = controls
    autoscroll.rendering = rendering
    websocket.state      = state
    websocket.util       = util
    websocket.autoscroll = autoscroll
    websocket.rendering  = rendering
    controls.state       = state
    controls.util        = util
    controls.autoscroll  = autoscroll
    controls.websocket   = websocket
    controls.rendering   = rendering
    rendering.state      = state
    rendering.util       = util
    rendering.autoscroll = autoscroll
    rendering.websocket  = websocket
    rendering.controls   = controls

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
