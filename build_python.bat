set VERSION=3.10.8

set mypath=%~dp0
cd %mypath:~0,-1%

if not exist dist mkdir dist
if not exist dist/Python-%VERSION%.tgz (
  curl https://www.python.org/ftp/python/%VERSION%/Python-%VERSION%.tgz --output dist\Python-%VERSION%.tgz
)

if not exist "%1/python310.lib" (
  echo building in %1
  rd /q /s build\Python-%VERSION%

  tar -C build -zxf dist\Python-%VERSION%.tgz
  build\Python-%VERSION%\PCBuild\build.bat
  (robocopy build\Python-%VERSION%\PCBuild\amd64 %1 /MIR) ^& if %ERRORLEVEL% leq 1 set ERRORLEVEL = 0
  (robocopy build\Python-%VERSION%\Lib %1\lib /MIR) ^& if %ERRORLEVEL% leq 1 set ERRORLEVEL = 0
  %1\python -m ensurepip
)
