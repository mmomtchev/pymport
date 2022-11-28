#pragma once

#include <map>
#include <list>
#include <thread>
#include <functional>
#include <napi.h>

#include "pystackobject.h"

namespace pymport {

typedef std::function<PyStrongRef()> PyCallExecutor;

// Must be constructed with the GIL held
// ToJS can be called only from a V8 thread
class PythonException {
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

// Object lifecycle overview

// Everything is organized around the PyObjectWrap which is the JS representation
// of a Python reference which is a PyObject* pointer.
//
// A PyObjectWrap exists both in C++ and in JS through the ObjectWrap interface.
// A PyObjectWrap contains a a reference to the underlying Python object.
// There can be only one PyObjectWrap referring to one Python object - the
// object store ensures this.
//
// A Python reference that is not represented in JS is entirely managed by
// the Python GC.
//
// All PyObjectWrap objects are created by New/NewCallable which accept a strong
// PyObject* reference and hold on to it while the PyObjectWrap is referenced in
// JS. Once a PyObjectWrap has been created for a given PyObject* reference, all
// subsequent "creations" of a new object will return the existing object
// through the ObjectStore API. As a PyObjectWrap holds a strong reference on the
// PyObject*, Python cannot GC objects which are referenced in JS.
//
// When the PyObjectWrap is not referenced anymore by JS, V8 will eventually GC
// the object which will trigger the C++ destructor. This destructor will
// dereference the PyObject*, signaling to Python that this object can be
// GCed and it will erase it from the ObjectStore.
//
// The heart of the translation layer are the FromJS and ToJS recursive
// methods - with all their subroutines.
//
// Both of them have local object stores that exist only for the duration
// of the recursion. These are only for detecting and handling circular
// references.
//
// FromJS has two functions: at the low-level, it can produce a raw
// *PyObject from a JS object - those are needed for calling into Python.
// At the higher level, it produces a new PyObjectWrap representation of a JS object.
// Both functions use the same inner methods. FromJS returns strong references.
// FromJS can also extract PyObject* references from PyObjectWrap objects. This is the
// PyObject pass-through.
//
// ToJS accepts a weak reference which is kept only for the duration of
// the recursion. It constructs JS objects from Python objects. In some
// cases these new JS objects may in fact be PyObjs - when dealing with
// functions and when encountering Python objects without JS equivalence.
// In Python a function is also an object. Thus, a function is also a PyObjectWrap.
// Functions have an additional JS function constructed around them that carries
// the underlying PyObject in a hidden __PyObject__ property. This allows
// FromJS to extract the Python* reference from it. This is what makes possible
// passing of arguments such as dtype=int16 in numpy or the subscript iterators
// in pandas.
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
  static Napi::Value ToJS(Napi::Env, const PyWeakRef &);
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

  static Napi::Value _ToJS(Napi::Env, const PyWeakRef &, NapiObjectStore &);
  static Napi::Value _ToJS_Dictionary(Napi::Env, const PyWeakRef &, NapiObjectStore &);
  static Napi::Value _ToJS_Tuple(Napi::Env, const PyWeakRef &, NapiObjectStore &);
  static Napi::Value _ToJS_List(Napi::Env, const PyWeakRef &, NapiObjectStore &);
  static Napi::Value _ToJS_Set(Napi::Env, const PyWeakRef &, NapiObjectStore &);
  static Napi::Value _ToJS_Dir(Napi::Env, const PyWeakRef &, NapiObjectStore &);
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
  // There is one V8 main thread per environment (EnvContext) and only one main Python thread (main.cc)
  std::thread::id v8_main;
};

// GIL locking rule:
// Every time we are called from JS context, we obtain the GIL
//
// This means all the JS calling convention functions and a few special cases
// that are documented through-out the code
//
// Thankfully, Python cannot access Python objects without the GIL
// This means that when compiled in DEBUG/DEBUG_VERBOSE the VERBOSE_PYOBJ macro
// has the added benefit of provoking a segfault if the GIL is not held
class PyGILGuard {
  PyGILState_STATE state;

    public:
  inline PyGILGuard() {
    VERBOSE(
      "PyGIL: Will obtain from %lu\n",
      static_cast<unsigned long>(std::hash<std::thread::id>{}(std::this_thread::get_id())));
    state = PyGILState_Ensure();
  }

  inline ~PyGILGuard() {
    VERBOSE(
      "PyGIL: Will release from %lu\n",
      static_cast<unsigned long>(std::hash<std::thread::id>{}(std::this_thread::get_id())));
    PyGILState_Release(state);
  }
};
}; // namespace pymport

#if PY_MAJOR_VERSION < 3 || (PY_MAJOR_VERSION == 3 && PY_MINOR_VERSION < 8)
#error Python 3.8 is required
#endif