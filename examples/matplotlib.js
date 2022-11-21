// Example from
// https://matplotlib.org/stable/gallery/lines_bars_and_markers/bar_colors.html#sphx-glr-gallery-lines-bars-and-markers-bar-colors-py
const { pymport } = require('../proxified');

const plt = pymport('matplotlib.pyplot');

const plots = plt.subplots();
const ax = plots.item(1);

const fruits = ['apple', 'blueberry', 'cherry', 'orange'];
const counts = [40, 100, 30, 55];
const bar_labels = ['red', 'blue', '_red', 'orange'];
const bar_colors = ['tab:red', 'tab:blue', 'tab:red', 'tab:orange'];

ax.bar(fruits, counts, { label: bar_labels, color: bar_colors });

ax.set_ylabel('fruit supply');
ax.set_title('Fruit supply by kind and color');
ax.legend({ title: 'Fruit color' });

plt.show();

/*
Original Python code

import matplotlib.pyplot as plt

fig, ax = plt.subplots()

fruits = ['apple', 'blueberry', 'cherry', 'orange']
counts = [40, 100, 30, 55]
bar_labels = ['red', 'blue', '_red', 'orange']
bar_colors = ['tab:red', 'tab:blue', 'tab:red', 'tab:orange']

ax.bar(fruits, counts, label=bar_labels, color=bar_colors)

ax.set_ylabel('fruit supply')
ax.set_title('Fruit supply by kind and color')
ax.legend(title='Fruit color')

plt.show()

*/