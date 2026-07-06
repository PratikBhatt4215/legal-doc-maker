const fs = require('fs');
const files = [];
function readDir(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const full = dir + '/' + item;
    if (fs.statSync(full).isDirectory()) readDir(full);
    else if (full.endsWith('.docx')) files.push(full);
  }
}
readDir('./src/app/templates');

for (const file of files) {
  const relative = file.replace(/^\.\/src\/app\/templates\//, '');
  const parts = relative.split('/');
  if (parts.length < 3) continue;
  const courtFolder = parts[1];
  console.log(relative, "=>", courtFolder);
}
