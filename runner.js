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
  const execute = new Function('readline', 'readAll', 'print', 'console', '"use strict";\n' + code);
  execute(readline, () => input, print, Object.freeze({ log: print, error: print, warn: print }));
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
