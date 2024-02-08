#!/bin/bash

set -x
unset MAKEFLAGS

mkdir -p dist
if [ ! -r dist/Python-${BUILTIN_PYTHON_VERSION}.tgz ]; then
  curl https://www.python.org/ftp/python/${BUILTIN_PYTHON_VERSION}/Python-${BUILTIN_PYTHON_VERSION}.tgz --output dist/Python-${BUILTIN_PYTHON_VERSION}.tgz
fi

case `uname` in
  'Linux') LIBNAME="$1/lib/libpython3.12.so" ;;
  'Darwin') LIBNAME="$1/lib/libpython3.12.dylib" ;;
  *) echo 'Unsupported platform for the builtin Python interpreter'
     exit 1
     ;;
esac

if [ ! -d "$1" ] || [ ! -r "${LIBNAME}" ]; then
  echo building in $1
  rm -rf build/Python-${BUILTIN_PYTHON_VERSION}
  rm -rf build/openssl

  tar -C build -zxf dist/Python-${BUILTIN_PYTHON_VERSION}.tgz
  (
    cd build/Python-${BUILTIN_PYTHON_VERSION}
    patch < ../../patches/python-3.12-configure.patch

    export PY_UNSUPPORTED_OPENSSL_BUILD=static
    case `uname` in
      'Linux')
        export LDFLAGS="-Wl,-z,origin -Wl,-rpath,'\$\$ORIGIN/../lib'"
        export CFLAGS=""
        export ZLIB_LIBS="-lz -ldl"
        export LIBFFI_LIBS="-l:libffi_pic.a -Wl,--exclude-libs,libffi_pic.a"
        ;;
      'Darwin')
        export LDFLAGS="-Wl,-rpath,@loader_path/../lib"
        mkdir -p ../openssl/lib
        mkdir -p ../openssl/include
        cp $(brew --prefix openssl@1.1)/lib/*.a ../openssl/lib
        cp -r $(brew --prefix openssl@1.1)/include/openssl ../openssl/include
        export SSL="--with-openssl=$(pwd)/../openssl"
        ;;
    esac

    ./configure --prefix $1 --enable-shared --enable-optimizations ${SSL}
    make -j4 build_all
    make install
  )
  rm -f $1/python
  [ ! -r $1/bin/python3 ] && ln -s python3.12 $1/bin/python3
  ln -s bin/python3 $1/python
fi
