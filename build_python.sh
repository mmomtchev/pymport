#!/bin/bash

VERSION=3.11.1

set -x
unset MAKEFLAGS

mkdir -p dist
if [ ! -r dist/Python-${VERSION}.tgz ]; then
  curl https://www.python.org/ftp/python/${VERSION}/Python-${VERSION}.tgz --output dist/Python-${VERSION}.tgz
fi

if [ ! -d "$1" ] || [ ! -r "${LIBNAME}" ]; then
  echo building in $1
  rm -rf build/Python-${VERSION}

  tar -C build -zxf dist/Python-${VERSION}.tgz
  (
    cd build/Python-${VERSION}

    export PY_UNSUPPORTED_OPENSSL_BUILD=static
    case `uname` in
      'Linux')
        export LDFLAGS="-Wl,-z,origin -Wl,-rpath,'\$\$ORIGIN/../lib'"
        export CFLAGS=""
        LIBNAME="$1/lib/libpython3.11.so"
        export ZLIB_LIBS="-lz -ldl"
        patch < ../../patches/python-3.11-setup.py.patch
        ;;
      'Darwin')
        export LDFLAGS="-Wl,-rpath,@loader_path/../lib"
        mkdir -p openssl/lib
        mkdir -p openssl/include
        cp $(brew --prefix openssl@1.1)/lib/*.a openssl/lib
        cp -r $(brew --prefix openssl@1.1)/include/openssl openssl/include
        export SSL="--with-openssl=$(pwd)/openssl"
        LIBNAME="$1/lib/libpython3.11.dylib"
        patch < ../../patches/python-3.11-configure.patch
        ;;
      *)
        echo 'Unsupported platform for the builtin Python interpreter'
        exit 1
        ;;
    esac

    ./configure --prefix $1 --enable-shared --enable-optimizations --without-system-ffi ${SSL}
    make -j4 build_all
    make -j4 install
  )
  rm -f $1/python
  ln -s bin/python3 $1/python
fi
