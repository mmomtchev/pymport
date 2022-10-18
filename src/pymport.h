#pragma once

#define NAPI_EXPERIMENTAL
#define NAPI_VERSION 6

#include <Python.h>
#include <napi.h>

class PyObj : public Napi::ObjectWrap<PyObj> {
  public:
    PyObj(const Napi::CallbackInfo &);
    virtual ~PyObj();

    Napi::Value ToString(const Napi::CallbackInfo &);

    Napi::Value Get(const Napi::CallbackInfo &);
    Napi::Value Call(const Napi::CallbackInfo &);

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
    static PyObject* _Dictionary(Napi::Object);
    static PyObject *_List(Napi::Array);

    static PyObject* FromJS(Napi::Value);

    static Napi::Value New(Napi::Env, PyObject *);
    static Napi::Function GetClass(Napi::Env);

  private:
    PyObject *self;
};

#if PY_MAJOR_VERSION < 3 || (PY_MAJOR_VERSION == 3 && PY_MINOR_VERSION < 3)
#error Python 3.3 is required
#endif