# Dump Python heap as JSON
# adapted from
# https://stackoverflow.com/questions/141351/how-do-i-find-what-is-using-memory-in-a-python-process-in-a-production-system
import gc
import sys
import json

def memory_dump():
  with open("python_memory_dump.json", 'w') as dump:
    xs = []
    for obj in gc.get_objects():
      i = id(obj)
      size = sys.getsizeof(obj, 0)
      refs = sys.getrefcount(obj) 
      referents = [id(o) for o in gc.get_referents(obj) if hasattr(o, '__class__')]
      if hasattr(obj, '__class__'):
        cls = str(obj.__class__)
        xs.append({'id': i, 'class': cls, 'size': size, 'refs': refs, 'referents': referents, 'text': str(obj) })
    json.dump(xs, dump)
