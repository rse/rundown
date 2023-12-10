
<img src="https://raw.githubusercontent.com/rse/rundown/master/rundown-logo.svg" width="200" align="right" alt=""/>

Rundown
=======

**Generate Rundown Scripts for Teleprompting**

[![github (author stars)](https://img.shields.io/github/stars/rse?logo=github&label=author%20stars&color=%233377aa)](https://github.com/rse)
[![github (author followers)](https://img.shields.io/github/followers/rse?label=author%20followers&logo=github&color=%234477aa)](https://github.com/rse)
[![github (project stdver)](https://img.shields.io/github/package-json/stdver/rse/rundown?logo=github&label=project%20stdver&color=%234477aa&cacheSeconds=900)](https://github.com/rse/rundown)
<br/>
[![npm (project license)](https://img.shields.io/npm/l/rundown?logo=npm&label=npm%20license&color=%23cc3333)](https://npmjs.com/@rse/rundown)
[![npm (project release)](https://img.shields.io/npm/v/rundown?logo=npm&label=npm%20release&color=%23cc3333)](https://npmjs.com/@rse/rundown)
[![npm (project downloads)](https://img.shields.io/npm/dm/rundown?logo=npm&label=npm%20downloads&color=%23cc3333)](https://npmjs.com/@rse/rundown)

Abstract
--------

`rundown`(1) is a small command-line tool to generate *rundown scripts*
for teleprompting. It can read *Microsoft Word* format files (`*.docx`),
extract text from it, and generate HTML/XML output for use in the
teleprompting applications *QPrompt* and *Autocue Explorer/Pioneer*.

Installation
------------

```
$ npm install -g @rse/rundown
```

Usage
-----

The [Unix manual page](https://github.com/rse/rundown/blob/master/rundown.md) contain
detailed usage information.

Example
--------

```
$ rundown -f qprompt -e "table:last tr:gt(0) td:last" -o sample.html sample.docx
```

License
-------

Copyright &copy; 2023 Dr. Ralf S. Engelschall (http://engelschall.com/)<br/>
Licensed under [GPL 3.0](https://spdx.org/licenses/GPL-3.0-only)

