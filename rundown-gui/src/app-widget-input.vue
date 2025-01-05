<!--
**
**  Rundown - Generate Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
**
-->

<template>
    <div class="app-input" v-bind:class="{ disabled, labeled: label !== '' }">
        <div v-if="label !== ''" class="label">{{ label }}:</div>
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
    border-right-color:      var(--color-std-bg-3)
    border-bottom-color:     var(--color-std-bg-3)
    background-color:        var(--color-std-bg-2)
    color:                   var(--color-std-fg-2)
    margin:                  0.2vw
    display:                 flex
    flex-direction:          row
    justify-content:         center
    align-items:             center
    .label
        white-space:         nowrap
        border-left-color:   var(--color-std-bg-3)
        border-top-color:    var(--color-std-bg-3)
        border-right-color:  var(--color-std-bg-5)
        border-bottom-color: var(--color-std-bg-5)
        background-color:    var(--color-std-bg-3)
        color:               var(--color-std-fg-4)
        font-family:         var(--font-family)
        font-size:           1.0vw
        padding-top:         0.2vw
        padding-bottom:      0.2vw
        padding-left:        0.4vw
        padding-right:       0.4vw
    input
        width:               100%
        border:              0
        outline:             none
        background-color:    transparent
        color:               var(--color-std-fg-3)
        font-family:         var(--font-family)
        font-size:           1.2vw
        padding-top:         0.2vw
        padding-bottom:      0.2vw
        padding-left:        0.4vw
        padding-right:       0.4vw
    &:hover
        border-left-color:   var(--color-std-bg-3)
        border-top-color:    var(--color-std-bg-3)
        border-right-color:  var(--color-std-bg-5)
        border-bottom-color: var(--color-std-bg-5)
        background-color:    var(--color-std-bg-4)
        color:               var(--color-std-fg-4)
    &.disabled
        background-color:    var(--color-std-bg-3)
    &:hover .label,
    &:hover input
        color:               var(--color-std-fg-4)
    &.disabled .label,
    &.disabled input
        color:               var(--color-std-fg-1)
</style>

<script setup lang="ts">
import { defineComponent } from "vue"
</script>

<script lang="ts">
export default defineComponent({
    name: "app-input",
    props: {
        modelValue:  { type: String,  default: "", required: true },
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

