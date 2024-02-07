#include <locale>
#include <codecvt>
#include <string>
#include <sstream>
#include <iomanip>

#include "pymport.h"
#include "values.h"
#include "memview.h"

#define _SILENCE_CXX17_CODECVT_HEADER_DEPRECATION_WARNING

using namespace Napi;
using namespace pymport;
using namespace std::string_literals;

#define STR(s) __STR(s)
#define __STR(x) #x ""

shared_mutex pymport::init_and_shutdown_mutex;
size_t pymport::active_environments = 0;
// There is one V8 main thread per environment (EnvContext) and only one main Python thread (main.cc)
PyThreadState *py_main;

std::string to_hex(long number) {
  std::stringstream r;
  r << std::hex << number;
  return r.str();
}

Value Version(const CallbackInfo &info) {
  Env env = info.Env();
  PyGILGuard pyGilGuard;
  Object versionInfo = Object::New(env);

  Object pymportVersion = Object::New(env);
  versionInfo.Set("pymport", pymportVersion);
  pymportVersion.Set("major", Number::New(env, PYMPORT_VERSION_MAJOR));
  pymportVersion.Set("minor", Number::New(env, PYMPORT_VERSION_MINOR));
  pymportVersion.Set("patch", Number::New(env, PYMPORT_VERSION_PATCH));
  pymportVersion.Set("suffix", String::New(env, STR(PYMPORT_VERSION_SUFFIX)));

#ifdef BUILTIN_PYTHON_PATH
  bool builtin = true;
#else
  bool builtin = false;
#endif
  Object pythonLibrary = Object::New(env);
  versionInfo.Set("pythonLibrary", pythonLibrary);
  pythonLibrary.Set("builtin", Boolean::New(env, builtin));
  pythonLibrary.Set("major", Number::New(env, PY_MAJOR_VERSION));
  pythonLibrary.Set("minor", Number::New(env, PY_MINOR_VERSION));
  pythonLibrary.Set("micro", Number::New(env, PY_MICRO_VERSION));
  pythonLibrary.Set("release", Number::New(env, PY_RELEASE_LEVEL));
  pythonLibrary.Set("serial", Number::New(env, PY_RELEASE_SERIAL));
  pythonLibrary.Set("version", String::New(env, to_hex(PY_VERSION_HEX)));

#if PY_MAJOR_VERSION > 3 || (PY_MAJOR_VERSION == 3 && PY_MINOR_VERSION >= 11)
  versionInfo.Set("pythonRuntime", String::New(env, to_hex(Py_Version)));
#else
  versionInfo.Set("pythonRuntime", env.Null());
#endif

  std::wstring_convert<std::codecvt_utf8_utf16<wchar_t>> converter;
  auto pyHomeWide = Py_GetPythonHome();
  if (pyHomeWide != nullptr) {
    std::string pyHome = converter.to_bytes(pyHomeWide);
    versionInfo.Set("pythonHome", String::New(env, pyHome.c_str()));
  } else {
    versionInfo.Set("pythonHome", env.Null());
  }

  return versionInfo;
}

// Runs the queue of V8 tasks scheduled from Python contexts
static void RunInV8Context(uv_async_t *async) {
  auto context = reinterpret_cast<EnvContext *>(async->data);
  VERBOSE(CALL, "RunInV8Context, queue length %d\n", static_cast<int>(context->v8_queue.jobs.size()));
  // As the lambdas are very light, it is better to not release the lock at all
  std::lock_guard<std::mutex> lock(context->v8_queue.lock);
  while (!context->v8_queue.jobs.empty()) {
    context->v8_queue.jobs.front()();
    context->v8_queue.jobs.pop();
  }
  uv_unref(reinterpret_cast<uv_handle_t *>(context->v8_queue.handle));
}

extern void MemInit();

#ifdef DEBUG

#define V(X) STR(X)
const char *debug_opt_names[] = {DEBUG_OPTS(V)};
#undef V
#define V(X) false
bool debug_opt_enabled[] = {DEBUG_OPTS(V)};
#undef V

static bool debug_init = false;
static void InitDebug() {
  if (debug_init) return;
  debug_init = true;
  for (size_t i = 0; i < sizeof(debug_opt_names) / sizeof(debug_opt_names[0]); i++) {
    if (std::getenv(("PYMPORT_DEBUG_"s + debug_opt_names[i]).c_str())) {
      printf("%s debug enabled\n", debug_opt_names[i]);
      debug_opt_enabled[i] = true;
    }
  }
}
#endif

static Napi::Object PympInit(Env env, Object exports) {
#ifdef DEBUG
  InitDebug();
#endif
  exclusive_guard lock(init_and_shutdown_mutex);
  Function pyObjCons = PyObjectWrap::GetClass(env);

  exports.Set("PyObject", pyObjCons);
  exports.Set("pymport", Function::New(env, PyObjectWrap::Import));
  exports.Set("pyval", Function::New(env, PyObjectWrap::Eval));
  exports.DefineProperty(PropertyDescriptor::Accessor<Version>("version", napi_enumerable));

  auto context = new EnvContext();
  context->pyObj = new FunctionReference();
  *context->pyObj = Persistent(pyObjCons);
  context->v8_main = std::this_thread::get_id();
  context->v8_queue.handle = new uv_async_t;

  uv_loop_t *event_loop;
  napi_status r = napi_get_uv_event_loop(env, &event_loop);
  if (r != napi_ok) throw Error::New(env, "Failed retrieving libuv event loop");
  if (uv_async_init(event_loop, context->v8_queue.handle, RunInV8Context) != 0)
    throw Error::New(env, "Failed initializing libuv queue");
  uv_unref(reinterpret_cast<uv_handle_t *>(context->v8_queue.handle));
  context->v8_queue.handle->data = context;
  VERBOSE(
    INIT,
    "PyGIL: Initialized new environment, V8 main thread is %lu\n",
    static_cast<unsigned long>(std::hash<std::thread::id>{}(std::this_thread::get_id())));

  env.SetInstanceData<EnvContext>(context);
  r = napi_add_async_cleanup_hook(
    env,
    [](napi_async_cleanup_hook_handle hook, void *arg) {
      auto context = reinterpret_cast<EnvContext *>(arg);
      VERBOSE(
        INIT,
        "PyGIL: Cleaning up environment, V8 main thread is %lu\n",
        static_cast<unsigned long>(std::hash<std::thread::id>{}(context->v8_main)));
      exclusive_guard lock(init_and_shutdown_mutex);

      active_environments--;
      context->pyObj->Reset();
      delete context->pyObj;

      // release all TSFNs (destruction path 2)
      for (auto const &tsfn : context->tsfn_store) { tsfn->Release(); }
      context->tsfn_store.clear();

      // abuse the data pointer to send the async hook
      context->v8_queue.handle->data = hook;
      uv_close(reinterpret_cast<uv_handle_t *>(context->v8_queue.handle), [](uv_handle_t *handle) {
        VERBOSE(
          INIT,
          "Finalizing the finalizer (%lu)...\n",
          static_cast<unsigned long>(std::hash<std::thread::id>{}(std::this_thread::get_id())));
        exclusive_guard lock(init_and_shutdown_mutex);

        auto hook = reinterpret_cast<napi_async_cleanup_hook_handle>(handle->data);
        delete reinterpret_cast<uv_async_t *>(handle);
        napi_status r = napi_remove_async_cleanup_hook(hook);
        if (r != napi_ok) {
          printf("Failed to unload the environment\n");
#ifdef DEBUG
          abort();
#endif
        }
      });
      // This is complicated because of
      // https://github.com/nodejs/node/issues/45088
      if (active_environments == 0) {
        VERBOSE(INIT, "Shutting down Python\n");
        PyEval_RestoreThread(py_main);
        Py_Finalize();
      }
      // context will be deleted by the NAPI Finalizer
    },
    context,
    nullptr);
  if (r != napi_ok) { throw Error::New(env, "Failed registering a cleanup hook"); }
  if (active_environments == 0 && !Py_IsInitialized()) {
    PyConfig config;

    VERBOSE(INIT, "Bootstrapping Python\n");
    PyConfig_InitPythonConfig(&config);
#ifdef BUILTIN_PYTHON_PATH
    auto pathPymport = std::getenv("PYMPORTPATH");
    auto homePython = std::getenv("PYTHONHOME");
    if (homePython == nullptr) {
      std::wstring wstr;
      if (pathPymport == nullptr) {
        wstr = BUILTIN_PYTHON_PATH;
      } else {
        std::wstring_convert<std::codecvt_utf8_utf16<wchar_t>> converter;
        wstr = converter.from_bytes(pathPymport);
      }
      auto python_home = reinterpret_cast<wchar_t *>(malloc(sizeof(wchar_t) * (wstr.size() + 1)));
      memcpy(python_home, wstr.c_str(), wstr.size() * sizeof(wchar_t));
      python_home[wstr.size()] = 0;
      config.home = python_home;
    }
#endif
    auto status = Py_InitializeFromConfig(&config);
    PyConfig_Clear(&config);
    if (PyStatus_Exception(status)) {
      throw Error::New(env, "Failed initializing Python: "s + std::string{status.err_msg});
    }
    memview::Init();
    PyObjectWrap::InitJSTrampoline();
    py_main = PyEval_SaveThread();
  }
  active_environments++;
  return exports;
}

NODE_API_MODULE(pymport, PympInit)
