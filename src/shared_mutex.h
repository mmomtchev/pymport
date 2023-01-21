#pragma once
#include "values.h"

class shared_mutex {
    public:
  inline shared_mutex() {
    ASSERT(uv_rwlock_init(&mutex) == 0);
  }

  inline virtual ~shared_mutex() {
    uv_rwlock_destroy(&mutex);
  }

  inline void exclusive_lock() {
    uv_rwlock_wrlock(&mutex);
  }

  inline void shared_lock() {
    uv_rwlock_rdlock(&mutex);
  }

  inline void exclusive_unlock() {
    uv_rwlock_wrunlock(&mutex);
  }

  inline void shared_unlock() {
    uv_rwlock_rdunlock(&mutex);
  }

    private:
  uv_rwlock_t mutex;
};

class shared_guard {
    public:
  inline shared_guard(shared_mutex &lock) : lock(lock) {
    lock.shared_lock();
  }

  inline ~shared_guard() {
    lock.shared_unlock();
  }

    private:
  shared_mutex &lock;
};

class exclusive_guard {
    public:
  inline exclusive_guard(shared_mutex &lock) : lock(lock) {
    lock.exclusive_lock();
  }

  inline ~exclusive_guard() {
    lock.exclusive_unlock();
  }

    private:
  shared_mutex &lock;
};
