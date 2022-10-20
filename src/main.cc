#include "pymport.h"
#include "values.h"

using namespace Napi;
using namespace pymport;

size_t active_environments = 0;

Napi::Object Init(Env env, Object exports) {
  Function pyObjCons = PyObj::GetClass(env);

  exports.Set("PyObject", pyObjCons);
  exports.Set("pymport", Function::New(env, PyObj::Import));

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
  if (active_environments == 0) { Py_Initialize(); }
  active_environments++;
  return exports;
}

NODE_API_MODULE(pymport, Init)
