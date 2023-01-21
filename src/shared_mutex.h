#pragma once
#include <thread>
#include "values.h"

// Normally, C++14 should have shared_timed_mutex and C++17 should have shared_mutex
// However Apple and Google decided that these weren't so important so they left them out
// from clang/LLVM on macOS <12

class shared_mutex {
    public:
  inline shared_mutex() {
    VERBOSE(SHMX, "init shared mutex\n");
    assert(uv_rwlock_init(&mutex) == 0);
  }

  inline virtual ~shared_mutex() {
    VERBOSE(SHMX, "destroy shared mutex\n");
    uv_rwlock_destroy(&mutex);
  }

  inline void exclusive_lock() {
    VERBOSE(SHMX, "exclusive lock shared mutex - wait\n");
#ifdef DEBUG
    if (owner == std::this_thread::get_id()) {
      printf("Recursive lock\n");
      abort();
    }
#endif
    uv_rwlock_wrlock(&mutex);
#ifdef DEBUG
    owner = std::this_thread::get_id();
#endif
    VERBOSE(SHMX, "exclusive lock shared mutex - obtained\n");
  }

  inline void shared_lock() {
    VERBOSE(SHMX, "shared lock shared mutex - wait\n");
#ifdef DEBUG
    if (owner == std::this_thread::get_id()) {
      printf("Recursive lock\n");
      abort();
    }
#endif
    uv_rwlock_rdlock(&mutex);
#ifdef DEBUG
    owner = std::this_thread::get_id();
#endif
    VERBOSE(SHMX, "shared lock shared mutex - obtained\n");
  }

  inline void exclusive_unlock() {
#ifdef DEBUG
    owner = std::thread::id();
#endif
    VERBOSE(SHMX, "exclusive unlock shared mutex\n");
    uv_rwlock_wrunlock(&mutex);
  }

  inline void shared_unlock() {
#ifdef DEBUG
    owner = std::thread::id();
#endif
    VERBOSE(SHMX, "shared unlock shared mutex\n");
    uv_rwlock_rdunlock(&mutex);
  }

    private:
  uv_rwlock_t mutex;
#ifdef DEBUG
  std::thread::id owner;
#endif
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
