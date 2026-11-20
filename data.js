export const labels = {
  languages: { python: 'Python', javascript: 'JavaScript' },
  levels: { beginner: 'Начальная', intermediate: 'Средняя', advanced: 'Продвинутая' }
};

const demos = {
  beginner: {
    title: 'Сумма двух чисел', topic: 'Ввод, переменные и числа',
    statement: 'Введи два целых числа и выведи их сумму. Числа могут быть положительными, отрицательными или нулём.',
    inputFormat: 'Одна строка с двумя целыми числами a и b через пробел (−1000 ≤ a, b ≤ 1000).',
    outputFormat: 'Одно целое число — сумма a и b.',
    hint: 'Раздели входную строку по пробелам и преобразуй обе части в числа перед сложением.',
    explanation: 'Прочитай строку, разбей её на две части, преобразуй части в числа и выведи сумму.',
    tests: [
      { input: '3 7', output: '10' }, { input: '-8 2', output: '-6' },
      { input: '0 0', output: '0' }, { input: '-1000 1000', output: '0' }
    ],
    code: {
      python: 'a, b = map(int, input().split())\nprint(a + b)\n',
      javascript: 'const [a, b] = readline().trim().split(/\\s+/).map(Number);\nconsole.log(a + b);\n'
    },
    quiz: [
      { question: 'Что должно появиться в выводе для ввода −4 9?', choices: ['13', '5', '−5'], correct: 1, explanation: 'Если к −4 прибавить 9, получится 5.' },
      { question: 'Почему части входной строки нужно преобразовать в числа?', choices: ['Строки могут склеиться при сложении', 'Пробелы нужно удалить из ответа', 'Иначе числа всегда будут отрицательными'], correct: 0, explanation: 'Например, сложение строк «3» и «7» даёт «37», а сумма чисел равна 10.' },
      { question: 'Какой тест проверяет, что противоположные числа дают ноль?', choices: ['2 3', '0 4', '−5 5'], correct: 2, explanation: 'Числа −5 и 5 противоположны, поэтому их сумма равна нулю.' }
    ]
  },
  intermediate: {
    title: 'Первое повторение', topic: 'Циклы и множества',
    statement: 'Просмотри числа слева направо. Выведи первое число, которое встретилось повторно. Если повторов нет, выведи NONE.',
    inputFormat: 'Первая строка — количество чисел n (1 ≤ n ≤ 1000). Вторая строка — n целых чисел через пробел (от −1000 до 1000).',
    outputFormat: 'Первое число, встретившееся повторно, или строка NONE.',
    hint: 'Держи множество уже просмотренных чисел. Проверь каждое число перед добавлением.',
    explanation: 'Множество отвечает, встречалось ли число раньше. Как только найдёшь повтор, заверши цикл.',
    tests: [
      { input: '5\n7 3 3 7 11', output: '3' }, { input: '4\n1 2 3 4', output: 'NONE' },
      { input: '3\n-2 -2 0', output: '-2' }, { input: '1\n5', output: 'NONE' }
    ],
    code: {
      python: 'n = int(input())\nseen = set()\nfor number in map(int, input().split()):\n    if number in seen:\n        print(number)\n        break\n    seen.add(number)\nelse:\n    print("NONE")\n',
      javascript: 'const n = Number(readline());\nconst numbers = readline().trim().split(/\\s+/).map(Number);\nconst seen = new Set();\nlet answer = "NONE";\nfor (const number of numbers) {\n    if (seen.has(number)) {\n        answer = number;\n        break;\n    }\n    seen.add(number);\n}\nconsole.log(answer);\n'
    },
    quiz: [
      { question: 'Какое число первым повторится в списке 4 9 9 4?', choices: ['4', '9', 'Повторов нет'], correct: 1, explanation: 'На третьей позиции число 9 встречается второй раз. Число 4 повторяется позже.' },
      { question: 'Какую операцию нужно выполнить перед добавлением числа в множество?', choices: ['Сортировку множества', 'Удаление первого числа', 'Проверку наличия числа'], correct: 2, explanation: 'Проверка наличия показывает, видел ли алгоритм это число раньше.' },
      { question: 'Какой ответ ожидается для одного числа 7?', choices: ['NONE', '7', '0'], correct: 0, explanation: 'В списке из одного элемента повторов быть не может.' }
    ]
  },
  advanced: {
    title: 'Кратчайший путь по карте', topic: 'Поиск в ширину',
    statement: 'На прямоугольной карте S — старт, F — финиш, . — свободная клетка, # — стена. Из клетки можно перейти в соседнюю по вертикали или горизонтали. Найди минимальное число шагов от S до F.',
    inputFormat: 'Первая строка — высота h и ширина w (1 ≤ h, w ≤ 30, h × w ≥ 2). Далее h строк длины w. На карте ровно один S и один F.',
    outputFormat: 'Минимальное число шагов или −1, если пути нет.',
    hint: 'Обходи карту слоями: сначала клетки на расстоянии 1, затем на расстоянии 2. Храни ещё не обработанные клетки в очереди.',
    explanation: 'Поиск в ширину обходит клетки по возрастанию расстояния. Помечай клетки при добавлении в очередь, чтобы не посещать их повторно.',
    tests: [
      { input: '3 4\nS.#.\n..#.\n...F', output: '5' },
      { input: '2 2\nS#\n#F', output: '-1' },
      { input: '1 2\nSF', output: '1' },
      { input: '2 4\nS#F.\n....', output: '4' }
    ],
    code: {
      python: 'from collections import deque\nh, w = map(int, input().split())\ngrid = [input() for _ in range(h)]\nstart = next((r, c) for r in range(h) for c in range(w) if grid[r][c] == "S")\nqueue = deque([(*start, 0)])\nseen = {start}\nanswer = -1\nwhile queue:\n    r, c, dist = queue.popleft()\n    if grid[r][c] == "F":\n        answer = dist\n        break\n    for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):\n        nr, nc = r + dr, c + dc\n        if 0 <= nr < h and 0 <= nc < w and grid[nr][nc] != "#" and (nr, nc) not in seen:\n            seen.add((nr, nc))\n            queue.append((nr, nc, dist + 1))\nprint(answer)\n',
      javascript: 'const [h, w] = readline().split(" ").map(Number);\nconst grid = Array.from({length: h}, () => readline());\nconst row = grid.findIndex(line => line.includes("S"));\nconst col = grid[row].indexOf("S");\nconst queue = [[row, col, 0]];\nconst seen = new Set([row * w + col]);\nlet answer = -1;\nfor (let i = 0; i < queue.length; i++) {\n    const [r, c, dist] = queue[i];\n    if (grid[r][c] === "F") { answer = dist; break; }\n    for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {\n        const nr = r + dr, nc = c + dc, key = nr * w + nc;\n        if (nr >= 0 && nr < h && nc >= 0 && nc < w && grid[nr][nc] !== "#" && !seen.has(key)) {\n            seen.add(key);\n            queue.push([nr, nc, dist + 1]);\n        }\n    }\n}\nconsole.log(answer);\n'
    },
    quiz: [
      { question: 'Какая структура помогает обрабатывать клетки по расстоянию?', choices: ['Стек', 'Очередь FIFO', 'Отсортированный список символов'], correct: 1, explanation: 'Очередь извлекает сначала те клетки, которые были добавлены раньше.' },
      { question: 'Когда лучше пометить клетку посещённой?', choices: ['Когда кладём её в очередь', 'Когда обработали всю карту', 'Только при встрече финиша'], correct: 0, explanation: 'Тогда соседние клетки не успеют добавить её в очередь повторно.' },
      { question: 'Какое расстояние у стартовой клетки?', choices: ['−1', '1', '0'], correct: 2, explanation: 'Чтобы попасть из S в S, не нужно делать шагов.' }
    ]
  }
};

export function demoTask(language, level) {
  const { code, ...demo } = demos[level];
  return { ...demo, reference: code[language], id: `demo-${language}-${level}`, type: 'demo' };
}

export function sameOutput(actual, expected) {
  const normalize = value => value.replace(/\r\n?/g, '\n').trim().split(/\s+/).join(' ');
  return normalize(actual) === normalize(expected);
}
