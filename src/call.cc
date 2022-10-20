#include "pymport.h"
#include "pystackobject.h"
#include "values.h"

using namespace Napi;
using namespace pymport;

Value PyObj::_Call(PyObject *py, const CallbackInfo &info) {
  Napi::Env env = info.Env();

  if (!PyCallable_Check(py)) { throw Napi::TypeError::New(env, "Value not callable"); }

  PyStackObject kwargs = PyDict_New();
  size_t argc = info.Length();
  if (argc > 0 && info[argc - 1].IsObject() && !info[argc - 1].IsArray() && !_InstanceOf(info[argc - 1])) {
    PyObjectStore store;
    _Dictionary((info[argc - 1]).ToObject(), kwargs, store);
    argc--;
  }

  PyStackObject args = PyTuple_New(argc);
  for (size_t i = 0; i < argc; i++) {
    PyObject *v = FromJS(info[i]);
    THROW_IF_NULL(v);
    PyTuple_SetItem(args, i, v);
  }

  PyObject *r = PyObject_Call(py, args, kwargs);
  THROW_IF_NULL(r);

  return New(env, r);
}

Value PyObj::Call(const CallbackInfo &info) {
  return _Call(self, info);
}

Value PyObj::_CallableTrampoline(const CallbackInfo &info) {
  PyObject *py = reinterpret_cast<PyObject *>(info.Data());
  return _Call(py, info);
}

Value PyObj::Callable(const CallbackInfo &info) {
  Napi::Env env = info.Env();

  return Boolean::New(env, PyCallable_Check(self));
}