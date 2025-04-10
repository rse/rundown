<!--
**
**  Rundown - Generate Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
**
-->

<template>
    <div class="app-input" v-bind:class="{ disabled, labeled: label !== '' }">
        <div v-if="label !== ''" class="label">{{ label }}</div>
        <input ref="input"
            type="text"
            v-bind:disabled="disabled"
            v-bind:placeholder="placeholder"
            v-bind:value="modelValue"
            v-on:input="(ev: Event) => onInput(((ev.target) as HTMLInputElement).value)" />
    </div>
</template>

<style lang="stylus">
.app-input
    border:                  0.1vw solid
    border-radius:           0.5vw
    border-left-color:       var(--color-std-bg-1)
    border-top-color:        var(--color-std-bg-1)
    border-right-color:      var(--color-std-bg-4)
    border-bottom-color:     var(--color-std-bg-4)
    background-color:        var(--color-std-bg-2)
    color:                   var(--color-std-fg-2)
    margin:                  0.2vw
    display:                 flex
    flex-direction:          row
    justify-content:         center
    align-items:             center
    height:                  1.8vw
    .label
        white-space:         nowrap
        border-top-left-radius: 0.5vw
        border-bottom-left-radius: 0.5vw
        border-left-color:   var(--color-std-bg-3)
        border-top-color:    var(--color-std-bg-3)
        border-right-color:  var(--color-std-bg-5)
        border-bottom-color: var(--color-std-bg-5)
        background-color:    var(--color-std-bg-3)
        color:               var(--color-std-fg-2)
        font-family:         var(--font-family)
        font-size:           1.0vw
        padding-top:         0.0vw
        padding-bottom:      0.2vw
        padding-left:        0.4vw
        padding-right:       0.4vw
        height:              calc(1.8vw - 0.6vw)
    input
        width:               calc(100% - 0.4vw)
        border:              0
        outline:             none
        background-color:    transparent
        color:               var(--color-std-fg-3)
        font-family:         var(--font-family)
        font-size:           1.1vw
        padding-top:         0.2vw
        padding-bottom:      0.2vw
        padding-left:        0.4vw
        padding-right:       0.4vw
        user-select:         text
    &:hover
        border-left-color:   var(--color-std-bg-3)
        border-top-color:    var(--color-std-bg-3)
        border-right-color:  var(--color-std-bg-5)
        border-bottom-color: var(--color-std-bg-5)
        background-color:    var(--color-std-bg-4)
        color:               var(--color-std-fg-4)
    &:hover .label
        border-left-color:   var(--color-std-bg-4)
        border-top-color:    var(--color-std-bg-4)
        border-right-color:  var(--color-std-bg-5)
        border-bottom-color: var(--color-std-bg-5)
        background-color:    var(--color-std-bg-5)
        color:               var(--color-std-fg-4)
    &:hover input
        color:               var(--color-std-fg-4)
    &:has(input:focus)
        border-left-color:   var(--color-acc-bg-2)
        border-top-color:    var(--color-acc-bg-2)
        border-right-color:  var(--color-acc-bg-4)
        border-bottom-color: var(--color-acc-bg-4)
        background-color:    var(--color-acc-bg-3)
        color:               var(--color-acc-fg-3)
    input:focus
        color:               var(--color-acc-fg-5)
    &:has(input:focus) .label
        border-left-color:   var(--color-acc-bg-3)
        border-top-color:    var(--color-acc-bg-3)
        border-right-color:  var(--color-acc-bg-4)
        border-bottom-color: var(--color-acc-bg-4)
        background-color:    var(--color-acc-bg-4)
        color:               var(--color-acc-fg-5)
    &.disabled
        background-color:    var(--color-std-bg-2)
    &.disabled .label
        background-color:    var(--color-std-bg-3)
        color:               var(--color-std-fg-0)
    &.disabled input
        background-color:    var(--color-std-bg-2)
        color:               var(--color-std-fg-0)
        user-select:         none
</style>

<script setup lang="ts">
import { defineComponent } from "vue"
</script>

<script lang="ts">
export default defineComponent({
    name: "app-input",
    props: {
        modelValue:  { type: String,  required: true },
        placeholder: { type: String,  default: "" },
        label:       { type: String,  default: "" },
        disabled:    { type: Boolean, default: false }
    },
    emits: [ "update:modelValue" ],
    data: (props) => ({
    }),
    methods: {
        onInput (value: string) {
            if (this.disabled)
                return
            this.$emit("update:modelValue", value)
        }
    }
})
</script>

