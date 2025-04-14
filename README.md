
<img src="https://raw.githubusercontent.com/rse/rundown/master/rundown-doc/rundown-logo.svg" width="200" align="right" alt=""/>

Rundown
=======

**Render Rundown Scripts for Teleprompting**

[![github (author stars)](https://img.shields.io/github/stars/rse?logo=github&label=author%20stars&color=%233377aa)](https://github.com/rse)
[![github (author followers)](https://img.shields.io/github/followers/rse?label=author%20followers&logo=github&color=%234477aa)](https://github.com/rse)
[![github (project stdver)](https://img.shields.io/github/package-json/stdver/rse/rundown?logo=github&label=project%20stdver&color=%234477aa&cacheSeconds=900)](https://github.com/rse/rundown)

Abstract
--------

**Rundown** is a toolkit for rendering *rundown scripts* for
teleprompting. It reads a *Microsoft Word* format file (`*.docx`),
extracts a particular table from it, and renders HTML output for use in
a browser-based teleprompting scenario. It consists of a library, providing
the base functionality, and both a command-line interface and Web user interface
for driving the functionality.

Impressions
-----------

The following is a side-by-side view of the Microsoft Word input on the left and
the rendered teleprompter view on the right:

![screenshot](rundown-doc/rundown-screenshot-1.png)

The following is a view of the web user interface, showing the supported keystrokes 
for controlling the scrolling of the rendered teleprompter view:

![screenshot](rundown-doc/rundown-screenshot-2.png)

Installation
------------

```
$ git clone https://github.com/rse/rundown
$ npm install
$ npm start build
```

Usage
-----

- Rundown CLI (One-Shot)

    ```
    $ rundown -o rundown-doc/sample.html rundown-doc/sample.docx
    $ rundown -o - - <rundown-doc/sample.docx >rundown-doc/sample.html
    $ docker run -v .:/pwd engelschall/rundown -o /pwd/rundown-doc/sample.html /pwd/rundown-doc/sample.docx
    $ docker run -i -v .:/pwd engelschall/rundown -o - - <rundown-doc/sample.docx >rundown-doc/sample.html
    ```

- Rundown CLI (Server)

    ```
    $ rundown -v info -m web ./rundown-doc
    $ docker run -p 8888:8888 -v ./rundown-doc:/work engelschall/rundown -v info -m web /work
    ```

- Rundown Web

    ```
    $ rundown -v info -m web-ui
    $ docker run -p 8888:8888 engelschall/rundown -v info -m web-ui
    ```

Design Criterias
----------------

The design of **Rundown** strictly followed the following particular design criterias, driven by
the experiences and demands in the *msg Filmstudio* of Dr. Ralf S. Engelschall:

- **Input**:
    - **Collaborative Input Editing**:
      Allow director plan preparation to be done in a fully
      *collabortively edited* Microsoft Word document.
    - **Table-Based Input**:
      Keep table format in Word-based director plan, people are already used to.
    - **Style-Based Input**:
      Consistently use Microsoft Word *styles* in director plan for
      unambiguous semantics and conversion.
    - **Experience-Driven Markups**:
      Support all *necessary markups* from the years of event experience.
    - **Distinguished Control & Content**:
      Distinguish between control (left side of table) and content
      (right side of table) in director plan.

- **Output**:
    - **Auto-Conversion**:
      Allow directory plan to be *automatically* (within a minute)
      converted into the rendered teleprompter view.
    - **Single Source of Truth**:
      Intentionally do *not support any editing* of the rendered
      teleprompter view, as the single source of truth is the Microsoft Word document.
    - **Incremental Rendering Updates**:
      Allow rendered teleprompter view to be *incrementally updated*,
      especially during event dry-runs and optionally also just before going
      live in events.

- **Style**:
    - **Light Input**:
      Use light-mode in Microsoft Word based director plan to also support printing.
    - **Dark Output**:
      Use dark-mode in rendered teleprompter view to avoid outshine effects on cameras.
    - **Aligned Input/Output**:
      Optically align light-mode directory plan and dark-mode
      teleprompter view as close as possible.
    - **Strong Typography**:
      Use strong typographic conventions in both directory plan and teleprompter view.

- **Rendering**:
    - **Speaker Indicators**:
      Always show an active speaker indicator in teleprompter view, so
      that, at any time, one knows who is currently speaking.
    - **Progress Indicators**:
      Always show a progress indicator in teleprompter view,
      so that, at any time, one knows where one is within the event.
    - **Text Size Adjustment**:
      Support text size adjustments in teleprompter view within reasonable ranges only.
    - **Reduced Eye Wandering**:
      Ensure that lines do not become too wide in teleprompter views,
      to avoid too much wandering of the eyes.
    - **Smooth Scrolling**:
      Support very smooth scrolling in the teleprompter view.
    - **Dial Controller Support**:
      Support dial controller (Prompter People Shuttle Pro) for controlling the scrolling.

Architecture
------------

The **Rundown** toolkit consists of the following parts:

- [rundown-doc: input documents](rundown-doc/)
- [rundown-lib: rendering library](rundown-lib/)
- [rundown-cli: command-line interface](rundown-cli/)
- [rundown-web: web interface](rundown-web/)
- [rundown-dst: distribution assembly line](rundown-dst/)

Those parts form an architecture which allows various use cases:

![screenshot](rundown-doc/rundown-architecture.png)

License
-------

Copyright &copy; 2023-2025 Dr. Ralf S. Engelschall (http://engelschall.com/)<br/>
Licensed under [GPL 3.0](https://spdx.org/licenses/GPL-3.0-only)

