#include "pymport.h"
#include "pystackobject.h"
#include "values.h"

using namespace Napi;
using namespace pymport;

Value PyObjectWrap::_Call(const PyWeakRef &py, const CallbackInfo &info) {
  Napi::Env env = info.Env();

  if (!PyCallable_Check(*py)) { throw Napi::TypeError::New(env, "Value not callable"); }

  PyStrongRef kwargs = PyDict_New();
  ExceptionHandler(env, kwargs);
  size_t argc = info.Length();
  if (argc > 0 && info[argc - 1].IsObject() && !info[argc - 1].IsArray() && !_InstanceOf(info[argc - 1])) {
    PyObjectStore store;
    _Dictionary((info[argc - 1]).ToObject(), kwargs, store);
    argc--;
  }

  PyStrongRef args = PyTuple_New(argc);
  ExceptionHandler(env, args);
  for (size_t i = 0; i < argc; i++) {
    PyStrongRef v = FromJS(info[i]);
    ExceptionHandler(env, v);
    // FromJS returns a strong reference and PyTuple_SetItem steals it
    int status = PyTuple_SetItem(*args, i, v.gift());
    ExceptionHandler(env, status);
  }

  PyStrongRef r = PyObject_Call(*py, *args, *kwargs);
  ExceptionHandler(env, r);

  return New(env, std::move(r));
}

Value PyObjectWrap::Call(const CallbackInfo &info) {
  return _Call(self, info);
}

Value PyObjectWrap::_CallableTrampoline(const CallbackInfo &info) {
  PyObject *py = reinterpret_cast<PyObject *>(info.Data());
  return _Call(py, info);
}

Value PyObjectWrap::Callable(const CallbackInfo &info) {
  Napi::Env env = info.Env();

  return Boolean::New(env, PyCallable_Check(*self));
}

Value PyObjectWrap::Eval(const CallbackInfo &info) {
  Napi::Env env = info.Env();
  auto text = NAPI_ARG_STRING(0).Utf8Value();
  PyStrongRef globals = info.Length() > 1 ? FromJS(info[1]) : PyStrongRef(PyDict_New());
  ExceptionHandler(env, globals);
  PyStrongRef locals = info.Length() > 2 ? FromJS(info[2]) : PyStrongRef(PyDict_New());
  ExceptionHandler(env, locals);

  PyStrongRef result = PyRun_String(text.c_str(), Py_eval_input, *globals, *locals);
  ExceptionHandler(env, result);

  return New(env, std::move(result));
}

void PyObjectWrap::_ExceptionThrow(Napi::Env env) {
  PyWeakRef err = PyErr_Occurred();
  if (err != nullptr) {
    PyStrongRef type = nullptr, v = nullptr, trace = nullptr;

    PyErr_Fetch(&type, &v, &trace);
    PyErr_Clear();

    PyStrongRef pstr = PyObject_Str(*v);
    const char *py_err_msg = PyUnicode_AsUTF8(*pstr);

    std::string err_msg = std::string("Python exception: ") + py_err_msg LINEINFO;

    auto error_object = Napi::Error::New(env, err_msg);
    if (trace != nullptr) {
      auto trace_object = New(env, std::move(trace));
      error_object.Set("pythonTrace", trace_object);
    }
    throw error_object;
  }
  throw Napi::TypeError::New(env, std::string("Unknown Python error ") LINEINFO);
}
