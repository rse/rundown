# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Rundown is a toolkit for rendering teleprompter scripts from Microsoft Word documents. It converts DOCX files containing structured tables into HTML output for browser-based teleprompting with smooth scrolling and typography optimized for studio use.

## Architecture

The project uses a modular architecture with numbered components:

- **rundown-1-doc**: Input documents and templates
- **rundown-2-rnd**: Output rendering templates (HTML/CSS/JS)
- **rundown-3-lib**: Core TypeScript library for DOCX conversion
- **rundown-4-web**: Vue.js web interface
- **rundown-5-cli**: Command-line interface
- **rundown-6-brd**: Bridge interface
- **rundown-7-dst**: Distribution assembly

Each component is a separate npm package with its own package.json and build process.

## Common Commands

### Development
```bash
# Install all dependencies across all components
npm install

# Build all components for production
npm start build

# Build for development (partial build)
npm start build:dev

# Lint all components
npm start lint

# Development with file watching
npm start build:dev:watch
npm start run:dev
```

### Running Rundown
```bash
# Command-line batch conversion
npm run rundown -o output.html input.docx

# Web display mode (serves files from directory)
npm start rundown-web

# Web UI mode (interactive conversion)
npm start rundown-web-ui
```

### Cleanup
```bash
# Remove build artifacts
npm start clean

# Remove all artifacts including node_modules
npm start clean:dist
```

## Build System

The project uses STX (Simple Task eXecutor) for build orchestration via `etc/stx.conf`. Each component has its own build process:

- **TypeScript compilation**: All components use TypeScript
- **Vue.js**: Web interface uses Vue 3 with Vite
- **Multiple output formats**: Library builds ESM, CJS, and UMD versions
- **Distribution**: Creates CLI binaries and web archives

## Key Technologies

- **TypeScript**: Primary language (avoid plain JavaScript)
- **Vue.js 3**: Web interface framework
- **Node.js**: Runtime (requires Node.js >=22.0.0)
- **Mammoth.js**: DOCX to HTML conversion
- **Cheerio**: HTML manipulation
- **Vite**: Build tool for web components
- **HAPI**: Web server framework for CLI modes

## Code Style Notes

- No semicolons except in `for` loops
- Double quotes for strings
- Two spaces for comments: `/*  comment  */`
- Parentheses around all arrow function parameters
- Blank line before comment lines
- Vertical alignment of similar operators
- Spaces after opening and before closing braces/brackets

## Development Workflow

1. Make changes in component's `src/` directory
2. Use `npm start build:dev` for incremental builds
3. Use `npm start lint` to check code style
4. Test with appropriate rundown mode
5. Use `npm start build` for production builds

The project supports three operational modes:
- **CMD**: One-shot DOCX to HTML conversion
- **WEB**: Continuous conversion with file watching
- **WEB-UI**: Interactive browser-based conversion