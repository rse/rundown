
ChangeLog
=========

2.2.2 (2025-11-14)
------------------

- UPDATE: upgrade NPM dependencies

2.2.1 (2025-10-26)
------------------

- IMPROVEMENT: improve chunk/section jumping behaviour
- IMPROVEMENT: add Bitfocus Companion plugin to Rundown Brige
- UPDATE: upgrade NPM dependencies

2.2.0 (2025-10-18)
------------------

- IMPROVEMENT: support German language (words with umlauts) for autoscrolling
- IMPROVEMENT: support auto-guessing the language for autoscrolling
- CLEANUP: added missing keystrokes to CONTROL tab on Web UI
- UPDATE: upgrade NPM dependencies

2.1.0 (2025-10-15)
------------------

- IMPROVEMENT: switch to requestAnimationFrame for smoother auto-scrolling
- IMPROVEMENT: make DOM loading and rendering more robust
- IMPROVEMENT: improve rendering performance
- IMPROVEMENT: use black with only alpha for the top/bottom overlay colors
- UPDATE: upgrade NPM dependencies

2.0.2 (2025-10-08)
------------------

- BUGFIX: fix PowerPoint state handling

2.0.1 (2025-10-05)
------------------

- CLEANUP: always use latest Alpine Linux version in docker container
- REFACTOR: move wrapping of words from run-time renderer to DOM generation library

2.0.0 (2025-10-05)
------------------

- IMPROVEMENT: add optional speech-to-text based auto-scrolling
- REFACTOR: split the rundown-2-rnd package into multiple source files
- UPDATE: upgrade NPM dependencies

1.5.2 (2025-10-03)
------------------

- CLEANUP: revert accidentally changed template

1.5.1 (2025-10-03)
------------------

- IMPROVEMENT: skip build targets on foreign hosts
- IMPROVEMENT: make "package" task a separate STX step
- UPDATE: upgrade NPM dependencies
- CLEANUP: various code cleanups

1.5.0 (2025-09-29)
------------------

- IMPROVEMENT: avoid slowing down PowerPoint on (re)entering locked mode
- BUGFIX: fix documentation of "ppt:xxx" states

1.4.8 (2025-09-20)
------------------

- BUGFIX: in the bridge, keep the internal work-off queue working after an error
- CLEANUP: ensure "NaN" does not occur for the percent display
- CLEANUP: catch errors in ZIP internal file loading
- CLEANUP: catch errors in file upload handling
- CLEANUP: catch errors in document replacement handling
- CLEANUP: catch errors in CLI DOCX conversion
- CLEANUP: improve typing in OSC server

1.4.7 (2025-09-20)
------------------

- IMPROVEMENT: add 6pt margin at end of a paragraph via R011 style
- BUGFIX: fix description of R312 and R313 styles in cheat sheet of template
- CLEANUP: cleanup linting/building by splitting lint into own stx command
- CLEANUP: various code cleanups
- UPDATE: upgrade NPM dependencies

1.4.6 (2025-07-26)
------------------

- CLEANUP: use more verbose output for "stx"
- UPDATE: upgrade NPM dependencies

1.4.5 (2025-07-06)
------------------

- BUGFIX: fix "clean-dist" NPS target
- BUGFIX: fix markdown code in Unix manual page of CLI
- BUGFIX: fix name of rundown-7-dst package
- IMPROVEMENT: replace "nps" with "stx" as the build tool

1.4.4 (2025-07-03)
------------------

- UPDATE: upgrade NPM dependencies
- BUGFIX: fix environment variable usage in build process for Windows platforms
- BUGFIX: make CLI filesystem watching (for live updates) more robust
- BUGFIX: add missing files to version control
- BUGFIX: de-indent NPS build scripts to better support Windows platform
- CLEANUP: remove more files on clean-dist target

1.4.3 (2025-07-01)
------------------

- UPDATE: upgrade NPM dependencies

1.4.2 (2025-06-25)
------------------

- UPDATE: upgrade NPM dependencies

1.4.1 (2025-06-22)
------------------

- UPDATE: upgrade NPM dependencies

1.4.0 (2025-05-29)
------------------

- IMPROVEMENT: introduce "R011: Base Paragraph" and "R021: Base Character" styles
- IMPROVEMENT: improve styling of "R321: Emphasis" to just underline and italics
- UPDATE: upgrade NPM dependencies

1.3.4 (2025-05-27)
------------------

- UPDATE: upgrade NPM dependencies

1.3.3 (2025-05-26)
------------------

- BUGFIX: fix rendering of optically empty content at start
- UPDATE: upgrade NPM dependencies

1.3.2 (2025-05-22)
------------------

- UPDATE: upgrade NPM dependencies
- IMPROVEMENT: improve rendering of arrows and dashes
- BUGFIX: fix header in generated HTML file
- BUGFIX: fix rendering of list elements with only disabled content

1.3.1 (2025-05-18)
------------------

- UPDATE: upgrade NPM dependencies
- IMPROVEMENT: switch from Node.js 22 to 24

1.3.0 (2025-05-10)
------------------

- IMPROVEMENT: improve rendering of part headers
- IMPROVEMENT: improve rendering of lists
- IMPROVEMENT: improve optical rendering
- IMPROVEMENT: increase margin for Display and Hint styles in rendering
- BUGFIX: fix building executables
- BUGFIX: only use 'key' and not 'code' information of KeyboardEvent, as
  virtual keyboards like VICREO Listener do not cause 'code' to be set in
  at least Chrome browser
- BUGFIX: fix upd(1) usage at top-level
- UPDATE: upgrade NPM dependencies
- CLEANUP: cleanup NPM dependencies

1.2.6 (2025-04-24)
------------------

- IMPROVEMENT: improve descriptions in top-level README.md
- CLEANUP: updated all screenshots
- CLEANUP: fix mail URL in Web UI

1.2.5 (2025-04-24)
------------------

- BUGFIX: fix Docker entrypoint argument handling

1.2.4 (2025-04-24)
------------------

- IMPROVEMENT: add Docker entrypoint for running both "rundown-cli" and "rundown-bridge"
- CLEANUP: add CHANGELOG.md entries to Github release
- CLEANUP: remove Perfect Scrollbar and additional TypoPRO font weights from Web UI

1.2.3 (2025-04-23)
------------------

- IMPROVEMENT: on SPACE and ESCAPE gradually adjust speed for smoother experience
- IMPROVEMENT: provide a lock functionality for production scenarios which disables some interactions
- IMPROVEMENT: under lock situation, prevent from scroll backwards over a state

1.2.2 (2025-04-23)
------------------

- IMPROVEMENT: for Rundown Web mode, convert only the latest DOCX file on startup
- UPDATE: cleanup NPM dependencies

1.2.1 (2025-04-23)
------------------

- IMPROVEMENT: also perform "upd" at the top-level
- UPDATE: update NPM dependencies
- BUGFIX: fix rendering in case of no existing states at all

1.2.0 (2025-04-23)
------------------

- REFACTORING: factor our rendering part from Rundown Lib to be able to use Vite for it, too
- IMPROVEMENT: support new style "R325: State" for automation
- IMPROVEMENT: use Stylus instead of CSS also in Rundown Lib
- IMPROVEMENT: validate the WebSocket requests in Rundown CLI more strictly
- IMPROVEMENT: added first cut for a Rundown Bridge tool controlling PowerPoint
- BUGFIX: avoid crashes in "ws" module for Rundown CLI by patching away optional dependencies
- BUGFIX: fix scrolling after scroll-wheel usage

1.1.3 (2025-04-18)
------------------

- IMPROVEMENT: improve smooth scrolling to work also under Firefox
- CLEANUP: various source tree cleanups
- BUGFIX: minify conditionally, never report gzip compression

1.1.2 (2025-04-17)
------------------

- CLEANUP: cleanup Word styles

1.1.1 (2025-04-17)
------------------

- CLEANUP: use more polyfills for Rundown Web
- CLEANUP: cleanup logging outputs
- UPDATE: update NPM dependencies

1.1.0 (2025-04-16)
------------------

- IMPROVEMENT: renamed style "R314: Hint" to "R315: Hint"
- IMPROVEMENT: converted style "R315: Description" to "R324: Info"
- IMPROVEMENT: added new style "R314: Display" for media display
- CLEANUP: remove rundown script sample to avoid confusion with template
- UPDATE: remove sample document button in Web UI

1.0.2 (2025-04-16)
------------------

- IMPROVEMENT: add logo to the rendering view
- IMPROVEMENT: provide new screenshots
- CLEANUP: cleanup description
- CLEANUP: cleanup cheat sheet
- CLEANUP: ignore more generated files

1.0.1 (2025-04-16)
------------------

- UPDATE: update architecture diagram
- IMPROVEMENT: distribute also the manual page
- IMPROVEMENT: provide also arm64 variants of the distribution

1.0.0 (2025-04-15)
------------------

- CLEANUP: final cleanups to source tree

0.9.5 (2025-04-15)
------------------

- IMPROVEMENT: increase default font size in rendering
- IMPROVEMENT: support changing the line height of rendering, too
- IMPROVEMENT: provide better top-level development procedure
- IMPROVEMENT: add info footer to Web UI
- UPDATE: update NPM dependencies

0.9.4 (2025-04-15)
------------------

- CLEANUP: also provide rundown-web.zip in distribution archives

0.9.3 (2025-04-14)
------------------

- IMPROVEMENT: simplify Docker container image generation
- IMPROVEMENT: automate Github release creation
- CLEANUP: various source tree cleanups

0.9.2 (2025-04-14)
------------------

- IMPROVEMENT: move distribution assembly line into own folder
- IMPROVEMENT: inline Rundown Web into Rundown CLI
- IMPROVEMENT: provide also sample for downloading in Rundown Web UI
- IMPROVEMENT: reduce Docker container image size
- CLEANUP: various code cleanups

0.9.1 (2025-04-14)
------------------

- BUGFIX: fix stdin/stdout handling in CLI
- IMPROVEMENT: improve Docker container image building

0.9.0 (2025-04-13)
------------------

(first stable release)

