<!--
**
**  Rundown - Generate Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
**
-->

<template>
    <div class="app-viewport">
        <iframe ref="viewport"
            class="viewport"
            v-bind:style="`zoom: ${zoomLevel}`">
        </iframe>
    </div>
</template>

<style lang="stylus">
.app-viewport
    position: relative
    width:  100%
    height: 100%
    border: 0
    .viewport
        width:  100%
        height: 100%
        background-color: var(--color-std-bg-1)
        color: var(--color-std-fg-1)
        border: 0
</style>

<script setup lang="ts">
import { defineComponent } from "vue"
</script>

<script lang="ts">
export default defineComponent({
    name: "app-viewport",
    components: {},
    props: {
        options:    { type: Object, default: new Map<string, string | boolean>() }
    },
    emits: [ "log" ],
    data: () => ({
        zoomLevel: 1.0
    }),
    async mounted () {
        this.log("INFO", "starting viewport")
        // this.$refs.viewport.src = "http://engelschall.com"
        const html = `
            <html>
                <head>
                </head>
                <body>
                    <h1>TEST</h1>
                </body>
            </html>
        `
        const iframe = this.$refs.viewport as HTMLIFrameElement
        iframe.contentWindow!.document.open()
        iframe.contentWindow!.document.write(html)
        iframe.contentWindow!.document.close()
    },
    methods: {
        log (level: string, msg: string, data?: any) {
            this.$emit("log", level, `viewport: ${msg}`, data)
        },
        load (data: string) {
            this.log("INFO", "UPDATE")
        },
        zoom (mode: "inc" | "set" | "dec") {
            if (mode === "set")
                this.zoomLevel = 1.0
            else if (mode === "dec")
                this.zoomLevel -= this.zoomLevel > 0.5 ? 0.1 : 0.0
            else if (mode === "inc")
                this.zoomLevel += this.zoomLevel < 1.5 ? 0.1 : 0.0
            this.log("INFO", `ZOOM: ${mode}`)
        }
    }
})
</script>

