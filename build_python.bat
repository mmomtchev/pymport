set mypath=%~dp0
cd %mypath:~0,-1%

if not exist dist mkdir dist
if not exist dist\Python-%BUILTIN_PYTHON_VERSION%.tgz (
  curl https://www.python.org/ftp/python/%BUILTIN_PYTHON_VERSION%/Python-%BUILTIN_PYTHON_VERSION%.tgz --output dist\Python-%BUILTIN_PYTHON_VERSION%.tgz
)

if not exist "%1\python312.lib" (
  echo building in %1
  rd /q /s build\Python-%BUILTIN_PYTHON_VERSION%

  tar -C build -zxf dist\Python-%BUILTIN_PYTHON_VERSION%.tgz
  build\Python-%BUILTIN_PYTHON_VERSION%\PCBuild\build.bat
  mkdir -p %1\DLLs
  (robocopy build\Python-%BUILTIN_PYTHON_VERSION%\PCBuild\amd64 %1\DLLs /MIR) ^& if %ERRORLEVEL% leq 1 set ERRORLEVEL = 0
  (robocopy build\Python-%BUILTIN_PYTHON_VERSION%\Lib %1\lib /MIR) ^& if %ERRORLEVEL% leq 1 set ERRORLEVEL = 0
  (robocopy build\Python-%BUILTIN_PYTHON_VERSION%\Include %1\include /MIR) ^& if %ERRORLEVEL% leq 1 set ERRORLEVEL = 0
  copy build\Python-%BUILTIN_PYTHON_VERSION%\PC\pyconfig.h %1\include
  FOR %%E IN (
    py.exe python.exe python3.dll python312.dll python312.lib pythonw.exe pyw.exe venvlauncher.exe venvwlauncher.exe _testembed.exe
  ) DO move "%1\DLLs\%%E" %1
  set PYTHONHOME=%~1
  %1\python -m ensurepip
)
