
<img src="https://raw.githubusercontent.com/rse/rundown/master/etc/rundown-logo.svg" width="200" align="right" alt=""/>

Rundown
=======

**Render Rundown Scripts for Teleprompting**

[![github (author stars)](https://img.shields.io/github/stars/rse?logo=github&label=author%20stars&color=%233377aa)](https://github.com/rse)
[![github (author followers)](https://img.shields.io/github/followers/rse?label=author%20followers&logo=github&color=%234477aa)](https://github.com/rse)
[![github (project stdver)](https://img.shields.io/github/package-json/stdver/rse/rundown?logo=github&label=project%20stdver&color=%234477aa&cacheSeconds=900)](https://github.com/rse/rundown)

Abstract
--------

**Rundown** is a toolkit to rendering *rundown scripts* for
teleprompting. It reads a *Microsoft Word* format file (`*.docx`),
extracts a particular table from it, and renders HTML output for use in
a browser-based teleprompting scenario.

![screenshot](doc/screenshot.png)

Installation
------------

```
$ git clone https://github.com/rse/rundown
$ (cd rundown-lib && npm install && npm start build)
$ (cd rundown-cli && npm install && npm start build)
$ (cd rundown-web && npm install && npm start build)
```

Examples
--------

- Rundown CLI (One-Shot)

    ```
    $ rundown -o etc/sample.html etc/sample.docx
    ```

- Rundown CLI (Server)

    ```
    $ rundown -a 127.0.0.1 -p 8888 ./etc
    $ open http://127.0.0.1:8888
    ```

- Rundown Web

    ```
    $ npx serve -l 8888 rundown-web/dst/
    $ open http://127.0.0.1:8888
    ```

Design Criterias
----------------

The design of **Rundown** strictly followed the following criterias, driven by
the experiences in the *msg Filmstudio*:

- Teaming:
    - Allow director plan preparation to be done in a fully *collabortively edited* Microsoft Word document.
    - Keep table format in Word-based director plan people are already used to.

- Markup:
    - Consistently use Word *styles* in director plan for unambiguous semantics and conversion.
    - Support all *necessary markups* from the years of experience.
    - Distinguish between control and content (teams) in director plan.

- Output:
    - Allow directory plan to be *automatically* converted into the teleprompter view
    - Intentionally do *not support any editing* of the teleprompter view
    - Allow teleprompter view to be *updated within a minute*, even during dry-runs and just before going live

- Theming:
    - Use light-mode in director plan to support printing
    - Use dark-mode in teleprompter view to avoid outshine effects on cameras
    - Align light-mode directory plan and dark-mode teleprompter view as close as possible
    - Use strong typographic conventions in both directory plan and teleprompter view

- Rendering:
    - Always show an active speaker indicator in teleprompter view
    - Always show a progress indicator in teleprompter view
    - Support view size adjustments in teleprompter view
    - Ensure that lines do not become too wide in teleprompter views to avoid too much wandering of the eyes

Architecture
------------

- [rundown-lib: base functionality](rundown-lib/)
- [rundown-cli: command-line interface](rundown-cli/)
- [rundown-web: web interface](rundown-web/)
- [rundown-gui: graphical user interface](rundown-gui/) (unfinished)
- [rundown-app: native application](rundown-app/) (unfinished)

![screenshot](doc/architecture.png)

License
-------

Copyright &copy; 2023-2025 Dr. Ralf S. Engelschall (http://engelschall.com/)<br/>
Licensed under [GPL 3.0](https://spdx.org/licenses/GPL-3.0-only)

