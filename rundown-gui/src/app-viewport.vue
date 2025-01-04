<!--
**
**  Rundown - Generate Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
**
-->

<template>
    <div class="app-viewport">
        <iframe ref="viewport" class="viewport"></iframe>
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
        const iframe = this.$refs.viewport
        iframe.contentWindow.document.open()
        iframe.contentWindow.document.write(html)
        iframe.contentWindow.document.close()
    },
    methods: {
        log (level: string, msg: string) {
            this.$emit("log", level, msg)
        },
        update (data: string) {
            this.log("INFO", "UPDATE")
        }
    }
})
</script>

