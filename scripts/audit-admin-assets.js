const fs = require('fs');
const path = require('path');

const root = process.cwd();
const textExtensions = new Set(['.html', '.js', '.json', '.md', '.toml', '.yml', '.yaml', '.ts']);
const ignoredDirs = new Set(['.git', 'node_modules']);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (textExtensions.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

const files = walk(root);
const contents = new Map(files.map(file => [file, fs.readFileSync(file, 'utf8')]));
const adminAssets = fs.readdirSync(root)
  .filter(name => /^admin-.*\.(js|html)$/.test(name))
  .sort();

const report = adminAssets.map(asset => {
  const ownPath = path.join(root, asset);
  const references = [];
  for (const [file, content] of contents) {
    if (file === ownPath) continue;
    if (content.includes(asset)) references.push(path.relative(root, file));
  }
  return { asset, references };
});

const unused = report.filter(item => item.references.length === 0);
console.log('\nADMIN ASSET USAGE\n');
for (const item of report) {
  console.log(`${item.references.length ? 'USED  ' : 'UNUSED'} ${item.asset}`);
  for (const ref of item.references) console.log(`       <- ${ref}`);
}
console.log(`\n${unused.length} unreferenced admin assets.`);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ report, unused }, null, 2));
}

const strict = !process.argv.includes('--allow-unused');
if (strict && unused.length) {
  console.error('\nRemove or explicitly reference these obsolete admin files:');
  unused.forEach(item => console.error(`- ${item.asset}`));
  process.exit(1);
}
