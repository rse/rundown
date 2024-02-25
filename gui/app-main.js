/*
**  Rundown - Generate Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

const os       = require("node:os")
const path     = require("node:path")
const fs       = require("node:fs")

const execa    = require("execa")
const electron = require("electron")

const Config   = require("./app-config")

const app = electron.app

const config = new Config()
config.load()

app.on("ready", () => {
    electron.ipcMain.handle("app.cwd",     (ev) => process.cwd())
    electron.ipcMain.handle("app.dialog",  (ev, method, params) => electron.dialog[method](params))

    electron.ipcMain.handle("config.load", (ev, ...args) => config.load(...args))
    electron.ipcMain.handle("config.save", (ev, ...args) => void (config.save(...args)))
    electron.ipcMain.handle("config.get",  (ev, ...args) => config.get(...args))
    electron.ipcMain.handle("config.set",  (ev, ...args) => void (config.set(...args)))
    electron.ipcMain.handle("config.del",  (ev, ...args) => void (config.del(...args)))

    let mainWindow = new electron.BrowserWindow({
        show:       false,
        x:          config.get("window-x",      100),
        y:          config.get("window-y",      100),
        width:      config.get("window-width",  700),
        height:     config.get("window-height", 500),
        minWidth:   700,
        minHeight:  500,
        webPreferences: {
            preload: path.join(__dirname, "app-ui-preload.js"),
            contextIsolation:        true,
            nodeIntegration:         true,
            nodeIntegrationInWorker: true
        }
    })
    mainWindow.loadURL(`file://${path.join(__dirname, "app-ui.html")}`)
    if (process.env.DEBUG)
        mainWindow.webContents.openDevTools()
    mainWindow.on("ready-to-show", () => {
        mainWindow.show()
    })
    mainWindow.on("closed", () => {
        mainWindow = null
    })
    const updateBounds = () => {
        const bounds = mainWindow.getBounds()
        config.set("window-x",      bounds.x)
        config.set("window-y",      bounds.y)
        config.set("window-width",  bounds.width)
        config.set("window-height", bounds.height)
    }
    mainWindow.on("resize", () => { updateBounds() })
    mainWindow.on("move",   () => { updateBounds() })

    let proc = null
    electron.ipcMain.handle("rundown.start", async (ev, input, output, extract, format) => {
        /*  determine CLI program path  */
        let program
        if      (os.platform() === "linux"  && os.arch() === "x64") program = "rundown-cli-lnx-x64"
        else if (os.platform() === "darwin" && os.arch() === "x64") program = "rundown-cli-mac-x64"
        else if (os.platform() === "win32"  && os.arch() === "x64") program = "rundown-cli-win-x64.exe"
        else
            throw new Error("unsupported platform")
        const p1 = path.resolve(`./${program}`)
        const p2 = path.resolve(`../cli/${program}`)
        const p3 = path.join(app.getAppPath(), program).replace("app.asar", "app.asar.unpacked")
        let p
        if      (await fs.promises.access(p1, fs.constants.F_OK).then(() => true).catch(() => false)) p = p1
        else if (await fs.promises.access(p2, fs.constants.F_OK).then(() => true).catch(() => false)) p = p2
        else if (await fs.promises.access(p3, fs.constants.F_OK).then(() => true).catch(() => false)) p = p3
        else
            throw new Error("CLI program not found")

        /*  execute CLI shell command  */
        const cmd = [ p, "-v", "debug", "-e", extract, "-f", format, "-o", output, input ]
        const args = cmd.slice(1).map((arg) => arg.match(/\s+/) ? `"${arg}"` : arg).join(" ")
        mainWindow.webContents.send("rundown.log", `** execute: rundown ${args}`)
        proc = execa(cmd[0], cmd.slice(1), { stdin: "ignore", stdout: "pipe", stderr: "pipe" })
        proc.stdout.on("data", (data) => {
            const str = data.toString().replace(/\r?\n$/, "")
            mainWindow.webContents.send("rundown.log", `-- ${str}`)
        })
        proc.stderr.on("data", (data) => {
            const str = data.toString().replace(/\r?\n$/, "")
            mainWindow.webContents.send("rundown.log", `++ ${str}`)
        })
        proc.on("exit", () => {
            mainWindow.webContents.send("rundown.log", "** finished")
            mainWindow.webContents.send("rundown.percent", 100)
        })
    })
    electron.ipcMain.handle("rundown.stop", (ev) => {
        mainWindow.webContents.send("rundown.log", "** stopped")
        mainWindow.webContents.send("rundown.percent", 0)
        proc = null
    })
})

app.on("window-all-closed", () => {
    config.save()
    app.quit()
})

