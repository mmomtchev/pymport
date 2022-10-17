#include "pymport.h"

using namespace Napi;

Napi::Object Init(Env env, Object exports) {
    Function pyObjCons = PyObj::GetClass(env);

    FunctionReference *pyObjRef = new FunctionReference();
    *pyObjRef = Napi::Persistent(pyObjCons);

    exports.Set("PyObject", pyObjCons);
    exports.Set("pymport", Function::New(env, PyObj::Import));

    env.SetInstanceData<FunctionReference>(pyObjRef);
    return exports;
}

napi_value pymport_init(napi_env env, napi_value exports) {
    Py_Initialize();

    return Napi::RegisterModule(env, exports, Init);
}
NAPI_MODULE(addon, pymport_init)
