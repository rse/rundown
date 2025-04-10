/*
**  Rundown - Generate Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  await the DOM to be ready...  */
const $ = jQuery
$(async () => {
    /*  fill input fields with reasonable defaults and remember values  */
    const cwd = await app.cwd()
    const input = await config.get("input", `${cwd}/sample.docx`)
    $("#input").val(input)
    $("#input").on("change keyup", async () => {
        const input = $("#input").val()
        await config.set("input", input)
    })
    const extract = await config.get("extract", "body")
    $("#extract").val(extract)
    $("#extract").on("change keyup", async () => {
        const extract = $("#extract").val()
        await config.set("extract", extract)
    })
    const format = await config.get("format", "qprompt")
    $("#format").val(format)
    $("#format").on("change keyup", async () => {
        const format = $("#format").val()
        await config.set("format", format)
    })
    const output = await config.get("output", `${cwd}/sample.html`)
    $("#output").val(output)
    $("#output").on("change keyup", async () => {
        const output = $("#output").val()
        await config.set("output", output)
    })

    /*  connect the input to a file chooser  */
    $("#inputchoose").on("click", async () => {
        const filename = $("#input").val()
        const result = await app.dialog("showOpenDialog", {
            properties: [ "openFile" ],
            filters: [ { name: "Word", extensions: [ "docx", "doc" ] } ],
            defaultPath: filename
        })
        if (!result.canceled) {
            $("#input").val(result.filePaths[0])
            await config.set("input", result.filePaths[0])
        }
    })

    /*  connect the output to a file chooser  */
    $("#outputchoose").on("click", async () => {
        const filename = $("#output").val()
        const result = await app.dialog("showSaveDialog", {
            properties: [ "showOverwriteConfirmation" ],
            filters: [ { name: "HTML/XML", extensions: [ "html", "xml" ] } ],
            defaultPath: filename
        })
        if (!result.canceled) {
            console.log(result)
            $("#output").val(result.filePath)
            await config.set("output", result.filePath)
        }
    })

    /*  provide a convenient logging function  */
    let logbook = []
    const logwindow = 500
    const logmsg = (msg) => {
        logbook.push(msg)
        const n = logbook.length
        if (n > logwindow)
            logbook = logbook.slice(n - logwindow)
        const output = $("#logbook")
        output.html(logbook.join("\n"))
        output.scrollTop(output.prop("scrollHeight"))
    }

    /*  log initial hints  */
    logmsg("## Please choose the input Microsoft Word file and an output file and press GENERATE.")
    logmsg("## Optionally configure your input extraction by using CSS selector \"body\" for entire")
    logmsg("## document or \"table:last tr:gt(0) td:last\" for last column of last table only.")
    logmsg("## Optionally configure your output format by using \"qprompt\" or \"autocue\".")
    logmsg("")

    /*  connect the start button to the main action  */
    let mode = "start"
    rundown.on("percent", (ev, percent) => {
        const max = $("#progress").innerWidth()
        const now = max * percent
        $("#progress > .bar").width(now)
        $("#progress > .percent").html(Math.ceil(percent) + "%")
    })
    rundown.on("log", (ev, msg) => {
        logmsg(msg)
    })
    $("#startstop").on("click", () => {
        if (mode === "start") {
            /*  fetch input fields  */
            const input   = $("#input").val()
            const extract = $("#extract").val()
            const format  = $("#format").val()
            const output  = $("#output").val()

            /*  deactivate button  */
            mode = "stop"
            $("#startstop").addClass("stop")
            $("#startstop").removeClass("start")
            $("#progress > .bar").width(0)

            /*  perform the main action in the main thread  */
            rundown.start(input, output, extract, format).then(() => {
                /*  reactivate button again  */
                $("#startstop").removeClass("stop")
                $("#startstop").addClass("start")
                mode = "start"
            }).catch((err) => {
                $("#startstop").removeClass("stop")
                $("#startstop").addClass("start")
                mode = "start"
                logmsg("++ ERROR: " + err)
            })
        }
        else if (mode === "stop") {
            rundown.stop()
            $("#startstop").removeClass("stop")
            $("#startstop").addClass("start")
            mode = "start"
        }
    })
})

