/*
**  Rundown - Render Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  external dependencies  */
import * as Vue from "vue"
import               "typopro-web/web/TypoPRO-SourceSansPro/TypoPRO-SourceSansPro-Regular.css"
import               "typopro-web/web/TypoPRO-SourceSansPro/TypoPRO-SourceSansPro-Bold.css"
import               "@fortawesome/fontawesome-free/js/all.min.js"
import               "@fortawesome/fontawesome-free/css/all.min.css"

/*  internal dependencies  */
import App      from "./app.vue"
import               "./app.styl"

document.addEventListener("DOMContentLoaded", (ev: Event) => {
    (async () => {
        const app = Vue.createApp(App)
        app.mount("#app")
    })().catch((err) => {
        console.error(`app: ERROR: top-level: ${err}`)
    })
})

