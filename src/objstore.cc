#include <Python.h>
#include "pymport.h"
#include "values.h"

using namespace Napi;
using namespace pymport;

#ifdef OBJ_STORE_DEBUG
#define OSDEBUG(...) printf(__VA_ARGS__)
#else
#define OSDEBUG(...)
#endif

// This the Object Store - it is stored per Environment
// in the environment instance data
// Credit goes to Brandon Reavis <brandon@naturalatlas.com>
// from whom I learned this trick
// All JS PyObjects created from C-API PyObjects are stored there
// The goal is to be able to reuse them when Python returns references
// This is the only way to avoid infinite loops when dealing with recursive structures

// New steals the py reference
Value PyObj::New(Napi::Env env, PyObject *obj) {
  THROW_IF_NULL(obj);

  auto context = env.GetInstanceData<EnvContext>();

  Object js;
  auto it = context->object_store.find(obj);
  if (it == context->object_store.end() || it->second->Value().IsEmpty()) {
    // This IsEmpty() situation is pending an award for most cumbersome API of the decade
    // (a JS object can be marked for deletion with a deferred destruction)
    if (it != context->object_store.end()) {
      // prevent the dying object from deleting the entry of the new one
      // as they share the same PyObject
      OSDEBUG("Objstore (%p): is dying %p (%d)\n", context, obj, (int)obj->ob_refcnt);
      context->object_store.erase(it->second->self);
      Py_DECREF(it->second->self);
      it->second->self = nullptr;
    }
    OSDEBUG("Objstore (%p): create %p (%d)\n", context, obj, (int)obj->ob_refcnt);
    js = context->pyObj->New({External<PyObject>::New(env, obj)});
    auto result = ObjectWrap::Unwrap(js);
    context->object_store.insert({obj, result});
  } else {
    // Retrieve the existing object from the store
    OSDEBUG("Objstore (%p): retrieve %p (%d)\n", context, obj, (int)obj->ob_refcnt);
    js = it->second->Value();
    // New must steal the reference
    Py_DECREF(obj);
  }

  return js;
}

Value PyObj::NewCallable(Napi::Env env, PyObject *py) {
  THROW_IF_NULL(py);

  auto context = env.GetInstanceData<EnvContext>();
  auto it = context->function_store.find(py);
  Function js;
  if (it == context->function_store.end()) {
    js = Function::New(env, _CallableTrampoline, "[Python_func]", py);
    FunctionReference *jsRef = new FunctionReference;
    // Functions never expire (for now)
    *jsRef = Napi::Persistent(js);
    context->function_store.insert({py, jsRef});
  } else {
    assert(!it->second->Value().IsEmpty());
    js = it->second->Value();
  }

  return js;
}

// This is triggered by the JS GC which destroys the JS PyObject
// -> the mapping is removed from the object store
// -> the C-API PyObject reference is decreased
// -> the Python GC can free the underlying object
void PyObj::Release() {
  Napi::Env env = Env();
  auto context = env.GetInstanceData<EnvContext>();

  auto it = context->object_store.find(self);
  assert(it != context->object_store.end());
  OSDEBUG("Objstore: delete %p (%d)\n", self, (int)self->ob_refcnt);
  context->object_store.erase(self);
}
