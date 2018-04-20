#!/bin/bash

set -e

if [[ $(git diff) ]]; then
    echo "Git shows that there are changes."
    echo "$(git diff)"
    exit 1
else
    echo "Git shows no changes"
fi

