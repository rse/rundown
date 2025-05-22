
ChangeLog
=========

1.3.2 (2025-05-XX)
------------------

- UPDATE: upgrade NPM dependencies

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

