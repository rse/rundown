/*
**  Rundown - Generate Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("app", {
    cwd:    (...args) => ipcRenderer.invoke("app.cwd",       ...args),
    dialog: (...args) => ipcRenderer.invoke("app.dialog",    ...args)
})

contextBridge.exposeInMainWorld("config", {
    load:   (...args) => ipcRenderer.invoke("config.load",   ...args),
    save:   (...args) => ipcRenderer.invoke("config.save",   ...args),
    get:    (...args) => ipcRenderer.invoke("config.get",    ...args),
    set:    (...args) => ipcRenderer.invoke("config.set",    ...args),
    del:    (...args) => ipcRenderer.invoke("config.del",    ...args)
})

contextBridge.exposeInMainWorld("rundown", {
    start:  (...args) => ipcRenderer.invoke("rundown.start", ...args),
    stop:   (...args) => ipcRenderer.invoke("rundown.stop",  ...args),
    on:     (ch, ...args) => ipcRenderer.on(`rundown.${ch}`, ...args),
    off:    (ch, ...args) => ipcRenderer.on(`rundown.${ch}`, ...args)
})
