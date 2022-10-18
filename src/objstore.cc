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

// Credit goes to Brandon Reavis <brandon@naturalatlas.com>
// from whom I learned this trick
// All JS PyObjects created from C-API PyObjects are stored here
// The goal is to be able to reuse them when Python returns references
// This is the only way to avoid infinite loops when dealing with recursive structures

// TODO support multiple environments
std::map<PyObject *, PyObj *> object_store;

// New steals the py reference
Value PyObj::New(Napi::Env env, PyObject *obj) {
  THROW_IF_NULL(obj);

  Object js;
  auto it = object_store.find(obj);
  if (it == object_store.end()) {
    OSDEBUG("Objstore: create %p (%d)\n", obj, (int)obj->ob_refcnt);
    FunctionReference *cons = env.GetInstanceData<FunctionReference>();
    js = cons->New({External<PyObject>::New(env, obj)});
    auto result = ObjectWrap::Unwrap(js);
    object_store.insert({obj, result});
  } else {
    OSDEBUG("Objstore: retrieve %p (%d)\n", obj, (int)obj->ob_refcnt);
    js = it->second->Value();
    Py_DECREF(obj);
  }

  return js;
}

// This is triggered by the JS GC which destroys the JS PyObject
// -> the mapping is removed from the object store
// -> the C-API PyObject reference is decreased
// -> the Python GC can free the underlying object
void PyObj::Release() {
  auto it = object_store.find(self);
  if (it != object_store.end()) {
    OSDEBUG("Objstore: delete %p (%d)\n", self, (int)self->ob_refcnt);
    object_store.erase(self);
  }
}
