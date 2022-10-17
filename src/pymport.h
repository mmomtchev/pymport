#pragma once

#define NAPI_EXPERIMENTAL
#define NAPI_VERSION 6

#include <Python.h>
#include <napi.h>

class PyObj : public Napi::ObjectWrap<PyObj> {
  public:
    PyObj(const Napi::CallbackInfo &);

    Napi::Value Get(const Napi::CallbackInfo &);
    Napi::Value Call(const Napi::CallbackInfo &);

    static Napi::Value Import(const Napi::CallbackInfo &);

    static Napi::Value FromJS(const Napi::CallbackInfo &);
    static Napi::Value ToJS(Napi::Env, PyObject *);
    Napi::Value ToJS(const Napi::CallbackInfo &);

    static Napi::Value Float(const Napi::CallbackInfo &);
    static Napi::Value Integer(const Napi::CallbackInfo &);
    static Napi::Value String(const Napi::CallbackInfo &);

    static PyObject *FromJS(Napi::Value);

    static Napi::Value New(Napi::Env, PyObject *);
    static Napi::Function GetClass(Napi::Env);

  private:
    PyObject *self;
};

#define NAPI_ARG_STRING(arg)                                                   \
    ({                                                                         \
        if (info.Length() <= arg || !info[arg].IsString()) {                   \
            throw Napi::TypeError::New(env, "Argument must be a string");      \
        }                                                                      \
        info[arg].ToString();                                                  \
    })

#define NAPI_ARG_NUMBER(arg)                                                   \
    ({                                                                         \
        if (info.Length() <= arg || !info[arg].IsNumber()) {                   \
            throw Napi::TypeError::New(env, "Argument must be a number");      \
        }                                                                      \
        info[arg].ToNumber();                                                  \
    })

#define THROW_IF_NULL(val)                                                     \
    if (val == nullptr) {                                                      \
        auto err = PyErr_Occurred();                                           \
        if (err != nullptr) {                                                  \
            PyObject *type, *v, *trace;                                        \
                                                                               \
            PyErr_Fetch(&type, &v, &trace);                                    \
            PyObject *pstr = PyObject_Str(v);                                  \
            const char *err_msg = PyUnicode_AsUTF8(pstr);                      \
            printf("Python exception: %s\n", err_msg);                         \
        }                                                                      \
        throw Napi::TypeError::New(env, "Failed converting value");            \
    }
