#include "pymport.h"
#include "pystackobject.h"
#include "values.h"

using namespace Napi;
using namespace pymport;

Value PyObj::_Call(PyObject *py, const CallbackInfo &info) {
  Napi::Env env = info.Env();

  if (!PyCallable_Check(py)) { throw Napi::TypeError::New(env, "Value not callable"); }

  PyStackObject args = PyTuple_New(info.Length());
  for (size_t i = 0; i < info.Length(); i++) {
    PyObject *v = FromJS(info[i]);
    THROW_IF_NULL(v);
    PyTuple_SetItem(args, i, v);
  }

  PyObject *r = PyObject_CallObject(py, args);
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
