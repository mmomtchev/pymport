#!/bin/bash

set -x
unset MAKEFLAGS

mkdir -p dist
if [ ! -r dist/Python-${BUILTIN_PYTHON_VERSION}.tgz ]; then
  curl https://www.python.org/ftp/python/${BUILTIN_PYTHON_VERSION}/Python-${BUILTIN_PYTHON_VERSION}.tgz --output dist/Python-${BUILTIN_PYTHON_VERSION}.tgz
fi

if [ ! -d "$1" ] || [ ! -r "${LIBNAME}" ]; then
  echo building in $1
  rm -rf build/Python-${BUILTIN_PYTHON_VERSION}
  rm -rf build/openssl

  tar -C build -zxf dist/Python-${BUILTIN_PYTHON_VERSION}.tgz
  (
    cd build/Python-${BUILTIN_PYTHON_VERSION}

    export PY_UNSUPPORTED_OPENSSL_BUILD=static
    patch < ../../patches/python-3.10-setup.py.patch
    patch < ../../patches/python-3.10-configure.patch
    case `uname` in
      'Linux')
        export LDFLAGS="-Wl,-z,origin -Wl,-rpath,'\$\$ORIGIN/../lib'"
        export CFLAGS=""
        LIBNAME="$1/lib/libpython3.10.so"
        export ZLIB_LIBS="-lz -ldl"
        ;;
      'Darwin')
        export LDFLAGS="-Wl,-rpath,@loader_path/../lib"
        mkdir -p ../openssl/lib
        mkdir -p ../openssl/include
        cp $(brew --prefix openssl@1.1)/lib/*.a ../openssl/lib
        cp -r $(brew --prefix openssl@1.1)/include/openssl ../openssl/include
        export SSL="--with-openssl=$(pwd)/../openssl"
        LIBNAME="$1/lib/libpython3.10.dylib"
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
