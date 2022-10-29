#include "pymport.h"
#include "pystackobject.h"
#include "values.h"

using namespace Napi;
using namespace pymport;

PyObjectWrap::PyObjectWrap(const CallbackInfo &info) : ObjectWrap(info), self(nullptr), memory_hint(0) {
  Napi::Env env = info.Env();

  if (info.Length() < 1) throw TypeError::New(env, "Cannot create an empty object");

  if (info[0].IsExternal()) {
    self = PyStrongRef(info[0].As<External<PyObject>>().Data());
    memory_hint = PyObject_LengthHint(*self, sizeof(PyObject));
    if (memory_hint > 0) Napi::MemoryManagement::AdjustExternalMemory(env, static_cast<int64_t>(memory_hint));
  } else {
    // Reference unicity cannot be achieved with a constructor
    throw Error::New(env, "Use PyObject.fromJS() to create PyObjects");
  }
}

PyObjectWrap::~PyObjectWrap() {
  Napi::Env env = Env();
#ifdef DEBUG
  if (active_environments == 0) return;
#endif
  VERBOSE_PYOBJ(*self, "ObjWrap delete");
  // self == nullptr when the object has been evicted from the ObjectStore
  // because it was dying - refer to the comments there
  if (*self != nullptr) { Release(); }

  // Whether the object has been evicted or not, the adjusting happens here
  if (memory_hint > 0) Napi::MemoryManagement::AdjustExternalMemory(env, -static_cast<int64_t>(memory_hint));
}

Function PyObjectWrap::GetClass(Napi::Env env) {
  return DefineClass(
    env,
    "PyObject",
    {PyObjectWrap::InstanceMethod("toString", &PyObjectWrap::ToString),
     PyObjectWrap::InstanceMethod("get", &PyObjectWrap::Get),
     PyObjectWrap::InstanceMethod("has", &PyObjectWrap::Has),
     PyObjectWrap::InstanceMethod("item", &PyObjectWrap::Item),
     PyObjectWrap::InstanceMethod("call", &PyObjectWrap::Call),
     PyObjectWrap::InstanceMethod("toJS", &PyObjectWrap::ToJS),
     PyObjectWrap::InstanceMethod("valueOf", &PyObjectWrap::ToJS),
     PyObjectWrap::InstanceAccessor("type", &PyObjectWrap::Type, nullptr),
     PyObjectWrap::InstanceAccessor("callable", &PyObjectWrap::Callable, nullptr),
     PyObjectWrap::InstanceAccessor("length", &PyObjectWrap::Length, nullptr),
     PyObjectWrap::StaticMethod("keys", &PyObjectWrap::Keys),
     PyObjectWrap::StaticMethod("values", &PyObjectWrap::Values),
     PyObjectWrap::StaticMethod("fromJS", &PyObjectWrap::FromJS),
     PyObjectWrap::StaticMethod("string", &PyObjectWrap::String),
     PyObjectWrap::StaticMethod("int", &PyObjectWrap::Integer),
     PyObjectWrap::StaticMethod("float", &PyObjectWrap::Float),
     PyObjectWrap::StaticMethod("dict", &PyObjectWrap::Dictionary),
     PyObjectWrap::StaticMethod("list", &PyObjectWrap::List),
     PyObjectWrap::StaticMethod("tuple", &PyObjectWrap::Tuple),
     PyObjectWrap::StaticMethod("slice", &PyObjectWrap::Slice)});
}

Value PyObjectWrap::ToString(const CallbackInfo &info) {
  Napi::Env env = info.Env();

  PyStrongRef r = PyObject_Str(*self);
  THROW_IF_NULL(r);
  return ToJS(env, r);
}

Value PyObjectWrap::Get(const CallbackInfo &info) {
  Napi::Env env = info.Env();

  std::string name = NAPI_ARG_STRING(0).Utf8Value();
  auto r = PyObject_GetAttrString(*self, name.c_str());
  if (r == nullptr) {
    PyErr_Clear();
    return env.Undefined();
  }
  return New(env, r);
}

Value PyObjectWrap::Import(const CallbackInfo &info) {
  Napi::Env env = info.Env();

  std::string name = NAPI_ARG_STRING(0).Utf8Value();
  PyStrongRef pyname = PyUnicode_DecodeFSDefault(name.c_str());
  THROW_IF_NULL(pyname);

  PyStrongRef obj = PyImport_Import(*pyname);
  return New(env, std::move(obj));
}

Value PyObjectWrap::Has(const CallbackInfo &info) {
  Napi::Env env = info.Env();

  std::string name = NAPI_ARG_STRING(0).Utf8Value();
  auto r = PyObject_HasAttrString(*self, name.c_str());
  return Boolean::New(env, r);
}

Value PyObjectWrap::Type(const CallbackInfo &info) {
  Napi::Env env = info.Env();

  // TODO Fix me
  return String::New(env, (*self)->ob_type->tp_name);
}

Value PyObjectWrap::Item(const CallbackInfo &info) {
  Napi::Env env = info.Env();

  if (PyList_Check(*self)) {
    Py_ssize_t idx = NAPI_ARG_NUMBER(0).Int64Value();
    PyWeakRef r = PyList_GetItem(*self, idx);
    THROW_IF_NULL(r);
    // PyList returns a borrowed reference, New expects a strong one
    Py_INCREF(*r);
    PyStrongRef strong = *r;
    return New(env, std::move(strong));
  }
  if (PyTuple_Check(*self)) {
    Py_ssize_t idx = NAPI_ARG_NUMBER(0).Int64Value();
    PyWeakRef r = PyTuple_GetItem(*self, idx);
    THROW_IF_NULL(r);
    if (r == nullptr) return env.Undefined();
    // PyTuple returns a borrowed reference, New expects a strong one
    Py_INCREF(*r);
    PyStrongRef strong = *r;
    return New(env, std::move(strong));
  }

  if (info.Length() < 1) throw Error::New(env, "Missing mandatory argument");
  PyStrongRef item = FromJS(info[0]);
  PyStrongRef r = PyObject_GetItem(*self, *item);
  THROW_IF_NULL(r);
  return New(env, std::move(r));
}

Value PyObjectWrap::Keys(const CallbackInfo &info) {
  Napi::Env env = info.Env();

  Object target = NAPI_ARG_OBJECT(0);
  if (!_InstanceOf(target)) TypeError::New(env, "Object is not PyObject");
  auto py = ObjectWrap::Unwrap(target);

  if (PyDict_Check(*py->self)) return New(env, PyDict_Keys(*py->self));

  throw TypeError::New(env, "Object does not implement keys()");
}

Value PyObjectWrap::Values(const CallbackInfo &info) {
  Napi::Env env = info.Env();

  Object target = NAPI_ARG_OBJECT(0);
  if (!_InstanceOf(target)) TypeError::New(env, "Object is not PyObject");
  auto py = ObjectWrap::Unwrap(target);

  if (PyDict_Check(*py->self)) return New(env, PyDict_Values(*py->self));

  throw TypeError::New(env, "Object does not implement values()");
}

Value PyObjectWrap::Length(const CallbackInfo &info) {
  Napi::Env env = info.Env();

  if (PyList_Check(*self)) { return Number::New(env, static_cast<long>(PyList_Size(*self))); }
  if (PyTuple_Check(*self)) return Number::New(env, static_cast<long>(PyTuple_Size(*self)));
  if (PyDict_Check(*self)) return Number::New(env, static_cast<long>(PyDict_Size(*self)));
  if (PyUnicode_Check(*self)) return Number::New(env, static_cast<long>(PyUnicode_GetLength(*self)));
  return env.Undefined();
}

bool PyObjectWrap::_InstanceOf(Napi::Value v) {
  Napi::Env env = v.Env();
  if (!v.IsObject()) return false;
  auto obj = v.ToObject();
  FunctionReference *cons = env.GetInstanceData<EnvContext>()->pyObj;
  return obj.ToObject().InstanceOf(cons->Value());
}

bool PyObjectWrap::_FunctionOf(Napi::Value v) {
  Napi::Env env = v.Env();
  if (!v.IsObject()) return false;
  auto obj = v.ToObject().Get("__PyObject__");
  if (!obj.IsObject()) return false;
  FunctionReference *cons = env.GetInstanceData<EnvContext>()->pyObj;
  return obj.ToObject().InstanceOf(cons->Value());
}