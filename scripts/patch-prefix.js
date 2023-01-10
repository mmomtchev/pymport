const fs = require('fs');
const path = require('path');
const bin_dir = path.resolve(path.dirname(
  require('@mapbox/node-pre-gyp').find(path.join(__dirname, '..', 'package.json'))));

const sysconfigDataPath = path.join(bin_dir, 'lib', 'python3.10');
const sysconfigs = fs.readdirSync(sysconfigDataPath).filter((file) => file.match(/_sysconfigdata_.*py/));
for (const f of sysconfigs) {
  const original = fs.readFileSync(path.join(sysconfigDataPath, f), 'utf-8');
  const platformDir = path.basename(bin_dir);
  const re = new RegExp(`\\/[-_a-zA-Z0-9/]+\\/pymport\\/lib\\/binding\\/${platformDir}/*([-_a-z0-9/]*)`, 'g');
  const patched = original.replace(re, path.join(bin_dir, '$1'));
  fs.writeFileSync(path.join(sysconfigDataPath, f), patched);
}
