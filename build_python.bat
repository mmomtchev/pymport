set mypath=%~dp0
cd %mypath:~0,-1%

set PYTHON_DIST=%mypath:~0,-1%\dist
set PYTHON_BUILD=%mypath:~0,-1%\build
set PYTHON_VERSION=%BUILTIN_PYTHON_VERSION%
cd deps\static-portable-python
build_python.bat %1
