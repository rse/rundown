
## About

**Rundown** is the toolkit of *Dr. Ralf S. Engelschall* for rendering
*rundown scripts* for teleprompting. It reads a style-driven Microsoft
Word `*.docx` file as its single source of truth, extracts the columns
of a particular table, and renders typographically strong, smooth-scrolling
HTML for browser-based teleprompting. It can additionally remote-control
Microsoft PowerPoint or Bitfocus Companion, and supports AI-based
auto-scrolling via client-side Speech-to-Text with fuzzy text matching.

## Repository Layout

**Rundown** is a monorepo of numbered component packages, wired via
`file:../` dependencies and orchestrated by `@rse/stx` (they are not npm
workspaces). The top-level `package.json` is a thin orchestrator and
holds the real version; components `3`-`6` are versioned `0.0.0`.

-   `rundown-1-doc/`: input documents, templates (`rundown-template.docx`),
    logos, screenshots, and diagrams. No code.
-   `rundown-2-rnd/`: teleprompter output rendering — the HTML/CSS/JS
    template and client-side runtime (TypeScript + Stylus + HTML).
-   `rundown-3-lib/`: the core library performing DOCX→HTML conversion
    (via mammoth + cheerio). Published as ESM/CJS/UMD.
-   `rundown-4-web/`: the Vue 3 web UI, built with Vite.
-   `rundown-5-cli/`: the command-line interface (`bin: rundown`), with
    CMD/WEB/WEB-UI modes; embeds a HAPI web server.
-   `rundown-6-brd/`: the bridge CLI for PowerPoint / Bitfocus Companion
    remote control.
-   `rundown-7-dst/`: distribution assembly — per-platform archives,
    Docker container, and GitHub releases. No code.

Each of `2`-`7` is a separate npm package with its own `package.json`,
`etc/stx.conf`, and `node_modules`.

## Build System

Build orchestration uses `@rse/stx`, not plain npm scripts. The only
meaningful npm script at each level is `npm start`, which invokes stx
with `etc/stx.conf`; targets are run as `npm start <target>`. Common
top-level targets (each fans out to the components):

```
npm install               # install deps across all components (via postinstall)
npm start build           # full production build (rnd, lib, web, cli, brd)
npm start build:dev       # dev/partial build across components
npm start build:dev:watch # rebuild + relint on all */src dirs
npm start lint            # check-dependencies + eslint/type-check across components
npm start clean           # remove build artifacts
npm start clean:dist      # clean + remove root node_modules and package-lock.json
npm start run:dev         # concurrently run dev build + CLI + bridge watches
npm run  rundown          # run the built CLI (dst-stage2/rundown.js)
npm start rundown-web     # run the CLI in WEB mode
npm start rundown-web-ui  # run the CLI in WEB-UI mode
npm start package         # package cli, brd, dst
npm start publish         # publish distribution archives and Docker image
```

No test target is defined; `lint` (eslint + type-check, plus
stylelint/htmllint/markdownlint where applicable) is the only
static-verification step.

Sources live in each component's `src/` directory (TypeScript, plus Vue
SFCs, Stylus, HTML). Compilation is multi-stage into `dst-stage1`
(tsc types/intermediate), `dst-stage2` (Vite bundles), and `dst-stage3`
(manpages and native `pkg` binaries). The runnable CLI entry after build
is `rundown-5-cli/dst-stage2/rundown.js`.

## Code Style

Strict TypeScript conventions are enforced across `*/src/` via a shared
flat `etc/eslint.mjs` (typescript-eslint strict + stylistic, neostandard):
no semicolons (except inside `for`), double quotes, 4-space indent,
Stroustrup braces, no braces around single-statement `if`/`while` blocks,
`&&`/`||` before the operator on wrapped lines, vertically-aligned
operators and object keys on similar consecutive lines, `/*  ...  */`
block comments with two leading/trailing spaces, parens around all arrow
parameters, and line breaks before `else`/`catch`/`finally`. Every file
starts with the 5-line GPL license header. Match existing formatting
exactly when editing.

