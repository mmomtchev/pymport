#include "pymport.h"
#include "pystackobject.h"
#include "values.h"

using namespace Napi;

PyObj::PyObj(const CallbackInfo &info) : ObjectWrap(info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1)
        throw TypeError::New(env, "Cannot create an empty object");

    if (info[0].IsExternal()) {
        self = info[0].As<External<PyObject>>().Data();
    } else {
        throw Error::New(env, "Not implemented");
    }
}

PyObj::~PyObj() {
    Py_DECREF(self);
}

Function PyObj::GetClass(Napi::Env env) {
    return DefineClass(env, "PyObject",
                       {PyObj::InstanceMethod("toString", &PyObj::ToString),
                        PyObj::InstanceMethod("get", &PyObj::Get),
                        PyObj::InstanceMethod("call", &PyObj::Call),
                        PyObj::InstanceMethod("toJS", &PyObj::ToJS),
                        PyObj::StaticMethod("fromJS", &PyObj::FromJS),
                        PyObj::StaticMethod("import", &PyObj::Import),
                        PyObj::StaticMethod("string", &PyObj::String),
                        PyObj::StaticMethod("float", &PyObj::Float),
                        PyObj::StaticMethod("dict", &PyObj::Dictionary),
                        PyObj::StaticMethod("list", &PyObj::List),
                        PyObj::StaticMethod("int", &PyObj::Integer)});
}

Value PyObj::ToString(const CallbackInfo &info) {
    Napi::Env env = info.Env();

    PyStackObject r = PyObject_Str(self);
    THROW_IF_NULL(r);
    return ToJS(env, r);
}

Value PyObj::Get(const CallbackInfo &info) {
    Napi::Env env = info.Env();

    std::string name = NAPI_ARG_STRING(0).Utf8Value();
    auto r = PyObject_GetAttrString(self, name.c_str());
    return New(env, r);
}

Value PyObj::Import(const CallbackInfo &info) {
    Napi::Env env = info.Env();

    std::string name = NAPI_ARG_STRING(0).Utf8Value();
    PyObject *pyname = PyUnicode_DecodeFSDefault(name.c_str());
    THROW_IF_NULL(pyname);

    auto obj = PyImport_Import(pyname);
    Py_DECREF(pyname);

    return New(env, obj);
}

// New steals the py reference
Value PyObj::New(Napi::Env env, PyObject *obj) {
    THROW_IF_NULL(obj);
    Napi::FunctionReference *cons =
        env.GetInstanceData<Napi::FunctionReference>();
    return cons->New({External<PyObject>::New(env, obj)});
}
