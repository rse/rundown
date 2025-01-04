<!--
**
**  Rundown - Generate Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
**
-->

<template>
    <div class="app-control">
        <div class="buttons">
            <app-button icon-series="solid" icon="file-export"
                text="SAVE" text2="Sample"
                v-bind:disabled="autoloadActivated || autoreloadActivated"
                v-on:click="doSampleSave"/>
            <app-button icon-series="solid" icon="file-import"
                text="LOAD" text2="Sample"
                v-bind:disabled="autoloadActivated || autoreloadActivated"
                v-on:click="doSampleLoad"/>
            <app-button icon-series="regular" icon="folder-open"
                text="LOAD" text2="Document"
                v-bind:disabled="autoloadActivated || autoreloadActivated"
                v-on:click="doDocumentLoad"/>
            <app-button icon-series="solid" icon="arrows-rotate"
                text="RELOAD" text2="Document"
                v-bind:disabled="autoloadActivated || autoreloadActivated || !hostIsApp"
                v-on:click="doDocumentReload"/>
            <app-button icon-series="solid" icon="eye"
                text="AUTOLOAD" text2="Document"
                v-bind:activated="autoloadActivated"
                v-bind:disabled="autoreloadActivated || !hostIsApp"
                v-on:click="doDocumentAutoLoad"/>
            <app-button icon-series="solid" icon="eye"
                text="AUTORELOAD" text2="Document"
                v-bind:activated="autoreloadActivated"
                v-bind:disabled="autoloadActivated || !hostIsApp"
                v-on:click="doDocumentAutoReload"/>
            <app-button icon-series="solid" icon="expand"
                text="TOGGLE" text2="Fullscreen"
                v-on:click="doFullscreenToggle"/>
            <app-button icon-series="solid" icon="circle-xmark"
                text="QUIT" text2="Application"
                v-bind:disabled="!hostIsApp"
                v-on:click="doAppQuit"/>
        </div>
        <div class="documents">
        </div>
    </div>
</template>

<style lang="stylus">
.app-control
    width:  100vw
    height: auto
    margin: 0
    padding: 0
    display: flex
    flex-direction: column
    justify-content: center
    align-items: center
    .buttons
        position: absolute
        top: 0
        margin-left: auto
        margin-right: auto
        border: 0.1vw solid
        border-left-color:   var(--color-std-bg-4)
        border-top-color:    var(--color-std-bg-4)
        border-right-color:  var(--color-std-bg-2)
        border-bottom-color: var(--color-std-bg-2)
        background-color:    var(--color-std-bg-3)
        display: flex
        flex-direction: row
        justify-content: center
        align-items: center
    .documents
        display: flex
        flex-direction: column
        justify-content: center
        align-items: center
</style>

<script setup lang="ts">
import { defineComponent } from "vue"
import appButton from "./app-widget-button.vue"
</script>

<script lang="ts">
export default defineComponent({
    name: "app-control",
    components: {
        "app-button": appButton
    },
    props: {
        options: { type: Object, default: new Map<string, string | boolean>() }
    },
    emits: [ "log", "command" ],
    data: () => ({
        hostIsApp:           false,
        autoloadActivated:   false,
        autoreloadActivated: false
    }),
    async created () {
        const g = window as any
        this.hostIsApp = (typeof g.rundown === "object" && g.rundown !== null)
    },
    async mounted () {
        this.log("INFO", "starting control")
        this.$emit("command", "foo")
    },
    methods: {
        log (level: string, msg: string) {
            this.$emit("log", level, msg)
        },
        doSampleSave () {
            this.log("info", "Sample Save")
        },
        doSampleLoad () {
            this.log("info", "Sample Load")
        },
        doDocumentLoad () {
            if (this.autoloadActivated || this.autoreloadActivated)
                return
            this.log("info", "Document Load")
        },
        doDocumentReload () {
            if (this.autoloadActivated || this.autoreloadActivated)
                return
            this.log("info", "Document Reload")
        },
        doDocumentAutoLoad () {
            if (this.autoreloadActivated)
                return
            this.log("info", "Document Auto Load")
            this.autoloadActivated = !this.autoloadActivated
        },
        doDocumentAutoReload () {
            if (this.autoloadActivated)
                return
            this.log("info", "Document Auto Reload")
            this.autoreloadActivated = !this.autoreloadActivated
        },
        doFullscreenToggle () {
            this.log("info", "Fullscreen Toggle")
        },
        doAppQuit () {
            this.log("info", "App Quit")
        }
    }
})
</script>

