/*
**  Rundown - Generate Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

const path     = require("node:path")
const fs       = require("node:fs")

const syspath  = require("syspath")
const jsonfile = require("jsonfile")

const pjson = require("./package.json")
const { dataDir } = syspath({ appName: pjson.name })
const cfgfile = path.join(dataDir, "app.json")

class Config {
    constructor () {
        this.data = {}
        this.dirty = false
        this.timer = null
    }
    load () {
        if (fs.existsSync(cfgfile))
            this.data = jsonfile.readFileSync(cfgfile)
        return this
    }
    save () {
        if (this.dirty)
            jsonfile.writeFileSync(cfgfile, this.data, { spaces: 4 })
        this.dirty = false
        return this
    }
    dirtyAndSave () {
        this.dirty = true
        if (this.timer !== null)
            clearTimeout(this.timer)
        this.timer = setTimeout(() => {
            this.save()
        }, 1000)
    }
    get (key, def) {
        let val = this.data[key]
        if (val === undefined)
            val = def
        return val
    }
    set (key, val) {
        this.data[key] = val
        this.dirtyAndSave()
        return this
    }
    del (key) {
        delete this.data[key]
        this.dirtyAndSave()
        return this
    }
}

module.exports = Config

