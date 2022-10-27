#include <locale>
#include <codecvt>
#include <string>

#include "pymport.h"
#include "values.h"

using namespace Napi;
using namespace pymport;

size_t pymport::active_environments = 0;
std::wstring builtin_python_path;

Napi::Object Init(Env env, Object exports) {
  Function pyObjCons = PyObjectWrap::GetClass(env);

  exports.Set("PyObject", pyObjCons);
  exports.Set("pymport", Function::New(env, PyObjectWrap::Import));
  exports.Set("pyval", Function::New(env, PyObjectWrap::Eval));

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
    auto pathPython = std::getenv("PYTHONPATH");
    if (pathPython == nullptr) {
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
  }
  active_environments++;
  return exports;
}

NODE_API_MODULE(pymport, Init)
