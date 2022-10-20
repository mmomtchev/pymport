#include "pymport.h"
#include "pystackobject.h"
#include "values.h"

using namespace Napi;
using namespace pymport;

PyObj::PyObj(const CallbackInfo &info) : ObjectWrap(info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1) throw TypeError::New(env, "Cannot create an empty object");

  if (info[0].IsExternal()) {
    self = info[0].As<External<PyObject>>().Data();
  } else {
    throw Error::New(env, "Not implemented");
  }
}

PyObj::~PyObj() {
  // self == nullptr when the object has been evicted from the ObjectStore
  // because it was dying - refer to the comments there
  if (self != nullptr) {
    Release();
    Py_DECREF(self);
  }
}

Function PyObj::GetClass(Napi::Env env) {
  return DefineClass(
    env,
    "PyObject",
    {PyObj::InstanceMethod("toString", &PyObj::ToString),
     PyObj::InstanceMethod("get", &PyObj::Get),
     PyObj::InstanceMethod("call", &PyObj::Call),
     PyObj::InstanceMethod("typeOf", &PyObj::TypeOf),
     PyObj::InstanceMethod("toJS", &PyObj::ToJS),
     PyObj::StaticMethod("fromJS", &PyObj::FromJS),
     PyObj::StaticMethod("import", &PyObj::Import),
     PyObj::StaticMethod("string", &PyObj::String),
     PyObj::StaticMethod("float", &PyObj::Float),
     PyObj::StaticMethod("dict", &PyObj::Dictionary),
     PyObj::StaticMethod("list", &PyObj::List),
     PyObj::StaticMethod("tuple", &PyObj::Tuple),
     PyObj::StaticMethod("int", &PyObj::Integer)});
}

Value PyObj::ToString(const CallbackInfo &info) {
  Napi::Env env = info.Env();

  PyStackObject r = PyObject_Str(self);
  THROW_IF_NULL(r);
  return ToJS(env, r);
}

Value PyObj::Get(const CallbackInfo &info) {
  Napi::Env env = info.Env();

  std::string name = NAPI_ARG_STRING(0).Utf8Value();
  auto r = PyObject_GetAttrString(self, name.c_str());
  return New(env, r);
}

Value PyObj::Import(const CallbackInfo &info) {
  Napi::Env env = info.Env();

  std::string name = NAPI_ARG_STRING(0).Utf8Value();
  PyStackObject pyname = PyUnicode_DecodeFSDefault(name.c_str());
  THROW_IF_NULL(pyname);

  auto obj = PyImport_Import(pyname);
  return New(env, obj);
}

Value PyObj::TypeOf(const CallbackInfo &info) {
  Napi::Env env = info.Env();

  return String::New(env, self->ob_type->tp_name);
}

bool PyObj::_InstanceOf(Napi::Value v) {
  Napi::Env env = v.Env();
  if (!v.IsObject()) return false;
  auto obj = v.ToObject();
  FunctionReference *cons = env.GetInstanceData<EnvContext>()->pyObj;
  return obj.ToObject().InstanceOf(cons->Value());
}

bool PyObj::_FunctionOf(Napi::Value v) {
  Napi::Env env = v.Env();
  if (!v.IsObject()) return false;
  auto obj = v.ToObject().Get("__PyObject__");
  if (!obj.IsObject()) return false;
  FunctionReference *cons = env.GetInstanceData<EnvContext>()->pyObj;
  return obj.ToObject().InstanceOf(cons->Value());
}