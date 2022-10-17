#include "pymport.h"

using namespace Napi;

Value PyObj::String(const CallbackInfo &info) {
    Napi::Env env = info.Env();

    auto raw = NAPI_ARG_STRING(0).Utf16Value();
    auto obj =
        PyUnicode_DecodeUTF16(reinterpret_cast<const char *>(raw.c_str()),
                              raw.size(), nullptr, nullptr);
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

PyObject* PyObj::FromJS(Napi::Value v) {
    if (v.IsNumber()) {
        auto raw = v.ToNumber().DoubleValue();
        return PyFloat_FromDouble(raw);
    }
    if (v.IsString()) {
        auto raw = v.ToString().Utf16Value();
        return
            PyUnicode_DecodeUTF16(reinterpret_cast<const char *>(raw.c_str()),
                                  raw.size(), nullptr, nullptr);
    }
    if (v.IsObject()) {
        Napi::Env env = v.Env();
        FunctionReference *cons = env.GetInstanceData<FunctionReference>();
        if (v.ToObject().InstanceOf(cons->Value())) {
            auto py = ObjectWrap::Unwrap(v.ToObject());
            return py->self;
        }
    }

    return nullptr;
}
