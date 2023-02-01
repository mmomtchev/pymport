#pragma once
#include <cassert>

#define MAX_SAFE_JS_INTEGER 9007199254740991
#define MIN_SAFE_JS_INTEGER -9007199254740991

#define NAPI_ARG_STRING(arg)                                                                                           \
  (info.Length() <= arg || !info[arg].IsString() ? throw Napi::TypeError::New(env, "Argument must be a string")        \
                                                 : info[arg].ToString())

#define NAPI_ARG_NUMBER(arg)                                                                                           \
  (info.Length() <= arg || !info[arg].IsNumber() ? throw Napi::TypeError::New(env, "Argument must be a number")        \
                                                 : info[arg].ToNumber())

#define NAPI_ARG_OBJECT(arg)                                                                                           \
  (info.Length() <= arg || !info[arg].IsObject() ? throw Napi::TypeError::New(env, "Argument must be an object")       \
                                                 : info[arg].ToObject())

#define NAPI_OPT_ARG_OBJECT(arg)                                                                                       \
  (info.Length() <= arg                                                                                                \
     ? Napi::Object()                                                                                                  \
     : (!info[arg].IsObject() ? throw Napi::TypeError::New(env, "Argument must be an object") : info[arg].ToObject()))

#define NAPI_ARG_ARRAY(arg)                                                                                            \
  (info.Length() <= arg || !info[arg].IsArray() ? throw Napi::TypeError::New(env, "Argument must be an array")         \
                                                : info[arg].As<Napi::Array>())

#define NAPI_ARG_BUFFER(arg)                                                                                           \
  ((info.Length() <= arg || !info[arg].IsBuffer()) ? throw Napi::TypeError::New(env, "Argument must be a Buffer")      \
                                                   : info[arg].As<Napi::Buffer<char>>())

#define NAPI_ARG_FUNC(arg)                                                                                             \
  ((info.Length() <= arg || !info[arg].IsFunction()) ? throw Napi::TypeError::New(env, "Argument must be a function")  \
                                                     : info[arg].As<Napi::Function>())

#define NAPI_ARG_PYOBJECT(arg)                                                                                         \
  (info.Length() <= arg || !info[arg].IsObject() || !_InstanceOf(info[arg])                                            \
     ? throw Napi::TypeError::New(env, "Argument must be a PyObject")                                                  \
     : (info[arg].ToObject().Has("__PyObject__") ? info[arg].ToObject().Get("__PyObject__").ToObject()                 \
                                                 : info[arg].ToObject()))

#ifdef DEBUG
#define DEBUG_OPTS(V) V(REFS), V(INIT), V(OBJS), V(CALL), V(MEMV), V(PGIL), V(SHMX)
extern bool debug_opt_enabled[];

#define LOG(...) fprintf(stderr, __VA_ARGS__)
#define INLINE
#define ASSERT(x) assert(x)
#define LINEINFO (std::string(" @ " + std::string(__FILE__) + ":" + std::to_string(__LINE__)))
#define EXCEPTION_CHECK(env, val) ExceptionCheck(env, val, LINEINFO)

#define V(X) X
enum debug_opt { DEBUG_OPTS(V) };
#undef V

#define VERBOSE(sys, ...)                                                                                              \
  do {                                                                                                                 \
    if (debug_opt_enabled[debug_opt::sys]) printf(__VA_ARGS__);                                                        \
  } while (0)

#define VERBOSE_PYOBJ(sys, o, msg)                                                                                     \
  do {                                                                                                                 \
    if (debug_opt_enabled[debug_opt::sys]) {                                                                           \
      printf(                                                                                                          \
        "%s %p : %s (refs %lu): ",                                                                                     \
        msg,                                                                                                           \
        (o),                                                                                                           \
        (o) != nullptr ? (o)->ob_type->tp_name : "null",                                                               \
        (o) != nullptr ? (unsigned long)((o)->ob_refcnt) : 0);                                                         \
      if (o != nullptr) PyObject_Print(o, stdout, 0);                                                                  \
      printf("\n");                                                                                                    \
    }                                                                                                                  \
  } while (0)

#else
#define LINEINFO
#define EXCEPTION_CHECK(env, val) ExceptionCheck(env, val)
#define LOG(...)
#define INLINE inline
#define ASSERT(x)
#define VERBOSE(...)
#define VERBOSE_PYOBJ(sys, o, msg)
#endif
