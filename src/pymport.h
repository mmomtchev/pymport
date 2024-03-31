#pragma once

#include <map>
#include <list>
#include <set>
#include <thread>
#include <mutex>
#include <functional>
#include <queue>
#include <napi.h>
#include <uv.h>

#include "shared_mutex.h"
#include "pystackobject.h"

namespace pymport {

// Refer to the Internals.md section in the wiki for a quick introduction

typedef std::function<PyStrongRef()> PyCallExecutor;

// Must be constructed with the GIL held
// ToJS can be called only from a V8 thread
class PythonException {
  PyStrongRef type;
  PyStrongRef value;
  PyStrongRef trace;
  std::string err_msg;

    public:
#ifdef DEBUG
  PythonException(std::string msg);
#else
  PythonException();
#endif
  Napi::Error ToJS(Napi::Env);
};

struct ToJSOpts {
  int depth;
  bool buffer;
};

class PyObjectWrap : public Napi::ObjectWrap<PyObjectWrap> {
    public:
  PyObjectWrap(const Napi::CallbackInfo &);
  virtual ~PyObjectWrap();

  Napi::Value ToString(const Napi::CallbackInfo &);

  Napi::Value Id(const Napi::CallbackInfo &);
  Napi::Value Get(const Napi::CallbackInfo &);
  Napi::Value Call(const Napi::CallbackInfo &);
  Napi::Value CallAsync(const Napi::CallbackInfo &);
  Napi::Value Item(const Napi::CallbackInfo &);

  Napi::Value Has(const Napi::CallbackInfo &);
  Napi::Value Type(const Napi::CallbackInfo &);
  Napi::Value Length(const Napi::CallbackInfo &);
  Napi::Value Callable(const Napi::CallbackInfo &);
  Napi::Value Constructor(const Napi::CallbackInfo &);

  static Napi::Value Import(const Napi::CallbackInfo &);
  static Napi::Value Eval(const Napi::CallbackInfo &);

  static Napi::Value FromJS(const Napi::CallbackInfo &);
  static Napi::Value ToJS(Napi::Env, const PyWeakRef &, ToJSOpts);
  Napi::Value ToJS(const Napi::CallbackInfo &);

  static Napi::Value Keys(const Napi::CallbackInfo &);
  static Napi::Value Values(const Napi::CallbackInfo &);

  static Napi::Value Float(const Napi::CallbackInfo &);
  static Napi::Value Integer(const Napi::CallbackInfo &);
  static Napi::Value String(const Napi::CallbackInfo &);
  static Napi::Value Dictionary(const Napi::CallbackInfo &);
  static Napi::Value Tuple(const Napi::CallbackInfo &);
  static Napi::Value List(const Napi::CallbackInfo &);
  static Napi::Value Slice(const Napi::CallbackInfo &);
  static Napi::Value Set(const Napi::CallbackInfo &);
  static Napi::Value FrozenSet(const Napi::CallbackInfo &);
  static Napi::Value Bytes(const Napi::CallbackInfo &);
  static Napi::Value ByteArray(const Napi::CallbackInfo &);
  static Napi::Value MemoryView(const Napi::CallbackInfo &);
  static Napi::Value Functor(const Napi::CallbackInfo &);

  static PyStrongRef FromJS(Napi::Value);

  static Napi::Value New(Napi::Env, PyStrongRef &&);
  static Napi::Value NewCallable(Napi::Env, PyStrongRef &&);

  static Napi::Function GetClass(Napi::Env);
  static void InitJSTrampoline();

  static inline void ExceptionCheck(
    Napi::Env env,
    const PyWeakRef &py
#ifdef DEBUG
    ,
    const std::string msg
#endif
  ) {
    if (py == nullptr) {
      PythonException py_err
#ifdef DEBUG
        (msg)
#endif
          ;
      throw py_err.ToJS(env);
    }
  }

  static inline void ExceptionCheck(
    Napi::Env env,
    int status
#ifdef DEBUG
    ,
    const std::string msg
#endif
  ) {
    if (status != 0) {
      PythonException py_err
#ifdef DEBUG
        (msg)
#endif
          ;
      throw py_err.ToJS(env);
    }
  }

    private:
  typedef std::map<PyObject *, Napi::Value> NapiObjectStore;
  typedef std::list<std::pair<Napi::Value, PyWeakRef>> PyObjectStore;

  void Release();

  static Napi::Value _ToJS(Napi::Env, const PyWeakRef &, NapiObjectStore &, ToJSOpts);
  static Napi::Value _ToJS_Dictionary(Napi::Env, const PyWeakRef &, NapiObjectStore &, ToJSOpts);
  static Napi::Value _ToJS_Tuple(Napi::Env, const PyWeakRef &, NapiObjectStore &, ToJSOpts);
  static Napi::Value _ToJS_List(Napi::Env, const PyWeakRef &, NapiObjectStore &, ToJSOpts);
  static Napi::Value _ToJS_Set(Napi::Env, const PyWeakRef &, NapiObjectStore &, ToJSOpts);
  static Napi::Value _ToJS_Dir(Napi::Env, const PyWeakRef &, NapiObjectStore &, ToJSOpts);
  static Napi::Value _ToJS_Buffer(Napi::Env, const PyWeakRef &, NapiObjectStore &);
  static Napi::Value _ToJS_JSFunction(Napi::Env, const PyWeakRef &);

  static PyStrongRef _FromJS(Napi::Value, PyObjectStore &);
  static void _FromJS_Dictionary(Napi::Object, const PyStrongRef &, PyObjectStore &);
  static void _FromJS_List(Napi::Array, const PyStrongRef &, PyObjectStore &);
  static void _FromJS_Tuple(Napi::Array, const PyStrongRef &, PyObjectStore &);
  static void _FromJS_Set(Napi::Array, const PyStrongRef &, PyObjectStore &);
  static PyStrongRef _FromJS_BytesArray(Napi::Buffer<char>);

  static PyCallExecutor CreateCallExecutor(const PyWeakRef &, const Napi::CallbackInfo &info);
  static Napi::Value _CallableTrampoline(const Napi::CallbackInfo &info);

  static PyStrongRef NewJSFunction(Napi::Function js_fn);

  static bool _InstanceOf(Napi::Value);
  static bool _FunctionOf(Napi::Value);

#ifdef DEBUG
  static void _ExceptionThrow(Napi::Env, const std::string msg);
#else
  static void _ExceptionThrow(Napi::Env);
#endif

  static PyStrongRef JSCall_Trampoline_Type;
  PyStrongRef self;
  Py_ssize_t memory_hint;
}; // namespace pymport

struct EnvContext {
  Napi::FunctionReference *pyObj;
  std::map<PyObject *, PyObjectWrap *> object_store;
  std::map<PyObject *, Napi::FunctionReference *> function_store;
  // There are two destruction paths for TSFNs:
  // * death by JSCall_Trampoline_Finalizer - when the object is GCed
  // * death by napi_async_cleanup_hook - when the environment shuts down before the GC
  // https://github.com/nodejs/node/pull/45903
  std::set<Napi::ThreadSafeFunction *> tsfn_store;
  // There is one V8 main thread per environment (EnvContext) and only one main Python thread (main.cc)
  std::thread::id v8_main;
  // libuv queue for running lambdas on the V8 main thread
  struct {
    uv_async_t *handle;
    std::queue<std::function<void()>> jobs;
    std::mutex lock;
  } v8_queue;

#ifdef DEBUG
  ~EnvContext() {
    VERBOSE(
      INIT,
      "Destroying the environment context for %lu\n",
      static_cast<unsigned long>(std::hash<std::thread::id>{}(v8_main)));
  }
#endif
};

extern shared_mutex init_and_shutdown_mutex;

// GIL locking rule:
// Every time we enter C++ called from JS context, we obtain the GIL
//
// This means all the JS calling convention functions and a few special cases
// that are documented through-out the code
//
// Unless mentioned, all functions are called from JS context
//
// Thankfully, Python cannot access Python objects without the GIL
// This means that when compiled in DEBUG/DEBUG_VERBOSE the VERBOSE_PYOBJ macro
// has the added benefit of provoking a segfault if the GIL is not held
class PyGILGuard {
  PyGILState_STATE state;

    public:
  inline PyGILGuard() {
    VERBOSE(
      PGIL,
      "PyGIL: Will obtain from %lu\n",
      static_cast<unsigned long>(std::hash<std::thread::id>{}(std::this_thread::get_id())));
    state = PyGILState_Ensure();
  }

  inline ~PyGILGuard() {
    VERBOSE(
      PGIL,
      "PyGIL: Will release from %lu\n",
      static_cast<unsigned long>(std::hash<std::thread::id>{}(std::this_thread::get_id())));
    PyGILState_Release(state);
  }
};
}; // namespace pymport

#if PY_MAJOR_VERSION < 3 || (PY_MAJOR_VERSION == 3 && PY_MINOR_VERSION < 8)
#error Python 3.8 is required
#endif
