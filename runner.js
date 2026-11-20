const pyodideRoot = 'https://cdn.jsdelivr.net/pyodide/v0.29.4/full/';
const send = self.postMessage.bind(self);
let python;

function writer() {
  let text = '';
  return {
    append(value) {
      if (text.length + value.length > 12000) throw new Error('Программа вывела слишком много данных.');
      text += value;
    },
    read: () => text
  };
}

function runJavaScript(code, input) {
  const output = writer();
  const lines = input.replace(/\r\n?/g, '\n').split('\n');
  let line = 0;
  const readline = () => lines[line++] ?? '';
  const print = (...args) => output.append(args.map(String).join(' ') + '\n');
  const stdin = Object.freeze({});
  const process = Object.freeze({ stdin, stdout: Object.freeze({ write: value => output.append(String(value)) }) });
  const readers = [];
  function require(name) {
    if (name === 'fs' || name === 'node:fs') return Object.freeze({
      readFileSync(fd) {
        if (fd !== 0 && fd !== '/dev/stdin') throw new Error('В редакторе можно читать только стандартный ввод.');
        return input;
      }
    });
    if (name === 'readline' || name === 'node:readline') return Object.freeze({
      createInterface(options) {
        if (options?.input !== stdin) throw new Error('Выбери process.stdin для ввода.');
        const reader = { callbacks: { line: [], close: [] }, closed: false };
        readers.push(reader);
        const api = Object.freeze({
          on(event, handler) {
            if (Object.hasOwn(reader.callbacks, event) && typeof handler === 'function') reader.callbacks[event].push(handler);
            return api;
          },
          close() { reader.closed = true; }
        });
        return api;
      }
    });
    throw new Error('В редакторе доступны чтение stdin и ограниченные модули fs и readline.');
  }
  const execute = new Function('readline', 'readAll', 'print', 'console', 'require', 'process',
    '"use strict"; return function () {\n' + code + '\n}');
  execute(readline, () => input, print, Object.freeze({ log: print, error: print, warn: print }), require, process)();
  for (const reader of readers) {
    const inputLines = lines.at(-1) === '' ? lines.slice(0, -1) : lines;
    for (const entry of inputLines) {
      if (reader.closed) break;
      for (const callback of reader.callbacks.line) callback(entry);
    }
    for (const callback of reader.callbacks.close) callback();
  }
  return output.read();
}

async function loadPython() {
  if (!python) {
    const { loadPyodide } = await import(pyodideRoot + 'pyodide.mjs');
    python = await loadPyodide({ indexURL: pyodideRoot, jsglobals: Object.create(null) });
  }
}

function runPython(code, input) {
  const output = writer();
  const dict = python.globals.get('dict');
  const globals = dict();
  dict.destroy();
  globals.set('_code', code);
  globals.set('_input', input);
  globals.set('_write', value => output.append(value));
  try {
    python.runPython(`
import contextlib, io, sys
class _Output:
    def write(self, value):
        _write(value)
        return len(value)
    def flush(self):
        pass
_previous = sys.stdin
try:
    sys.stdin = io.StringIO(_input)
    with contextlib.redirect_stdout(_Output()):
        exec(compile(_code, 'solution.py', 'exec'), {'__name__': '__main__'})
finally:
    sys.stdin = _previous
`, { globals });
    return output.read();
  } finally {
    globals.destroy();
  }
}

self.onmessage = async ({ data }) => {
  const { language, code, inputs } = data;
  try {
    if (language === 'python') await loadPython();
    send({ kind: 'ready' });
    for (let index = 0; index < inputs.length; index++) {
      const input = inputs[index];
      const output = language === 'python' ? runPython(code, input) : runJavaScript(code, input);
      send({ kind: 'case', index, output });
    }
    send({ kind: 'done' });
  } catch (error) {
    send({ kind: 'error', message: String(error.message || error).slice(0, 2000) });
  }
};
