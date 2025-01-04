/*
**  Rundown - Generate Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  external requirements  */
const os        = require("node:os")
const fs        = require("node:fs")
const path      = require("node:path")

const glob      = require("glob")
const shell     = require("shelljs")
const execa     = require("execa")
const zip       = require("cross-zip")

/*  establish asynchronous environment  */
;(async () => {
    /*  remove previously generated files  */
    console.log("++ cleanup")
    shell.rm("-rf", "dst")

    /*  reduce the size of the development tree  */
    console.log("++ reducing source-tree")
    const remove = glob.sync("node_modules/typopro-web/web/TypoPRO-*")
        .filter((path) => !path.match(/\/TypoPRO-SourceSansPro$/))
        .filter((path) => !path.match(/\/TypoPRO-Hack$/))
    for (const file of remove)
        shell.rm("-rf", file)

    /*   package according to platform...  */
    const electronbuilder = path.resolve(path.join("node_modules", ".bin", "electron-builder"))
    const arch1 = os.arch()
    let arch2 = arch1
    if (arch2 === "arm64")
        arch2 = "a64"
    if (os.platform() === "win32") {
        /*  embed CLI program  */
        shell.cp(path.join(__dirname, "..", "cli", "rundown-cli-win-x64.exe"), "rundown-cli-win-x64.exe")

        /*  run Electron-Builder to package the application  */
        console.log("++ packaging App as an Electron distribution for Windows platform")
        execa.sync(electronbuilder, [ "--win", `--${arch1}` ],
            { stdin: "inherit", stdout: "inherit", stderr: "inherit" })

        /*  pack application into a distribution archive
            (notice: under macOS the ZIP does NOT automatically use a top-level directory)  */
        console.log("++ packing App into ZIP distribution archive")
        shell.mv("dst/rundown-gui.exe", "dst/rundown.exe")
        zip.zipSync(
            path.join(__dirname, "dst/Rundown.exe"),
            path.join(__dirname, `dst/Rundown-win-${arch2}.zip`))
    }
    else if (os.platform() === "darwin") {
        /*  embed CLI program  */
        shell.cp(path.join(__dirname, "..", "cli", "rundown-cli-mac-x64"), "rundown-cli-mac-x64")

        /*  run Electron-Builder to package the application  */
        console.log("++ packaging App as an Electron distribution for macOS platform")
        execa.sync(electronbuilder, [ "--mac", `--${arch1}` ],
            { stdin: "inherit", stdout: "inherit", stderr: "inherit" })

        /*  pack application into a distribution archive
            (notice: under macOS the ZIP DOES automatically use a top-level directory)  */
        console.log("++ packing App into ZIP distribution archive")
        shell.mv("dst/mac/rundown-gui.app", "dst/Rundown.app")
        zip.zipSync(
            path.join(__dirname, "dst/Rundown.app"),
            path.join(__dirname, `dst/Rundown-mac-${arch2}.zip`))
    }
    else if (os.platform() === "linux") {
        /*  embed CLI program  */
        shell.cp(path.join(__dirname, "..", "cli", "rundown-cli-lnx-x64"), "rundown-cli-lnx-x64")

        /*  run Electron-Builder to package the application  */
        console.log("++ packaging App as an Electron distribution for Linux platform")
        execa.sync(electronbuilder, [ "--linux", `--${arch1}` ],
            { stdin: "inherit", stdout: "inherit", stderr: "inherit" })

        /*  pack application into a distribution archive  */
        console.log("++ packing App into ZIP distribution archive")
        shell.mv("dst/rundown-gui-*.AppImage", "dst/Rundown")
        zip.zipSync(
            path.join(__dirname, "dst/Rundown"),
            path.join(__dirname, `dst/Rundown-lnx-${arch2}.zip`))
    }
})().catch((err) => {
    console.log(`** npm: package: ERROR: ${err}`)
})

