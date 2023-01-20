#include <cmath>
#include <map>
#include "pymport.h"
#include "pystackobject.h"
#include "values.h"

using namespace Napi;
using namespace pymport;

// _ToJS expects a borrowed reference
Napi::Value PyObjectWrap::_ToJS(Napi::Env env, const PyWeakRef &py, NapiObjectStore &store, ToJSOpts opts) {
  if (opts.depth == 0) return New(env, PyStrongRef(py));
  // This is a temporary store that breaks recursion, it keeps tracks of the locally
  // created Napi::Objects for each PyObject and if one is encountered multiple times,
  // then it is replaced by the same reference
  // This also means that the recursion must use a single Napi::HandleScope because these
  // are stack-allocated local references
  auto existing = store.find(*py);
  if (existing != store.end()) { return existing->second; }

  // Fixed values before anything else
  // Especially since PyLong_Check succeeds for booleans
  if (*py == Py_None) { return env.Null(); }
  if (*py == Py_False) { return Boolean::New(env, false); }
  if (*py == Py_True) { return Boolean::New(env, true); }

  if (PyLong_Check(*py)) {
    int64_t raw = static_cast<int64_t>(PyLong_AsLongLong(*py));
    if (raw >= MIN_SAFE_JS_INTEGER && raw <= MAX_SAFE_JS_INTEGER) return Number::New(env, static_cast<double>(raw));
    return BigInt::New(env, static_cast<int64_t>(raw));
  }

  if (PyFloat_Check(*py)) { return Number::New(env, PyFloat_AsDouble(*py)); }

  if (PyList_Check(*py)) { return _ToJS_List(env, py, store, opts); }

  if (PyUnicode_Check(*py)) {
    PyStrongRef utf16 = PyUnicode_AsUTF16String(*py);
    EXCEPTION_CHECK(env, utf16);
    auto raw = PyBytes_AsString(*utf16);
    EXCEPTION_CHECK(env, static_cast<int>(raw == nullptr));
    return String::New(env, reinterpret_cast<char16_t *>(raw + 2), PyUnicode_GET_LENGTH(*py));
  }

  if (PyDict_Check(*py)) { return _ToJS_Dictionary(env, py, store, opts); }

  if (PyTuple_Check(*py)) { return _ToJS_Tuple(env, py, store, opts); }

  if (PyAnySet_Check(*py)) { return _ToJS_Set(env, py, store, opts); }

  if (PyModule_Check(*py)) { return _ToJS_Dir(env, py, store, opts); }

  if (PyObject_Type(*py) == *JSCall_Trampoline_Type) { return _ToJS_JSFunction(env, py); }

  if (opts.buffer && PyObject_CheckBuffer(*py)) { return _ToJS_Buffer(env, py, store); }

  // Everything else is kept as a PyObject
  // (New/NewCallable expect a strong reference and steal it)
  PyStrongRef strong(py);
  if (PyCallable_Check(*py)) { return NewCallable(env, std::move(strong)); }
  return New(env, std::move(strong));
}

Napi::Value PyObjectWrap::_ToJS_Dictionary(Napi::Env env, const PyWeakRef &py, NapiObjectStore &store, ToJSOpts opts) {
  auto obj = Object::New(env);

  PyWeakRef key = nullptr, value = nullptr;
  Py_ssize_t pos = 0;
  store.insert({*py, obj});
  while (PyDict_Next(*py, &pos, &key, &value)) {
    auto jsKey = _ToJS(env, key, store, {opts.depth - 1, opts.buffer});
    auto jsValue = _ToJS(env, value, store, {opts.depth - 1, opts.buffer});
    obj.Set(jsKey, jsValue);
  }
  return obj;
}

Napi::Value PyObjectWrap::_ToJS_Tuple(Napi::Env env, const PyWeakRef &py, NapiObjectStore &store, ToJSOpts opts) {
  Napi::Array r = Array::New(env);
  size_t len = PyTuple_Size(*py);
  store.insert({*py, r});

  for (size_t i = 0; i < len; i++) {
    PyWeakRef v = PyTuple_GetItem(*py, i);
    EXCEPTION_CHECK(env, v);
    Napi::Value js = _ToJS(env, v, store, {opts.depth - 1, opts.buffer});
    r.Set(i, js);
  }
  return r;
}

Napi::Value PyObjectWrap::_ToJS_List(Napi::Env env, const PyWeakRef &py, NapiObjectStore &store, ToJSOpts opts) {
  Napi::Array r = Array::New(env);
  size_t len = PyList_Size(*py);
  store.insert({*py, r});

  for (size_t i = 0; i < len; i++) {
    PyWeakRef v = PyList_GetItem(*py, i);
    EXCEPTION_CHECK(env, v);
    Napi::Value js = _ToJS(env, v, store, {opts.depth - 1, opts.buffer});
    r.Set(i, js);
  }
  return r;
}

Napi::Value PyObjectWrap::_ToJS_Set(Napi::Env env, const PyWeakRef &py, NapiObjectStore &store, ToJSOpts opts) {
  auto array = Array::New(env);

  PyStrongRef iter = PyObject_GetIter(*py);
  store.insert({*py, array});

  PyStrongRef item = nullptr;
  size_t i = 0;
  while ((item = PyIter_Next(*iter)) != nullptr) {
    array.Set(i, _ToJS(env, item, store, {opts.depth - 1, opts.buffer}));
    item = nullptr;
    i++;
  }
  return array;
}

Napi::Value PyObjectWrap::_ToJS_Dir(Napi::Env env, const PyWeakRef &py, NapiObjectStore &store, ToJSOpts opts) {
  Napi::Object r = Object::New(env);
  PyStrongRef list = PyObject_Dir(*py);
  // It seems that some system modules are hidden, we return an empty array
  if (list == nullptr) {
    PyErr_Clear();
    return r;
  }
  size_t len = PyList_Size(*list);
  store.insert({*py, r});

  for (size_t i = 0; i < len; i++) {
    PyWeakRef key = PyList_GetItem(*list, i);
    EXCEPTION_CHECK(env, key);
    PyStrongRef value = PyObject_GetAttr(*py, *key);
    // dir(module) can reference modules that are not installed
    // Typical examples are queue/tkinter or dbm/gdbm
    // (reading this value leads to an exception in Python too)
    if (value == nullptr) {
      PyErr_Clear();
      continue;
    }

    VERBOSE_PYOBJ(OBJS, *key, "key");
    Napi::Value jsKey = _ToJS(env, key, store, {opts.depth - 1, opts.buffer});
    Napi::Value jsValue = _ToJS(env, value, store, {opts.depth - 1, opts.buffer});
    r.Set(jsKey, jsValue);
  }
  return r;
}

Napi::Value PyObjectWrap::_ToJS_Buffer(Napi::Env env, const PyWeakRef &py, NapiObjectStore &store) {
  Py_buffer view;
  int status = PyObject_GetBuffer(*py, &view, PyBUF_C_CONTIGUOUS);
  EXCEPTION_CHECK(env, status);

  // V8 doesn't like multiple Buffers that point to the same memory location
  // https://github.com/nodejs/node/issues/32463
  // For this reason it is impossible to implement shared Buffers between Python and JS
  Napi::Value buffer = Buffer<char>::Copy(env, reinterpret_cast<char *>(view.buf), view.len);
  PyBuffer_Release(&view);
  return buffer;
}

Napi::Value PyObjectWrap::ToJS(Napi::Env env, const PyWeakRef &py, ToJSOpts opts) {
  NapiObjectStore store;
  return _ToJS(env, py, store, opts);
}

Napi::Value PyObjectWrap::ToJS(const CallbackInfo &info) {
  Napi::Env env = info.Env();
  PyGILGuard pyGilGuard;

  ToJSOpts opts = {-1, true};
  Object js_opts = NAPI_OPT_ARG_OBJECT(0);
  if (!js_opts.IsEmpty()) {
    if (js_opts.Has("buffer")) opts.buffer = js_opts.Get("buffer").ToBoolean().Value();
    if (js_opts.Has("depth")) {
      float depth = js_opts.Get("depth").ToNumber().FloatValue();
      if (!std::isinf(depth)) opts.depth = js_opts.Get("depth").ToNumber().Int32Value();
    }
  }

  return PyObjectWrap::ToJS(env, self, opts);
}
