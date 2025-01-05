<!--
**
**  Rundown - Generate Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
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
                        v-on:click="doDocumentLoad"/>
                    <app-button icon-series="solid" icon="arrows-rotate"
                        text="RELOAD" text2="Document"
                        v-bind:disabled="autoloadActivated || autoreloadActivated || !hostIsApp"
                        v-on:click="doDocumentReload"/>
                    <app-button icon-series="solid" icon="file-import"
                        text="LOAD" text2="Sample"
                        v-bind:disabled="autoloadActivated || autoreloadActivated"
                        v-on:click="doSampleLoad"/>
                    <app-button icon-series="solid" icon="file-export"
                        text="SAVE" text2="Sample"
                        v-bind:disabled="autoloadActivated || autoreloadActivated"
                        v-on:click="doSampleSave"/>
                    <app-button class="api-enabled"
                        icon-series="solid" icon="gamepad"
                        text="Enable" text2="API"
                        v-bind:disabled="!hostIsApp && false"
                        v-bind:activated="apiEnabled"
                        v-on:click="doApiToggle"/>
                    <app-button icon-series="solid" icon="circle-xmark"
                        text="QUIT" text2="Application"
                        v-bind:disabled="!hostIsApp"
                        v-on:click="doAppQuit"/>
                </div>
                <div class="buttons">
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
                    <app-button icon-series="solid" icon="magnifying-glass-plus"
                        text="INCREASE" text2="Zoom"
                        v-on:click="doZoomInc"/>
                    <app-button icon-series="solid" icon="magnifying-glass"
                        text="RESET" text2="Zoom"
                        v-on:click="doZoomSet"/>
                    <app-button icon-series="solid" icon="magnifying-glass-minus"
                        text="DECREASE" text2="Zoom"
                        v-on:click="doZoomDec"/>
                    <app-button icon-series="solid" icon="expand"
                        text="TOGGLE" text2="Fullscreen"
                        v-on:click="doFullscreenToggle"/>
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
                            <div class="entry-timestamp">Timestamp</div>
                            <div class="entry-sections">Sections</div>
                            <div class="entry-chunks">Chunks</div>
                            <div class="entry-position">Position</div>
                            <div class="entry-actions">Actions</div>
                        </div>
                        <div ref="listBody" class="list-body">
                            <div v-for="(document, idx) of documents" v-bind:key="document.name"
                                class="list-entry" v-bind:class="{ odd: idx % 2 !== 0 }">
                                <div class="entry-main"
                                    v-bind:class="{
                                        selected: document === documentSelected,
                                        opened: document === documentOpened }"
                                    v-on:click="listEntryAction(document, idx, 'select')">
                                    <div class="entry-name">{{ document.name ?? "" }}</div>
                                    <div class="entry-timestamp">{{ moment(document.timestamp).format("yyyy-MM-DD HH:mm:ss") }}</div>
                                    <div class="entry-sections">{{ document.sections }}</div>
                                    <div class="entry-chunks">{{ document.chunks }}</div>
                                    <div class="entry-position">{{ document.position ? (document.position * 100).toFixed(0) + "%" : "" }}</div>
                                    <div class="entry-actions">
                                        <div class="action"
                                            v-on:click.stop="(el) => listEntryAction(document, idx, 'delete')">
                                            <i class="fa-solid fa-square-minus"></i>
                                        </div>
                                        <div class="action"
                                            v-bind:class="{ disabled: idx === 0 }"
                                            v-on:click.stop="(el) => listEntryAction(document, idx, 'move-up')">
                                            <i class="fa-solid fa-square-caret-up"></i>
                                        </div>
                                        <div class="action"
                                            v-bind:class="{ disabled: idx === documents.length - 1 }"
                                            v-on:click.stop="(el) => listEntryAction(document, idx, 'move-down')">
                                            <i class="fa-solid fa-square-caret-down"></i>
                                        </div>
                                        <div class="action"
                                            v-bind:class="{ disabled: document === documentOpened }"
                                            v-on:click.stop="(el) => listEntryAction(document, idx, 'open')">
                                            <i class="fa-solid fa-square-check"></i>
                                        </div>
                                    </div>
                                </div>
                                <div v-if="document.updates" class="entry-updates">
                                    <div v-for="(documentU, idxU) of document.updates" v-bind:key="document.name! + documentU.timestamp"
                                        class="list-entry">
                                        <div class="entry-main"
                                            v-bind:class="{
                                                selected: documentU === documentSelected,
                                                opened: documentU === documentOpened }"
                                            v-on:click="listEntryUpdateAction(document, idx, documentU, idxU, 'select')">
                                            <div class="entry-name"></div>
                                            <div class="entry-timestamp">{{ moment(documentU.timestamp).format("yyyy-MM-DD HH:mm:ss") }}</div>
                                            <div class="entry-sections">{{ documentU.sections }}</div>
                                            <div class="entry-chunks">{{ documentU.chunks }}</div>
                                            <div class="entry-position"></div>
                                            <div class="entry-actions">
                                                <div class="action"
                                                    v-on:click.stop="(el) => listEntryUpdateAction(document, idx, documentU, idxU, 'delete')">
                                                    <i class="fa-solid fa-square-minus"></i>
                                                </div>
                                                <div class="action disabled">
                                                    <i class="fa-solid fa-square-caret-up"></i>
                                                </div>
                                                <div class="action disabled">
                                                    <i class="fa-solid fa-square-caret-down"></i>
                                                </div>
                                                <div class="action"
                                                    v-bind:class="{ disabled: documentU === documentOpened }"
                                                    v-on:click.stop="(el) => listEntryUpdateAction(document, idx, documentU, idxU, 'open')">
                                                    <i class="fa-solid fa-square-check"></i>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="latch" v-on:click="panelToggle">
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
                height: 10vw
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
                        width: calc(35% - 0.2vw - 0.4vw)
                        padding-left: 0.4vw
                    .entry-timestamp
                        width: calc(20% - 0.4vw)
                        padding-left: 0.4vw
                    .entry-sections
                        width: calc(10% - 0.4vw)
                        padding-left: 0.4vw
                    .entry-chunks
                        width: calc(10% - 0.4vw)
                        padding-left: 0.4vw
                    .entry-position
                        width: calc(10% - 0.4vw)
                        padding-left: 0.4vw
                    .entry-actions
                        width: calc(15% - 0.4vw)
                        padding-left: 0.4vw
                .list-body
                    position: relative
                    width: 100%
                    height: 10vw
                    overflow: auto
                .list-entry
                    width: 100%
                    display: flex
                    flex-direction: column
                    justify-content: center
                    align-items: center
                    &.odd
                        background-color: var(--color-std-bg-1)
                    .entry-main
                        width: calc(100% - 0.2vw)
                        padding: 0.1vw 0.1vw 0.1vw 0.1vw
                        display: flex
                        flex-direction: row
                        justify-content: center
                        align-items: center
                        &.selected
                            background-color: var(--color-acc-bg-3)
                            color: var(--color-acc-fg-3)
                            .entry-actions
                                .action
                                    &:hover
                                        color: var(--color-acc-fg-5)
                                    &.disabled
                                        color: var(--color-acc-fg-1)
                        &.opened
                            background-color: var(--color-sig-bg-3)
                            color: var(--color-sig-fg-3)
                            .entry-actions
                                .action
                                    &:hover
                                        color: var(--color-sig-fg-5)
                                    &.disabled
                                        color: var(--color-sig-fg-1)
                    .entry-updates
                        width: 100%
                        display: flex
                        flex-direction: column
                        justify-content: center
                        align-items: center
                    .entry-name
                        width: calc(35% - 0.2vw - 0.4vw)
                        padding-left: 0.4vw
                    .entry-timestamp
                        width: calc(20% - 0.4vw)
                        padding-left: 0.4vw
                        font-size: 0.75vw
                    .entry-sections
                        width: calc(10% - 0.4vw)
                        padding-left: 0.4vw
                        text-align: center
                    .entry-chunks
                        width: calc(10% - 0.4vw)
                        padding-left: 0.4vw
                        text-align: center
                    .entry-position
                        width: calc(10% - 0.4vw)
                        padding-left: 0.4vw
                        text-align: center
                    .entry-actions
                        width: calc(15% - 0.4vw)
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
                                color: var(--color-std-fg-1)
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
import Mousetrap           from "mousetrap"
import PerfectScrollbar    from "perfect-scrollbar"
import appWidgetButton     from "./app-widget-button.vue"
import appWidgetInput      from "./app-widget-input.vue"
import appLogo             from "./app-logo.svg?url"
</script>

<script lang="ts">
interface Document {
    name?:     string
    timestamp: Date
    sections:  number
    chunks:    number
    position?: number
    data?:     any
    updates?:  Document[]
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
    data: () => ({
        appIcon:             appLogo,
        panelOpen:           true,
        hostIsApp:           false,
        autoloadActivated:   false,
        autoreloadActivated: false,
        apiAddr:             "0.0.0.0",
        apiPort:             "8888",
        apiEnabled:          false,
        documents:           [
            { name: "test0", timestamp: new Date(), sections: 1, chunks: 2, position: 0.3 },
            {
                name: "test1", timestamp: new Date(), sections: 1, chunks: 2, position: 0.3, updates:
                [
                    { timestamp: new Date(), sections: 1, chunks: 2 },
                    { timestamp: new Date(), sections: 1, chunks: 2 },
                    { timestamp: new Date(), sections: 1, chunks: 2 }
                ]
            },
            { name: "test2", timestamp: new Date(), sections: 1, chunks: 2, position: 0.3 },
            { name: "test3", timestamp: new Date(), sections: 1, chunks: 2, position: 0.3 },
        ] as Document[],
        documentSelected:    null as Document | null,
        documentOpened:      null as Document | null,
        ps: null as PerfectScrollbar | null
    }),
    async created () {
        const g = window as any
        this.hostIsApp = (typeof g.rundown === "object" && g.rundown !== null)
    },
    async mounted () {
        this.log("INFO", "starting control")

        /*  activate perfect scrolling  */
        const container = this.$refs.listBody as HTMLElement
        this.ps = new PerfectScrollbar(container, {
            suppressScrollX: true,
            scrollXMarginOffset: 100
        })

        Mousetrap.bind("ctrl+p",       () => { this.panelToggle() })
        Mousetrap.bind("ctrl+s",       () => { this.doSampleSave() })
        Mousetrap.bind("ctrl+l",       () => { this.doSampleLoad() })
        Mousetrap.bind("ctrl+o",       () => { this.doDocumentLoad() })
        Mousetrap.bind("ctrl+r",       () => { this.doDocumentReload() })
        Mousetrap.bind("ctrl+shift+o", () => { this.doDocumentAutoLoad() })
        Mousetrap.bind("ctrl+shift+r", () => { this.doDocumentAutoReload() })
        Mousetrap.bind("ctrl+plus",    () => { this.doZoomInc() })
        Mousetrap.bind("ctrl+0",       () => { this.doZoomSet() })
        Mousetrap.bind("ctrl+-",       () => { this.doZoomDec() })
        Mousetrap.bind("ctrl+f",       () => { this.doFullscreenToggle() })
        Mousetrap.bind("ctrl+a",       () => { this.doApiToggle() })
        Mousetrap.bind("ctrl+q",       () => { this.doAppQuit() })
    },
    methods: {
        log (level: string, msg: string, data?: any) {
            this.$emit("log", level, msg, data)
        },
        command (action: string, data: { [ key: string ]: any } | null = null) {
            this.$emit("command", action, data)
        },
        async panelToggle () {
            console.log("PANEL")
            this.panelOpen = !this.panelOpen
            const panelOuter = this.$refs.panelOuter as HTMLElement
            const panelInner = this.$refs.panelInner as HTMLElement
            const tl = Anime.timeline({
                targets:  panelOuter,
                duration: 500,
                autoplay: true
            })
            if (this.panelOpen) {
                /*  open panel  */
                tl.add({
                    easing:     "spring(1, 80, 10, 0)",
                    translateY: [ -panelInner.clientHeight, 0 ]
                })
            }
            else {
                /*  close panel  */
                tl.add({
                    easing:     "spring(1, 80, 10, 0)",
                    translateY: [ 0, -panelInner.clientHeight ]
                })
            }
            await tl.finished
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
        doZoomInc () {
            this.log("info", "Zoom Inc")
            this.command("zoom", { mode: "inc" })
        },
        doZoomSet () {
            this.log("info", "Zoom Set")
            this.command("zoom", { mode: "set" })
        },
        doZoomDec () {
            this.log("info", "Zoom Dec")
            this.command("zoom", { mode: "dec" })
        },
        doFullscreenToggle () {
            this.log("info", "Fullscreen Toggle")
        },
        doAppQuit () {
            this.log("info", "App Quit")
        },
        doApiToggle () {
            // if (!this.hostIsApp)
            //     return
            this.apiEnabled = !this.apiEnabled
            this.log("info", "API Toggle", { enabled: this.apiEnabled, addr: this.apiAddr, port: this.apiPort })
        },
        listEntryAction (document: Document, idx: number, action: string) {
            const documents = this.documents
            if (action === "select")
                this.documentSelected = document
            else if (action === "open")
                this.documentOpened = document
            else if (action === "delete") {
                documents.splice(idx, 1)
                if (this.documentSelected === document) {
                    if (idx <= documents.length - 1)
                        this.documentSelected = documents[idx]
                    else if (idx > 0 && idx > documents.length - 1)
                        this.documentSelected = documents[idx - 1]
                    else
                        this.documentSelected = null
                }
            }
            else if (action === "move-up" && idx > 0) {
                documents.splice(idx, 1)
                documents.splice(idx > 0 ? idx - 1 : 0, 0, document)
            }
            else if (action === "move-down" && idx < documents.length - 1) {
                documents.splice(idx, 1)
                documents.splice(idx < documents.length - 1 ? idx + 1 :
                    documents.length, 0, document)
            }
        },
        listEntryUpdateAction (document: Document, idx: number, documentU: Document, idxU: number, action: string) {
            const documentsU = this.documents[idx].updates!
            if (action === "select")
                this.documentSelected = documentU
            else if (action === "open")
                this.documentOpened = documentU
            else if (action === "delete") {
                documentsU.splice(idxU, 1)
                if (this.documentSelected === documentU) {
                    if (idxU <= documentsU.length - 1)
                        this.documentSelected = documentsU[idxU]
                    else if (idxU > 0 && idxU > documentsU.length - 1)
                        this.documentSelected = documentsU[idxU - 1]
                    else
                        this.documentSelected = null
                }
            }
            else if (action === "move-up" && idxU > 0) {
                documentsU.splice(idxU, 1)
                documentsU.splice(idxU > 0 ? idxU - 1 : 0, 0, documentU)
            }
            else if (action === "move-down" && idx < documentsU.length - 1) {
                documentsU.splice(idxU, 1)
                documentsU.splice(idxU < documentsU.length - 1 ? idxU + 1 :
                    documentsU.length, 0, documentU)
            }
        }
    }
})
</script>

