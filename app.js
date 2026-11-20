import { demoTask, labels, sameOutput } from './data.js';

const $ = id => document.getElementById(id);
const language = $('language');
const difficulty = $('difficulty');
const editor = $('editor');
const settings = $('settings');
const providerSelect = $('provider');
const keyPattern = /^sk-[A-Za-z0-9_-]{15,397}$/;
let task;
let provider = 'openai';
let apiKey = '';
let config = { ollama: false, openai: false };
let busy = false;
let cancelExecution;
let solved = [];
try { solved = JSON.parse(localStorage.getItem('kod-praktika.solved') || '[]'); } catch { /* Optional storage. */ }
if (!Array.isArray(solved)) solved = [];

const configured = fetch('/api/config', { signal: AbortSignal.timeout(6000) })
  .then(async response => {
    if (response.ok) config = await response.json();
    if (config.ollama && !config.openai) provider = 'ollama';
  }).catch(() => {});

function write(id, text) { $(id).textContent = text; }
function showNotice(text = '', bad = false, id = 'notice') {
  const notice = $(id);
  notice.textContent = text;
  notice.hidden = !text;
  notice.classList.toggle('bad', bad);
}
function setConsole(state, output, tone = '') {
  write('run-state', state);
  write('stdout', output);
  $('run-state').className = `tag ${tone}`;
}
function syncLines() {
  write('numbers', editor.value.split('\n').map((_, i) => i + 1).join('\n'));
  $('numbers').scrollTop = editor.scrollTop;
}
function progress() { write('progress', `Решённых задач: ${solved.length}`); }

function showTask(next) {
  task = next;
  for (const [id, value] of Object.entries({
    'task-type': task.type === 'ai' ? 'От ИИ' : 'Учебный пример',
    topic: task.topic, 'task-title': task.title, statement: task.statement,
    'input-format': task.inputFormat, 'output-format': task.outputFormat,
    'sample-in': task.tests[0].input, 'sample-out': task.tests[0].output,
    hint: task.hint, explanation: task.explanation, reference: task.reference,
    filename: language.value === 'python' ? 'solution.py' : 'solution.js',
    'quiz-topic': task.topic
  })) write(id, value);
  document.querySelectorAll('.problem details').forEach(element => { element.open = false; });
  editor.value = language.value === 'python'
    ? '# Напиши решение. Ввод — input(), вывод — print().\n'
    : '// Напиши решение. Ввод — readline(), вывод — console.log().\n';
  $('stdin').value = task.tests[0].input;
  syncLines();
  renderQuiz();
  setConsole('Ожидает запуска', 'Нажми «Запустить» для своего ввода или «Проверить» для всех тестов.');
}

function renderQuiz() {
  const fields = task.quiz.map((item, index) => {
    const field = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = `${index + 1}. ${item.question}`;
    field.append(legend);
    item.choices.forEach((choice, option) => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = `q${index}`;
      input.value = String(option);
      input.required = true;
      const text = document.createElement('span');
      text.textContent = choice;
      label.append(input, text);
      field.append(label);
    });
    const feedback = document.createElement('p');
    feedback.className = 'feedback';
    feedback.hidden = true;
    field.append(feedback);
    return field;
  });
  $('questions').replaceChildren(...fields);
  $('score').hidden = true;
  $('retry-quiz').hidden = true;
}

function showTab(quiz) {
  $('practice-tab').setAttribute('aria-pressed', String(!quiz));
  $('quiz-tab').setAttribute('aria-pressed', String(quiz));
  $('practice').hidden = quiz;
  $('quiz').hidden = !quiz;
}

function useDemo() {
  showNotice();
  showTask(demoTask(language.value, difficulty.value));
}

function lock(value, canStop = false) {
  busy = value;
  for (const id of ['generate', 'demo-button', 'language', 'difficulty', 'run', 'check']) $(id).disabled = value;
  $('stop').hidden = !value || !canStop;
}

function execute(languageId, code, inputs) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(`/runner/${languageId}.js`, { type: 'module' });
    const outputs = [];
    let timer;
    const stop = error => {
      clearTimeout(timer);
      worker.terminate();
      cancelExecution = undefined;
      if (error) reject(new Error(error));
      else resolve(outputs);
    };
    cancelExecution = () => stop('Выполнение остановлено.');
    const setLimit = (duration, error) => {
      clearTimeout(timer);
      timer = setTimeout(() => stop(error), duration);
    };
    setLimit(languageId === 'python' ? 45000 : 4000, 'Среда запуска не загрузилась. Для первого запуска Python нужен доступ к cdn.jsdelivr.net.');
    worker.onmessage = ({ data }) => {
      if (data.kind === 'ready') setLimit(3000, 'Превышено время выполнения теста. Проверь циклы и объём вычислений.');
      if (data.kind === 'case' && data.index === outputs.length && typeof data.output === 'string') {
        outputs.push(data.output.slice(0, 12000));
        setLimit(3000, 'Превышено время выполнения теста.');
      }
      if (data.kind === 'error') stop(String(data.message || 'Ошибка в программе.').slice(0, 2000));
      if (data.kind === 'done') stop(outputs.length === inputs.length ? '' : 'Среда вернула неполный результат.');
    };
    worker.onerror = () => stop('Не удалось запустить среду выполнения.');
    worker.postMessage({ language: languageId, code, inputs });
  });
}

async function trial(checkAll) {
  if (busy) return;
  const tests = checkAll ? task.tests : [{ input: $('stdin').value }];
  lock(true, true);
  setConsole('Выполняется', language.value === 'python' ? 'Запускаем Python. Первая загрузка может занять несколько секунд.' : 'Запускаем JavaScript.');
  try {
    const outputs = await execute(language.value, editor.value, tests.map(test => test.input));
    if (!checkAll) {
      setConsole('Готово', outputs[0] || '(нет вывода)', 'good');
      return;
    }
    let passed = 0;
    const rows = tests.map((test, i) => {
      if (sameOutput(outputs[i], test.output)) {
        passed++;
        return `✓ Тест ${i + 1}`;
      }
      if (i !== 0) return `✕ Тест ${i + 1} — неверный ответ`;
      return `✕ Тест 1 — неверный ответ\n  Ожидалось: ${test.output}\n  Получено: ${outputs[0] || '(нет вывода)'}`;
    });
    const allPassed = passed === tests.length;
    setConsole(`${passed} из ${tests.length}`, rows.join('\n'), allPassed ? 'good' : 'bad');
    if (allPassed && !solved.includes(task.id)) {
      solved.push(task.id);
      try { localStorage.setItem('kod-praktika.solved', JSON.stringify(solved)); } catch { /* Optional storage. */ }
      progress();
    }
  } catch (error) {
    setConsole('Ошибка запуска', error.message, 'bad');
  } finally { lock(false); }
}

function describeProvider() {
  const ollama = providerSelect.value === 'ollama';
  $('key-wrap').hidden = ollama;
  $('forget-key').hidden = ollama || !apiKey;
  write('provider-info', ollama
    ? 'Работает на локальном сервере, запущенном с OLLAMA_MODEL. Запрос отправляется в Ollama на этом компьютере.'
    : config.openai
      ? 'На сервере настроен OpenAI. При желании можно использовать свой ключ.'
      : 'Введи ключ OpenAI API. Он хранится до обновления вкладки. Запросы используют квоту твоего проекта.');
}

async function openSettings() {
  await configured;
  if (settings.open) return;
  providerSelect.value = provider;
  providerSelect.options[1].disabled = !config.ollama;
  $('api-key').value = '';
  $('api-key').placeholder = apiKey ? 'Ключ сохранён в этой вкладке' : 'sk-…';
  showNotice('', false, 'settings-error');
  describeProvider();
  settings.showModal();
}

async function newTask() {
  if (busy) return;
  lock(true);
  try {
    await configured;
    if (provider === 'openai' && !apiKey && !config.openai) {
      await openSettings();
      return;
    }
    showNotice('ИИ составляет условие, тесты и вопросы по теме…');
    const response = await fetch('/api/task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(provider === 'openai' && apiKey && { Authorization: `Bearer ${apiKey}` }) },
      body: JSON.stringify({ language: language.value, level: difficulty.value, provider, previous: task.title }),
      signal: AbortSignal.timeout(125000)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Не удалось создать задачу.');
    showNotice('Проверяем эталонное решение на всех тестах…');
    const candidate = result.task;
    const outputs = await execute(language.value, candidate.reference, candidate.tests.map(test => test.input));
    if (!candidate.tests.every((test, index) => sameOutput(outputs[index], test.output))) {
      throw new Error('ИИ вернул противоречивые тесты. Попробуй сгенерировать новую задачу.');
    }
    showTask(candidate);
    showTab(false);
    showNotice('Новая задача готова. Эталонное решение прошло тесты.');
  } catch (error) {
    showNotice(error.name === 'TimeoutError' ? 'Генерация заняла слишком много времени. Попробуй ещё раз.' : error.message, true);
  } finally { lock(false); }
}

$('practice-tab').onclick = () => showTab(false);
$('quiz-tab').onclick = () => showTab(true);
language.onchange = useDemo;
difficulty.onchange = useDemo;
$('demo-button').onclick = () => { useDemo(); showTab(false); };
$('run').onclick = () => trial(false);
$('check').onclick = () => trial(true);
$('stop').onclick = () => cancelExecution?.();
$('generate').onclick = newTask;
editor.oninput = syncLines;
editor.onscroll = () => { $('numbers').scrollTop = editor.scrollTop; };
$('quiz-form').onsubmit = event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  let score = 0;
  task.quiz.forEach((item, index) => {
    const correct = Number(data.get(`q${index}`)) === item.correct;
    if (correct) score++;
    const feedback = $('questions').children[index].querySelector('.feedback');
    feedback.classList.toggle('bad', !correct);
    feedback.textContent = `${correct ? 'Верно.' : 'Правильный ответ — ' + item.choices[item.correct] + '.'} ${item.explanation}`;
    feedback.hidden = false;
  });
  $('score').hidden = false;
  $('retry-quiz').hidden = false;
  write('score', `Результат: ${score} из ${task.quiz.length}.`);
};
$('retry-quiz').onclick = renderQuiz;
$('settings-button').onclick = openSettings;
$('close-settings').onclick = () => settings.close();
settings.onclose = () => { $('api-key').value = ''; };
providerSelect.onchange = describeProvider;
$('forget-key').onclick = () => { apiKey = ''; settings.close(); };
$('settings-form').onsubmit = event => {
  event.preventDefault();
  const value = $('api-key').value.trim();
  if (providerSelect.value === 'openai' && value && !keyPattern.test(value)) {
    showNotice('Ключ OpenAI API должен начинаться с sk-.', true, 'settings-error');
    return;
  }
  if (providerSelect.value === 'openai' && value) apiKey = value;
  provider = providerSelect.value;
  settings.close();
  showNotice('Настройки сохранены для этой вкладки.');
};

progress();
useDemo();
