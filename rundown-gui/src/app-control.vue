<!--
**
**  Rundown - Generate Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
**
-->

<template>
    <div class="app-control">
        <div ref="panelOuter" class="panel-outer">
            <div ref="panelInner" class="panel-inner">
                <img class="icon" v-bind:src="appIcon"/>
                <div class="buttons">
                    <app-button icon-series="regular" icon="folder-open"
                        text="LOAD" text2="Document"
                        v-bind:disabled="autoloadActivated || autoreloadActivated"
                        v-on:click="command('control:document-load')"/>
                    <app-button icon-series="solid" icon="arrows-rotate"
                        text="RELOAD" text2="Document"
                        v-bind:disabled="autoloadActivated || autoreloadActivated || !hostIsApp"
                        v-on:click="command('control:document-reload')"/>
                    <app-button icon-series="solid" icon="file-import"
                        text="LOAD" text2="Sample"
                        v-bind:disabled="autoloadActivated || autoreloadActivated"
                        v-on:click="command('control:sample-load')"/>
                    <app-button icon-series="solid" icon="file-export"
                        text="SAVE" text2="Sample"
                        v-bind:disabled="autoloadActivated || autoreloadActivated"
                        v-on:click="command('control:sample-save')"/>
                    <app-button class="api-enabled"
                        icon-series="solid" icon="gamepad"
                        text="Enable" text2="API"
                        v-bind:disabled="!hostIsApp || apiAddr === '' || apiPort === ''"
                        v-bind:activated="apiEnabled"
                        v-on:click="uiApiToggle"/>
                    <app-button icon-series="solid" icon="circle-xmark"
                        text="QUIT" text2="Application"
                        v-bind:disabled="!hostIsApp"
                        v-on:click="command('app:app-quit')"/>
                </div>
                <div class="buttons">
                    <app-button icon-series="solid" icon="eye"
                        text="AUTOLOAD" text2="Documents"
                        v-bind:activated="autoloadActivated"
                        v-bind:disabled="autoreloadActivated || !hostIsApp"
                        v-on:click="command('control:document-autoload-toggle')"/>
                    <app-button icon-series="solid" icon="eye"
                        text="AUTORELOAD" text2="Documents"
                        v-bind:activated="autoreloadActivated"
                        v-bind:disabled="autoloadActivated || !hostIsApp"
                        v-on:click="command('control:document-autoreload-toggle')"/>
                    <app-button icon-series="solid" icon="magnifying-glass-minus"
                        text="DECREASE" text2="Zoom"
                        v-on:click="command('viewport:zoom-change', { mode: 'dec' })"/>
                    <app-button icon-series="solid" icon="magnifying-glass"
                        text="RESET" text2="Zoom"
                        v-on:click="command('viewport:zoom-change', { mode: 'set' })"/>
                    <app-button icon-series="solid" icon="magnifying-glass-plus"
                        text="INCREASE" text2="Zoom"
                        v-on:click="command('viewport:zoom-change', { mode: 'inc' })"/>
                    <app-button icon-series="solid" icon="expand"
                        text="TOGGLE" text2="Fullscreen"
                        v-on:click="command('control:fullscreen-toggle')"/>
                </div>
                <div class="api">
                    <app-input
                        class="api-addr" ref="apiAddr"
                        label="API IP Address"
                        v-model="apiAddr"
                        v-bind:disabled="apiEnabled"/>
                    <app-input
                        class="api-port" ref="apiPort"
                        label="API TCP Port"
                        v-model="apiPort"
                        v-bind:disabled="apiEnabled"/>
                </div>
                <div class="documents">
                    <div class="document-list">
                        <div class="list-title">
                            <div class="entry-name">Name</div>
                            <div class="entry-position">Position</div>
                            <div class="entry-timestamp">Timestamp</div>
                            <div class="entry-sections">Sections</div>
                            <div class="entry-chunks">Chunks</div>
                            <div class="entry-actions">Actions</div>
                        </div>
                        <div ref="listBody" class="list-body">
                            <div v-for="(documentSet, dsIdx) of documentSets"
                                v-bind:key="documentSet.name"
                                class="list-entry"
                                v-bind:class="{ odd: dsIdx % 2 !== 0 }">
                                <div v-for="(document, dIdx) of documentSet.documents"
                                    v-bind:key="document.timestamp.toString()"
                                    class="entry-document"
                                    v-bind:class="{ selected: document === documentSelected }"
                                    v-on:click="documentAction(documentSet, dsIdx, document, dIdx, 'select')">
                                    <div class="entry-name">{{ dIdx === 0 ? documentSet.name : "" }}</div>
                                    <div class="entry-position">{{ dIdx === 0 ? (documentSet.position * 100).toFixed(0) + "%" : "" }}</div>
                                    <div class="entry-timestamp">{{ moment(document.timestamp).format("yyyy-MM-DD HH:mm:ss") }}</div>
                                    <div class="entry-sections">{{ document.sections }}</div>
                                    <div class="entry-chunks">{{ document.chunks }}</div>
                                    <div class="entry-actions">
                                        <div class="action"
                                            v-on:click.stop="(el) => documentAction(documentSet, dsIdx, document, dIdx, 'delete')">
                                            <i class="fa-solid fa-square-minus"></i>
                                        </div>
                                        <div v-if="dIdx === 0"
                                            class="action"
                                            v-bind:class="{ disabled: dsIdx === 0 }"
                                            v-on:click.stop="(el) => documentSetAction(documentSet, dsIdx, 'move-up')">
                                            <i class="fa-solid fa-square-caret-up"></i>
                                        </div>
                                        <div v-if="dIdx === 0"
                                            class="action"
                                            v-bind:class="{ disabled: dsIdx === documentSets.length - 1 }"
                                            v-on:click.stop="(el) => documentSetAction(documentSet, dsIdx, 'move-down')">
                                            <i class="fa-solid fa-square-caret-down"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="latch" v-on:click="command('control:panel-toggle')">
                <div v-show="!panelOpen" class="latch-down"><i class="fa-solid fa-angles-down"></i></div>
                <div v-show="panelOpen" class="latch-up"><i class="fa-solid fa-angles-up"></i></div>
            </div>
            <div class="latch-overlay"></div>
        </div>
    </div>
</template>

<style lang="stylus">
.app-control
    width:  100vw
    height: 100vh
    margin: 0
    padding: 0
    .panel-outer
        width: 38vw
        margin-left: auto
        margin-right: auto
        .panel-inner
            box-shadow: 0 0 1vw #111111
            width: 38vw
            height: auto
            display: flex
            flex-direction: column
            justify-content: center
            align-items: center
            border: 0.1vw solid
            border-bottom-left-radius:  0.5vw
            border-bottom-right-radius: 0.5vw
            border-left-color:   var(--color-std-bg-4)
            border-top-color:    var(--color-std-bg-4)
            border-right-color:  var(--color-std-bg-2)
            border-bottom-color: var(--color-std-bg-2)
            background-color:    var(--color-std-bg-3)
            padding: 1vw 1vw 1.5vw 1vw
            .icon
                width: 8vw
                margin-bottom: 1vw
            .buttons
                width: 100%
                display: flex
                flex-direction: row
                justify-content: center
                align-items: center
            .api
                margin-top: 1vw
                display: flex
                flex-direction: row
                justify-content: center
                align-items: center
                .api-addr
                    width: 40%
                .api-port
                    width: 40%
            .documents
                margin-top: 1vw
                display: flex
                flex-direction: column
                justify-content: center
                align-items: center
        .documents
            width: 35vw
            .document-list
                width: calc(100% - 0.2vw)
                height: 15vw
                display: flex
                flex-direction: column
                justify-content: flex-start
                align-items: center
                border: 0.1vw solid
                border-radius: 0.5vw
                border-left-color:   var(--color-std-bg-2)
                border-top-color:    var(--color-std-bg-2)
                border-right-color:  var(--color-std-bg-4)
                border-bottom-color: var(--color-std-bg-4)
                background-color:    var(--color-std-bg-2)
                color:               var(--color-std-fg-3)
                padding: 0.1vw 0.1vw 0.1vw 0.1vw
                .list-title
                    width: calc(100% - 0.2vw)
                    display: flex
                    flex-direction: row
                    justify-content: center
                    align-items: center
                    padding: 0.1vw 0.1vw 0.1vw 0.1vw
                    background-color: var(--color-std-bg-3)
                    border-top-left-radius:  0.5vw
                    border-top-right-radius: 0.5vw
                    font-size: 0.8vw
                    .entry-name
                        width: calc(30% - 0.2vw - 0.4vw)
                        padding-left: 0.4vw
                    .entry-position
                        width: calc(10% - 0.8vw)
                        padding-left: 0.4vw
                        padding-right: 0.4vw
                        text-align: right
                    .entry-timestamp
                        width: calc(20% - 0.4vw)
                        padding-left: 0.4vw
                    .entry-sections
                        width: calc(10% - 0.4vw)
                        padding-left: 0.4vw
                        text-align: right
                    .entry-chunks
                        width: calc(10% - 0.8vw)
                        padding-left: 0.4vw
                        padding-right: 0.4vw
                        text-align: right
                    .entry-actions
                        width: calc(20% - 0.4vw)
                        padding-left: 0.4vw
                .list-body
                    position: relative
                    width: 100%
                    height: 15vw
                    overflow: auto
                .list-entry
                    width: 100%
                    display: flex
                    flex-direction: column
                    justify-content: center
                    align-items: center
                    font-size: 1.1vw
                    &.odd
                        background-color: var(--color-std-bg-1)
                    .entry-documentset
                        width: calc(100% - 0.2vw)
                        padding: 0.1vw 0.1vw 0.1vw 0.1vw
                        display: flex
                        flex-direction: row
                        justify-content: center
                        align-items: center
                    .entry-document
                        width: calc(100% - 0.2vw)
                        padding: 0.1vw 0.1vw 0.1vw 0.1vw
                        display: flex
                        flex-direction: row
                        justify-content: center
                        align-items: center
                        &:hover
                            background-color: var(--color-std-bg-4)
                        &.selected
                            background-color: var(--color-acc-bg-3)
                            color: var(--color-acc-fg-3)
                            .entry-actions
                                .action
                                    &:hover
                                        color: var(--color-acc-fg-5)
                                    &.disabled
                                        color: var(--color-acc-fg-1)
                    .entry-name
                        width: calc(30% - 0.2vw - 0.4vw)
                        padding-left: 0.4vw
                        font-weight: bold
                    .entry-position
                        width: calc(10% - 0.8vw)
                        padding-left: 0.4vw
                        padding-right: 0.4vw
                        text-align: right
                    .entry-timestamp
                        width: calc(20% - 0.4vw)
                        padding-left: 0.4vw
                        font-size: 0.75vw
                    .entry-sections
                        width: calc(10% - 0.4vw)
                        padding-left: 0.4vw
                        text-align: right
                    .entry-chunks
                        width: calc(10% - 0.8vw)
                        padding-left: 0.4vw
                        padding-right: 0.4vw
                        text-align: right
                    .entry-actions
                        width: calc(20% - 0.4vw)
                        padding-left: 0.4vw
                        display: flex
                        flex-direction: row
                        justify-content: flex-start
                        align-items: center
                        .action
                            margin-right: 0.2vw
                            &:hover
                                color: var(--color-std-fg-5)
                            &.disabled
                                color: var(--color-std-fg-0)
                        .action:first-child
                            margin-right: 0.8vw
        .latch
            box-shadow: 0 0 0.5vw #111111
            position: relative
            left: calc(50% - 2vw)
            top: -0.1vw
            width: 4vw
            height: 1.5vw
            font-size: 0.8vw
            border: 0.1vw solid
            border-bottom-left-radius: 0.3vw
            border-bottom-right-radius: 0.3vw
            border-left-color:   var(--color-std-bg-4)
            border-top-color:    var(--color-std-bg-3)
            border-right-color:  var(--color-std-bg-2)
            border-bottom-color: var(--color-std-bg-2)
            background-color:    var(--color-std-bg-3)
            color:               var(--color-std-fg-1)
            display: flex
            flex-direction: column
            justify-content: center
            align-items: center
            &:hover
                border-left-color:   var(--color-std-bg-5)
                border-top-color:    var(--color-std-bg-4)
                border-right-color:  var(--color-std-bg-3)
                border-bottom-color: var(--color-std-bg-3)
                background-color:    var(--color-std-bg-4)
                color:               var(--color-std-fg-4)
        .latch-overlay
            position: relative
            left: calc(50% - 2.0vw)
            top: -3.2vw
            width: 4.2vw
            height: 1.5vw
            background-color:    var(--color-std-bg-3)
            z-index: 200
</style>

<script setup lang="ts">
import { defineComponent } from "vue"
import moment              from "moment"
import Anime               from "animejs"
import PerfectScrollbar    from "perfect-scrollbar"

import type { DocumentSet, Document, AppControl } from "./app-control.d.ts"

import appWidgetButton     from "./app-widget-button.vue"
import appWidgetInput      from "./app-widget-input.vue"
import appLogo             from "./app-logo.svg?url"
</script>

<script lang="ts">
interface Data {
    appIcon:             string
    panelOpen:           boolean
    hostIsApp:           boolean
    autoloadActivated:   boolean
    autoreloadActivated: boolean
    apiAddr:             string
    apiPort:             string
    apiEnabled:          boolean
    documentSets:        DocumentSet[]
    documentSetSelected: DocumentSet | null
    documentSelected:    Document    | null
    ps:                  PerfectScrollbar | null
}
export default defineComponent({
    name: "app-control",
    components: {
        "app-button": appWidgetButton,
        "app-input":  appWidgetInput
    },
    props: {
        options: { type: Object, default: new Map<string, string | boolean>() }
    },
    emits: [ "log", "command" ],
    data (): Data {
        return {
            appIcon:             appLogo,
            panelOpen:           true,
            hostIsApp:           false,
            autoloadActivated:   false,
            autoreloadActivated: false,
            apiAddr:             "0.0.0.0",
            apiPort:             "8888",
            apiEnabled:          false,
            documentSets:        [
                {
                    id: 1, name: "test1", position: 0.3, documents: [
                        { timestamp: new Date(), sections: 1, chunks: 2 },
                        { timestamp: new Date(), sections: 1, chunks: 2 },
                        { timestamp: new Date(), sections: 1, chunks: 2 }
                    ] as Document[]
                },
                {
                    id: 2, name: "test2", position: 0.5, documents: [
                        { timestamp: new Date(), sections: 1, chunks: 2 },
                        { timestamp: new Date(), sections: 1, chunks: 2 }
                    ] as Document[]
                },
                {
                    id: 3, name: "test3", position: 0.7, documents: [
                        { timestamp: new Date(), sections: 1, chunks: 2 },
                    ] as Document[]
                },
                {
                    id: 4, name: "test4", position: 0.7, documents: [
                        { timestamp: new Date(), sections: 1, chunks: 2 },
                    ] as Document[]
                },
                {
                    id: 5, name: "test5", position: 0.0, documents: [
                        { timestamp: new Date(), sections: 1, chunks: 2 },
                        { timestamp: new Date(), sections: 1, chunks: 2 },
                        { timestamp: new Date(), sections: 1, chunks: 2 }
                    ] as Document[]
                }
            ],
            documentSetSelected: null,
            documentSelected:    null,
            ps: null
        }
    },
    async created () {
        const g = window as any
        this.hostIsApp = (typeof g.rundown === "object" && g.rundown !== null)
    },
    async mounted () {
        this.log("INFO", "starting control")

        /*  activate improved scrolling  */
        const container = this.$refs.listBody as HTMLElement
        this.ps = new PerfectScrollbar(container, {
            suppressScrollX: true,
            scrollXMarginOffset: 100
        })

        /*  react changes to the selected document  */
        this.$watch("documentSelected", () => {
            this.command("viewport:load", { data: this.documentSelected })
        })
    },
    methods: {
        /*  ==== INTERNAL API ====  */

        log (level: string, msg: string, data?: any) {
            this.$emit("log", level, `control: ${msg}`, data)
        },
        command (action: string, data: { [ key: string ]: any } | null = null) {
            this.$emit("command", action, data)
        },
        sampleSave () {
            this.log("INFO", "Sample Save")
        },
        sampleLoad () {
            this.log("INFO", "Sample Load")
        },
        documentLoad () {
            if (this.autoloadActivated || this.autoreloadActivated)
                return
            this.log("INFO", "Document Load")
        },
        documentReload () {
            if (this.autoloadActivated || this.autoreloadActivated)
                return
            this.log("INFO", "Document Reload")
        },
        documentAutoloadToggle () {
            if (this.autoreloadActivated)
                return
            this.log("INFO", "Document Auto Load")
            this.autoloadActivated = !this.autoloadActivated
        },
        documentAutoreloadToggle () {
            if (this.autoloadActivated)
                return
            this.log("INFO", "Document Auto Reload")
            this.autoreloadActivated = !this.autoreloadActivated
        },
        fullscreenToggle () {
            this.log("INFO", "Fullscreen Toggle")
        },
        uiApiToggle () {
            this.apiEnabled = !this.apiEnabled
            this.command("app:api-toggle", {
                enabled: this.apiEnabled,
                addr:    this.apiAddr,
                port:    this.apiPort
            })
        },
        documentSetAction (documentSet: DocumentSet, dsIdx: number, action: string) {
            const documentSets = this.documentSets
            if (action === "move-up" && dsIdx > 0) {
                documentSets.splice(dsIdx, 1)
                documentSets.splice(dsIdx > 0 ? dsIdx - 1 : 0, 0, documentSet)
            }
            else if (action === "move-down" && dsIdx < documentSets.length - 1) {
                documentSets.splice(dsIdx, 1)
                documentSets.splice(dsIdx < documentSets.length - 1 ? dsIdx + 1 :
                    documentSets.length, 0, documentSet)
            }
        },
        documentAction (documentSet: DocumentSet, dsIdx: number, document: Document, dIdx: number, action: string) {
            const documents = documentSet.documents
            if (action === "select") {
                this.documentSetSelected = documentSet
                this.documentSelected = document
            }
            else if (action === "delete") {
                documents.splice(dIdx, 1)
                if (this.documentSelected === document) {
                    this.documentSetSelected = null
                    this.documentSelected    = null
                }
            }
        },

        /*  ==== EXTERNAL API ====  */

        /*  determine wheter panel is already opened  */
        panelOpened (this: Data & AppControl) {
            return this.panelOpen
        },

        /*  toggle panel opening state  */
        async panelToggle (this: Data & AppControl & { $refs: any }) {
            const panelOuter = this.$refs.panelOuter as HTMLElement
            const panelInner = this.$refs.panelInner as HTMLElement
            const tl = Anime.timeline({
                targets:  panelOuter,
                duration: 500,
                autoplay: true
            })
            if (!this.panelOpen)
                /*  open panel  */
                tl.add({
                    easing:     "spring(1, 80, 10, 0)",
                    translateY: [ -panelInner.clientHeight, 0 ]
                })
            else
                /*  close panel  */
                tl.add({
                    easing:     "spring(1, 80, 10, 0)",
                    translateY: [ 0, -panelInner.clientHeight ]
                })
            await tl.finished
            this.panelOpen = !this.panelOpen
            return this.panelOpen
        },

        /*  determine available document sets  */
        docSetsList (this: Data & AppControl) {
            return this.documentSets
        },

        /*  determine available documents in selected document set  */
        docList (this: Data & AppControl) {
            if (this.documentSetSelected === null)
                throw new Error("still no document set selected")
            return this.documentSetSelected.documents
        },

        /*  select document set by id  */
        docSetSelectById (this: Data & AppControl, id: number) {
            const documentSet = this.documentSets.find((documentSet) => documentSet.id === id)
            if (!documentSet)
                throw new Error("invalid document set id")
            this.documentSetSelected = documentSet
            this.docSelectByDirection("last")
        },

        /*  select document set by direction  */
        docSetSelectByDirection (this: Data & AppControl, direction: "first" | "prev" | "next" | "last") {
            if (this.documentSets.length === 0)
                throw new Error("no document sets loaded at all")
            if (direction === "first") {
                this.documentSetSelected = this.documentSets[0]
                this.docSelectByDirection("last")
            }
            else if (direction === "last") {
                this.documentSetSelected = this.documentSets[this.documentSets.length - 1]
                this.docSelectByDirection("last")
            }
            else {
                if (this.documentSetSelected === null)
                    throw new Error("relative directions need an already selected document set")
                const idx = this.documentSets.findIndex((documentSet) =>
                    documentSet === this.documentSetSelected)
                if (direction === "prev" && idx > 0) {
                    this.documentSetSelected = this.documentSets[idx - 1]
                    this.docSelectByDirection("last")
                }
                else if (direction === "next" && idx < this.documentSets.length - 1) {
                    this.documentSetSelected = this.documentSets[idx + 1]
                    this.docSelectByDirection("last")
                }
            }
        },

        /*  select document in selected document set by id  */
        docSelectById (this: Data & AppControl, id: number) {
            if (this.documentSetSelected === null)
                throw new Error("still no document set selected")
            const document = this.documentSetSelected.documents.find(
                (document) => document.id === id)
            if (!document)
                throw new Error("no such document in currently selected document set")
            this.documentSelected = document
        },

        /*  select document in selected document set by direction  */
        docSelectByDirection (this: Data & AppControl, direction: "first" | "prev" | "next" | "last") {
            const documentSet = this.documentSetSelected
            if (documentSet === null)
                throw new Error("no document set selected")
            const documents = documentSet.documents
            if (documents.length === 0)
                throw new Error("no documents in selected document set")
            if (direction === "first")
                this.documentSelected = documents[0]
            else if (direction === "last")
                this.documentSelected = documents[documents.length - 1]
            else {
                if (this.documentSelected === null)
                    throw new Error("relative directions need an already selected document")
                const idx = documents.findIndex((document) => document === this.documentSelected)
                if (direction === "prev" && idx > 0)
                    this.documentSelected = documents[idx - 1]
                else if (direction === "next" && idx < documents.length - 1)
                    this.documentSelected = documents[idx + 1]
            }
        }
    }
})
</script>

