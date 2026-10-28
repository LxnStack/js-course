---
id: 18
title: 实战：写一个待办清单
summary: 从需求拆解到五个可运行版本，把表单、事件委托、筛选与 localStorage 组装成一个刷新不丢的待办清单。
minutes: 48
keywords: 实战 待办清单 Todo 状态与渲染 事件委托 data-id 筛选 localStorage 持久化
---

> 前面 17 章你学的都是零件：变量、数组、函数、DOM、事件、存储。这一章把它们装成一台能用的机器。
>
> 我们要做一个待办清单：能添加、能删除、能勾选完成、能筛选、能计数、刷新后不丢。功能不多，但它包含了几乎所有网页应用的核心循环——先改数据，再画界面。
>
> 这一章分 5 步，每一步都给一份完整可运行的代码。写完一步就跑一次，看到效果再走下一步。第 19 章会把这份代码搬进工程化的项目里。

## 为什么需要它

你已经能看懂 `map`，会绑 `click`，也知道 `localStorage` 怎么读写。可当有人对你说「做一个待办清单」时，卡住的地方通常不是语法，而是三个问题：

- 不知道该从哪一行开始写
- 界面和数据各改各的，最后一个对不上
- 功能越加越多，改一处坏三处

先看一个最直觉的写法：

```js
addBtn.addEventListener('click', () => {
  const li = document.createElement('li');
  li.textContent = input.value;
  listEl.append(li);
});
```

这段代码能跑，点一下真的多出一行。但它只把内容画到了页面上，没有留下数据。接下来你会发现：删除时要根据 DOM 反推是哪一条，很难；筛选时要遍历 DOM 读文字，很别扭；刷新后页面空了，因为内存里根本没有一份「待办列表」。

问题不在 DOM，而在顺序：**应该先有一份数据，再根据数据画界面**。这一章就是把这件事练成肌肉记忆。

先把需求拆成六条，每条都能单独验收：

| 需求 | 用户看到的效果 | 用到前面哪一章 |
| --- | --- | --- |
| 新增 | 输入文字，回车或点按钮，列表多一条 | 第 15 章的表单 |
| 删除 | 点「删除」，只消失那一条 | 第 15 章的事件委托 |
| 切换完成 | 勾选后文字划掉，取消后恢复 | 第 15 章的 `classList` |
| 筛选 | 全部 / 未完成 / 已完成 三个视图 | 第 6 章的 `filter` |
| 计数 | 显示还剩几项 | 第 6 章的 `filter` 加 `length` |
| 持久化 | 刷新、关掉再打开，数据还在 | 第 16 章的 `localStorage` |

前五条只需要一个数组，第六条只需要在每次改动后写一次存储。听起来不难，真正容易出错的是「每次」这两个字：漏掉一处，用户就会遇到「明明勾了，刷新又变回去」。

## 三个文件，各管一件事

先把项目建成三个文件：

```text
todo-app/
├── index.html    # 结构
├── style.css     # 外观
└── app.js        # 数据与交互
```

| 文件 | 负责 | 不该出现 |
| --- | --- | --- |
| `index.html` | 页面骨架：表单、筛选按钮、列表容器 | 大段样式、业务逻辑 |
| `style.css` | 颜色、间距、完成态的下划线 | 数据、事件 |
| `app.js` | 数据、渲染、事件处理 | 手写的颜色和字号 |

分开不是为了「看起来专业」。真实收益是：调样式时不用在一堆 JS 里翻找；逻辑出问题时只看一个文件；第 19 章把它们拆成模块时，边界已经清楚。

### HTML：骨架里只放容器

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>待办清单</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main class="app">
    <h1>我的待办</h1>

    <form id="todo-form">
      <input id="todo-input" type="text" placeholder="今天要做什么？" autocomplete="off">
      <button type="submit">添加</button>
    </form>

    <div class="toolbar">
      <div class="filters">
        <button type="button" data-filter="all" class="is-active">全部</button>
        <button type="button" data-filter="active">未完成</button>
        <button type="button" data-filter="done">已完成</button>
      </div>
      <span id="count"></span>
    </div>

    <ul id="todo-list"></ul>
    <p id="empty" hidden>还没有待办，先加一条。</p>
  </main>

  <script src="app.js" defer></script>
</body>
</html>
```

几个容易漏的点：

- 用 `form` 包住输入框和按钮，这样按回车和点按钮都会触发同一个 `submit` 事件
- 筛选按钮写 `type="button"`，否则它们会被当成提交按钮
- 列表容器 `ul` 一开始是空的，内容全部由 JS 生成
- `p#empty` 带 `hidden`，显示与否交给 JS 判断
- `script` 加 `defer`，保证执行时 DOM 已经解析完（第 15 章讲过）

### CSS：只写外观，不做逻辑

```css
* { box-sizing: border-box; }

body {
  margin: 0;
  padding: 24px 16px;
  font-family: system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
  background: #f5f6f8;
  color: #222;
}

.app { max-width: 520px; margin: 0 auto; }

form { display: flex; gap: 8px; }

#todo-input {
  flex: 1;
  padding: 10px 12px;
  font-size: 16px;
  border: 1px solid #ccd;
  border-radius: 8px;
}

button { cursor: pointer; }

#todo-form button {
  padding: 10px 18px;
  font-size: 16px;
  border: 0;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 16px 0 8px;
}

.filters button {
  padding: 4px 10px;
  font-size: 14px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: #555;
}

.filters button.is-active {
  border-color: #2563eb;
  color: #2563eb;
}

#todo-list { padding: 0; margin: 0; list-style: none; }

.todo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  margin-bottom: 8px;
  background: #fff;
  border-radius: 8px;
}

.todo.done .todo-text {
  color: #999;
  text-decoration: line-through;
}

.todo-text { flex: 1; word-break: break-all; }

.todo-del {
  border: 0;
  background: transparent;
  color: #c00;
  font-size: 14px;
}
```

重点只有两处：`.todo.done .todo-text` 负责完成态的划线和灰字，`.filters button.is-active` 负责当前筛选的高亮。JS 只加 `done` 和 `is-active` 这两个 class，具体长什么样全交给 CSS——这就是第 15 章说的「优先切 class」。

### 怎么打开：走本地服务器

```bash
# 在 todo-app 目录执行，任选一种
npx serve .

# 或者用 VS Code 的 Live Server 插件，右键 index.html 选 Open with Live Server
```

双击 `index.html` 也能看到页面，但第 16 章讲过：`file://` 下源是 `null`，`localStorage` 的行为不稳定，请求也发不出去。用上面的方式打开，地址变成 `http://localhost:...`，后面加持久化时不会遇到怪问题。

## 数据结构：一个数组装下所有待办

动手写逻辑前，先决定数据长什么样。这一步比写 HTML 重要得多：

```js
let todos = [
  {
    id: 1729999999999,
    text: '读第 18 章',
    done: false,
    createdAt: 1729999999999,
  },
];
```

为什么是「数组里放对象」：

- **数组**保证顺序，也能直接用 `filter`、`map`、`find`（第 6 章）
- **对象**把一条待办的属性绑在一起，不会出现「文字和状态分两个数组、下标错位」
- **`id`** 给每条一个稳定标识，删除和勾选都靠它，不靠下标
- **`createdAt`** 现在只用来排序，以后加「按时间排序」「显示创建日期」都靠它
- **`done`** 用布尔值，不用 `0` / `1` 或字符串，条件判断最直接

| 字段 | 类型 | 作用 | 能不能省 |
| --- | --- | --- | --- |
| `id` | number | 唯一标识，删除、勾选时定位 | 不能省 |
| `text` | string | 显示的内容 | 不能省 |
| `done` | boolean | 是否完成 | 不能省 |
| `createdAt` | number | 创建时间戳，排序用 | 可以省，但建议留 |

为什么不用下标当 `id`？因为删除会让后面的下标整体前移。第 3 条删掉后，原来的第 4 条变成第 3 条，你按「下标 3」去勾选，勾到的是别人。

:::warn
这里用 `let todos` 而不是 `const`，是因为删除时我们会整体替换：

```js
todos = todos.filter((todo) => todo.id !== id);
```

用 `const` 也能通过 `splice` 改内容（第 2 章讲过 `const` 不冻结内容），但「整体替换」写起来更不容易出错，读代码时一眼就能看出这是一份新列表。
:::

## 状态与渲染分离

这是整章最重要的一节，也是后面所有框架的核心思想。

先看错误的写法：

```js
// 改数据，同时手动改界面
todos.push(newTodo);

const li = document.createElement('li');
li.textContent = newTodo.text;
listEl.append(li);
```

只做「添加」时它没问题。一旦加上删除和筛选，麻烦就来了：删除时你要同时 `todos.splice(...)` 和 `li.remove()`；筛选时你要记住哪些 `li` 被隐藏了；刷新时页面又空了，因为数据只活在内存里。两套状态各改各的，迟早对不上。

正确的写法只有一条规则：**先改数据，再调用 `render()` 重画**。

```js
function addTodo(text) {
  todos.unshift({
    id: Date.now(),
    text,
    done: false,
    createdAt: Date.now(),
  });

  render();
}
```

`render()` 不关心上一次画了什么，每次都清空列表、按当前的 `todos` 重新画。听起来很浪费，但浏览器处理几十条数据毫无压力，换来的是「界面永远等于数据」这个保证。

`render()` 还要遵守两条纪律：

- 只读 `todos` 和 `filter`，不修改它们
- 不在里面发请求、写存储、绑全局事件

这样它才可以被反复调用，同一份数据画出来的结果永远一样。

除了 `todos`，还有一个状态：当前筛选。它不属于数据，属于「用户现在想看哪一部分」：

```js
let todos = [];        // 数据：有哪些待办
let filter = 'all';    // 视图：现在显示哪一类
```

| 操作 | 改什么 | 之后调用 |
| --- | --- | --- |
| 添加 | `todos` | `save()` + `render()` |
| 删除 | `todos` | `save()` + `render()` |
| 勾选 | `todos` 里某条的 `done` | `save()` + `render()` |
| 切换筛选 | `filter` | 只 `render()` |

最后一行值得注意：筛选只改「看什么」，不改数据，所以不需要写存储。刷新后回到「全部」是合理的默认行为。

## 第 1 步：能添加

先只做添加。下面这份 `app.js` 是完整的，直接替换掉空文件就能跑：

```js
const form = document.querySelector('#todo-form');
const input = document.querySelector('#todo-input');
const listEl = document.querySelector('#todo-list');

let todos = [];

function render() {
  listEl.innerHTML = '';

  for (const todo of todos) {
    const li = document.createElement('li');
    li.className = 'todo';
    li.textContent = todo.text;
    listEl.append(li);
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (text === '') return;

  todos.unshift({
    id: Date.now(),
    text,
    done: false,
    createdAt: Date.now(),
  });

  input.value = '';
  input.focus();
  render();
});

render();
```

```text
输入「买牛奶」，按回车之后：

我的待办
[今天要做什么？      ] [添加]
全部  未完成  已完成

买牛奶
```

逐段看：

- `e.preventDefault()` 拦住表单的默认提交。不写这一行，页面会刷新，`todos` 立刻清空（第 15 章讲过）
- `input.value.trim()` 先去掉首尾空格，再判断是不是空字符串。只写 `if (!input.value) return` 的话，输入一个空格也能加进去
- `todos.unshift(...)` 把新待办放到数组最前面，最新的显示在最上面。想放最后就用 `push`
- `Date.now()` 生成毫秒时间戳当 `id`。同一毫秒内连续添加两次，`id` 会重复，删除时两条一起消失。日常手速基本碰不到，批量导入时要小心。现代浏览器可以用 `crypto.randomUUID()` 生成字符串 `id`
- `input.value = ''` 和 `input.focus()` 让输入框清空并保持焦点，用户可以接着输入下一条
- 最后一行的 `render()` 是启动时先画一次。现在 `todos` 是空的，所以什么也不显示

如果改用字符串 `id`，后面所有比较都要跟着改：

```js
const id = crypto.randomUUID();          // 类似 '3f2a...' 的字符串

// 读回来就直接比较，不要再 Number()
const todo = todos.find((item) => item.id === li.dataset.id);
```

:::warn
`trim()` 只去掉首尾空白，不会合并中间的空格。「买 牛奶」和「买牛奶」仍然是两条不同的待办。要不要去重、要不要忽略大小写，是产品决定，不是 `trim()` 能解决的。
:::

## 第 2 步：能删除

现在每条待办要带一个删除按钮，删除时只删对应那条。`app.js` 换成完整版：

```js
const form = document.querySelector('#todo-form');
const input = document.querySelector('#todo-input');
const listEl = document.querySelector('#todo-list');

let todos = [];

function render() {
  listEl.innerHTML = '';

  for (const todo of todos) {
    const li = document.createElement('li');
    li.className = 'todo';
    li.dataset.id = todo.id;

    const span = document.createElement('span');
    span.className = 'todo-text';
    span.textContent = todo.text;

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'todo-del';
    delBtn.textContent = '删除';

    li.append(span, delBtn);
    listEl.append(li);
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (text === '') return;

  todos.unshift({
    id: Date.now(),
    text,
    done: false,
    createdAt: Date.now(),
  });

  input.value = '';
  input.focus();
  render();
});

listEl.addEventListener('click', (e) => {
  const delBtn = e.target.closest('.todo-del');
  if (!delBtn) return;

  const li = delBtn.closest('.todo');
  const id = Number(li.dataset.id);

  todos = todos.filter((todo) => todo.id !== id);
  render();
});

render();
```

点「买牛奶」那一行的删除，列表里只剩其余待办，其他行不动。三个关键点：

**第一，`data-id` 存的是字符串。** `li.dataset.id = todo.id` 写进去是数字，读出来是 `'1729999999999'`。所以比较前要 `Number()`，否则 `'1' === 1` 永远是 `false`，你会遇到「怎么点都删不掉」。

**第二，用事件委托。** 列表每次 `render()` 都会重建，给每个按钮单独绑监听，旧节点的监听白绑，新节点又没绑上。把监听绑在 `listEl` 上，无论列表重建多少次都有效（第 15 章讲过）。

**第三，用 `closest` 找行。** 用户可能点到按钮里的文字，`e.target` 不一定是按钮本身。先用 `closest('.todo-del')` 找到按钮，再用 `closest('.todo')` 找到这一行，比判断 `e.target.tagName` 稳。

| `id` 的生成方式 | 类型 | 读回来 | 比较时 |
| --- | --- | --- | --- |
| `Date.now()` | number | string | `Number(li.dataset.id)` 后 `===` |
| `crypto.randomUUID()` | string | string | 直接 `===`，不要转数字 |

:::warn
不要用「第几行」当删除依据。列表顺序会变，筛选后显示的行号也对不上原数组。DOM 上只存 `id`，真正的数据永远回 `todos` 里找。
:::

## 第 3 步：能勾选完成

加上复选框，勾选时改数据里的 `done`，再让 CSS 去表现。完整版：

```js
const form = document.querySelector('#todo-form');
const input = document.querySelector('#todo-input');
const listEl = document.querySelector('#todo-list');

let todos = [];

function render() {
  listEl.innerHTML = '';

  for (const todo of todos) {
    const li = document.createElement('li');
    li.className = 'todo';
    li.dataset.id = todo.id;
    li.classList.toggle('done', todo.done);

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = todo.done;
    box.setAttribute('aria-label', '切换完成');

    const span = document.createElement('span');
    span.className = 'todo-text';
    span.textContent = todo.text;

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'todo-del';
    delBtn.textContent = '删除';

    li.append(box, span, delBtn);
    listEl.append(li);
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (text === '') return;

  todos.unshift({
    id: Date.now(),
    text,
    done: false,
    createdAt: Date.now(),
  });

  input.value = '';
  input.focus();
  render();
});

listEl.addEventListener('click', (e) => {
  const li = e.target.closest('.todo');
  if (!li) return;

  const id = Number(li.dataset.id);

  if (e.target.matches('.todo-del')) {
    todos = todos.filter((todo) => todo.id !== id);
  } else if (e.target.matches('input[type="checkbox"]')) {
    const todo = todos.find((todo) => todo.id === id);
    if (!todo) return;
    todo.done = !todo.done;
  } else {
    return;
  }

  render();
});

render();
```

```text
勾选「买牛奶」：
☑ 买牛奶  删除      ← 文字变灰、加删除线
再点一次取消，恢复黑色
```

`box.checked = todo.done` 用的是 property，不是 attribute（第 15 章讲过两者的区别）。渲染时由数据决定复选框状态，用户点击后再把新状态写回数据。

最容易犯的错是只改界面：

```js
// 错：只改 DOM，不改数据
box.addEventListener('change', () => {
  li.classList.toggle('done');
});
```

这时页面看起来正常，但 `todos` 里那条的 `done` 还是 `false`。一刷新、一筛选、一排序，界面重画，它又变回未完成。正确做法永远是先 `todo.done = !todo.done`，再 `render()`。

`li.classList.toggle('done', todo.done)` 只在渲染时按数据设置一次，第二个参数决定是加上还是去掉，不在点击时切换。这样无论用户怎么点，界面上的状态始终来自 `todos`，不会出现「看起来勾了、数据里没勾」。

## 第 4 步：能筛选、能计数

筛选不修改数据，只是决定「这一次画哪些」。再加一个计数。完整版：

```js
const form = document.querySelector('#todo-form');
const input = document.querySelector('#todo-input');
const listEl = document.querySelector('#todo-list');
const countEl = document.querySelector('#count');
const emptyEl = document.querySelector('#empty');
const filterEl = document.querySelector('.filters');

let todos = [];
let filter = 'all';

function getVisibleTodos() {
  if (filter === 'active') return todos.filter((todo) => !todo.done);
  if (filter === 'done') return todos.filter((todo) => todo.done);
  return todos;
}

function render() {
  const visible = getVisibleTodos();
  listEl.innerHTML = '';

  for (const todo of visible) {
    const li = document.createElement('li');
    li.className = 'todo';
    li.dataset.id = todo.id;
    li.classList.toggle('done', todo.done);

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = todo.done;
    box.setAttribute('aria-label', '切换完成');

    const span = document.createElement('span');
    span.className = 'todo-text';
    span.textContent = todo.text;

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'todo-del';
    delBtn.textContent = '删除';

    li.append(box, span, delBtn);
    listEl.append(li);
  }

  const left = todos.filter((todo) => !todo.done).length;
  countEl.textContent = `还剩 ${left} 项`;

  emptyEl.hidden = visible.length > 0;
  emptyEl.textContent =
    todos.length === 0 ? '还没有待办，先加一条。' : '这个筛选下没有内容。';

  for (const btn of document.querySelectorAll('[data-filter]')) {
    btn.classList.toggle('is-active', btn.dataset.filter === filter);
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (text === '') return;

  todos.unshift({
    id: Date.now(),
    text,
    done: false,
    createdAt: Date.now(),
  });

  input.value = '';
  input.focus();
  render();
});

listEl.addEventListener('click', (e) => {
  const li = e.target.closest('.todo');
  if (!li) return;

  const id = Number(li.dataset.id);

  if (e.target.matches('.todo-del')) {
    todos = todos.filter((todo) => todo.id !== id);
  } else if (e.target.matches('input[type="checkbox"]')) {
    const todo = todos.find((todo) => todo.id === id);
    if (!todo) return;
    todo.done = !todo.done;
  } else {
    return;
  }

  render();
});

filterEl.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-filter]');
  if (!btn) return;

  filter = btn.dataset.filter;
  render();
});

render();
```

```text
三条待办，其中一条已完成：
全部  未完成  已完成          还剩 2 项

切到「已完成」：
全部  未完成  [已完成]        还剩 2 项

显示 1 条，计数仍然是 2
```

几个细节：

- `getVisibleTodos()` 用 `filter()` 生成新数组，**不会改动 `todos`**
- `btn.dataset.filter` 读出来是字符串 `'all'`、`'active'`、`'done'`，正好和 `filter` 变量对上
- 计数用 `todos.filter(...)`，不是 `visible.length`。筛选到「已完成」时，剩余数量不应该跟着变成 0
- 空状态分两种：一条都没有，和当前筛选下没有。文案不同，用户才不会以为数据丢了
- 当前按钮高亮在 `render()` 里统一处理，不在点击事件里单独改。这样刷新、筛选、删除之后，高亮永远和 `filter` 一致

:::warn
筛选时不要用 `todos.splice()` 把不显示的数据删掉。那样「已完成」的数据会真的消失，切回「全部」就找不回来了。筛选只是「看一部分」，不是「删一部分」。
:::

## 第 5 步：刷新不丢

最后一步：每次改动后写进 `localStorage`，启动时读回来。完整版：

```js
const form = document.querySelector('#todo-form');
const input = document.querySelector('#todo-input');
const listEl = document.querySelector('#todo-list');
const countEl = document.querySelector('#count');
const emptyEl = document.querySelector('#empty');
const filterEl = document.querySelector('.filters');

const STORAGE_KEY = 'todos-v1';

let todos = load();
let filter = 'all';

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return [];

  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter((item) => item && typeof item.text === 'string');
  } catch (err) {
    console.warn('本地数据损坏，已重置', err);
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch (err) {
    console.warn('保存失败，可能是空间不足或浏览器禁用了本地存储', err);
  }
}

function commit() {
  save();
  render();
}

function getVisibleTodos() {
  if (filter === 'active') return todos.filter((todo) => !todo.done);
  if (filter === 'done') return todos.filter((todo) => todo.done);
  return todos;
}

function render() {
  const visible = getVisibleTodos();
  listEl.innerHTML = '';

  for (const todo of visible) {
    const li = document.createElement('li');
    li.className = 'todo';
    li.dataset.id = todo.id;
    li.classList.toggle('done', todo.done);

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = todo.done;
    box.setAttribute('aria-label', '切换完成');

    const span = document.createElement('span');
    span.className = 'todo-text';
    span.textContent = todo.text;

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'todo-del';
    delBtn.textContent = '删除';

    li.append(box, span, delBtn);
    listEl.append(li);
  }

  const left = todos.filter((todo) => !todo.done).length;
  countEl.textContent = `还剩 ${left} 项`;

  emptyEl.hidden = visible.length > 0;
  emptyEl.textContent =
    todos.length === 0 ? '还没有待办，先加一条。' : '这个筛选下没有内容。';

  for (const btn of document.querySelectorAll('[data-filter]')) {
    btn.classList.toggle('is-active', btn.dataset.filter === filter);
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (text === '') return;

  todos.unshift({
    id: Date.now(),
    text,
    done: false,
    createdAt: Date.now(),
  });

  input.value = '';
  input.focus();
  commit();
});

listEl.addEventListener('click', (e) => {
  const li = e.target.closest('.todo');
  if (!li) return;

  const id = Number(li.dataset.id);

  if (e.target.matches('.todo-del')) {
    todos = todos.filter((todo) => todo.id !== id);
  } else if (e.target.matches('input[type="checkbox"]')) {
    const todo = todos.find((todo) => todo.id === id);
    if (!todo) return;
    todo.done = !todo.done;
  } else {
    return;
  }

  commit();
});

filterEl.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-filter]');
  if (!btn) return;

  filter = btn.dataset.filter;
  render();
});

render();
```

```text
操作两条之后，Application 面板里 todos-v1 的值：

[{"id":1729999999999,"text":"读第 18 章","done":true,"createdAt":1729999999999},
 {"id":1729999999998,"text":"买牛奶","done":false,"createdAt":1729999999998}]
```

`load()` 在定义之前就被 `let todos = load()` 调用了。这里能成立，是因为函数声明会提升（第 9 章讲过），`STORAGE_KEY` 也已经初始化。但顺序仍然是「先常量、再调用」，别把 `STORAGE_KEY` 写到 `load()` 后面。

`load()` 做了四层容错：

- 没有数据（`raw === null`）就返回空数组，不报错
- `JSON.parse` 失败（数据被手动改坏、旧版本格式不兼容）就 `catch` 住，返回空数组
- 解析出来不是数组（比如是个对象或数字）也返回空数组
- 数组里的元素缺 `text` 或类型不对，直接过滤掉，不让坏数据进入渲染

存储键叫 `todos-v1`，不是随手起的名字。等哪天你把数据结构从「数组」改成「按日期分组的对象」，旧格式的数据就读不出来了。这时把键改成 `todos-v2`，等于换一个新抽屉，旧数据留在原地不闯祸。想保留旧数据，就在 `load()` 里判断版本再迁移。名字里带版本，是本地存储最省事的一次保险。

`save()` 也包了 `try/catch`。`localStorage` 在隐私模式、存储空间满、被浏览器策略禁用时会抛错。不包的话，一次保存失败会让整个点击回调中断，界面停在「看起来点了但没反应」。

`commit()` 把「写存储」和「重画」绑在一起，所有改数据的操作都调用它。这样漏写一次 `save()` 的风险就小很多——这就是第 16 章说的「封装」。

:::warn
不要在 `input` 事件里每敲一个字就 `save()`。`localStorage` 是同步 API，会阻塞主线程，输入会明显卡顿。只在提交、删除、勾选这种「一次操作结束」的时机写。
:::

## 两种渲染写法：createElement 与模板字符串

上面一直用 `createElement` 建节点。另一种常见写法是拼 HTML 字符串，再一次性赋给 `innerHTML`：

```js
function render() {
  const visible = getVisibleTodos();

  listEl.innerHTML = visible
    .map(
      (todo) => `
        <li class="todo ${todo.done ? 'done' : ''}" data-id="${todo.id}">
          <input type="checkbox" ${todo.done ? 'checked' : ''} aria-label="切换完成">
          <span class="todo-text">${escapeHtml(todo.text)}</span>
          <button type="button" class="todo-del">删除</button>
        </li>
      `,
    )
    .join('');

  countEl.textContent = `还剩 ${todos.filter((todo) => !todo.done).length} 项`;
}

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
```

短了很多，但多了一个必须做的事：`escapeHtml`。用户输入 `<img src=x onerror=alert(1)>` 时，如果直接插进模板字符串，浏览器会把它当 HTML 解析并执行（第 15 章讲过 XSS）。`escapeHtml` 把 `<`、`>`、`"`、`&` 换成实体，页面才会显示原文。

| 维度 | `createElement` | 模板字符串 + `innerHTML` |
| --- | --- | --- |
| 安全性 | `textContent` 默认当文本，天然安全 | 每个插值都要自己转义，漏一个就出问题 |
| 写法 | 啰嗦，一个节点五六行 | 短，结构和 HTML 一致 |
| 性能 | 直接建节点，大列表略好 | 先拼字符串再解析，几十条感觉不到 |
| 事件 | 仍然需要事件委托 | 同样需要事件委托 |
| 适合 | 用户输入多、结构会变 | 内容可信、结构固定 |

选择建议：**只要列表里有用户输入，先用 `createElement`**。等你对转义很有把握，再用模板字符串。不要用 `innerHTML +=` 在循环里追加，那会让浏览器每次都重新解析整个列表，数据一多就卡。

全量重建听起来笨，但它有一个实际好处：你不需要写「新增时插到第几行、删除时移除哪个节点、勾选时改哪个 class」这三套逻辑。只要 `todos` 是对的，界面就一定是对的。条目超过几百条、重建开始卡顿时，再考虑只更新变化的那一行，或者换用框架——那时你会带着「为什么需要它」的理解去学，而不是背 API。

## 验收清单

写完不算完成，能通过下面每一条才算：

- 输入「买牛奶」按回车，列表立刻出现一条，输入框清空，光标还在输入框里
- 输入只有空格的内容，不会产生条目
- 点某一条的「删除」，只消失那一条，其余不动
- 勾选后文字变灰并加删除线，再点一次恢复
- 切到「未完成」，只显示未完成；切到「已完成」，只显示已完成
- 当前筛选按钮高亮，切换后高亮跟着走
- 计数显示的是「所有未完成」，不随筛选变化
- 刷新页面，条目、完成状态都还在
- 输入 `<b>测试</b>`，页面上显示原文，不会变粗
- 手动把 `localStorage` 里的值改成 `{` 再刷新，页面不崩，显示空列表
- 手机宽度下不出现横向滚动

## 三个进阶方向

基础版跑通后，可以按这个顺序继续加。每加一个功能，都先问一遍：数据要加什么字段，改完之后哪一步调用 `render()`。

- **编辑**：双击文字，把 `span` 换成输入框；回车保存，Esc 取消，空内容不保存。只改 `text`，`id` 不动。难点是回车和失焦可能各触发一次保存，需要一个「正在保存」的标记，或者提交后先把输入框移除再改数据。
- **拖拽排序**：用 `dragstart`、`dragover`、`drop` 这组事件，或者给每条加一个 `order` 字段，渲染前按 `order` 排序。难点是拖拽过程中不要直接挪 DOM，松手后一次性调整数组顺序，再 `render()`。
- **截止日期**：表单加一个 `date` 输入，存成时间戳；渲染时和 `Date.now()` 比较，过期且未完成的条目加一个 `overdue` class。排序、筛选、计数都要把日期考虑进去。

## 常见误区清单

| 写法 | 结果 | 为什么 |
| --- | --- | --- |
| 只改 DOM 不改 `todos` | 刷新或筛选后恢复原样 | DOM 不是数据源，`render()` 只认 `todos` |
| 每次 `render()` 后重新给按钮绑事件 | 点一次触发两次 | 旧监听器还在，应该用事件委托 |
| 用数组下标当 `id` | 删除后勾错行 | 下标会随删除变化，`id` 必须稳定 |
| `li.dataset.id` 不转数字就 `===` | 永远删不掉 | 读出来是字符串，`'1' === 1` 为 `false` |
| 把 `filter` 的变化也存进 `localStorage` | 下次打开仍停在某个筛选 | 筛选是视图状态，不是数据 |
| 计数用 `visible.length` | 筛选后剩余数变小 | 剩余数应基于全部 `todos` |
| 筛选时 `splice` 掉不显示的数据 | 已完成的数据真的没了 | 筛选只影响渲染，不改数据 |
| `submit` 不写 `preventDefault()` | 页面刷新，数据全丢 | 表单默认提交会导航 |
| `if (!input.value) return` | 空格也能添加 | 先 `trim()` 再判断 |
| `innerHTML` 直接拼用户输入 | 可能执行任意脚本 | XSS，必须转义或用 `textContent` |
| `localStorage` 存对象不 `stringify` | 读出 `'[object Object]'` | 存储层只接受字符串 |
| 在 `input` 事件里每次 `save()` | 输入卡顿 | 同步 API 阻塞主线程 |

## 通勤自测

:::quiz 下面这段代码输出什么？
```js
const todos = [
  { id: 1, text: 'a', done: false },
  { id: 2, text: 'b', done: true },
];
const visible = todos.filter((todo) => !todo.done);
console.log(visible.length, todos.length);
```
输出 `1 2`。`filter` 返回新数组，原数组长度不变；这正是「筛选不改数据」的基础。
:::

:::quiz 下面这段代码输出什么？
```js
const el = document.createElement('li');
el.dataset.id = 42;
console.log(typeof el.dataset.id, Number(el.dataset.id));
```
输出 `string 42`。`data-*` 的值在 DOM 上永远是字符串，写进去时数字被转成了 `'42'`；比较前要 `Number()`。
:::

:::quiz 下面这段代码执行后，`todos.length` 是多少？
```js
let todos = [{ id: 1 }, { id: 1 }, { id: 2 }];
todos = todos.filter((todo) => todo.id !== 1);
console.log(todos.length);
```
输出 `1`。两个 `id` 为 1 的元素都被过滤掉了。这也是为什么 `id` 必须唯一：用 `Date.now()` 时同一毫秒内连续添加会撞 id。
:::

:::quiz 为什么推荐「先改数据，再 `render()`」，而不是点一下就直接改 DOM？
直接改 DOM 会让数据与界面变成两份真相。删除、筛选、刷新时两边对不上，而且刷新后内存里的数据并没有变。单向流程只有一个真相，`render()` 每次都按数据重画，逻辑可以推演。
:::

:::quiz 列表渲染为什么用事件委托，而不是给每个删除按钮单独绑监听？
`render()` 每次都清空并重建 `li`，旧节点和它的监听器一起消失。事件委托绑在父元素 `listEl` 上，新节点自动生效，也不用反复解绑。
:::

:::quiz 计数为什么不能用当前显示条数？
当前显示条数受 `filter` 影响。「已完成」视图下未完成数是 0，但用户真正关心的是全部未完成数量。计数要从完整的 `todos` 里算。
:::

:::quiz `localStorage` 里存着 `'{oops'`，刷新页面会发生什么？代码里哪一步救了它？
`JSON.parse` 会抛 `SyntaxError`。`load()` 里的 `try/catch` 接住这个错误，返回空数组，页面正常渲染空状态，不会白屏。如果没包 `try/catch`，脚本会在解析那一步中断，后面的 `render()` 根本不会执行。
:::

:::quiz 勾选复选框后，为什么不能只写 `li.classList.toggle('done')`？
那只改了界面，`todos` 里对应项的 `done` 没变。下一次 `render()`（筛选、删除、刷新）会按数据重画，勾选状态又回去了。必须先改 `todo.done`，再 `render()`。
:::

## 动手练习（到电脑上做）

**必做**

1. 不看正文，从零实现一遍，时间控制在两小时内。卡住时只回看对应步骤，不要整段复制。
   验收：上面「验收清单」的前 8 条全部通过；控制台没有报错。

2. 加一个「清除已完成」按钮：点击后删除所有 `done` 为 `true` 的待办，删除前用 `confirm()` 确认一次。当前筛选是「已完成」时，清空后要显示空状态。
   验收：没有已完成项时按钮不可点或点击无效果；清除后计数正确；`localStorage` 里的数据同步更新；刷新后不会复活。

3. 把第 5 步的 `createElement` 渲染改成模板字符串加 `escapeHtml`，其余逻辑不变。
   验收：添加 `<b>测试</b>` 和 `<img src=x onerror=alert(1)>` 都只显示原文；删除、勾选、筛选、持久化全部正常。

**进阶**

4. 双击文字进入编辑：把 `span` 换成输入框，回车保存、Esc 取消、失焦保存。空内容不保存，恢复原来的文字。
   验收：编辑后刷新仍是新文字；空值不会把待办清空；编辑一条时其他条不受影响；`id` 不变。

5. 给每条加截止日期：表单里加一个 `date` 输入框，存成时间戳；列表按截止日期从近到远排序；过期且未完成的条目标红。
   验收：日期能正确存入和读出；没有日期的排在最后；跨天后过期状态自动正确；刷新后排序和颜色都保留。

:::tip
这一章写完，你已经走过了一个应用完整的生命周期：想清楚数据、画出来、响应操作、记住状态。第 19 章不会再教你新功能，而是把这三个文件变成一个有目录、有命令、有版本记录、能部署上线的项目——同样的代码，换一种组织方式，就从「练手」变成「作品」。

如果现在只能记住一句话，记这句：**任何操作都先改数据，再 `render()`**。后面的 Vue、React，本质上都在替你做这件事。
:::
