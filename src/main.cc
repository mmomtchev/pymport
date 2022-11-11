#include <locale>
#include <codecvt>
#include <string>
#include <sstream>
#include <iomanip>

#include "pymport.h"
#include "values.h"
#include "memview.h"

#define _SILENCE_CXX17_CODECVT_HEADER_DEPRECATION_WARNING

using namespace Napi;
using namespace pymport;

#define STR(s) __STR(s)
#define __STR(x) #x

size_t pymport::active_environments = 0;
std::wstring builtin_python_path;

std::string to_hex(long number) {
  std::stringstream r;
  r << std::hex << number;
  return r.str();
}

Value Version(const CallbackInfo &info) {
  Env env = info.Env();
  Object versionInfo = Object::New(env);

  Object pymportVersion = Object::New(env);
  versionInfo.Set("pymport", pymportVersion);
  pymportVersion.Set("major", Number::New(env, PYMPORT_VERSION_MAJOR));
  pymportVersion.Set("minor", Number::New(env, PYMPORT_VERSION_MINOR));
  pymportVersion.Set("patch", Number::New(env, PYMPORT_VERSION_PATCH));
  pymportVersion.Set("suffix", String::New(env, STR("" PYMPORT_VERSION_SUFFIX)));

#ifdef BUILTIN_PYTHON_PATH
  bool builtin = true;
#else
  bool builtin = false;
#endif
  Object pythonLibrary = Object::New(env);
  versionInfo.Set("pythonLibrary", pythonLibrary);
  pythonLibrary.Set("builtin", Boolean::New(env, builtin));
  pythonLibrary.Set("major", Number::New(env, PY_MAJOR_VERSION));
  pythonLibrary.Set("minor", Number::New(env, PY_MINOR_VERSION));
  pythonLibrary.Set("micro", Number::New(env, PY_MICRO_VERSION));
  pythonLibrary.Set("release", Number::New(env, PY_RELEASE_LEVEL));
  pythonLibrary.Set("serial", Number::New(env, PY_RELEASE_SERIAL));
  pythonLibrary.Set("version", String::New(env, to_hex(PY_VERSION_HEX)));

#if PY_MAJOR_VERSION > 3 || (PY_MAJOR_VERSION == 3 && PY_MINOR_VERSION >= 11)
  versionInfo.Set("pythonRuntime", String::New(env, to_hex(Py_Version)));
#else
  versionInfo.Set("pythonRuntime", env.Null());
#endif

  std::wstring_convert<std::codecvt_utf8_utf16<wchar_t>> converter;
  auto pyHomeWide = Py_GetPythonHome();
  if (pyHomeWide != nullptr) {
    std::string pyHome = converter.to_bytes(pyHomeWide);
    versionInfo.Set("pythonHome", String::New(env, pyHome.c_str()));
  } else {
    versionInfo.Set("pythonHome", env.Null());
  }

  return versionInfo;
}

extern void MemInit();

Napi::Object Init(Env env, Object exports) {
  Function pyObjCons = PyObjectWrap::GetClass(env);

  exports.Set("PyObject", pyObjCons);
  exports.Set("pymport", Function::New(env, PyObjectWrap::Import));
  exports.Set("pyval", Function::New(env, PyObjectWrap::Eval));
  exports.DefineProperty(PropertyDescriptor::Accessor<Version>("version", napi_enumerable));

  auto context = new EnvContext();
  context->pyObj = new FunctionReference();
  *context->pyObj = Persistent(pyObjCons);

  env.SetInstanceData<EnvContext>(context);
  env.AddCleanupHook(
    [](EnvContext *context) {
      active_environments--;
      context->pyObj->Reset();
      delete context->pyObj;
#ifdef DEBUG
      // This is complicated because of
      // https://github.com/nodejs/node/issues/45088
      // Anyway, it is really needed only for the asan build
      if (active_environments == 0) { Py_Finalize(); }
#endif
      // context will be deleted by the NAPI Finalizer
    },
    context);
  if (active_environments == 0) {
#ifdef BUILTIN_PYTHON_PATH
    auto pathPymport = std::getenv("PYMPORTPATH");
    auto homePython = std::getenv("PYTHONHOME");
    if (homePython == nullptr) {
      if (pathPymport == nullptr) {
        Py_SetPythonHome(BUILTIN_PYTHON_PATH);
      } else {
        std::wstring_convert<std::codecvt_utf8_utf16<wchar_t>> converter;
        builtin_python_path = converter.from_bytes(pathPymport);
        Py_SetPythonHome(builtin_python_path.c_str());
      }
    }
#endif
    Py_Initialize();
    memview::Init();
    PyObjectWrap::InitJSTrampoline();
  }
  active_environments++;
  return exports;
}

NODE_API_MODULE(pymport, Init)
