<!--
**
**  Rundown - Generate Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
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
import { defineComponent } from "vue"
import moment              from "moment"
import URI                 from "urijs"
import AppControl          from "./app-control.vue"
import AppViewport         from "./app-viewport.vue"
</script>

<script lang="ts">
export default defineComponent({
    name: "app",
    components: {
        "app-control":  AppControl,
        "app-viewport": AppViewport
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
        command (arg: any) {
            this.log("INFO", `command: ${arg}`, { foo: "bar", baz: 42 })
        }
    }
})
</script>

