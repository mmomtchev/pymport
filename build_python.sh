#!/bin/bash

set -x
unset MAKEFLAGS
cd `dirname $0`

export PYTHON_DIST=$(pwd)/dist
export PYTHON_BUILD=$(pwd)/build
export PYTHON_VERSION=${BUILTIN_PYTHON_VERSION}
cd deps/static-portable-python
bash build_python.sh $1 --enable-shared
