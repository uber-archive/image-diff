#!/bin/sh
# Exit on first error
set -e

# Run foundry with arguments
./node_modules/.bin/foundry release "$@"
