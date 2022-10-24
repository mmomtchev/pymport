#include "pymport.h"
#include "values.h"

using namespace Napi;
using namespace pymport;

size_t active_environments = 0;

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
      // We can't finalize the Python environment until there is
      // a solution for https://github.com/nodejs/node/issues/45088
      //if (active_environments == 0) { Py_Finalize(); }
      // context will be deleted by the NAPI Finalizer
    },
    context);
  if (active_environments == 0) {
    Py_Initialize();
#ifdef BUILTIN_PYTHON_PATH
    Py_SetPythonHome(BUILTIN_PYTHON_PATH);
#endif
  }
  active_environments++;
  return exports;
}

NODE_API_MODULE(pymport, Init)
