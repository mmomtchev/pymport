#include <functional>
#include "pymport.h"
#include "pystackobject.h"
#include "values.h"

using namespace Napi;

namespace pymport {

class PympWorker : public AsyncWorker {
    public:
  PympWorker(Napi::Env, PyCallExecutor *, Promise::Deferred &);
  virtual ~PympWorker();

  virtual void Execute() override;
  virtual void OnOK() override;
  virtual void OnError(const Napi::Error &) override;

    private:
  PyCallExecutor *executor;
  PyStrongRef rval;
  Promise::Deferred promise;
  PythonException *err;
};

inline PympWorker::PympWorker(Napi::Env env, PyCallExecutor *executor, Promise::Deferred &promise)
  : AsyncWorker(env, "pymport"), executor(executor), rval(nullptr), promise(promise), err(nullptr) {
}

inline PympWorker::~PympWorker() {
  ASSERT(*rval == nullptr);
}

void PympWorker::Execute() {
  // This runs in one of the worker threads in the libuv pool
  PyGILGuard pyGilGuard;
  rval = (*executor)();
  // The executor contains PyStrongRefs and must be deleted with the GIL held
  delete executor;
  // Async exception throwing:
  // * collect the information (construct the PythonException) in the worker thread
  // * create the JS exception object when back to V8
  if (*rval == nullptr) { err = new PythonException(LINEINFO); }
}

void PympWorker::OnOK() {
  Napi::Env env = Env();
  PyGILGuard pyGILGuard;
  HandleScope scope(env);
  if (err == nullptr) {
    promise.Resolve(PyObjectWrap::New(env, std::move(rval)));
  } else {
    promise.Reject(err->ToJS(env).Value());
    delete err;
  }
}

void PympWorker::OnError(const Napi::Error &error) {
  Error::Fatal("pymport async worker onError", "failed calling Python");
}

// Asynchronous call from JavaScript to Python (the callable is this)
Value PyObjectWrap::CallAsync(const CallbackInfo &info) {
  Napi::Env env = info.Env();
  PyGILGuard pyGilGuard;
  PyCallExecutor *fn = new PyCallExecutor(CreateCallExecutor(self, info));
  auto deferred = Promise::Deferred::New(env);
  PympWorker *worker = new PympWorker(env, fn, deferred);
  worker->Queue();
  return deferred.Promise();
}

} // namespace pymport
