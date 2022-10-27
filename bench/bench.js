const fs = require('fs');

const bench = fs.readdirSync(__dirname).filter((file) => file.match(/\.bench\.js$/));

process.env['PYTHONPATH'] = __dirname;

(async () => {
  for (const size of [2, 16, 64, 128])
    for (const b of bench) {
      console.log(`${b}`);
      // eslint-disable-next-line no-await-in-loop
      await require(`${__dirname}/${b}`)(size);
      console.log(`\n\n`);
    }
})();
