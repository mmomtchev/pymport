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
