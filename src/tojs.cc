#include "pymport.h"
#include "pystackobject.h"

using namespace Napi;

Napi::Value PyObj::ToJS(Napi::Env env, PyObject *py) {
    EscapableHandleScope scope(env);

    if (PyLong_Check(py)) {
        return scope.Escape(Number::New(env, PyLong_AsLong(py)));
    }

    if (PyFloat_Check(py)) {
        return scope.Escape(Number::New(env, PyFloat_AsDouble(py)));
    }

    if (PyList_Check(py)) {
        Napi::Array r = Array::New(env);
        size_t len = PyList_Size(py);

        for (size_t i = 0; i < len; i++) {
            PyObject *v = PyList_GetItem(py, i);
            Napi::Value js = PyObj::ToJS(env, v);
            r.Set(i, js);
        }
        return scope.Escape(r);
    }

    if (PyUnicode_Check(py)) {
        PyStackObject utf16 = PyUnicode_AsUTF16String(py);
        auto raw = PyBytes_AsString(utf16);
        return scope.Escape(String::New(env,
                                        reinterpret_cast<char16_t *>(raw + 2),
                                        PyUnicode_GET_LENGTH(py)));
    }

    if (PyDict_Check(py)) {
        auto obj = Object::New(env);

        PyObject *key, *value;
        Py_ssize_t pos = 0;
        while (PyDict_Next(py, &pos, &key, &value)) {
            auto jsKey = ToJS(env, key);
            auto jsValue = ToJS(env, value);
            obj.Set(jsKey, jsValue);
        }
        return scope.Escape(obj);
    }

    if (PyTuple_Check(py)) {
        Napi::Array r = Array::New(env);
        size_t len = PyTuple_Size(py);

        for (size_t i = 0; i < len; i++) {
            PyObject *v = PyTuple_GetItem(py, i);
            Napi::Value js = PyObj::ToJS(env, v);
            r.Set(i, js);
        }
        return scope.Escape(r);
    }

    // Everything else is kept as a PyObject
    return New(env, py);
}

Napi::Value PyObj::ToJS(const CallbackInfo &info) {
    Napi::Env env = info.Env();

    return PyObj::ToJS(env, self);
}