#include <cmath>
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
  EXCEPTION_CHECK(env, obj);
  return New(env, std::move(obj));
}

Value PyObjectWrap::Float(const CallbackInfo &info) {
  Napi::Env env = info.Env();

  auto raw = NAPI_ARG_NUMBER(0).DoubleValue();
  PyStrongRef obj = PyFloat_FromDouble(raw);
  EXCEPTION_CHECK(env, obj);
  return New(env, std::move(obj));
}

Value PyObjectWrap::Integer(const CallbackInfo &info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1) throw Error::New(env, "No argument given");

  int64_t raw = 0;
  if (info[0].IsNumber()) {
    raw = info[0].ToNumber().Int64Value();
  } else if (info[0].IsBigInt()) {
    bool lossless;
    raw = info[0].As<BigInt>().Int64Value(&lossless);
    if (!lossless) throw RangeError::New(env, "BigInt overflow");
  } else {
    throw Error::New(env, "Argument must be a number");
  }
  PyStrongRef obj = PyLong_FromLongLong(static_cast<long long>(raw));
  EXCEPTION_CHECK(env, obj);
  return New(env, std::move(obj));
}

// Returns a strong reference
void PyObjectWrap::_FromJS_Dictionary(Napi::Object object, const PyStrongRef &target, PyObjectStore &store) {
  Napi::Env env = object.Env();

  for (auto const &el : object.GetPropertyNames()) {
    auto key = ((Napi::Value)el.second).ToString().Utf8Value();
    auto js = object.Get(key);
    PyStrongRef item = _FromJS(js, store);
    EXCEPTION_CHECK(env, item);
    // This is the only Py***_Set that does not steal a reference
    int status = PyDict_SetItemString(*target, key.c_str(), *item);
    EXCEPTION_CHECK(env, status);
  }
}

Value PyObjectWrap::Dictionary(const CallbackInfo &info) {
  Napi::Env env = info.Env();

  auto raw = NAPI_ARG_OBJECT(0);
  PyStrongRef dict = PyDict_New();
  EXCEPTION_CHECK(env, dict);
  PyObjectStore store;
  _FromJS_Dictionary(raw, dict, store);

  return New(env, std::move(dict));
}

// Returns a strong reference
void PyObjectWrap::_FromJS_List(Napi::Array array, const PyStrongRef &target, PyObjectStore &store) {
  size_t len = array.Length();

  for (size_t i = 0; i < len; i++) {
    PyStrongRef el = _FromJS(array.Get(i), store);
    int status = PyList_SetItem(*target, i, el.gift());
    EXCEPTION_CHECK(array.Env(), status);
  }
}

Value PyObjectWrap::List(const CallbackInfo &info) {
  Napi::Env env = info.Env();

  auto raw = NAPI_ARG_ARRAY(0);
  PyStrongRef list = PyList_New(raw.Length());
  EXCEPTION_CHECK(env, list);
  PyObjectStore store;
  _FromJS_List(raw, list, store);

  return New(env, std::move(list));
}

// Returns a strong reference
void PyObjectWrap::_FromJS_Tuple(Napi::Array array, const PyStrongRef &target, PyObjectStore &store) {
  size_t len = array.Length();

  for (size_t i = 0; i < len; i++) {
    PyStrongRef el = _FromJS(array.Get(i), store);
    int status = PyTuple_SetItem(*target, i, el.gift());
    EXCEPTION_CHECK(array.Env(), status);
  }
}

Value PyObjectWrap::Tuple(const CallbackInfo &info) {
  Napi::Env env = info.Env();

  auto raw = NAPI_ARG_ARRAY(0);
  PyStrongRef tuple = PyTuple_New(raw.Length());
  EXCEPTION_CHECK(env, tuple);
  PyObjectStore store;
  _FromJS_Tuple(raw, tuple, store);

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
  EXCEPTION_CHECK(env, slice);

  return New(env, std::move(slice));
}

PyStrongRef PyObjectWrap::_FromJS_BytesArray(Buffer<char> buffer) {
  PyStrongRef bytearray = PyByteArray_FromStringAndSize(buffer.Data(), buffer.ByteLength());
  EXCEPTION_CHECK(buffer.Env(), bytearray);
  return bytearray;
}

Value PyObjectWrap::Bytes(const CallbackInfo &info) {
  Napi::Env env = info.Env();
  Buffer<char> buffer = NAPI_ARG_BUFFER(0);
  PyStrongRef bytes = PyBytes_FromStringAndSize(buffer.Data(), buffer.ByteLength());
  EXCEPTION_CHECK(env, bytes);
  return New(env, std::move(bytes));
}

Value PyObjectWrap::ByteArray(const CallbackInfo &info) {
  Napi::Env env = info.Env();
  Buffer<char> buffer = NAPI_ARG_BUFFER(0);
  PyStrongRef bytearray = PyByteArray_FromStringAndSize(buffer.Data(), buffer.ByteLength());
  EXCEPTION_CHECK(env, bytearray);
  return New(env, std::move(bytearray));
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

// Is this a class instance
static bool HasPrototype(Napi::Object v) {
  if (!v.Has("__proto__")) return false;
  Value proto = v.Get("__proto__");
  if (!proto.IsObject() || !proto.ToObject().Has("__proto__")) return false;
  Value proto_proto = proto.ToObject().Get("__proto__");
  return !proto_proto.IsNull();
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
    double raw = v.ToNumber().DoubleValue();
    double integer;
    double fract = fabs(modf(raw, &integer));
    PyStrongRef py = nullptr;
    if (
      (fract < std::numeric_limits<float>::epsilon() || fract > 1 - std::numeric_limits<float>::epsilon()) &&
      !std::isinf(raw))
      py = PyLong_FromLongLong(static_cast<long long>(v.ToNumber().Int64Value()));
    else
      py = PyFloat_FromDouble(raw);
    EXCEPTION_CHECK(env, py);
    return py;
  }
  if (v.IsBigInt()) {
    bool lossless;
    int64_t raw = v.As<BigInt>().Int64Value(&lossless);
    if (!lossless) throw RangeError::New(env, "BigInt overflow");
    PyStrongRef py = PyLong_FromLongLong(static_cast<long long>(raw));
    EXCEPTION_CHECK(env, py);
    return py;
  }
  if (v.IsString()) {
    auto raw = v.ToString().Utf16Value();
    PyStrongRef py =
      PyUnicode_DecodeUTF16(reinterpret_cast<const char *>(raw.c_str()), raw.size() * 2, nullptr, nullptr);
    EXCEPTION_CHECK(env, py);
    store.push_front({v, py});
    return py;
  }
  if (v.IsArray()) {
    auto array = v.As<Array>();
    PyStrongRef list = PyList_New(array.Length());
    EXCEPTION_CHECK(env, list);
    store.push_front({v, list});
    _FromJS_List(array, list, store);
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

    if (obj.IsBuffer()) { return _FromJS_BytesArray(obj.As<Buffer<char>>()); }
    if (v.IsFunction()) { return NewJSFunction(v.As<Function>()); }

    // These are not supported
    if (HasPrototype(obj)) { throw TypeError::New(env, "class objects cannot be converted to Python"); }

    // Fallback to dictionary
    PyStrongRef dict = PyDict_New();
    EXCEPTION_CHECK(env, dict);
    store.push_front({v, dict});
    _FromJS_Dictionary(obj, dict, store);
    return dict;
  }
  if (v.IsNull() || v.IsUndefined()) { return Py_None; }

  if (v.IsBoolean()) {
    if (v.ToBoolean() == true) return Py_True;
    if (v.ToBoolean() == false) return Py_False;
  }

  throw TypeError::New(env, "Object type is not supported");
}
