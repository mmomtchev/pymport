def raise_exception():
  raise Exception('test exception')

def delete_arg(arg):
  del arg

def single_dict_arg(d):
  if not isinstance(d, dict):
    raise Exception('argument is not a dict')

def catch_exception(callable):
  try:
    callable()
    return None
  except Exception as err:
    return err

def dont_catch_exception(callable):
  return callable()

def call_with_cheese(callable):
  return callable(slice(1, 2, 3))

class SomeClass:
  name = 'Python_name'
  static_member = 42

  def method():
    return None

