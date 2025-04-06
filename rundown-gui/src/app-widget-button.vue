<!--
**
**  Rundown - Generate Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
**
-->

<template>
    <div class="app-button" v-bind:class="{ disabled, activated, horizontal: direction === 'horizontal' }"
        v-on:click="click">
        <div class="app-button-icon">
            <i v-bind:class="[ `fa-${iconSeries}`, `fa-${icon}` ]"></i>
        </div>
        <div class="app-button-text">
            {{ text }}
        </div>
        <div v-if="text2 !== ''" class="app-button-text2">
            {{ text2 }}
        </div>
    </div>
</template>

<style lang="stylus">
.app-button
    width: auto
    min-width: 5vw
    display: flex
    flex-direction: column
    justify-content: center
    align-items: center
    border: 0.1vw solid
    border-radius:       0.5vw
    border-left-color:   var(--color-std-bg-4)
    border-top-color:    var(--color-std-bg-4)
    border-right-color:  var(--color-std-bg-2)
    border-bottom-color: var(--color-std-bg-2)
    background-color:    var(--color-std-bg-3)
    color:               var(--color-std-fg-3)
    padding: 0.3vw
    margin:  0.2vw
    .app-button-icon
        width: 100%
        font-size: 2.0vw
        display: flex
        flex-direction: row
        justify-content: center
        align-items: center
    .app-button-text
        margin-top: 0.3vw
        width: 100%
        font-size: 0.8vw
        display: flex
        flex-direction: row
        justify-content: center
        align-items: center
        font-weight: bold
    .app-button-text2
        margin-top: -0.2vw
        width: 100%
        font-size: 0.8vw
        display: flex
        flex-direction: row
        justify-content: center
        align-items: center
    &.activated
        border-left-color:   var(--color-acc-bg-4)
        border-top-color:    var(--color-acc-bg-4)
        border-right-color:  var(--color-acc-bg-2)
        border-bottom-color: var(--color-acc-bg-2)
        background-color:    var(--color-acc-bg-3)
        color:               var(--color-acc-fg-4)
    &:hover
        border-left-color:   var(--color-std-bg-4)
        border-top-color:    var(--color-std-bg-4)
        border-right-color:  var(--color-std-bg-2)
        border-bottom-color: var(--color-std-bg-2)
        background-color:    var(--color-std-bg-5)
        color:               var(--color-std-fg-5)
    &.activated:hover
        border-left-color:   var(--color-acc-bg-4)
        border-top-color:    var(--color-acc-bg-4)
        border-right-color:  var(--color-acc-bg-2)
        border-bottom-color: var(--color-acc-bg-2)
        background-color:    var(--color-acc-bg-5)
        color:               var(--color-acc-fg-5)
    &.disabled
        border-left-color:   var(--color-std-bg-4)
        border-top-color:    var(--color-std-bg-4)
        border-right-color:  var(--color-std-bg-2)
        border-bottom-color: var(--color-std-bg-2)
        background-color:    var(--color-std-bg-3)
        color:               var(--color-std-fg-3)
    &.disabled .app-button-icon,
    &.disabled .app-button-text,
    &.disabled .app-button-text2
        color:               var(--color-std-fg-0)
    &.horizontal
        flex-direction: row
        .app-button-icon
            font-size: 1.0vw
        .app-button-text
            margin-top:  0.2vw
            margin-left: 0.5vw
        .app-button-text2
            margin-top:  0.2vw
            margin-left: 0.3vw
</style>

<script setup lang="ts">
import { defineComponent } from "vue"
</script>

<script lang="ts">
export default defineComponent({
    name: "app-button",
    props: {
        direction:  { type: String,  default: "vertical" },
        iconSeries: { type: String,  default: "solid" },
        icon:       { type: String,  default: "circle-question" },
        text:       { type: String,  default: "unknown" },
        text2:      { type: String,  default: "" },
        activated:  { type: Boolean, default: false },
        disabled:   { type: Boolean, default: false }
    },
    emits: [ "click" ],
    methods: {
        click () {
            if (this.disabled)
                return
            this.$emit("click")
        }
    }
})
</script>

