
<img src="https://raw.githubusercontent.com/rse/rundown/master/rundown-1-doc/rundown-logo.svg" width="200" align="right" alt=""/>

Rundown
=======

**Render Rundown Scripts for Teleprompting**

[![github (author stars)](https://img.shields.io/github/stars/rse?logo=github&label=author%20stars&color=%233377aa)](https://github.com/rse)
[![github (author followers)](https://img.shields.io/github/followers/rse?label=author%20followers&logo=github&color=%234477aa)](https://github.com/rse)
[![github (project stdver)](https://img.shields.io/github/package-json/version/rse/rundown?logo=github&label=project%20stdver&color=%234477aa&cacheSeconds=900)](https://github.com/rse/rundown)

Abstract
--------

**Rundown** is a toolkit for rendering *rundown scripts* for
teleprompting. It reads a *Microsoft Word* format file (`*.docx`) as
its "single source of truth", extracts columns of a particular table
from it, and renders typographically strong and smooth scrolling HTML
output for use in a browser-based teleprompting scenario.

**Rundown** consists of a library, providing the base functionality, and
both a command-line interface and Web user interface for driving
the functionality. The teleprompting view can be ad-hoc in batch,
continuously in batch, or interactively rendered.

Additionally, **Rundown** can remote control *Microsoft PowerPoint* for
aligning a companion slideset, or remote control *Bitfocus Companion*
for driving dependent aspects of an event, like audio and video.
Finally, **Rundown** supports an optional, cool Speech-to-Text-based
auto-scrolling functionality.

Impressions
-----------

The following is the rundown script input in Microsoft Word:

![screenshot](rundown-1-doc/rundown-screenshot-5.png)

The following is a side-by-side view of the Microsoft Word rundown
script input on the left, and the rendered teleprompter view on the
right:

![screenshot](rundown-1-doc/rundown-screenshot-1.png)

The following is the rendered prompting view in the original 16:9 aspect ratio,
as shown in the studio on the teleprompters:

![screenshot](rundown-1-doc/rundown-screenshot-4.png)

The following are two screenshots of the interactive web user interface,
showing the buttons to download and upload the rundown script, and the
supported keystrokes for controlling the scrolling of the rendered
teleprompter view:

![screenshot](rundown-1-doc/rundown-screenshot-2.png)
![screenshot](rundown-1-doc/rundown-screenshot-3.png)

Central Application
-------------------

Visit the URL https://rundown.studio.msg.team/ to load a centrally
deployed **Rundown** as a Web UI application into your local browser
and then, fully offline, use local download and upload operations from
within this application.

NOTICE: This application is a client-side-only application, i.e., once
the application is loaded, there is no more server communication, as
the DOCX to HTML conversion is performed directly within this Web
application. As a consequence, your DOCX input and the corresponding
rendered HTML output never leave your local browser sandbox. Also, the
application, once loaded, can operate fully offline.

Installation
------------

```
$ git clone https://github.com/rse/rundown
$ npm install
$ npm start build
```

Usage
-----

- **CMD** Mode (One-Shot Conversion)

  Render the DOCX input to an HTML output in a one-shot conversion mode.
  The conversion itself is performed locally in the started tool process.

    ```
    # with Rundown source tree
    $ npm run rundown -o      rundown-1-doc/rundown-template.html  rundown-1-doc/rundown-template.docx
    $ npm run rundown -o - - >rundown-1-doc/rundown-template.html <rundown-1-doc/rundown-template.docx

    # with Rundown archive distribution
    $ rundown-cli -o      rundown-template.html  rundown-template.docx
    $ rundown-cli -o - - >rundown-template.html <rundown-template.docx

    # with Rundown Docker distribution
    $ docker run -v .:/work engelschall/rundown rundown-cli -o     /work/rundown-template.html /work/rundown-template.docx
    $ docker run -i         engelschall/rundown rundown-cli -o - -      >rundown-template.html      <rundown-template.docx
    ```

- **WEB** Mode (Continuous Conversion)

  Render the DOCX input to an HTML output in a continuous conversion mode.
  The conversion itself is performed locally in the started service process.

    ```
    # with Rundown source tree
    $ npm run rundown -v info -a 127.0.0.1 -p 8888 -m web ./rundown-1-doc

    # with Rundown archive distribution
    $ rundown-cli -v info -a 127.0.0.1 -p 8888 -m web .

    # with Rundown Docker distribution
    $ docker run -p 8888:8888 -v .:/work engelschall/rundown rundown-cli -v info -p 8888 -m web /work
    ```

    ```
    $ open http://127.0.0.1:8888
    ```

- **WEB-UI** Mode (Interactive Conversion, Local)

  Render the DOCX input to an HTML output in an interactive conversion mode,
  where the application is loaded locally. The conversion itself is performed
  locally in the browser.

    ```
    # with Rundown source tree
    $ npm run rundown -v info -a 127.0.0.1 -p 8888 -m web-ui

    # with Rundown archive distribution
    $ rundown-cli -v info -a 127.0.0.1 -p 8888 -m web-ui

    # with Rundown Docker distribution
    $ docker run -p 8888:8888 engelschall/rundown rundown-cli -v info -o 8888 -m web-ui
    ```

    ```
    $ open http://127.0.0.1:8888
    ```

- **WEB-UI** Mode (Interactive Conversion, Central)

  Render the DOCX input to an HTML output in an interactive conversion mode,
  where the application is loaded remotely. The conversion itself is performed
  locally in the browser.

    ```
    $ open https://rundown.studio.msg.team/
    ```

Design Criterias
----------------

The design of **Rundown** strictly followed the following particular design criterias, driven by
the experiences and demands in the *msg Filmstudio* of Dr. Ralf S. Engelschall:

- **Input**:
    - **Collaborative Input Editing**:
      Allow rundown script preparation to be done in a fully
      *collabortively edited* Microsoft Word document.
    - **Table-Based Input**:
      Keep table format in Word-based rundown script, people are already used to.
    - **Style-Based Input**:
      Consistently use Microsoft Word *styles* in rundown script for
      unambiguous semantics and conversion.
    - **Experience-Driven Markups**:
      Support all *necessary markups* from the years of event experience.
    - **Distinguished Control & Content**:
      Distinguish between control (left side of table) and content
      (right side of table) in rundown script.

- **Output**:
    - **Auto-Conversion**:
      Allow rundown script to be *automatically* (within a minute)
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
      Use light-mode in Microsoft Word based rundown script to also support printing.
    - **Dark Output**:
      Use dark-mode in rendered teleprompter view to avoid outshine effects on cameras.
    - **Aligned Input/Output**:
      Optically align light-mode rundown script and dark-mode
      teleprompter view as close as possible.
    - **Strong Typography**:
      Use strong typographic conventions in both rundown script and teleprompter view.

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
    - **Presenter Preflights**:
      Allow presenters to in-advance preflight their prompting session.
    - **Confidential Preflights**:
      Support fully local preflights for confidential rundown script content.
    - **Optional Application Control**:
      Support optional controlling of external applications through embedded state styles.
    - **Locked Production**:
      Support a locked production mode where certain dangerous interactions are disabled.

Architecture
------------

The **Rundown** toolkit consists of the following parts:

- [rundown-1-doc: input documents](rundown-1-doc/)
- [rundown-2-rnd: output rendering](rundown-2-rnd/)
- [rundown-3-lib: rendering library](rundown-3-lib/)
- [rundown-4-web: web interface](rundown-4-web/)
- [rundown-5-cli: command-line interface](rundown-5-cli/)
- [rundown-6-brd: command-line interface of bridge](rundown-6-brd/)
- [rundown-7-dst: distribution assembly line](rundown-7-dst/)

Those parts form an architecture which allows various use cases:

![screenshot](rundown-1-doc/rundown-architecture.png)

License
-------

Copyright &copy; 2023-2025 Dr. Ralf S. Engelschall (http://engelschall.com/)<br/>
Licensed under [GPL 3.0](https://spdx.org/licenses/GPL-3.0-only)

