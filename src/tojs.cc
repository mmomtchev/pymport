#include "pymport.h"
#include "pystackobject.h"
#include <map>

using namespace Napi;
using namespace pymport;

// _ToJS expects a borrowed reference
Napi::Value PyObjectWrap::_ToJS(Napi::Env env, PyObject *py, NapiObjectStore &store) {
  // This is a temporary store that breaks recursion, it keeps tracks of the locally
  // created Napi::Objects for each PyObject and if one is encountered multiple times,
  // then it is replaced by the same reference
  // This also means that the recursion must use a single Napi::HandleScope because these
  // are stack-allocated local references
  auto existing = store.find(py);
  if (existing != store.end()) { return existing->second; }

  if (PyLong_Check(py)) { return Number::New(env, PyLong_AsLong(py)); }

  if (PyFloat_Check(py)) { return Number::New(env, PyFloat_AsDouble(py)); }

  if (PyList_Check(py)) {
    Napi::Array r = Array::New(env);
    size_t len = PyList_Size(py);
    store.insert({py, r});

    for (size_t i = 0; i < len; i++) {
      PyObject *v = PyList_GetItem(py, i);
      Napi::Value js = _ToJS(env, v, store);
      r.Set(i, js);
    }
    return r;
  }

  if (PyUnicode_Check(py)) {
    PyStackObject utf16 = PyUnicode_AsUTF16String(py);
    auto raw = PyBytes_AsString(utf16);
    return String::New(env, reinterpret_cast<char16_t *>(raw + 2), PyUnicode_GET_LENGTH(py));
  }

  if (PyDict_Check(py)) {
    auto obj = Object::New(env);

    PyObject *key, *value;
    Py_ssize_t pos = 0;
    store.insert({py, obj});
    while (PyDict_Next(py, &pos, &key, &value)) {
      auto jsKey = _ToJS(env, key, store);
      auto jsValue = _ToJS(env, value, store);
      obj.Set(jsKey, jsValue);
    }
    return obj;
  }

  if (PyTuple_Check(py)) {
    Napi::Array r = Array::New(env);
    size_t len = PyTuple_Size(py);
    store.insert({py, r});

    for (size_t i = 0; i < len; i++) {
      PyObject *v = PyTuple_GetItem(py, i);
      Napi::Value js = _ToJS(env, v, store);
      r.Set(i, js);
    }
    return r;
  }

  if (PyModule_Check(py)) {
#ifdef WIN32
    throw Error::New(env, "toJS() on Python module objects is still not supported on Windows");
#else
    auto dict = PyModule_GetDict(py);
    auto r = _ToJS(env, dict, store);
    return r;
#endif
  }

  if (py == Py_None) { return env.Null(); }

  if (py == Py_False) { return Boolean::New(env, false); }
  if (py == Py_True) { return Boolean::New(env, true); }

  // Everything else is kept as a PyObject
  // (New/NewCallable expect a strong reference and steal it)
  Py_INCREF(py);
  if (PyCallable_Check(py)) { return NewCallable(env, py); }
  return New(env, py);
}

Napi::Value PyObjectWrap::ToJS(Napi::Env env, PyObject *py) {
  NapiObjectStore store;
  return _ToJS(env, py, store);
}

Napi::Value PyObjectWrap::ToJS(const CallbackInfo &info) {
  Napi::Env env = info.Env();

  return PyObjectWrap::ToJS(env, self);
}