<!--
**
**  Rundown - Render Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
**
-->

<template>
    <div class="app">
        <div class="logo"><img v-bind:src="logo"/></div>
        <div class="tabs">
            <div class="tab" v-bind:class="{ active: tab === 'content'}" v-on:click="tab = 'content'">CONTENT</div>
            <div class="tab" v-bind:class="{ active: tab === 'control'}" v-on:click="tab = 'control'">CONTROL</div>
        </div>
        <div v-show="tab === 'content'" class="content">
            <div class="intro">
                Here you can download the <b>Rundown</b> template
                for <b>Microsoft&reg; Word&reg;</b>, and once filled with your content,
                uploaded (or dragged and dropped) again for rendering in the prompter format.
                See under the tab CONTROL for details how to interactively control this prompter rendering.
            </div>
            <div class="content-row">
                <div class="content-left"
                    v-on:click="downloadClick">
                    <div class="info">Click to download <b>Rundown</b> template document for <i>editing</i>.</div>
                    <div class="icon1"><i class="fa fa-solid fa-file-word"></i></div>
                    <div class="icon2"><i class="fa fa-solid fa-arrow-down"></i></div>
                </div>
                <div class="content-right"
                    v-bind:class="{ dragging: uploadDragOver }"
                    v-on:dragenter.prevent.stop="dragEnter"
                    v-on:dragover.prevent.stop="dragOver"
                    v-on:dragleave.prevent.stop="dragLeave"
                    v-on:drop.prevent.stop="drop"
                    v-on:click="uploadClick">
                    <div v-show="!uploadDragOver && !uploadProgress">
                        <div class="info">Click or drag &amp; drop to upload <b>Rundown</b> document for <i>prompting</i>.</div>
                        <div class="icon1"><i class="fa fa-solid fa-file-word"></i></div>
                        <div class="icon2"><i class="fa fa-solid fa-arrow-up"></i></div>
                    </div>
                    <div v-show="uploadDragOver && !uploadProgress">
                        <div class="info">Drop to upload <b>Rundown</b> document for prompting.</div>
                        <div class="icon1"><i class="fa fa-solid fa-file-word"></i></div>
                        <div class="icon2"><i class="fa fa-solid fa-spinner fa-spin"></i></div>
                    </div>
                    <div v-show="!uploadDragOver && uploadProgress">
                        <div class="info">Converting <b>Rundown</b> document for prompting.</div>
                        <div class="icon1"><i class="fa fa-solid fa-file-word"></i></div>
                        <div class="icon2"><i class="fa fa-solid fa-spinner fa-spin"></i></div>
                    </div>
                    <input ref="uploadInput"
                        class="upload-input"
                        type="file"
                        v-bind:multiple="false"
                        v-bind:accept="`.docx, ${templateMimeType}`"
                        v-on:change="uploadChange"/>
                </div>
            </div>
            <div class="footer">
                <a href="https://github.com/rse/rundown"><b>Rundown</b></a>&nbsp;
                <a v-bind:href="'https://github.com/rse/rundown/releases/tag/' + version">{{ version }}</a>
                &mdash; Rendering Rundown Scripts for Teleprompting<br/>
                Copyright &copy; 2023-2025 <a href="mailto:rse@engelschall.com">Dr. Ralf S. Engelschall</a>,
                Licensed under <a href="https://spdx.org/licenses/GPL-3.0-only">GPL 3.0</a>
            </div>
        </div>
        <div v-show="tab === 'control'" class="control">
            <div class="intro">
                The <b>Rundown</b> rendering for the prompter is controlled
                through distinct keystrokes only, usually emitted by controller devices.
                The primary keystrokes (blue) are for combined keyboard and controller usage.
                The secondary keystrokes (grey) are additional ones to complement the controller support.
            </div>
            <div class="actions">
                <div class="action">
                    <div class="keystroke">
                        <span class="key primary"><i class="fa fa-solid fa-arrow-up"></i></span>,&nbsp;
                        <span class="key">S</span>
                    </div>
                    <div class="description">
                        <i>increase</i> scroll speed
                    </div>
                </div>
                <div class="action">
                    <div class="keystroke">
                        <span class="key primary"><i class="fa fa-solid fa-arrow-down"></i></span>,&nbsp;
                        <span class="key">W</span>
                    </div>
                    <div class="description">
                        <i>decrease</i> scroll speed
                    </div>
                </div>
                <div class="action">
                    <div class="keystroke">
                        <span class="key primary">SPACE</span>
                    </div>
                    <div class="description">
                        <i>pause/resume</i> scrolling
                    </div>
                </div>
                <div class="action">
                    <div class="keystroke">
                        <span class="key primary">ESC</span>,&nbsp;
                        <span class="key">Alt</span>+<span class="key"><i class="fa fa-solid fa-arrow-up"></i></span>
                    </div>
                    <div class="description">
                        <i>stop</i> scrolling
                    </div>
                </div>
                <div class="action">
                    <div class="keystroke">
                        <span class="key primary">T</span>,&nbsp;
                        <span class="key">1</span>
                    </div>
                    <div class="description">
                        scroll to <i>top</i>
                    </div>
                </div>
                <div class="action">
                    <div class="keystroke">
                        <span class="key primary">B</span>,&nbsp;
                        <span class="key">2</span>
                    </div>
                    <div class="description">
                        scroll to <i>bottom</i>
                    </div>
                </div>
                <div class="action">
                    <div class="keystroke">
                        <span class="key primary">Shift</span>+<span class="key primary">PageUp</span>,&nbsp;
                        <span class="key">Num1</span>
                    </div>
                    <div class="description">
                        scroll to <i>previous</i> sibling section
                    </div>
                </div>
                <div class="action">
                    <div class="keystroke">
                        <span class="key primary">Shift</span>+<span class="key primary">PageDown</span>,&nbsp;
                        <span class="key">Num2</span>
                    </div>
                    <div class="description">
                        scroll to <i>next</i> sibling section
                    </div>
                </div>
                <div class="action">
                    <div class="keystroke">
                        <span class="key primary">PageUp</span>,&nbsp;
                        <span class="key"><i class="fa fa-solid fa-arrow-left"></i></span>
                    </div>
                    <div class="description">
                        scroll to <i>previous</i> sibling chunk
                    </div>
                </div>
                <div class="action">
                    <div class="keystroke">
                        <span class="key primary">PageDown</span>,&nbsp;
                        <span class="key"><i class="fa fa-solid fa-arrow-right"></i></span>
                    </div>
                    <div class="description">
                        scroll to <i>next</i> sibling chunk
                    </div>
                </div>
                <div class="action">
                    <div class="keystroke">
                        <span class="key">L</span>
                    </div>
                    <div class="description">
                        lock interactions for production
                    </div>
                </div>
                <div class="action">
                    <div class="keystroke">
                        <span class="key"><b>&ndash;</b></span>
                    </div>
                    <div class="description">
                        <i>decrease</i> font-size
                    </div>
                </div>
                <div class="action">
                    <div class="keystroke">
                        <span class="key">+</span>
                    </div>
                    <div class="description">
                        <i>increase</i> font-size
                    </div>
                </div>
                <div class="action">
                    <div class="keystroke">
                        <span class="key">0</span>
                    </div>
                    <div class="description">
                        <i>reset</i> font-size
                    </div>
                </div>
                <div class="action">
                    <div class="keystroke">
                        <span class="key">Alt</span>+
                        <span class="key"><b>&ndash;</b></span>
                    </div>
                    <div class="description">
                        <i>decrease</i> line-height
                    </div>
                </div>
                <div class="action">
                    <div class="keystroke">
                        <span class="key">Alt</span>+
                        <span class="key">+</span>
                    </div>
                    <div class="description">
                        <i>increase</i> line-height
                    </div>
                </div>
                <div class="action">
                    <div class="keystroke">
                        <span class="key">Alt</span>+
                        <span class="key">0</span>
                    </div>
                    <div class="description">
                        <i>reset</i> line-height
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="stylus">
.app
    position: relative
    width:   100vw
    height:  100vh
    margin:  0
    padding: 0
    display: flex
    flex-direction: column
    justify-content: center
    align-items: center
    .logo img
        height: 6rem
        width: auto
        margin-top: 1rem
        margin-bottom: 2rem
    .tabs
        display: flex
        flex-direction: row
        justify-content: center
        align-items: center
        .tab
            background-color: var(--color-std-bg-3)
            color: var(--color-std-fg-3)
            margin-right: 1rem
            padding: 0.25rem 1rem 0.25rem 1rem
            font-size: 2rem
            border-top-left-radius: 0.5rem
            border-top-right-radius: 0.5rem
            &.active
                background-color: var(--color-acc-bg-5)
                color: var(--color-std-fg-5)
    .intro
        font-size: 2rem
        margin-left: 5rem
        margin-right: 5rem
        margin-bottom: 2rem
    .content
        display: flex
        flex-direction: column
        justify-content: flex-start
        align-items: center
        width: 80vw
        height: calc(80vh - 2rem)
        border-top: 0.1rem solid var(--color-acc-bg-5)
        padding-top: 2rem
        .content-row
            display: flex
            flex-direction: row
            justify-content: center
            align-items: center
            .content-left
                margin-right: 4rem
            .content-left,
            .content-right > div
                display: flex
                flex-direction: column
                justify-content: flex-start
                align-items: center
            .content-left,
            .content-right
                cursor: pointer
                background-color: var(--color-std-bg-3)
                color: var(--color-std-fg-3)
                padding: 1rem 4rem
                border-radius: 1rem
                width: 24rem
                &:hover
                    background-color: var(--color-acc-bg-3)
                    color: var(--color-acc-fg-5)
                .info
                    font-size: 2.0rem
                    height: 9rem
                    text-align: center
                .icon1
                    font-size: 10rem
                .icon2
                    margin-top: -2rem
                    font-size: 5rem
            .content-right:hover
                background-color: var(--color-sig-bg-3)
                color: var(--color-sig-fg-5)
            .content-right *
                pointer-events: none
            .content-right.dragging
                background-color: var(--color-sig-bg-3)
                color: var(--color-sig-fg-5)
    .footer
        margin-top: 3rem
        font-size: 1.75rem
        text-align: center
        color: var(--color-std-fg-1)
        a,
        a:visited,
        a:hover
            text-decoration: none
            color: var(--color-std-fg-2)
    .upload-input
        display: none
    .control
        display: flex
        flex-direction: column
        justify-content: flex-start
        align-items: center
        width: 80vw
        height: calc(80vh - 2rem)
        border-top: 0.1rem solid var(--color-acc-bg-5)
        padding-top: 2rem
        .actions
            background-color: var(--color-std-bg-2)
            border-radius: 1rem
            padding: 1rem 2rem 1rem 2rem
            .action
                font-size: 1.75rem
                display: flex
                flex-direction: row
                justify-content: center
                align-items: center
                .keystroke
                    font-size: 1.5rem
                    width: 25rem
                    .key
                        border-radius: 0.75rem
                        background-color: var(--color-std-bg-5)
                        color: var(--color-std-fg-5)
                        padding: 0 0.75rem 0 0.75rem
                        display: inline-block
                        text-align: center
                        &.primary
                            border-radius: 0.75rem
                            background-color: var(--color-acc-bg-3)
                            color: var(--color-std-fg-5)
                .description
                    width: 30rem
</style>

<script setup lang="ts">
import { defineComponent }  from "vue"
import moment               from "moment"
import Rundown              from "../../rundown-3-lib"
import logo                 from "./app-logo.svg?url"
import template             from "../../rundown-1-doc/rundown-template.docx?url"
import pkg                  from "../../package.json" with { type: "json" }
</script>

<script lang="ts">
const templateMimeType = "application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
export default defineComponent({
    name: "app",
    data: () => ({
        tab: "content",
        downloadProgress: false,
        uploadDragOver: false,
        uploadProgress: false,
        logo,
        templateMimeType,
        version: pkg.version
    }),
    mounted () {
        /*  remove the potentially existing hash (in case of an exit)  */
        history.replaceState(null, document.title, window.location.pathname + window.location.search)
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
        dragEnter (ev: DragEvent) {
            this.uploadDragOver = true
        },
        dragOver (ev: DragEvent) {
            this.uploadDragOver = true
        },
        dragLeave (ev: DragEvent) {
            this.uploadDragOver = false
        },
        drop (ev: DragEvent) {
            this.uploadDragOver = false
            const dt = ev.dataTransfer
            if (dt?.files && dt.files.length === 1) {
                const file = dt.files[0]
                this.uploadDocument(file)
            }
        },
        uploadClick () {
            (this.$refs.uploadInput as HTMLInputElement).click()
        },
        async uploadChange (ev: Event) {
            const files = (ev.target as HTMLInputElement)!.files as FileList
            if (files.length === 1) {
                const file = files[0]
                this.uploadDocument(file)
            }
        },
        async uploadDocument (file: File) {
            if (file.type === templateMimeType
                || file.name.match(/.+\.docx$/i)) {
                try {
                    this.uploadProgress = true
                    const input = await new Promise<ArrayBuffer>((resolve, reject) => {
                        const reader = new FileReader()
                        reader.onload  = (ev: ProgressEvent<FileReader>) => { resolve(ev.target?.result as ArrayBuffer) }
                        reader.onerror = (ev: ProgressEvent<FileReader>) => { reject(new Error("failed to load")) }
                        reader.readAsArrayBuffer(file)
                    })
                    const rundown = new Rundown()
                    rundown.on("warning", (message: string) => {
                        this.log("warning", message)
                    })
                    rundown.on("error", (message: string) => {
                        this.log("error", message)
                    })
                    const selector = "table:has(tr:first-child:has(*:contains('Control/Video'))) tr:gt(0) td:nth-last-child(-n+2)"
                    const output = await rundown.convert(input, selector)

                    history.replaceState(null, document.title, "#with-exit")
                    document.open()
                    document.write(output)
                    document.close()
                    this.uploadProgress = false
                }
                catch (err) {
                    this.uploadProgress = false
                    this.log("error", "uploading document failed", {
                        reason: err instanceof Error ? err.message : String(err)
                    })
                }
            }
        },
        downloadClick () {
            if (this.downloadProgress)
                return
            this.downloadProgress = true
            const link = document.createElement("a")
            link.href = template
            link.download = "rundown-template.docx"
            document.body.appendChild(link)
            link.click()
            setTimeout(() => {
                link.remove()
                this.downloadProgress = false
            }, 1000)
        }
    }
})
</script>

