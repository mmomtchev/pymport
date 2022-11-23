// JS version of the official example from https://graph-tool.skewed.de/static/doc/quickstart.html

const { pymport, PyObject } = require('../proxified');
const gt = pymport('graph_tool.all');
const np = pymport('numpy');
const pl = pymport('pylab');

const g = gt.Graph();

const v_age = g.new_vertex_property('int');
const e_age = g.new_edge_property('int');

const N = 100000;

let v = g.add_vertex();

// Every sequence/mapping in Python has a __setitem__
// equivalent to an assignment by using the [] operator
v_age.__setitem__(v, 0);

const vlist = PyObject.list([v]);

for (let i = 1; i < N; i++) {
  const v = g.add_vertex();
  v_age.__setitem__(v, i);

  const rand = np.random.randint(0, vlist.length);
  const target = vlist.item(rand);

  const e = g.add_edge(v, target);
  e_age.__setitem__(e, i);

  vlist.append(target);
  vlist.append(v);
}

v = g.vertex(np.random.randint(0, g.num_vertices()));

for (; ;) {
  console.log(`vertex: ${PyObject.int(v).toJS()}, in-degree: ${v.in_degree()}, ` +
    `out-degree: ${v.out_degree()}, age: ${v_age.item(v)}`);

  if (v.out_degree().toJS() == 0) {
    console.log('Nowhere else to go... We found the main hub!');
    break;
  }

  const n_list = PyObject.list([]);

  // v.out_neighbors() returns a Python generator object
  const it = v.out_neighbors();
  for (const w of it) {
    n_list.append(w);
  }

  v = n_list.item(np.random.randint(0, n_list.length));
}

g.vertex_properties.__setitem__('age', v_age);
g.edge_properties.__setitem__('age', e_age);

g.save('price.xml.gz');

const in_hist = gt.vertex_hist(g, 'in');

const y = in_hist.item(0);
const err = np.sqrt(y);

// Unlike Python, JavaScript does not have operator overloading meaning that
// we have to unroll all operators to their method equivalents
// including the subtraction which is between a numpy array and a scalar
// In Python we have:
// err[err >= y] = y[err >= y] - 1e-2
// Also, note that we cannot use err.item() because numpy.ndarray.item() will take precedence
err.__setitem__(err.__ge__(y), err.__getitem__(err.__ge__(y)).__sub__(1e2));

pl.figure({ figsize: [6, 4] });
pl.errorbar(in_hist.item(1).__getitem__(PyObject.slice({ stop: -1 })), in_hist.item(0), {
  fmt: 'o', yerr: err, label: 'in'
});

pl.gca().set_yscale('log');
pl.gca().set_xscale('log');
pl.gca().set_ylim(1e-1, 1e5);
pl.gca().set_xlim(0.8, 1e3);
pl.subplots_adjust({ left: 0.2, bottom: 0.2 });
pl.xlabel('$k_{in}$');
pl.ylabel('$NP(k_{in})$');
pl.tight_layout();
pl.savefig('price-deg-dist.svg');
