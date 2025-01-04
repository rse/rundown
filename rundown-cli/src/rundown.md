
# rundown(1) -- Generate Rundown Scripts for Teleprompting

## SYNOPSIS

`rundown`
\[`-h`|`--help`\]
\[`-V`|`--version`\]
\[`-e`|`--extract` *css-selector-chain*\]
\[`-o`|`--output` *output-file*|`-`]
*input-file*|`-`

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

- *input-file*|`-`
  Read the input from a file or `stdin`.

## EXAMPLES

The following are examples of using `rundown`(1):

- read DOCX file and generate script for *QPrompt*:

    ```sh
    $ rundown -o sample.html sample.docx
    ```

- read DOCX file, extract text from last column (of all rows, except the
  heading one) of the last table, and generate script for *QPrompt*:

    ```sh
    $ rundown -e "table:last tr:gt(0) td:last" -o sample.html sample.docx
    ```

## HISTORY

`rundown`(1) was developed in December 2023 for use in the *msg Filmstudio*.

## AUTHOR

Dr. Ralf S. Engelschall <rse@engelschall.com>

