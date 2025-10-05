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
    const util       = new RundownUtil(      state)
    const autoscroll = new RundownAutoScroll(state, util)
    const websocket  = new RundownWebSocket( state, util, autoscroll)
    const controls   = new RundownControls(  state, util, autoscroll, websocket)
    const rendering  = new RundownRendering( state, util, autoscroll, websocket, controls)

    /*  provide circular inter-module references  */
    autoscroll.provideCircRefs(controls, rendering)
    controls.provideCircRefs(rendering)
    websocket.provideCircRefs(rendering)

    /*  initialize auto-scrolling  */
    autoscroll.initializeWordSequence()
    autoscroll.initializeSpeechRecognition()

    /*  initialize rendering  */
    rendering.initializeEventListeners()

    /*  initialize controls  */
    controls.initializeKeyboardListeners()
    controls.initializeAutoScroll()
    controls.initializeExitButton()

    /*  connect WebSocket  */
    websocket.connect()
}, { once: true })
