const fs = require('fs');

const bench = fs.readdirSync(__dirname).filter((file) => file.match(/\.bench\.js$/));

process.env['PYTHONPATH'] = __dirname;

const sizes = process.argv[2] ? process.argv[2].split(',').map(s => +s) : [2, 16, 64, 128];

(async () => {
  for (const size of sizes)
    for (const b of bench) {
      console.log(`${b}`);
      // eslint-disable-next-line no-await-in-loop
      await require(`${__dirname}/${b}`)(size);
      console.log(`\n\n`);
    }
})();
