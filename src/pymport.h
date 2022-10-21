#pragma once

#include <map>
#include <list>
#include <Python.h>
#include <napi.h>

namespace pymport {

// Object lifecycle overview

// Everything is organized around the PyObj which is the JS representation
// of a Python reference which is a PyObject* pointer.
//
// A PyObj exists both in C++ and in JS through the ObjectWrap interface.
// A PyObj is an object, while a PyObject* is a reference.
//
// A Python reference that is not represented in JS is entirely managed by
// the Python GC.
//
// All PyObj objects are created by New/NewCallable which accept a strong
// PyObject* reference and hold on to it while the PyObj is referenced in
// JS. Once a PyObj has been created for a given PyObject* reference, all
// subsequent "creations" of a new object will return the existing object
// through the ObjectStore API. As a PyObj holds a strong reference on the
// PyObject*, Python cannot GC objects which are referenced in JS.
//
// When the PyObj is not referenced anymore by JS, V8 will eventually GC
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
// At the higher level, it produces a new PyObj representation of a JS object.
// Both functions use the same inner methods. FromJS returns strong references.
// FromJS can also extract PyObject* references from PyObj objects. This is the
// PyObject pass-through.
//
// ToJS accepts a weak reference which is kept only for the duration of
// the recursion. It constructs JS objects from Python objects. In some
// cases these new JS objects may in fact be PyObjs - when dealing with
// functions and when encountering Python objects without JS equivalence.
// In Python a function is also an object. Thus, a function is also a PyObj.
// Functions have an additional JS function constructed around them that carries
// the underlying PyObject in a hidden __PyObject__ property. This allows
// FromJS to extract the Python* reference from it. This is what makes possible
// passing of arguments such as dtype=int16 in numpy or the subscript iterators
// in pandas.
class PyObj : public Napi::ObjectWrap<PyObj> {
    public:
  PyObj(const Napi::CallbackInfo &);
  virtual ~PyObj();

  Napi::Value ToString(const Napi::CallbackInfo &);

  Napi::Value Get(const Napi::CallbackInfo &);
  Napi::Value Call(const Napi::CallbackInfo &);

  Napi::Value Has(const Napi::CallbackInfo &);
  Napi::Value Type(const Napi::CallbackInfo &);
  Napi::Value Callable(const Napi::CallbackInfo &);

  static Napi::Value Import(const Napi::CallbackInfo &);

  static Napi::Value FromJS(const Napi::CallbackInfo &);
  static Napi::Value ToJS(Napi::Env, PyObject *);
  Napi::Value ToJS(const Napi::CallbackInfo &);

  static Napi::Value Float(const Napi::CallbackInfo &);
  static Napi::Value Integer(const Napi::CallbackInfo &);
  static Napi::Value String(const Napi::CallbackInfo &);
  static Napi::Value Dictionary(const Napi::CallbackInfo &);
  static Napi::Value Tuple(const Napi::CallbackInfo &);
  static Napi::Value List(const Napi::CallbackInfo &);
  static Napi::Value Slice(const Napi::CallbackInfo &);

  static PyObject *FromJS(Napi::Value);

  static Napi::Value New(Napi::Env, PyObject *);
  static Napi::Value NewCallable(Napi::Env, PyObject *);
  static Napi::Function GetClass(Napi::Env);

    private:
  typedef std::map<PyObject *, Napi::Value> NapiObjectStore;
  typedef std::list<std::pair<Napi::Value, PyObject *>> PyObjectStore;

  void Release();
  static Napi::Value _ToJS(Napi::Env, PyObject *, NapiObjectStore &);
  static PyObject *_FromJS(Napi::Value, PyObjectStore &);
  static PyObject *_Dictionary(Napi::Object, PyObject *, PyObjectStore &);
  static PyObject *_List(Napi::Array, PyObject *, PyObjectStore &);
  static PyObject *_Tuple(Napi::Array, PyObject *, PyObjectStore &);
  static PyObject *_Slice(Napi::Array, PyObjectStore &);
  static Napi::Value _Call(PyObject *, const Napi::CallbackInfo &info);
  static Napi::Value _CallableTrampoline(const Napi::CallbackInfo &info);
  static bool _InstanceOf(Napi::Value);
  static bool _FunctionOf(Napi::Value);

  PyObject *self;
};

struct EnvContext {
  Napi::FunctionReference *pyObj;
  std::map<PyObject *, PyObj *> object_store;
  std::map<PyObject *, Napi::FunctionReference *> function_store;
};

}; // namespace pymport

#if PY_MAJOR_VERSION < 3 || (PY_MAJOR_VERSION == 3 && PY_MINOR_VERSION < 3)
#error Python 3.3 is required
#endif