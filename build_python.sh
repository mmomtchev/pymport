VERSION=3.10.8

unset MAKEFLAGS

mkdir -p dist
if [ ! -r dist/Python-${VERSION}.tgz ]; then
  curl https://www.python.org/ftp/python/${VERSION}/Python-${VERSION}.tgz --output dist/Python-${VERSION}.tgz
fi

if [ ! -d "$1" ] || [ ! -r "$1/lib/libpython3.10.so" ]; then
  echo building in $1
  rm -rf build/Python-${VERSION}

  tar -C build -zxf dist/Python-${VERSION}.tgz
  (
    cd build/Python-${VERSION}
    export LDFLAGS="-Wl,-z,origin -Wl,-rpath,'\$\$ORIGIN/../lib'"
    ./configure --prefix $1 --enable-shared --enable-optimizations --disable-test-modules
    make -j4 build_all
    make install
  )
  ln -s bin/python3 $1/python
fi
