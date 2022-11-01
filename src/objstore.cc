#include <Python.h>
#include "pymport.h"
#include "pystackobject.h"
#include "values.h"

using namespace Napi;
using namespace pymport;

// This the Object Store - it is stored per Environment
// in the environment instance data
// Credit goes to Brandon Reavis <brandon@naturalatlas.com>
// from whom I learned this trick
// All JS PyObjects created from C-API PyObjects are stored there
// The goal is to be able to reuse them when Python returns references
// This is the only way to avoid infinite loops when dealing with recursive structures

// New steals the py reference
Value PyObjectWrap::New(Napi::Env env, PyStrongRef &&obj) {
  ExceptionHandler(env, obj);

  auto context = env.GetInstanceData<EnvContext>();
  VERBOSE_PYOBJ(*obj, "Objstore new");

  Object js;
  auto it = context->object_store.find(*obj);
  if (it == context->object_store.end() || it->second->Value().IsEmpty()) {
    // This IsEmpty() situation is pending an award for most cumbersome API of the decade
    // (a JS object can be marked for deletion with a deferred destruction)
    if (it != context->object_store.end()) {
      // prevent the dying object from deleting the entry of the new one
      // as they share the same PyObject
      VERBOSE_PYOBJ(*obj, "Objstore is dying");
      auto o = it->second;
      context->object_store.erase(*o->self);
      o->self = nullptr;
    }
    VERBOSE_PYOBJ(*obj, "Objstore insert");
    js = context->pyObj->New({External<PyObject>::New(env, obj.gift())});
    auto result = ObjectWrap::Unwrap(js);
    context->object_store.insert({*result->self, result});
  } else {
    // Retrieve the existing object from the store
    VERBOSE_PYOBJ(*obj, "Objstore retrieve");
    js = it->second->Value();
  }

  return js;
}

// NewCallable steals the reference
Value PyObjectWrap::NewCallable(Napi::Env env, PyStrongRef &&py) {
  ExceptionHandler(env, py);

  VERBOSE_PYOBJ(*py, "Funcstore new callable");
  auto context = env.GetInstanceData<EnvContext>();
  auto it = context->function_store.find(*py);
  Function js;
  if (it == context->function_store.end()) {
    VERBOSE_PYOBJ(*py, "Funcstore insert");
    // py is a strong reference that will be duplicated here
    // - one copy goes to the __PyObject__ property of the function which is a normal PyObject
    // - the other copy goes to the hint of the function descriptor which will be passed to the trampoline
    // both have the same lifecycle and both will be destroyed at the same time
    // -> so we consider them a single strong reference
    // It will be destroyed when the __PyObject__ is collected
    // (the function contains the __PyObject__ so the destruction order is defined)
    js = Function::New(env, _CallableTrampoline, "[PyFunction]", *py);

    // The function store keeps weak references to allow the GC to free these objects
    FunctionReference *jsRef = new FunctionReference;
    *jsRef = Napi::Weak(js);
    context->function_store.insert({*py, jsRef});
    js.AddFinalizer(
      [](Napi::Env env, FunctionReference *fini_fn, PyObject *fini_py) {
        VERBOSE_PYOBJ(fini_py, "Funcstore erase");
        auto context = env.GetInstanceData<EnvContext>();
        context->function_store.erase(fini_py);
        delete fini_fn;
      },
      jsRef,
      *py);

    js.DefineProperty(Napi::PropertyDescriptor::Value("__PyObject__", New(env, std::move(py)), napi_default));
  } else {
    VERBOSE_PYOBJ(*py, "Funcstore retrieve");
    // TODO: confirm that deferred destruction does not apply to functions??
    assert(!it->second->Value().IsEmpty());
    js = it->second->Value();
  }

  return js;
}

// This is triggered by the JS GC which destroys the JS PyObject
// -> the mapping is removed from the object store
// -> the C-API PyObject reference is decreased
// -> the Python GC can free the underlying object
void PyObjectWrap::Release() {
  Napi::Env env = Env();
  auto context = env.GetInstanceData<EnvContext>();

  ASSERT(context->object_store.find(*self) != context->object_store.end());
  VERBOSE_PYOBJ(*self, "Objstore erase");
  context->object_store.erase(*self);
}
