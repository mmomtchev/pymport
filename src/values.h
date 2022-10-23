#define NAPI_ARG_STRING(arg)                                                                                           \
  (info.Length() <= arg || !info[arg].IsString() ? throw Napi::TypeError::New(env, "Argument must be a string")        \
                                                 : info[arg].ToString())

#define NAPI_ARG_NUMBER(arg)                                                                                           \
  (info.Length() <= arg || !info[arg].IsNumber() ? throw Napi::TypeError::New(env, "Argument must be a number")        \
                                                 : info[arg].ToNumber())

#define NAPI_ARG_OBJECT(arg)                                                                                           \
                                                                                                                       \
  (info.Length() <= arg || !info[arg].IsObject() ? throw Napi::TypeError::New(env, "Argument must be an object")       \
                                                 : info[arg].ToObject())

#define NAPI_ARG_ARRAY(arg)                                                                                            \
  (info.Length() <= arg || !info[arg].IsArray() ? throw Napi::TypeError::New(env, "Argument must be an array")         \
                                                : info[arg].As<Napi::Array>())

#define NAPI_ARG_FUNC(arg)                                                                                             \
  ((info.Length() <= arg || !info[arg].IsFunction()) ? throw Napi::TypeError::New(env, "Argument must be a function"); \
                                                     : info[arg].As<Napi::Function>())

#ifdef DEBUG
#define LOG(...) fprintf(stderr, __VA_ARGS__)
#define LINEINFO +std::string(" @ " + std::string(__FILE__) + ":" + std::to_string(__LINE__))
#else
#define LOG(...)
#define LINEINFO
#endif

#define THROW_IF_NULL(val)                                                                                             \
  if ((PyObject *)val == nullptr) {                                                                                    \
    auto err = PyErr_Occurred();                                                                                       \
    if (err != nullptr) {                                                                                              \
      PyObject *type, *v, *trace;                                                                                      \
                                                                                                                       \
      PyErr_Fetch(&type, &v, &trace);                                                                                  \
      PyObject *pstr = PyObject_Str(v);                                                                                \
      const char *py_err_msg = PyUnicode_AsUTF8(pstr);                                                                 \
      std::string err_msg = std::string("Python exception: ") + py_err_msg LINEINFO;                                   \
      throw Napi::Error::New(env, err_msg);                                                                            \
    }                                                                                                                  \
    throw Napi::TypeError::New(env, std::string("Failed converting value at ") LINEINFO);                              \
  }

#define DEBUG_PY_PRINT(o, msg)                                                                                         \
  {                                                                                                                    \
    printf("%s %p: ", msg, (PyObject *)o);                                                                             \
    PyObject_Print(o, stdout, 0);                                                                                      \
    printf("\n\n");                                                                                                    \
  }
