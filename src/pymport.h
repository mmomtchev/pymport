#pragma once

#include <map>
#include <list>
#include <Python.h>
#include <napi.h>

namespace pymport {

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