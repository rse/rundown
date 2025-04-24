#!/bin/bash

if [[ $1 = "rundown-cli" ]]; then
    shift
    exec node --no-warnings rundown-cli.js ${1+"$@"}
elif [[ $1 = "rundown-bridge" ]]; then
    shift
    exec node --no-warnings rundown-bridge.js ${1+"$@"}
else
    echo "ERROR: invalid command (expected \"rundown-cli\" or \"rundown-bridge\")" 1>&2
fi

