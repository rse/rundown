<!--
**
**  Rundown - Generate Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
**
-->

<template>
    <div class="app">
        <!--  Viewport UI  -->
        <app-viewport
            ref="viewport"
            v-bind:options="options"
            v-on:log="log"
        ></app-viewport>

        <!--  Control UI  -->
        <app-control
            ref="control"
            v-bind:options="options"
            v-on:log="log"
            v-on:command="command"
        ></app-control>
    </div>
</template>

<style lang="stylus">
.app
    width:   100vw
    height:  100vh
    margin:  0
    padding: 0
    position: relative
    .app-viewport
        position: absolute
        width:  100%
        height: 100%
        top:  0
        left: 0
        z-index: 0
    .app-control
        position: absolute
        top:  0
        left: 0
        z-index: 100
</style>

<script setup lang="ts">
import { defineComponent }  from "vue"
import moment               from "moment"
import URI                  from "urijs"
import Mousetrap            from "mousetrap"

import AppControlComp       from "./app-control.vue"
import type { AppControl }  from "./app-control.ts"
import AppViewportComp      from "./app-viewport.vue"
import type { AppViewport } from "./app-viewport.ts"
</script>

<script lang="ts">
export default defineComponent({
    name: "app",
    components: {
        "app-control":  AppControlComp,
        "app-viewport": AppViewportComp
    },
    data: () => ({
        options:    new Map<string, string | boolean>(),
        url:        ""
    }),
    created () {
        /*  determine mode  */
        let url = new URI(window.location.href)
        const hash = url.hash()
        let m
        if ((m = hash.match(/^#(?:\?(.+))?$/)) !== null) {
            if (m[1]) {
                const opts = m[1].split("&")
                for (const opt of opts) {
                    let m2
                    if ((m2 = opt.match(/^(.+)=(.+)$/)) !== null)
                        this.options.set(m2[1], m2[2])
                    else
                        this.options.set(opt, true)
                }
            }
        }

        /*  determine URL  */
        url = new URI(window.location.href)
        url.pathname("")
        url.search("")
        url.hash("")
        this.url = url.toString()

        /*  attach to external host communication channel  */
        window.addEventListener("message", (event: MessageEvent) => {
            if (typeof event.data?.action === "string" && typeof event.data.data === "object") {
                const { action, data } = event.data
                this.command(action, data)
            }
        })

        /*  bind keyboard events to actions  */
        Mousetrap.bind("ctrl+m",       () => { this.command("control:panel-toggle") })
        Mousetrap.bind("ctrl+l",       () => { this.command("control:document-load") })
        Mousetrap.bind("ctrl+r",       () => { this.command("control:document-reload") })
        Mousetrap.bind("ctrl+o",       () => { this.command("control:sample-load") })
        Mousetrap.bind("ctrl+r",       () => { this.command("control:sample-save") })
        Mousetrap.bind("ctrl+shift+o", () => { this.command("control:document-autoload-toggle") })
        Mousetrap.bind("ctrl+shift+r", () => { this.command("control:document-autoreload-toggle") })
        Mousetrap.bind("ctrl+f",       () => { this.command("control:fullscreen-toggle") })
        Mousetrap.bind("ctrl+a",       () => { this.command("app:api-toggle") })
        Mousetrap.bind("ctrl+q",       () => { this.command("app:app-quit") })
        Mousetrap.bind("ctrl+shift+p", () => { this.command("control:documentset-prev") })
        Mousetrap.bind("ctrl+shift+n", () => { this.command("control:documentset-next") })
        Mousetrap.bind("ctrl+p",       () => { this.command("control:document-prev") })
        Mousetrap.bind("ctrl+n",       () => { this.command("control:document-next") })
        Mousetrap.bind("ctrl+d",       () => { this.command("viewport:zoom-change", { mode: "dec" }) })
        Mousetrap.bind("ctrl+0",       () => { this.command("viewport:zoom-change", { mode: "set" }) })
        Mousetrap.bind("ctrl+i",       () => { this.command("viewport:zoom-change", { mode: "inc" }) })
    },
    methods: {
        log (level: string, msg: string, data: { [ key: string ]: any } | null = null) {
            const timestamp = moment().format("YYYY-MM-DD hh:mm:ss.SSS")
            let output = `${timestamp} [${level}]: ${msg}`
            if (data !== null)
                output += ` (${Object.keys(data)
                    .map((key) => key + ": " + JSON.stringify(data[key]))
                    .join(", ")
                })`
            console.log(output)
        },
        command (action: string, data: { [ key: string ]: any } | null = null) {
            const targets = {
                app:      this,
                viewport: this.$refs.viewport as AppViewport,
                control:  this.$refs.control  as AppControl
            }
            this.log("INFO", `app: command: ${action}`, data)
            const m = action.match(/^([^:]+):(.+)$/)
            if (m === null) {
                this.log("ERROR", `app: invalid command format: "${action}"`, data)
                return
            }
            let [ , target, func ] = m
            func = func.replace(/-([a-z])/g, (_, x) => x.toUpperCase())
            const t = (targets as any)[target]
            if (t === undefined) {
                this.log("ERROR", `app: unknown command target: "${action}"`, data)
                return
            }
            const a = t[func]
            if (typeof a !== "function") {
                this.log("ERROR", `app: unknown command action: "${action}"`, data)
                return
            }
            a(data)
        },
        apiToggle (data: { enabled: boolean, addr: string, port: string }) {
            this.log("INFO", "app: API toggle", data)
        }
    }
})
</script>

