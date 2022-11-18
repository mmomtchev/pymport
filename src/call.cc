
#include <vector>

#include "pymport.h"
#include "pystackobject.h"
#include "values.h"

using namespace Napi;
using namespace pymport;

// An object of JSCall_Trampoline represents the Python view of a JS function
// This callable type cannot be constructed from Python and is normally not visible
// except when inspecting a function object passed from JS
typedef struct {
  PyObject_HEAD;
  Napi::FunctionReference js_fn;
} JSCall_Trampoline;

static PyObject *JSCall_Trampoline_Constructor(PyTypeObject *type, PyObject *args, PyObject *kw) {
  auto me = reinterpret_cast<JSCall_Trampoline *>(type->tp_alloc(type, 0));
  if (me == nullptr) return PyErr_NoMemory();

  // Make sure we don't segfault if someone manages to call us from Python
  memset(reinterpret_cast<void *>(&me->js_fn), 0, sizeof(Napi::FunctionReference));
  me->js_fn = FunctionReference();
  return reinterpret_cast<PyObject *>(me);
}

// Synchronous call into JS from Python
static PyObject *JSCall_Trampoline_Call(PyObject *self, PyObject *args, PyObject *kw) {
  JSCall_Trampoline *me = reinterpret_cast<JSCall_Trampoline *>(self);
  Napi::Env env = me->js_fn.Env();
  if (me->js_fn.IsEmpty()) {
    fprintf(stderr, "Called an empty JS function, don't manually construct objects of pymport.js_function type\n");
    Py_RETURN_NOTIMPLEMENTED;
  }

  ASSERT(PyTuple_Check(args));
  ASSERT(kw == nullptr || PyDict_Check(kw));

  std::vector<napi_value> js_args;

  // Positional arguments
  size_t len = PyTuple_Size(args);
  for (size_t i = 0; i < len; i++) {
    PyWeakRef v = PyTuple_GetItem(args, i);
    PyObjectWrap::EXCEPTION_CHECK(env, v);
    js_args.push_back(PyObjectWrap::New(env, PyStrongRef(v)));
  }

  // Named arguments -> placed in a object as a last argument
  if (kw != nullptr) {
    auto js_kwargs = Object::New(env);
    PyWeakRef key = nullptr, value = nullptr;
    Py_ssize_t pos = 0;
    while (PyDict_Next(kw, &pos, &key, &value)) {
      auto jsKey = PyObjectWrap::ToJS(env, key);
      js_kwargs.Set(jsKey, PyObjectWrap::New(env, PyStrongRef(value)));
    }
    js_args.push_back(js_kwargs);
  }

  try {
    Value js_ret = me->js_fn.Call(js_args);
    PyStrongRef ret = PyObjectWrap::FromJS(js_ret);
    PyObjectWrap::EXCEPTION_CHECK(env, ret);
    return ret.gift();
  } catch (const Error &err) { PyErr_SetString(PyExc_Exception, err.what()); }

  return nullptr;
}

static PyObject *JSCall_Trampoline_Finalizer(PyObject *self, PyObject *args, PyObject *kw) {
  VERBOSE_PYOBJ(self, "jscall_trampoline finalizer");
  JSCall_Trampoline *me = reinterpret_cast<JSCall_Trampoline *>(self);
  me->js_fn.Reset();
  Py_RETURN_NONE;
}

static PyType_Slot jscall_trampoline_slots[] = {
  {Py_tp_alloc, reinterpret_cast<void *>(PyType_GenericAlloc)},
  {Py_tp_new, reinterpret_cast<void *>(JSCall_Trampoline_Constructor)},
  {Py_tp_call, reinterpret_cast<void *>(JSCall_Trampoline_Call)},
  {Py_tp_dealloc, reinterpret_cast<void *>(JSCall_Trampoline_Finalizer)},
  {0, 0}};

static PyType_Spec jscall_trampoline_spec = {
  "pymport.js_function", sizeof(JSCall_Trampoline), 0, Py_TPFLAGS_DEFAULT, jscall_trampoline_slots};

PyStrongRef PyObjectWrap::JSCall_Trampoline_Type = nullptr;

void PyObjectWrap::InitJSTrampoline() {
  JSCall_Trampoline_Type = PyType_FromSpec(&jscall_trampoline_spec);

  if (JSCall_Trampoline_Type == nullptr) {
    fprintf(stderr, "Error initalizing js_function type\n");
    abort();
  }
}

Napi::Value PyObjectWrap::_ToJS_JSFunction(Napi::Env, const PyWeakRef &py) {
  JSCall_Trampoline *raw = reinterpret_cast<JSCall_Trampoline *>(*py);
  return raw->js_fn.Value();
}

#define IS_INFO_ARG_KWARGS(n) (info[n].IsObject() && !info[n].IsArray() && !_InstanceOf(info[n]))

Value PyObjectWrap::_Call(const PyWeakRef &py, const CallbackInfo &info) {
  Napi::Env env = info.Env();

  if (!PyCallable_Check(*py)) { throw Napi::TypeError::New(env, "Value not callable"); }

  size_t argc = info.Length();
#if PY_MAJOR_VERSION > 3 || (PY_MAJOR_VERSION == 3 && PY_MINOR_VERSION >= 9)
  if (argc == 0) {
    PyStrongRef r = PyObject_CallNoArgs(*py);
    EXCEPTION_CHECK(env, r);

    return New(env, std::move(r));
  } else if (argc == 1 && !IS_INFO_ARG_KWARGS(0)) {
    PyStrongRef arg = FromJS(info[0]);
    EXCEPTION_CHECK(env, arg);
    PyStrongRef r = PyObject_CallOneArg(*py, *arg);
    EXCEPTION_CHECK(env, r);

    return New(env, std::move(r));
  }
#endif

  PyStrongRef kwargs = nullptr;
  if (argc > 0 && IS_INFO_ARG_KWARGS(argc - 1)) {
    kwargs = PyDict_New();
    EXCEPTION_CHECK(env, kwargs);
    PyObjectStore store;
    _FromJS_Dictionary((info[argc - 1]).ToObject(), kwargs, store);
    argc--;
  } else if (argc > 0 && info[argc - 1].IsUndefined()) {
    argc--;
  }

  PyStrongRef args = nullptr;
  if (argc > 0 || kwargs != nullptr) {
    args = PyTuple_New(argc);
    EXCEPTION_CHECK(env, args);
    for (size_t i = 0; i < argc; i++) {
      PyStrongRef v = FromJS(info[i]);
      EXCEPTION_CHECK(env, v);
      // FromJS returns a strong reference and PyTuple_SetItem steals it
      int status = PyTuple_SetItem(*args, i, v.gift());
      EXCEPTION_CHECK(env, status);
    }
  }

  PyStrongRef r = nullptr;
  if (kwargs == nullptr) {
    r = PyObject_CallObject(*py, *args);
  } else {
    r = PyObject_Call(*py, *args, *kwargs);
  }
  EXCEPTION_CHECK(env, r);

  return New(env, std::move(r));
}

Value PyObjectWrap::Call(const CallbackInfo &info) {
  return _Call(self, info);
}

Value PyObjectWrap::_CallableTrampoline(const CallbackInfo &info) {
  PyObject *py = reinterpret_cast<PyObject *>(info.Data());
  return _Call(py, info);
}

Value PyObjectWrap::Callable(const CallbackInfo &info) {
  Napi::Env env = info.Env();

  return Boolean::New(env, PyCallable_Check(*self));
}

Value PyObjectWrap::Eval(const CallbackInfo &info) {
  Napi::Env env = info.Env();
  auto text = NAPI_ARG_STRING(0).Utf8Value();
  PyStrongRef globals = (info.Length() > 1 && !info[1].IsUndefined()) ? FromJS(info[1]) : PyStrongRef(PyDict_New());
  EXCEPTION_CHECK(env, globals);
  PyStrongRef locals = (info.Length() > 2 && !info[2].IsUndefined()) ? FromJS(info[2]) : PyStrongRef(PyDict_New());
  EXCEPTION_CHECK(env, locals);

  PyStrongRef result = PyRun_String(text.c_str(), Py_eval_input, *globals, *locals);
  EXCEPTION_CHECK(env, result);

  return New(env, std::move(result));
}

#ifdef DEBUG
void PyObjectWrap::_ExceptionThrow(Napi::Env env, std::string msg) {
#else
void PyObjectWrap::_ExceptionThrow(Napi::Env env) {
#endif
  PyWeakRef err = PyErr_Occurred();
  if (err != nullptr) {
    PyStrongRef type = nullptr, v = nullptr, trace = nullptr;

    PyErr_Fetch(&type, &v, &trace);
    PyErr_Clear();

    PyStrongRef pstr = PyObject_Str(*v);
    const char *py_err_msg = PyUnicode_AsUTF8(*pstr);

    std::string err_msg = std::string("Python exception: ") + py_err_msg
#ifdef DEBUG
      + msg
#endif
      ;

    auto error_object = Napi::Error::New(env, err_msg);
    if (trace != nullptr) {
      auto trace_object = New(env, std::move(trace));
      error_object.Set("pythonTrace", trace_object);
    }
    throw error_object;
  }
  throw Napi::TypeError::New(
    env,
    std::string("Unknown Python error")
#ifdef DEBUG
      + msg
#endif

  );
}

PyStrongRef PyObjectWrap::NewJSFunction(Function js_fn) {
  Napi::Env env = js_fn.Env();

  // Create a new instance of JSCall_Trampoline
  PyStrongRef args = PyTuple_New(0);
  EXCEPTION_CHECK(env, args);

  // create the Python trampoline object
  PyStrongRef trampoline = PyObject_CallObject(*JSCall_Trampoline_Type, *args);
  EXCEPTION_CHECK(env, trampoline);

  // Pass the JS reference to the callback
  auto *raw = reinterpret_cast<JSCall_Trampoline *>(*trampoline);
  raw->js_fn = Persistent(js_fn);

  return trampoline;
}

Value PyObjectWrap::Functor(const CallbackInfo &info) {
  Napi::Env env = info.Env();

  auto fn = NAPI_ARG_FUNC(0);
  PyStrongRef obj = NewJSFunction(fn);
  EXCEPTION_CHECK(env, obj);
  return New(env, std::move(obj));
}
