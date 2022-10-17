#include "pymport.h"

using namespace Napi;

Napi::Value PyObj::ToJS(Napi::Env env, PyObject *py) {
    if (PyLong_Check(py)) {
        return Number::New(env, PyLong_AsLong(py));
    }

    if (PyFloat_Check(py)) {
        return Number::New(env, PyFloat_AsDouble(py));
    }

    if (PyList_Check(py)) {
        Napi::Array r = Array::New(env);
        size_t len = PyList_Size(py);

        for (size_t i = 0; i < len; i++) {
            PyObject *v = PyList_GetItem(py, i);
            Napi::Value js = PyObj::ToJS(env, v);
            r.Set(i, js);
        }
        return r;
    }

    throw Error::New(env, "Unsupported Python type");
}

Napi::Value PyObj::ToJS(const CallbackInfo &info) {
    Napi::Env env = info.Env();

    return PyObj::ToJS(env, self);
}