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
            <div class="button"
                v-on:click="doOpen">
                <div class="button-icon"><i class="fas fa-home"></i></div>
                <div class="button-text">OPEN</div>
            </div>
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
        .button
            width: 4vw
            display: flex
            flex-direction: column
            justify-content: center
            align-items: center
            border: 0.1vw solid
            border-left-color:   var(--color-std-bg-4)
            border-top-color:    var(--color-std-bg-4)
            border-right-color:  var(--color-std-bg-2)
            border-bottom-color: var(--color-std-bg-2)
            background-color:    var(--color-std-bg-3)
            color:               var(--color-std-fg-3)
            margin: 0.2vw
            .button-icon
                width: 100%
                font-size: 2.0vw
                display: flex
                flex-direction: row
                justify-content: center
                align-items: center
            .button-text
                margin-top: 0.1vw
                width: 100%
                font-size: 0.8vw
                display: flex
                flex-direction: row
                justify-content: center
                align-items: center
            &:hover
                border-left-color:   var(--color-std-bg-5)
                border-top-color:    var(--color-std-bg-5)
                border-right-color:  var(--color-std-bg-3)
                border-bottom-color: var(--color-std-bg-3)
                background-color:    var(--color-std-bg-4)
                color:               var(--color-std-fg-4)
    .documents
        display: flex
        flex-direction: column
        justify-content: center
        align-items: center
</style>

<script setup lang="ts">
import { defineComponent } from "vue"
</script>

<script lang="ts">
export default defineComponent({
    name: "app-control",
    components: {
    },
    props: {
        options:    { type: Object, default: new Map<string, string | boolean>() }
    },
    emits: [ "log", "command" ],
    data: () => ({
    }),
    async mounted () {
        this.log("INFO", "starting control")
        this.$emit("command", "foo")
    },
    methods: {
        log (level: string, msg: string) {
            this.$emit("log", level, msg)
        },
        doOpen () {
            this.log("info", "OPEN")
        }
    }
})
</script>

