
# rundown(1) -- Generate Rundown Scripts for Teleprompting

## SYNOPSIS

`rundown`
\[`-h`|`--help`\]
\[`-V`|`--version`\]
\[`-e`|`--extract` *css-selector-chain*\]
\[`-o`|`--output` *output-file*|`-`]
\[`-a`|`--http-addr` *ip-address*\]
\[`-p`|`--http-port` *tcp-port*\]
\[`-m`|`--mode` `cmd`|`web`|`web-ui`\]
\[*input-file*|`-`|*input-directory*\]

## DESCRIPTION

`rundown`(1) is a small command-line tool to generate *rundown scripts*
for teleprompting. It can read *Microsoft Word* format files (`*.docx`),
extract text from it, and generate HTML/XML output for use in the
teleprompting applications *QPrompt* and *Autocue Explorer/Pioneer*.

## OPTIONS

The following command-line options and arguments exist:

- \[`-h`|`--help`\]:
  Show program usage information only.

- \[`-V`|`--version`\]:
  Show program version information only.

- \[`-e`|`--extract` *css-selector-chain*\]:
  Extract the text from the HTML DOM generated from the DOCX input
  document with the help of a CSS selector chain like `body` or
  `table:last tr:gt(0) td:last`.

- \[`-o`|`--output` *output-file*|`-`\]:
  Write the output to a file or `stdout`.

- \[`-a`|`--http-addr` *ip-address*\]:
  Listen on *ip-address* for serving the result.

- \[`-p`|`--http-port` *tcp-port*\]:
  Listen on *tcp-port* for serving the result.

- \[`-m`|`--mode` `cmd`|`web`|`web-ui`\]:
  Select the operation mode, `cmd` (default) for the CLI based
  one-shot rendering, `web` for the Web-based continuous rendering,
  and `web-ui` for the Web user interface for interactive rendering.

- \[*input-file*|`-`|*input-directory*\]
  Read the input from a file or `stdin`.

## HISTORY

`rundown`(1) was developed in December 2023 for use in the *msg Filmstudio*.

## AUTHOR

Dr. Ralf S. Engelschall <rse@engelschall.com>

