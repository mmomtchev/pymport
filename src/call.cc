
#include <vector>
#include <condition_variable>

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
  FunctionReference *js_fn;
  ThreadSafeFunction *js_tsfn;
} JSCall_Trampoline;

// This function is called from a Python context and can run in every thread
static PyObject *JSCall_Trampoline_Constructor(PyTypeObject *type, PyObject *args, PyObject *kw) {
  auto me = reinterpret_cast<JSCall_Trampoline *>(type->tp_alloc(type, 0));
  if (me == nullptr) return PyErr_NoMemory();

  // Make sure we don't segfault if someone manages to call us from Python
  me->js_fn = nullptr;
  me->js_tsfn = nullptr;
  return reinterpret_cast<PyObject *>(me);
}

// A Python wrapper around a JS function
// It returns an owned reference as per the Python calling convention
// Called from Python context but always on the V8 main thread
static PyObject *CallJSWithPythonArgs(JSCall_Trampoline *fn, PyObject *args, PyObject *kw) {
  Napi::Env env = fn->js_fn->Env();
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
      auto jsKey = PyObjectWrap::ToJS(env, key, {1, true});
      js_kwargs.Set(jsKey, PyObjectWrap::New(env, PyStrongRef(value)));
    }
    js_args.push_back(js_kwargs);
  }

  // We release the GIL while we are running JavaScript
  Value js_ret;
  PyThreadState *python_state = PyEval_SaveThread();
  try {
    js_ret = fn->js_fn->Call(js_args);
  } catch (const Error &err) {
    PyEval_RestoreThread(python_state);
    throw err;
  }
  PyEval_RestoreThread(python_state);

  PyStrongRef ret = PyObjectWrap::FromJS(js_ret);
  PyObjectWrap::EXCEPTION_CHECK(env, ret);
  return ret.gift();
}

// Synchronous call from Python to JavaScript
// Called from Python context, if called on a worker thread blocks and waits for the main thread
static PyObject *JSCall_Trampoline_Call(PyObject *self, PyObject *args, PyObject *kw) {
  JSCall_Trampoline *me = reinterpret_cast<JSCall_Trampoline *>(self);

  if (me->js_fn == nullptr) {
    PyErr_SetString(
      PyExc_NotImplementedError,
      "Called an empty JS function, don't manually construct objects of pymport.js_function type\n");
    return nullptr;
  }
  Napi::Env env = me->js_fn->Env();

  bool async = false;
  if (std::this_thread::get_id() != env.GetInstanceData<EnvContext>()->v8_main) { async = true; }

  ASSERT(PyTuple_Check(args));
  ASSERT(kw == nullptr || PyDict_Check(kw));

  // We always call JavaScript synchronously but this function can be called from a background thread
  if (async) {
    // We have been called in a worker thread, we will schedule the call in the V8 main thread
    // And we will block until that call returns
    std::mutex lock;
    std::condition_variable cv;
    bool ready = false;
    std::string error = "no error";
    PyObject *ret = nullptr;

    // Release the GIL - so that we can acquire it in the V8 main thread
    PyThreadState *python_state = PyEval_SaveThread();
    me->js_tsfn->Ref(env);
    me->js_tsfn->BlockingCall([me, args, kw, &lock, &ready, &error, &cv, &ret](Napi::Env env, Function js_fn) {
      // This runs in the V8 main thread
      std::unique_lock<std::mutex> guard(lock);
      {
        // Reacquire the GIL in the V8 main thread with an empty Python context
        PyGILGuard pyGilGuard;
        try {
          ret = CallJSWithPythonArgs(me, args, kw);
        } catch (const Error &err) { error = err.Message(); }
      }
      ready = true;
      cv.notify_one();
    });
    std::unique_lock<std::mutex> guard(lock);
    cv.wait(guard, [&ready] { return ready; });
    me->js_tsfn->Unref(env);
    // Restore the GIL and thread state before returning back to Python
    PyEval_RestoreThread(python_state);
    if (ret == nullptr) { PyErr_SetString(PyExc_Exception, error.c_str()); }
    return ret;
  } else {
    try {
      return CallJSWithPythonArgs(me, args, kw);
    } catch (const Error &err) { PyErr_SetString(PyExc_Exception, err.what()); }
    return nullptr;
  }
}

// Finalizer for pymport.js_function
// Can be called both from Python and JS context
static PyObject *JSCall_Trampoline_Finalizer(PyObject *self, PyObject *args, PyObject *kw) {
  VERBOSE_PYOBJ(CALL, self, "jscall_trampoline finalizer");
  JSCall_Trampoline *me = reinterpret_cast<JSCall_Trampoline *>(self);

  auto fn = me->js_fn;
  auto tsfn = me->js_tsfn;
  if (fn == nullptr) Py_RETURN_NONE;

  auto context = fn->Env().GetInstanceData<EnvContext>();
  auto finalizer = [fn, tsfn, context]() {
    fn->Reset();
    delete fn;
    // release the TSFN only if it hasn't been destroyed (destruction path 1)
    if (context->tsfn_store.count(tsfn) > 0) {
      context->tsfn_store.erase(tsfn);
      tsfn->Release();
      delete tsfn;
    }
  };

#ifndef DEBUG
  if (std::this_thread::get_id() == context->v8_main)
    finalizer();
  else
#endif
  {
    VERBOSE(CALL, "jscall_trampoline asynchronous finalization\n");
    std::lock_guard<std::mutex> lock(context->v8_queue.lock);
    context->v8_queue.jobs.emplace(std::move(finalizer));
    assert(uv_async_send(context->v8_queue.handle) == 0);
    uv_ref(reinterpret_cast<uv_handle_t *>(context->v8_queue.handle));
  }

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
  if (PyObjectWrap::JSCall_Trampoline_Type != nullptr) {
    VERBOSE(INIT, "Re-initializing PyObjectWrap::JSCall_Trampoline_Type (Python shutdown without dlclose)\n");
    PyObjectWrap::JSCall_Trampoline_Type = nullptr;
  }

  JSCall_Trampoline_Type = PyType_FromSpec(&jscall_trampoline_spec);

  if (JSCall_Trampoline_Type == nullptr) {
    fprintf(stderr, "Error initializing js_function type\n");
    abort();
  }
}

// Transform a PyObject containing a JS function back to a JS function
Napi::Value PyObjectWrap::_ToJS_JSFunction(Napi::Env env, const PyWeakRef &py) {
  JSCall_Trampoline *raw = reinterpret_cast<JSCall_Trampoline *>(*py);
  if (raw->js_fn == nullptr) return env.Undefined();
  return raw->js_fn->Value();
}

#define IS_INFO_ARG_KWARGS(n)                                                                                          \
  (info[n].IsObject() && !info[n].IsArray() && !info[n].IsFunction() && !_InstanceOf(info[n]) && !info[n].IsBuffer())

// Transform the JS arguments to Python references and return a lambda making the actual Python call
PyCallExecutor PyObjectWrap::CreateCallExecutor(const PyWeakRef &py, const CallbackInfo &info) {
  Napi::Env env = info.Env();

  if (!PyCallable_Check(*py)) { throw Napi::TypeError::New(env, "Value not callable"); }

  size_t argc = info.Length();
#if PY_MAJOR_VERSION > 3 || (PY_MAJOR_VERSION == 3 && PY_MINOR_VERSION >= 9)
  if (argc == 0) {
    return [py]() { return PyObject_CallNoArgs(*py); };
  } else if (argc == 1 && !IS_INFO_ARG_KWARGS(0)) {
    PyStrongRef arg = FromJS(info[0]);
    EXCEPTION_CHECK(env, arg);
    return [py, arg = std::move(arg)] { return PyObject_CallOneArg(*py, *arg); };
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

  if (kwargs == nullptr) {
    if (args == nullptr) {
      return [py]() { return PyObject_CallObject(*py, nullptr); };
    }
    return [py, args = std::move(args)]() { return PyObject_CallObject(*py, *args); };
  } else {
    return [py, args = std::move(args), kwargs = std::move(kwargs)]() { return PyObject_Call(*py, *args, *kwargs); };
  }
}

// Synchronous call from JavaScript to Python (the callable is this)
Value PyObjectWrap::Call(const CallbackInfo &info) {
  Napi::Env env = info.Env();
  PyGILGuard pyGilGuard;
  PyStrongRef r = CreateCallExecutor(self, info)();
  EXCEPTION_CHECK(env, r);
  return New(env, std::move(r));
}

// Synchronous call from JavaScript to Python (the callable is in the context)
Value PyObjectWrap::_CallableTrampoline(const CallbackInfo &info) {
  Napi::Env env = info.Env();
  PyGILGuard pyGilGuard;
  PyObject *py = reinterpret_cast<PyObject *>(info.Data());
  PyStrongRef r = CreateCallExecutor(py, info)();
  EXCEPTION_CHECK(env, r);
  return New(env, std::move(r));
}

Value PyObjectWrap::Callable(const CallbackInfo &info) {
  PyGILGuard pyGilGuard;
  Napi::Env env = info.Env();

  return Boolean::New(env, PyCallable_Check(*self));
}

Value PyObjectWrap::Eval(const CallbackInfo &info) {
  PyGILGuard pyGilGuard;
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

// Must be constructed with the GIL held
// ToJS can be called only from a V8 thread
#ifdef DEBUG
PythonException::PythonException(std::string msg)
#else
PythonException::PythonException()
#endif
  : type(nullptr), value(nullptr), trace(nullptr) {
  using namespace std::string_literals;

  PyWeakRef err = PyErr_Occurred();
  if (err != nullptr) {
    PyErr_Fetch(&type, &value, &trace);
    PyErr_Clear();

    PyStrongRef pstr = PyObject_Str(*value);
    const char *py_err_msg = PyUnicode_AsUTF8(*pstr);

    err_msg = "Python exception: "s + py_err_msg
#ifdef DEBUG
      + msg
#endif
      ;
  } else {
    err_msg = "Unknown Python error: "s;
  }
}

// This is a destructive operation
Napi::Error PythonException::ToJS(Napi::Env env) {
  auto error_object = Napi::Error::New(env, err_msg);
  if (*trace != nullptr) {
    auto type_object = PyObjectWrap::New(env, std::move(type));
    auto value_object = PyObjectWrap::New(env, std::move(value));
    auto trace_object = PyObjectWrap::New(env, std::move(trace));
    error_object.Set("pythonType", type_object);
    error_object.Set("pythonValue", value_object);
    error_object.Set("pythonTrace", trace_object);
  }
  return error_object;
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
  raw->js_fn = new FunctionReference(Persistent(js_fn));
  raw->js_tsfn = new ThreadSafeFunction(ThreadSafeFunction::New(env, js_fn, "pymport.js_function", 0, 1));
  // Sometimes V8 won't destroy some objects - so these TSFN should not block the event loop's exit
  raw->js_tsfn->Unref(env);

  auto context = env.GetInstanceData<EnvContext>();
  context->tsfn_store.insert(raw->js_tsfn);

  return trampoline;
}

Value PyObjectWrap::Functor(const CallbackInfo &info) {
  PyGILGuard pyGilGuard;
  Napi::Env env = info.Env();

  auto fn = NAPI_ARG_FUNC(0);
  PyStrongRef obj = NewJSFunction(fn);
  EXCEPTION_CHECK(env, obj);
  return New(env, std::move(obj));
}
