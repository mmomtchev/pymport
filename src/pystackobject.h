#include <Python.h>

class PyStackObject {
    PyObject *self;

  public:
    PyStackObject(PyObject *v) : self(v){};
    virtual ~PyStackObject() { Py_DECREF(self); }
    operator PyObject *() { return self; }
    PyObject *operator*() { return self; }
};
