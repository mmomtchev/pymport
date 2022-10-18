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

#define NAPI_ARG_OBJECT(arg)                                                   \
    ({                                                                         \
        if (info.Length() <= arg || !info[arg].IsObject()) {                   \
            throw Napi::TypeError::New(env, "Argument must be an object");     \
        }                                                                      \
        info[arg].ToObject();                                                  \
    })

#define THROW_IF_NULL(val)                                                     \
    if ((PyObject *)val == nullptr) {                                          \
        auto err = PyErr_Occurred();                                           \
        if (err != nullptr) {                                                  \
            PyObject *type, *v, *trace;                                        \
                                                                               \
            PyErr_Fetch(&type, &v, &trace);                                    \
            PyObject *pstr = PyObject_Str(v);                                  \
            const char *py_err_msg = PyUnicode_AsUTF8(pstr);                   \
            std::string err_msg =                                              \
                std::string("Python exception: ") + py_err_msg;                \
            throw Napi::Error::New(env, err_msg);                              \
        }                                                                      \
        throw Napi::TypeError::New(                                            \
            env, std::string("Failed converting value at ") +                  \
                     std::string(__FILE__) + ":" + std::to_string(__LINE__));  \
    }
