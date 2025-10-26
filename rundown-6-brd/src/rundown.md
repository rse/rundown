
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
  Activate plugin of id *id*. Currently the following plugins are supported:

  - `ppt` (Microsoft PowerPoint):
    This plugin accepts the following key/value configurations:
    `prefix=`*prefix*, `connect=udp://`*ip*`:`*port*, and
    `listen=udp://`*ip*`:`*port*. This plugin then reacts on the
    following run-time states: *prefix*`:start` (start presentation),
    *prefix*`:end` (end presentation), *prefix*`:next` (goto next
    slide), *prefix*`:prev` (goto previous slide), *prefix*`:goto=`*N*
    (goto particular slide *N*), and *prefix*`:black` (toggle
    presentation blank).

  - `bfc` (Bitfocus Companion):
    This plugin accepts the following key/value configurations:
    `prefix=`*prefix*, `connect=udp://`*ip*`:`*port*, and
    `alias=`*alias*`:`*coords*[`;`*alias*`:`*coords*[;...]] where
    *coords* is a *coord*[`+`*coord*,[`+`...]] and *coord* is
    *page*`/`*row*`/`*colum*. This plugin then reacts on the
    follwing states: *prefix*`:press=`*page*`/`*row*`/`*colum* and
    *prefix*`:`*alias*.

## HISTORY

`rundown-bridge`(1) was developed in April 2025 for use in the *msg Filmstudio*.

## AUTHOR

Dr. Ralf S. Engelschall <rse@engelschall.com>

