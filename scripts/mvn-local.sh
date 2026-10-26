#!/usr/bin/env sh
# Standard build entrypoint; requires JDK 17+ and Maven 3.6.3+.
set -eu
cd "$(dirname "$0")/.."
exec mvn --batch-mode --no-transfer-progress "$@"
