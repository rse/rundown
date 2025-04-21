
# rundown-bridge(1) -- Rundown Bridge

## SYNOPSIS

`rundown-bridge`
\[`-h`|`--help`\]
\[`-V`|`--version`\]
\[`-v`|`--verbose` *level*\]
\[`-r`|`--rundown` `ws://`*ip-address*`:`*tcp-port*\]
\[`-p`|`--plugin` *id*`\[`:prefix=`*prefix*`,`\]\[*key*`=`*value*\[,...\]\]\]

## DESCRIPTION

`rundown-bridge`(1) is a small command-line tool to bridge events
between **Rundown** and other applications, driven by plugins. Currently
**PowerPoint** is supported as a plugin.

## OPTIONS

The following command-line options and arguments exist:

- \[`-h`|`--help`\]:
  Show program usage information only.

- \[`-V`|`--version`\]:
  Show program version information only.

- \[`-v`|`--verbose *level*`\]:
  Set verbose logging.

- \[`-r`|`--rundown` `ws://`*ip-address*`:`*tcp-port*\]:
  Connect to **Rundown**.

- \[`-p`|`--plugin` *id*`\[`:prefix=`*prefix*`,`\]\[*key*`=`*value*\[,...\]\]\]:
  Connect to **PowerPoint OSCPoint**.

## HISTORY

`rundown-bridge`(1) was developed in April 2025 for use in the *msg Filmstudio*.

## AUTHOR

Dr. Ralf S. Engelschall <rse@engelschall.com>

