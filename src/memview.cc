#include "pymport.h"
#include "pystackobject.h"
#include "values.h"
#include "memview.h"

using namespace Napi;
using namespace pymport;

// This is naturally segregated by environment
static std::map<PyObject *, Reference<Buffer<char>> *> memview_store;

// A MemView_Finalizer_Type is a Python callable type
// It is used to register a WeakRef finalizer that is called when a memview is destroyed by Python
// This also destroys the V8 Persistent Reference
// This is the only case in which the V8 GC can be blocked by the Python GC
// Called from Python context
static PyObject *MemView_Finalizer(PyObject *self, PyObject *args, PyObject *kw) {
  VERBOSE_PYOBJ(MEMV, self, "memview finalizer");

  // This is in fact a borrowed reference, but this is the counterpart to the inversion below
  PyStrongRef weak = PyTuple_GetItem(args, 0);
  ASSERT(*weak != nullptr);
  VERBOSE_PYOBJ(MEMV, *weak, "memview weak");

  auto it = memview_store.find(*weak);
  ASSERT(it != memview_store.end());
  auto v8_buffer = it->second;
  memview_store.erase(*weak);

  // Destroy the V8 Persistent Reference
  // This has to run in the V8 thread
  auto finalizer = [v8_buffer]() {
    v8_buffer->Reset();
    delete v8_buffer;
  };

  auto env = v8_buffer->Env();
  auto context = env.GetInstanceData<EnvContext>();
#ifndef DEBUG
  if (std::this_thread::get_id() == context->v8_main)
    finalizer();
  else
#endif
  {
    VERBOSE(MEMV, "memview asynchronous finalization\n");
    std::lock_guard<std::mutex> lock(context->v8_queue.lock);
    context->v8_queue.jobs.emplace(std::move(finalizer));
    assert(uv_async_send(context->v8_queue.handle) == 0);
    uv_ref(reinterpret_cast<uv_handle_t *>(context->v8_queue.handle));
  }

  Py_RETURN_NONE;
}

static PyType_Slot memview_finalizer_slots[] = {{Py_tp_call, reinterpret_cast<void *>(MemView_Finalizer)}, {0, 0}};

static PyType_Spec memview_finalizer_spec = {
  "pymport._memview_finalizer", 0, 0, Py_TPFLAGS_DEFAULT, memview_finalizer_slots};

static PyStrongRef MemView_Finalizer_Type = nullptr;

void memview::Init() {
  if (MemView_Finalizer_Type != nullptr) {
    VERBOSE(INIT, "Re-initializing MemView_Finalizer_Type (Python shutdown without dlclose)\n");
    MemView_Finalizer_Type = nullptr;
  }
  MemView_Finalizer_Type = PyType_FromSpec(&memview_finalizer_spec);

  if (MemView_Finalizer_Type == nullptr) {
    fprintf(stderr, "Error memview finalizer type\n");
    abort();
  }
}

Value PyObjectWrap::MemoryView(const CallbackInfo &info) {
  Napi::Env env = info.Env();
  PyGILGuard pyGilGuard;
  Buffer<char> buffer = NAPI_ARG_BUFFER(0);
  PyStrongRef memoryView = PyMemoryView_FromMemory(buffer.Data(), buffer.ByteLength(), PyBUF_WRITE);
  EXCEPTION_CHECK(env, memoryView);

  // Create a new instance of MemView_Finalizer_Type
  PyStrongRef args = PyTuple_New(0);
  PyStrongRef finalizer = PyObject_CallObject(*MemView_Finalizer_Type, *args);

  // Attach it as a finalizer
  // This is in fact a strong (owned) ref but we need to leave it stale
  // It is going to be deleted in the finalizer callback
  PyWeakRef weak = PyWeakref_NewRef(*memoryView, *finalizer);

  auto *persistent = new Reference<Buffer<char>>();
  *persistent = Persistent(buffer);
  memview_store.insert({*weak, persistent});

  VERBOSE_PYOBJ(MEMV, *weak, "memview register finalizer");

  return New(env, std::move(memoryView));
}
