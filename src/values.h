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

#ifdef DEBUG_VERBOSE
#define INLINE inline
#define ASSERT(x) assert(x)
#define VERBOSE(...) printf(__VA_ARGS__)
#define VERBOSE_PYOBJ(o, msg)                                                                                          \
  {                                                                                                                    \
    printf(                                                                                                            \
      "%s %p : %s (refs %lu): ",                                                                                       \
      msg,                                                                                                             \
      (o),                                                                                                             \
      (o) != nullptr ? (o)->ob_type->tp_name : "null",                                                                 \
      (o) != nullptr ? (unsigned long)((o)->ob_refcnt) : 0);                                                           \
    PyObject_Print(o, stdout, 0);                                                                                      \
    printf("\n");                                                                                                      \
  }

#else

#define INLINE
#define ASSERT(x)
#define VERBOSE(...)
#define VERBOSE_PYOBJ(o, msg)
#endif
