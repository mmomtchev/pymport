#include "pymport.h"
#include "pystackobject.h"
#include "values.h"

using namespace Napi;
using namespace pymport;

PyObjectWrap::PyObjectWrap(const CallbackInfo &info) : ObjectWrap(info), self(nullptr), memory_hint(0) {
  Napi::Env env = info.Env();
  // There are two ways to get here:
  // * when called directly from JavaScript we throw
  // * when called from the Object Store the GIL is already held
  // So, we do not need to obtain the GIL here
  // (Python does support recursive locking, but recursive locking is a bad practice)

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
  // This is never contested unless running a thread creation stress test
  shared_guard lock(pymport::init_and_shutdown_mutex);
  Napi::Env env = Env();

  // Whether the object has been evicted or not, the adjusting happens here
  if (memory_hint > 0) Napi::MemoryManagement::AdjustExternalMemory(env, -static_cast<int64_t>(memory_hint));

  // Skip if Python has been shut down
  // Refer to the comment about https://github.com/nodejs/node/issues/45088
  if (active_environments == 0) {
    VERBOSE(INIT, "Destructor running after the environment cleanup: %p\n", *self);
    return;
  }

  // This is, in fact, a function that is called from a JavaScript context
  // TODO: this can block the event loop with long-running Python operations
  PyGILGuard pyGILGuard;
  ASSERT(active_environments > 0);

  VERBOSE_PYOBJ(OBJS, *self, "ObjWrap delete");
  // self == nullptr when the object has been evicted from the ObjectStore
  // because it was dying - refer to the comments there
  if (*self != nullptr) { Release(); }

  // We need to manually unreference, otherwise we won't be covered by the
  // GIL guard - pyGILGuard will be destroyed before the member variables
  self = nullptr;
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
     PyObjectWrap::InstanceMethod("callAsync", &PyObjectWrap::CallAsync),
     PyObjectWrap::InstanceMethod("toJS", &PyObjectWrap::ToJS),
     PyObjectWrap::InstanceMethod("valueOf", &PyObjectWrap::ToJS),
     PyObjectWrap::InstanceAccessor("id", &PyObjectWrap::Id, nullptr),
     PyObjectWrap::InstanceAccessor("type", &PyObjectWrap::Type, nullptr),
     PyObjectWrap::InstanceAccessor("callable", &PyObjectWrap::Callable, nullptr),
     PyObjectWrap::InstanceAccessor("length", &PyObjectWrap::Length, nullptr),
     PyObjectWrap::InstanceAccessor("constr", &PyObjectWrap::Constructor, nullptr),
     PyObjectWrap::StaticMethod("keys", &PyObjectWrap::Keys),
     PyObjectWrap::StaticMethod("values", &PyObjectWrap::Values),
     PyObjectWrap::StaticMethod("fromJS", &PyObjectWrap::FromJS),
     PyObjectWrap::StaticMethod("string", &PyObjectWrap::String),
     PyObjectWrap::StaticMethod("int", &PyObjectWrap::Integer),
     PyObjectWrap::StaticMethod("float", &PyObjectWrap::Float),
     PyObjectWrap::StaticMethod("dict", &PyObjectWrap::Dictionary),
     PyObjectWrap::StaticMethod("list", &PyObjectWrap::List),
     PyObjectWrap::StaticMethod("tuple", &PyObjectWrap::Tuple),
     PyObjectWrap::StaticMethod("slice", &PyObjectWrap::Slice),
     PyObjectWrap::StaticMethod("set", &PyObjectWrap::Set),
     PyObjectWrap::StaticMethod("frozenSet", &PyObjectWrap::FrozenSet),
     PyObjectWrap::StaticMethod("bytes", &PyObjectWrap::Bytes),
     PyObjectWrap::StaticMethod("bytearray", &PyObjectWrap::ByteArray),
     PyObjectWrap::StaticMethod("memoryview", &PyObjectWrap::MemoryView),
     PyObjectWrap::StaticMethod("func", &PyObjectWrap::Functor)});
}

Value PyObjectWrap::ToString(const CallbackInfo &info) {
  Napi::Env env = info.Env();
  PyGILGuard pyGilGuard;

  PyStrongRef r = PyObject_Str(*self);
  EXCEPTION_CHECK(env, r);
  return ToJS(env, r, {1, false});
}

Value PyObjectWrap::Id(const CallbackInfo &info) {
  Napi::Env env = info.Env();
  PyGILGuard pyGilGuard;

  return Number::New(env, reinterpret_cast<uint64_t>(*self));
}

Value PyObjectWrap::Get(const CallbackInfo &info) {
  Napi::Env env = info.Env();
  PyGILGuard pyGilGuard;

  std::string name = NAPI_ARG_STRING(0).Utf8Value();
  PyStrongRef r = PyObject_GetAttrString(*self, name.c_str());
  if (r == nullptr) {
    PyErr_Clear();
    return env.Undefined();
  }
  return New(env, std::move(r));
}

Value PyObjectWrap::Import(const CallbackInfo &info) {
  Napi::Env env = info.Env();
  PyGILGuard pyGilGuard;

  std::string name = NAPI_ARG_STRING(0).Utf8Value();
  PyStrongRef pyname = PyUnicode_DecodeFSDefault(name.c_str());
  EXCEPTION_CHECK(env, pyname);

  PyStrongRef obj = PyImport_Import(*pyname);
  return New(env, std::move(obj));
}

Value PyObjectWrap::Has(const CallbackInfo &info) {
  Napi::Env env = info.Env();
  PyGILGuard pyGilGuard;

  bool r;
  if (PyAnySet_Check(*self)) {
    if (info.Length() < 1) throw Error::New(env, "Missing mandatory argument");
    PyStrongRef key = FromJS(info[0]);
    r = PySet_Contains(*self, *key);
  } else {
    std::string name = NAPI_ARG_STRING(0).Utf8Value();
    r = PyObject_HasAttrString(*self, name.c_str());
  }
  return Boolean::New(env, r);
}

Value PyObjectWrap::Type(const CallbackInfo &info) {
  Napi::Env env = info.Env();
  PyGILGuard pyGilGuard;

  return String::New(env, Py_TYPE(*self)->tp_name);
}

Value PyObjectWrap::Constructor(const CallbackInfo &info) {
  Napi::Env env = info.Env();
  PyGILGuard pyGilGuard;

  return New(env, PyStrongRef(reinterpret_cast<PyObject *>(Py_TYPE(*self))));
}

Value PyObjectWrap::Item(const CallbackInfo &info) {
  Napi::Env env = info.Env();
  PyGILGuard pyGilGuard;

  if (info.Length() < 1) throw Error::New(env, "Missing mandatory argument");
  PyStrongRef item = FromJS(info[0]);
  PyStrongRef r = PyObject_GetItem(*self, *item);
  if (r == nullptr) {
    PyErr_Clear();
    return env.Undefined();
  }
  return New(env, std::move(r));
}

Value PyObjectWrap::Keys(const CallbackInfo &info) {
  Napi::Env env = info.Env();
  PyGILGuard pyGilGuard;

  Object target = NAPI_ARG_PYOBJECT(0);
  auto py = ObjectWrap::Unwrap(target);

  if (PyMapping_Check(*py->self)) return New(env, PyMapping_Keys(*py->self));

  throw TypeError::New(env, "Object does not support mapping protocol");
}

Value PyObjectWrap::Values(const CallbackInfo &info) {
  Napi::Env env = info.Env();
  PyGILGuard pyGilGuard;

  Object target = NAPI_ARG_PYOBJECT(0);
  auto py = ObjectWrap::Unwrap(target);

  if (PyMapping_Check(*py->self)) return New(env, PyMapping_Values(*py->self));

  throw TypeError::New(env, "Object does not support mapping protocol");
}

Value PyObjectWrap::Length(const CallbackInfo &info) {
  Napi::Env env = info.Env();
  PyGILGuard pyGilGuard;

  if (PySequence_Check(*self)) return Number::New(env, static_cast<long>(PySequence_Size(*self)));
  if (PyMapping_Check(*self)) return Number::New(env, static_cast<long>(PyMapping_Size(*self)));
  if (PyAnySet_Check(*self)) return Number::New(env, static_cast<long>(PySet_Size(*self)));
  return env.Undefined();
}

// Is the Napi::Value v a PyObject?
bool PyObjectWrap::_InstanceOf(Napi::Value v) {
  Napi::Env env = v.Env();
  if (!v.IsObject()) return false;
  auto obj = v.ToObject();
  FunctionReference *cons = env.GetInstanceData<EnvContext>()->pyObj;
  return obj.InstanceOf(cons->Value());
}

// Is the Napi::Value v a proxified PyObject or a PyObject function?
// (both of these are recognized by having a __PyObject__ attribute that is a PyObject)
bool PyObjectWrap::_FunctionOf(Napi::Value v) {
  Napi::Env env = v.Env();
  if (!v.IsObject()) return false;
  auto obj = v.ToObject().Get("__PyObject__");
  if (!obj.IsObject()) return false;
  FunctionReference *cons = env.GetInstanceData<EnvContext>()->pyObj;
  return obj.ToObject().InstanceOf(cons->Value());
}
