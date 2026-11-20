import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';

const file = name => new URL(name, import.meta.url);
export async function loadAssets() {
  return Object.fromEntries(await Promise.all([
    ['/', 'text/html; charset=utf-8', 'index.html'],
    ['/styles.css', 'text/css; charset=utf-8', 'styles.css'],
    ['/app.js', 'text/javascript; charset=utf-8', 'app.js'],
    ['/data.js', 'text/javascript; charset=utf-8', 'data.js'],
    ['/runner/javascript.js', 'text/javascript; charset=utf-8', 'runner.js', 'javascript'],
    ['/runner/python.js', 'text/javascript; charset=utf-8', 'runner.js', 'python']
  ].map(async ([path, mime, filename, runner]) =>
    [path, [mime, await readFile(file(filename), 'utf8'), runner]])));
}

if (process.argv.includes('--build')) {
  const assets = await loadAssets();
  const server = await readFile(file('server.mjs'), 'utf8');
  await mkdir(file('dist/server/'), { recursive: true });
  await writeFile(file('dist/server/index.js'), `${server}\nexport default createApp(${JSON.stringify(assets)});\n`);
  try {
    await mkdir(file('dist/.openai/'), { recursive: true });
    await copyFile(file('.openai/hosting.json'), file('dist/.openai/hosting.json'));
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  console.log('Готово: dist/server/index.js');
}
