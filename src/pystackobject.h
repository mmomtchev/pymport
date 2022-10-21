#pragma once
#include <Python.h>

// This is a simple RAII guard around a PyObject* with
// automatic deallocation (ie a stack-allocated PyObject)
class PyStackObject {
  PyObject *self;

    public:
  PyStackObject(PyObject *v) : self(v){};
  virtual ~PyStackObject() {
    if (self != nullptr) Py_DECREF(self);
  }
  operator PyObject *() {
    return self;
  }
  PyObject *operator*() {
    return self;
  }
};
