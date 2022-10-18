#include "pymport.h"
#include "pystackobject.h"
#include "values.h"

using namespace Napi;

Value PyObj::String(const CallbackInfo &info) {
    Napi::Env env = info.Env();

    auto raw = NAPI_ARG_STRING(0).Utf16Value();
    auto obj =
        PyUnicode_DecodeUTF16(reinterpret_cast<const char *>(raw.c_str()),
                              raw.size() * 2, nullptr, nullptr);
    return New(env, obj);
}

Value PyObj::Float(const CallbackInfo &info) {
    Napi::Env env = info.Env();

    auto raw = NAPI_ARG_NUMBER(0).DoubleValue();
    auto obj = PyFloat_FromDouble(raw);
    return New(env, obj);
}

Value PyObj::Integer(const CallbackInfo &info) {
    Napi::Env env = info.Env();

    auto raw = NAPI_ARG_NUMBER(0).Int64Value();
    auto obj = PyLong_FromLong(raw);
    return New(env, obj);
}

PyObject* PyObj::_Dictionary(Napi::Object object) {
    Napi::Env env = object.Env();

    auto dict = PyDict_New();
    THROW_IF_NULL(dict);

    for (auto const &el : object.GetPropertyNames()) {
        auto key = ((Napi::Value)el.second).ToString().Utf8Value();
        PyStackObject item = FromJS(object.Get(key));
        THROW_IF_NULL(item);
        PyDict_SetItemString(dict, key.c_str(), item);
    }

    return dict;
}

Value PyObj::Dictionary(const CallbackInfo &info) {
    Napi::Env env = info.Env();

    auto raw = NAPI_ARG_OBJECT(0);
    auto dict = _Dictionary(raw);
    
    return New(env, dict);
}

PyObject *PyObj::_List(Napi::Array array) {
    Napi::Env env = array.Env();
    size_t len = array.Length();
    auto py = PyList_New(len);
    THROW_IF_NULL(py);

    for (size_t i = 0; i < len; i++) {
        auto el = FromJS(array.Get(i));
        PyList_SetItem(py, i, el);
    }

    return py;
}

Value PyObj::List(const CallbackInfo &info) {
    Napi::Env env = info.Env();

    auto raw = NAPI_ARG_ARRAY(0);
    auto list = _List(raw);

    return New(env, list);
}

Value PyObj::FromJS(const CallbackInfo &info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1)
        throw Error::New(env, "Missing argument");
    return New(info.Env(), FromJS(info[0]));
}

PyObject *PyObj::FromJS(Napi::Value v) {
    Napi::Env env = v.Env();

    if (v.IsNumber()) {
        auto raw = v.ToNumber().DoubleValue();
        if (fmod(raw, 1) == 0)
            return PyLong_FromLong(v.ToNumber().Int64Value());
        else
            return PyFloat_FromDouble(raw);
    }
    if (v.IsString()) {
        auto raw = v.ToString().Utf16Value();
        return PyUnicode_DecodeUTF16(
            reinterpret_cast<const char *>(raw.c_str()), raw.size() * 2, nullptr,
            nullptr);
    }
    if (v.IsArray()) {
        auto array = v.As<Array>();
        auto list = _List(array);
        return list;
    }
    if (v.IsObject()) {
        FunctionReference *cons = env.GetInstanceData<FunctionReference>();
        auto obj = v.ToObject();
        if (obj.ToObject().InstanceOf(cons->Value())) {
            auto py = ObjectWrap::Unwrap(v.ToObject());
            return py->self;
        }

        auto dict = _Dictionary(obj);
        return dict;
    }

    return nullptr;
}
