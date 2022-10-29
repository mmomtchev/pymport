#include "pymport.h"
#include "pystackobject.h"
#include "values.h"

using namespace Napi;
using namespace pymport;

Value PyObjectWrap::String(const CallbackInfo &info) {
  Napi::Env env = info.Env();

  auto raw = NAPI_ARG_STRING(0).Utf16Value();
  PyStrongRef obj =
    PyUnicode_DecodeUTF16(reinterpret_cast<const char *>(raw.c_str()), raw.size() * 2, nullptr, nullptr);
  return New(env, std::move(obj));
}

Value PyObjectWrap::Float(const CallbackInfo &info) {
  Napi::Env env = info.Env();

  auto raw = NAPI_ARG_NUMBER(0).DoubleValue();
  PyStrongRef obj = PyFloat_FromDouble(raw);
  return New(env, std::move(obj));
}

Value PyObjectWrap::Integer(const CallbackInfo &info) {
  Napi::Env env = info.Env();

  auto raw = NAPI_ARG_NUMBER(0).Int64Value();
  PyStrongRef obj = PyLong_FromLong(raw);
  return New(env, std::move(obj));
}

// Returns a strong reference
void PyObjectWrap::_Dictionary(Napi::Object object, const PyStrongRef &target, PyObjectStore &store) {
  Napi::Env env = object.Env();

  for (auto const &el : object.GetPropertyNames()) {
    auto key = ((Napi::Value)el.second).ToString().Utf8Value();
    auto js = object.Get(key);
    PyStrongRef item = _FromJS(js, store);
    THROW_IF_NULL(item);
    // This is the only Py***_Set that does not steal a reference
    PyDict_SetItemString(*target, key.c_str(), *item);
  }
}

Value PyObjectWrap::Dictionary(const CallbackInfo &info) {
  Napi::Env env = info.Env();

  auto raw = NAPI_ARG_OBJECT(0);
  PyStrongRef dict = PyDict_New();
  THROW_IF_NULL(dict);
  PyObjectStore store;
  _Dictionary(raw, dict, store);

  return New(env, std::move(dict));
}

// Returns a strong reference
void PyObjectWrap::_List(Napi::Array array, const PyStrongRef &target, PyObjectStore &store) {
  size_t len = array.Length();

  for (size_t i = 0; i < len; i++) {
    PyStrongRef el = _FromJS(array.Get(i), store);
    PyList_SetItem(*target, i, el.gift());
  }
}

Value PyObjectWrap::List(const CallbackInfo &info) {
  Napi::Env env = info.Env();

  auto raw = NAPI_ARG_ARRAY(0);
  PyStrongRef list = PyList_New(raw.Length());
  THROW_IF_NULL(list);
  PyObjectStore store;
  _List(raw, list, store);

  return New(env, std::move(list));
}

// Returns a strong reference
void PyObjectWrap::_Tuple(Napi::Array array, const PyStrongRef &target, PyObjectStore &store) {
  size_t len = array.Length();

  for (size_t i = 0; i < len; i++) {
    PyStrongRef el = _FromJS(array.Get(i), store);
    PyTuple_SetItem(*target, i, el.gift());
  }
}

Value PyObjectWrap::Tuple(const CallbackInfo &info) {
  Napi::Env env = info.Env();

  auto raw = NAPI_ARG_ARRAY(0);
  PyStrongRef tuple = PyTuple_New(raw.Length());
  THROW_IF_NULL(tuple);
  PyObjectStore store;
  _Tuple(raw, tuple, store);

  return New(env, std::move(tuple));
}

Value PyObjectWrap::Slice(const CallbackInfo &info) {
  Napi::Env env = info.Env();

  Array array = NAPI_ARG_ARRAY(0);
  if (array.Length() != 3)
    throw RangeError::New(env, "Slices must have exactly three arguments - start, stop and step");
  PyObjectStore store;
  PyStrongRef slice =
    PySlice_New(*_FromJS(array[(uint32_t)0], store), *_FromJS(array[1], store), *_FromJS(array[2], store));
  THROW_IF_NULL(slice);

  return New(env, std::move(slice));
}

Value PyObjectWrap::FromJS(const CallbackInfo &info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1) throw Error::New(env, "Missing argument");
  return New(info.Env(), FromJS(info[0]));
}

// Returns a strong reference
PyStrongRef PyObjectWrap::FromJS(Napi::Value v) {
  PyObjectStore store;
  return _FromJS(v, store);
}

// Returns a strong reference
PyStrongRef PyObjectWrap::_FromJS(Napi::Value v, PyObjectStore &store) {
  Napi::Env env = v.Env();

  // Break recursion on circular references
  // Alas, Napi::Values must be individually compared using
  // the provided operator==...
  for (const auto &i : store) {
    if (i.first == v) {
      // The store contains weak references
      // We must return a strong reference
      return PyStrongRef(i.second);
    }
  }

  if (v.IsNumber()) {
    auto raw = v.ToNumber().DoubleValue();
    double integer;
    double fract = fabs(modf(raw, &integer));
    if (fract < std::numeric_limits<float>::epsilon() || fract > 1 - std::numeric_limits<float>::epsilon())
      return PyLong_FromLong(v.ToNumber().Int64Value());
    else
      return PyFloat_FromDouble(raw);
  }
  if (v.IsString()) {
    auto raw = v.ToString().Utf16Value();
    PyStrongRef py =
      PyUnicode_DecodeUTF16(reinterpret_cast<const char *>(raw.c_str()), raw.size() * 2, nullptr, nullptr);
    store.push_front({v, py});
    return py;
  }
  if (v.IsArray()) {
    auto array = v.As<Array>();
    PyStrongRef list = PyList_New(array.Length());
    THROW_IF_NULL(list);
    store.push_front({v, list});
    _List(array, list, store);
    return list;
  }
  if (v.IsObject()) {
    auto obj = v.ToObject();
    if (_FunctionOf(obj)) {
      auto wrap = obj.Get("__PyObject__").ToObject();
      auto py = ObjectWrap::Unwrap(wrap);
      // Copy the strong reference
      return PyStrongRef(py->self);
    }
    // A Proxy is an instance of the underlying object, so this
    // must come after the previous block
    if (_InstanceOf(obj)) {
      auto py = ObjectWrap::Unwrap(obj);
      // Copy the strong reference
      return PyStrongRef(py->self);
    }

    PyStrongRef dict = PyDict_New();
    THROW_IF_NULL(dict);
    store.push_front({v, dict});
    _Dictionary(obj, dict, store);
    return dict;
  }
  if (v.IsNull() || v.IsUndefined()) { return Py_None; }

  if (v.IsBoolean()) {
    if (v.ToBoolean() == true) return Py_True;
    if (v.ToBoolean() == false) return Py_False;
  }

  return nullptr;
}
