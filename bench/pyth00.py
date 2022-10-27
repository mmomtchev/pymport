def fn(np, size):
  i = 0
  b = 0
  while i < 100:
    a = np.matmul(np.arange(size * size * 2).reshape([size, size * 2]).T, np.arange(size * size * 2).reshape([size, size * 2]))
    b = (np.average(a) + b) / 2
    i += 1

  return b
