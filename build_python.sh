#!/bin/bash

VERSION=3.11.1

set -x
unset MAKEFLAGS

mkdir -p dist
if [ ! -r dist/Python-${VERSION}.tgz ]; then
  curl https://www.python.org/ftp/python/${VERSION}/Python-${VERSION}.tgz --output dist/Python-${VERSION}.tgz
fi

case `uname` in
  'Linux')
    export LDFLAGS="-Wl,-z,origin -Wl,-rpath,'\$\$ORIGIN/../lib'"
    export CFLAGS=""
    LIBNAME="$1/lib/libpython3.11.so"
    export ZLIB_LIBS="-lz -ldl"
    export PY_UNSUPPORTED_OPENSSL_BUILD=static
    ;;
  'Darwin')
    export LDFLAGS="-Wl,-rpath,@loader_path/../lib"
    export SSL="--with-openssl=$(brew --prefix openssl@1.1)"
    LIBNAME="$1/lib/libpython3.11.dylib"
    ;;
  *)
    echo 'Unsupported platform for the builtin Python interpreter'
    exit 1
    ;;
esac

if [ ! -d "$1" ] || [ ! -r "${LIBNAME}" ]; then
  echo building in $1
  rm -rf build/Python-${VERSION}

  tar -C build -zxf dist/Python-${VERSION}.tgz
  (
    cd build/Python-${VERSION}
    sed -i 's/ffi_lib = None/ffi_lib=":libffi_pic.a"/g' setup.py

    ./configure --prefix $1 --enable-shared --enable-optimizations --disable-test-modules ${SSL}
    make -j4 build_all
    make install
  )
  rm -f $1/python
  ln -s bin/python3 $1/python
fi
