---
id: 17
title: 错误处理与调试
summary: 读懂四类常见报错与调用栈，掌握 throw、try/catch/finally 和异步错误的处理方式，再用断点与 Network 面板把 bug 快速定位到具体一行。
minutes: 38
keywords: 错误处理 try catch finally throw Error 异常 调试 断点 Sources Network 报错
---

> 写代码的时间只占一小部分，剩下的大部分时间在找「为什么它不按我想的运行」。
>
> 这一章教你两件事：一是让错误**可控地失败**，该提示的提示、该兜底的兜底；二是让错误**可被定位**，看到一段红色报错时知道先看哪一行。
>
> 第 16 章的 `fetch` 和 `try/catch` 已经出现过，这一章把它们讲透。第 18 章的项目里，你会不断用到这里的排查流程。

## 为什么需要它

先看一个很短的脚本：

```js
console.log('开始');

const user = undefined;
console.log(user.name);

console.log('这行不会执行');
```

```text
开始
Uncaught TypeError: Cannot read properties of undefined (reading 'name')
```

第三行报错之后，第四行永远不会执行。浏览器不会「跳过这一行继续往下跑」，整个脚本就此停住。

这解释了很多「点了没反应」的现象：按钮的点击回调里，第一行取数据就报错了，后面更新界面、关闭弹窗、清空输入全都没跑到。用户看到的是「按钮坏了」，控制台里其实只有一行红字。

更隐蔽的是异步场景：一个请求失败，`catch` 里什么也没写，页面一直停在「加载中」，用户既不知道发生了什么，也不知道该不该等。

错误处理不是给代码加一堆保险，而是明确三件事：

- 哪些失败是**预期内**的（用户没填、网络断了、数据不存在），要给提示或兜底
- 哪些是**代码 bug**（读错属性、拼错方法），要让它尽快暴露，而不是被吞掉
- 出错之后，**哪些收尾必须做**（关 loading、释放定时器、恢复按钮）

## 四类常见错误

JS 的错误对象都有 `name` 和 `message`。`name` 是大类，`message` 是具体描述。先认识四个大类：

| 类型 | 发生时机 | 典型文案 | 常见原因 |
| --- | --- | --- | --- |
| `SyntaxError` | 解析阶段，或解析 JSON 时 | `Invalid or unexpected token` | 缺括号、引号不配对、中文标点、坏 JSON |
| `TypeError` | 运行时 | `Cannot read properties of undefined (reading 'name')` | 对错误类型做操作，如读 undefined 的属性 |
| `ReferenceError` | 运行时 | `notDeclared is not defined` | 变量没声明、拼错、超出作用域 |
| `RangeError` | 运行时 | `Maximum call stack size exceeded` | 递归没有终止条件、数组长度非法 |

下面这段可以一次跑完，每段单独 `try/catch`，所以不会互相打断：

```js
// TypeError：读 undefined 的属性
try {
  const user = {};
  console.log(user.profile.name);
} catch (err) {
  console.log(err.name, '-', err.message);
}
// 输出: TypeError - Cannot read properties of undefined (reading 'name')

// ReferenceError：变量根本不存在
try {
  console.log(notDeclared);
} catch (err) {
  console.log(err.name, '-', err.message);
}
// 输出: ReferenceError - notDeclared is not defined

// RangeError：递归没有出口
function recurse() {
  recurse();
}

try {
  recurse();
} catch (err) {
  console.log(err.name, '-', err.message);
}
// 输出: RangeError - Maximum call stack size exceeded
```

`SyntaxError` 要单独说，因为它分两种。一种是代码本身写错了，浏览器在**执行前**解析阶段就发现，整个 `script` 一行都不会跑：

```text
console.log('hi'
// Uncaught SyntaxError: Invalid or unexpected token
```

这种错误无法用 `try/catch` 捕获，因为代码还没开始执行。你只能看控制台报的行号，回去改源码。最常见的原因是少一个右括号、引号不配对，或者从文章里复制了中文全角引号 `“”`。

另一种是运行时解析字符串，比如 `JSON.parse` 收到坏数据，这种能被 `catch`：

```js
try {
  JSON.parse('{bad}');
} catch (err) {
  console.log(err.name);      // 输出: SyntaxError
  console.log(err.message);   // 提示 JSON 格式不对，具体文案随浏览器版本略有差异
}
```

记住一个判断顺序：**先看 `name`，再看 `message`，最后看栈追踪的第一帧**。不要被整段红字吓到，真正有用的信息就在前三行。

## 读栈追踪：错误从哪来

把上面的 `user.name` 放进一个函数调用里，控制台会给出更完整的信息：

```text
Uncaught TypeError: Cannot read properties of undefined (reading 'name')
    at showUser (app.js:12:15)
    at init (app.js:20:3)
    at app.js:24:1
```

第一行是错误类型和消息。下面每一行 `at ...` 是调用链的一层：

- `at showUser (app.js:12:15)`：错误发生在 `showUser` 函数里，文件 `app.js` 第 12 行、第 15 列
- `at init (app.js:20:3)`：`showUser` 是被 `init` 在第 20 行调用的
- `at app.js:24:1`：`init` 又是在文件顶层第 24 行被调用的

顺序是**从内到外**：最上面是出错的位置，越往下越接近程序入口。读的时候先找第一行属于你自己代码的帧，那里通常就是问题源头。

点击文件名，浏览器会跳到 Sources 面板对应的行。线上代码经过压缩后，变量名会变成 `a`、`b`，行号也对不上，这时需要 source map 才能还原。本地开发不用管这个。

如果栈里出现 `node_modules`、`react-dom` 这类路径，说明错误是从框架内部抛出来的，但真正的原因往往在你传进去的数据。先看第一个属于你项目的帧。

## throw：主动抛出错误

不是所有错误都来自浏览器。你也可以在代码发现「不该继续」时主动停下：

```js
function divide(a, b) {
  if (b === 0) {
    throw new Error('除数不能为 0');
  }
  return a / b;
}

try {
  divide(1, 0);
} catch (err) {
  console.log(err.name);          // 输出: Error
  console.log(err.message);       // 输出: 除数不能为 0
  console.log(typeof err.stack);  // 输出: string
}
```

`throw` 会立刻结束当前函数，把控制权交给最近的 `catch`。没有 `catch`，就是「未捕获错误」，当前脚本停止。

`Error` 对象有三个常用属性：`name` 是类型名，`message` 是你写的描述，`stack` 是调用栈字符串。`stack` 不是标准强制要求，但所有主流浏览器和 Node 都支持，调试时非常有用。

可以 `throw` 任何值，比如 `throw '出错了'`、`throw 404`。不要这么做：字符串没有 `stack`，`catch` 里拿到的就是一个普通字符串，你无法知道它从哪来。**永远抛 `Error` 对象**。

:::warn
`throw` 之后的代码不会执行，包括同一函数里的 `return` 和收尾逻辑。如果函数中间申请了资源、开了 loading，要放在 `finally` 里清理，不能指望 `throw` 之后的语句。
:::

## 自定义错误类型

项目大了以后，「出错了」这三个字不够用。调用方需要知道是**校验失败**、**未登录**还是**网络超时**，才能决定怎么处理。做法是继承 `Error`：

```js
class ValidationError extends Error {
  constructor(message, field) {
    super(message);              // 必须先调用，初始化 message 和 stack
    this.name = 'ValidationError';
    this.field = field;
  }
}

function checkAge(age) {
  if (!Number.isInteger(age) || age < 0) {
    throw new ValidationError('年龄必须是非负整数', 'age');
  }
  return age;
}

try {
  checkAge(-1);
} catch (err) {
  console.log(err instanceof ValidationError);  // 输出: true
  console.log(err.name);                        // 输出: ValidationError
  console.log(err.field);                       // 输出: age
  console.log(err.message);                     // 输出: 年龄必须是非负整数
}
```

三个要点：`super(message)` 必须第一行调用，否则 `this` 不能用；把 `name` 改成自己的类名，控制台里才看得懂；额外字段（这里是 `field`）用来携带结构化信息。

`instanceof` 能区分错误类型。调用方可以据此把错误显示到对应输入框，而不是笼统弹一个「操作失败」。

不要给每个小函数都定义错误类。只有「调用方需要根据类型做不同处理」时才值得，比如校验错误、权限错误、网络错误这三类。

## try / catch / finally 的执行顺序

```js
function test() {
  try {
    console.log('1 try');
    return 'try 的返回值';
  } finally {
    console.log('2 finally');
  }
}

console.log(test());
// 输出:
// 1 try
// 2 finally
// try 的返回值
```

`try` 里的 `return` 先把返回值算出来，然后 `finally` 执行，最后函数才真正返回。这个顺序很多人第一次会猜错。

`finally` 里也可以写 `return`，它会**覆盖** `try` 的返回值：

```js
function override() {
  try {
    return 'try';
  } finally {
    return 'finally';
  }
}

console.log(override());   // 输出: finally
```

这是反模式。`finally` 的职责是收尾，不是决定返回值。看到这种代码，把它改掉。

完整的执行规则只有四条：

1. `try` 正常结束，跳过 `catch`，执行 `finally`
2. `try` 里抛错，跳到 `catch`，执行 `finally`
3. `catch` 里又抛错，`finally` 仍然执行，然后错误继续往外传
4. 无论走哪条路，`finally` 都执行（除非进程直接退出）

`finally` 最典型的用途是收尾：关闭 loading、清除定时器、断开连接、恢复按钮。

```js
async function load() {
  setLoading(true);
  try {
    const data = await request('/api/users');
    render(data);
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);      // 成功失败都要关掉 loading
  }
}
```

### catch 的参数可以省略

如果你不打算使用错误对象，`catch` 后面可以不写参数：

```js
try {
  JSON.parse('{bad}');
} catch {
  console.log('解析失败，使用默认值');
}
```

这个写法是 ES2019 加入的。它的好处是明确表达「我不关心具体错误」，坏处是容易变成吞错误的入口。只有在你确实有兜底方案时才这么写。

## 不要写空 catch

这是初学者最容易犯、后果最严重的一个错误：

```js
function saveData() {
  throw new Error('磁盘满了');
}

function showToast(message) {
  console.log('提示：', message);
}

// 反例：错误被吃掉，出问题完全查不到
try {
  saveData();
} catch (err) {}

// 正例：记录细节 + 给用户可理解的反馈
try {
  saveData();
} catch (err) {
  console.error('保存失败', err);
  showToast('保存失败，请重试');
}
```

空 `catch` 等于告诉程序「出什么事都当没发生」。数据没存上，用户以为存上了；请求失败了，页面显示成功。等几天后用户来投诉，你连日志都没有。

「不要吞掉」不等于「每个 catch 都要弹窗」。按场景分三种处理方式：

| 场景 | 处理方式 |
| --- | --- |
| 有明确兜底（坏数据用默认值） | 返回默认值，同时 `console.warn` 记录 |
| 能给用户正确提示（网络失败） | 提示 + 记录，必要时重试 |
| 处理不了（未知 bug） | 补充上下文后 `throw` 出去，让它暴露 |

第三种经常被忽略。捕获了却不知道怎么处理，最好的做法是加上「当时在做什么」再抛出去：

```js
async function loadUser(id) {
  try {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    throw new Error(`加载用户 ${id} 失败`, { cause: err });
  }
}
```

`cause` 是 ES2022 加入的，用来保留原始错误。调用方看到的是「加载用户 42 失败」，展开 `err.cause` 还能看到真正的原因。Chrome、Firefox 和 Node 16.9+ 都支持。

## 异步里的错误

同步代码的 `try/catch` 很直观，异步就不一样了。先看正确写法：

```js
async function load() {
  try {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    console.log(data);
  } catch (err) {
    console.error('加载失败', err.message);
  }
}
```

`await` 会把 Promise 的拒绝「翻译成」同步抛错，所以 `try/catch` 能接住。注意它只能接住**网络层失败和 404 的判断**，`fetch` 对 4xx/5xx 本身不 reject，第 16 章讲过。

最常见的错误是**忘了 `await`**：

```js
async function loadData() {
  throw new Error('接口挂了');
}

async function wrong() {
  try {
    loadData();          // 没有 await
  } catch (err) {
    console.log('抓不到');
  }
}

async function right() {
  try {
    await loadData();
  } catch (err) {
    console.log('抓到了', err.message);
  }
}

wrong();   // 控制台出现未处理的 Promise 拒绝
right();   // 输出: 抓到了 接口挂了
```

`loadData()` 返回的是一个 Promise，错误在 Promise 内部，`try/catch` 只能捕获同步抛出的东西。没有 `await`，函数调用本身不会抛错，拒绝发生在之后。

另一种抓不到的情况是回调：

```js
try {
  setTimeout(() => {
    throw new Error('定时器里炸了');
  }, 0);
} catch (err) {
  console.log('抓不到');
}

setTimeout(() => {
  try {
    throw new Error('定时器里炸了');
  } catch (err) {
    console.error('自己抓到了', err.message);
  }
}, 0);
```

定时器回调执行时，早就离开了 `try` 的调用栈。错误处理必须写在回调内部。

不用 `async/await` 时，用 `.catch()`：

```js
fetch('/api/data')
  .then((res) => res.json())
  .catch((err) => console.error('请求失败', err));
```

漏掉 `.catch()` 会产生「未处理的 Promise 拒绝」（unhandled rejection）。浏览器会在控制台报错，但不会自动帮你恢复界面。可以加一个全局兜底，用来记录日志，不能当成主要处理手段：

```js
window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的 Promise 拒绝', event.reason);
});
```

:::warn
`try/catch` 不是越包越好。把整个函数包起来，看似「防崩」，实际会让你失去精确的错误位置。只包**可能失败、且你知道怎么处理**的那几行，其余让它自然抛出。
:::

## 防御性写法：在错误发生前拦住

很多错误不用 `try/catch`，靠写代码时多想一步就能避免。

**可选链**（optional chaining）用于「这个值可能不存在」：

```js
const user = null;

const name = user?.profile?.name ?? '匿名';
console.log(name);   // 输出: 匿名

const count = 0;
console.log(count ?? 10);   // 输出: 0
console.log(count || 10);   // 输出: 10，因为 0 是假值
```

`?.` 遇到 `null` 或 `undefined` 就短路，整个链条返回 `undefined`，不会继续读后面的属性。注意每一层都可能为空时要写多个 `?.`：`user?.profile.name` 在 `user` 存在但 `profile` 不存在时仍然会报错。

`??` 只在左边是 `null` 或 `undefined` 时取右边。`||` 把 `0`、`''`、`false` 也当假值，用它给数字或布尔值兜底会得到错误结果。这个坑第 3 章提过，在配置项和计数场景里特别常见。

**在边界做校验**，比在每一行后面加判断更有效：

```js
function createUser(input) {
  if (input == null || typeof input.name !== 'string') {
    throw new TypeError('createUser 需要一个带 name 的对象');
  }

  const name = input.name.trim();
  if (name === '') {
    throw new Error('name 不能为空');
  }

  return { name };
}

console.log(createUser({ name: ' 小明 ' }));   // 输出: { name: '小明' }

try {
  createUser({});
} catch (err) {
  console.error(err.message);   // 输出: createUser 需要一个带 name 的对象
}
```

「边界」指数据进入你系统的入口：用户输入、接口响应、URL 参数、函数对外暴露的参数。在这些地方校验一次，内部代码就可以信任数据，不用层层判断。

区分两种缺失：

- **预期内的缺失**：接口可选字段、用户没填的昵称，用 `?.` 和默认值
- **不该发生的缺失**：必填的 `id`、初始化后的配置，应该直接报错

用可选链去「安抚」一个本该存在的值，只会把 bug 推迟到更远的地方，错误信息更难懂。

## 调试：console 家族

```js
console.log('普通信息', { id: 1 });
console.warn('警告：存储快满了');
console.error('错误：请求失败');

console.table([
  { name: '小明', age: 18 },
  { name: '小红', age: 20 },
]);

console.group('用户信息');
console.log('name: 小明');
console.log('age: 18');
console.groupEnd();

console.time('渲染列表');
for (let i = 0; i < 1000; i++) {}
console.timeEnd('渲染列表');   // 输出类似: 渲染列表: 0.12 ms
```

几个使用要点：

- 打印对象时直接传对象，不要 `'user: ' + user`，那样只会得到 `[object Object]`
- `console.table` 把数组或对象打印成表格，看字段多的一批数据非常直观
- `console.group` 和 `groupEnd` 把一组日志折叠在一起，排查多步流程时避免刷屏
- `console.time` 和 `timeEnd` 的标签必须一致，用来粗略测耗时
- `console.trace()` 会打印当前调用栈，比 `console.log` 多告诉你「谁调用了这里」

日志不是越多越好。在循环里打一百条，你反而找不到关键那条。更高效的办法是断点。

## 断点：让代码停在你想看的地方

打开开发者工具的 Sources 面板，`Ctrl + P` 搜索文件名，点行号左侧的空白处，就设置了一个断点。代码执行到这一行会暂停，整个页面的状态冻结，你可以慢慢看。

三种断点方式，对应三种场景：

| 方式 | 怎么设 | 什么时候用 |
| --- | --- | --- |
| 普通断点 | 点行号左侧 | 知道大概哪几行有问题 |
| 条件断点 | 右键行号，选 Add conditional breakpoint，填表达式 | 循环第 50 次才出错，不想停 49 次 |
| `debugger` 语句 | 代码里写 `debugger;` | 临时排查，改完必须删掉 |

```js
function findBug(items) {
  let total = 0;

  for (let i = 0; i < items.length; i++) {
    debugger;             // 每次循环都会暂停，适合临时排查
    total += items[i].price;
  }

  return total;
}

findBug([{ price: 10 }, { price: 20 }]);
```

`debugger` 只在开发者工具打开时生效，但**不要提交到代码里**。别人打开页面会莫名其妙停住。

暂停之后，右侧面板有几个关键区域：

- **Scope**：当前作用域里的所有变量，包括闭包和全局
- **Watch**：你手动添加的表达式，比如 `items.length`、`user.name`，每步都重新求值
- **Call Stack**：调用链，点任意一帧可以跳到那层代码，看当时的变量
- **Breakpoints**：所有断点列表，可以临时禁用

单步按钮对应四种操作：

| 操作 | 快捷键 | 什么时候用 |
| --- | --- | --- |
| Step over | F10 | 执行下一行，不进函数。大多数时候用这个 |
| Step into | F11 | 进入当前行调用的函数，怀疑问题在函数内部时用 |
| Step out | Shift + F11 | 不小心进太深，直接跑完当前函数回到调用处 |
| Resume | F8 | 继续跑到下一个断点 |

还有「Pause on exceptions」开关（Sources 面板右上角的暂停图标），可以让代码在抛错的那一刻自动停下，而不是等错误冒到控制台。调试「错误被别处 catch 吃掉」的问题时特别有用。

断点比 `console.log` 强在：不修改代码、能看到全部变量、能回退调用栈、能逐行观察变化。循环里尤其明显，日志会刷屏，断点只会停在你关心的那一次。

## Network 面板：接口问题在这里定位

页面数据不对，先分清是「前端渲染错了」还是「请求就没拿到」。Network 面板回答后者。

打开面板，刷新页面，勾选 `Fetch/XHR` 过滤，能看到每个请求的：

- **Name / URL**：请求地址对不对，有没有拼错路径
- **Status**：200、404、500，或者 `(failed)`、`(canceled)`
- **Method**：GET 还是 POST
- **Payload**：请求体，POST 时检查字段有没有发出去
- **Response**：服务器返回的原始内容
- **Timing**：各阶段耗时，判断是网络慢还是服务器慢

点进一个请求，重点看四块：Headers 里的 `Content-Type` 和 CORS 响应头、Payload 里的请求参数、Response 里的真实返回、Preview 里的格式化结果。

几个实用操作：勾选 `Preserve log`，页面跳转后请求记录不丢；右键请求选 `Copy as fetch`，把浏览器实际发出的请求复制成代码，方便对比你写的参数；`Copy as cURL` 可以贴到终端复现，用来确认「是不是只有浏览器不行」。

排查顺序建议固定成：**请求发了吗 → 状态码是多少 → 请求体对吗 → 响应体是什么**。四步走完，接口问题基本就定位了。

## 常见报错对照表

| 报错 | 通常原因 | 怎么查 |
| --- | --- | --- |
| `Cannot read properties of undefined (reading 'x')` | 数据还没到，或对象层级猜错 | 打印父对象，看接口返回结构；确认是 `user.profile.name` 还是 `user.name` |
| `Cannot read properties of null (reading 'x')` | `querySelector` 没选中，或显式赋了 null | 检查选择器拼写、脚本执行时机；在读取前打印元素 |
| `x is not a function` | 方法名拼错，或值的类型不对 | `console.log(typeof x)`；确认数组方法没用在 NodeList 上 |
| `x is not defined` | 变量没声明、拼错、超出作用域 | 检查拼写和声明位置；模块里检查有没有 `import` |
| `Unexpected token '<'` | 把 HTML 当 JS 或 JSON 解析 | 看 Network 的响应体；检查 script 路径、接口是否返回了错误页 |
| `Assignment to constant variable` | 给 `const` 重新赋值 | 找到那行赋值，改 `let`，或去掉不该有的赋值 |
| `Maximum call stack size exceeded` | 递归没有终止条件，或函数互相调用 | 看栈里重复出现的函数名，检查递归出口 |
| `Invalid or unexpected token` | 语法错误：缺括号、引号不配对、中文标点 | 看报错行和上一行；检查是否从文章复制了全角符号 |
| `Cannot access 'x' before initialization` | 在 `let` / `const` 声明前使用了变量 | 调整声明顺序；注意暂时性死区 |
| `Failed to fetch` | 断网、URL 错、CORS 被拦、`file://` 协议 | Network 看请求是否发出；看控制台 CORS 提示；确认用本地服务器打开 |
| `Unexpected end of JSON input` | 响应体为空或 JSON 不完整 | 看 Response；检查是不是 204 或 500 空响应 |
| `body stream already read` | 响应体被读了两次 | 只解析一次；需要两次就先 `res.clone()` |

## 一套排查流程

遇到 bug 时按这个顺序走，比随机改代码快得多：

1. **复现**：能不能稳定重现？点哪个按钮、填什么数据、什么顺序触发的？不能复现的问题，先想办法让它稳定出现。
2. **读报错**：看类型、消息、栈的第一帧。没有报错但有异常表现，就在关键节点加日志或断点。
3. **缩小范围**：是数据问题、逻辑问题，还是渲染问题？用二分法注释掉一半代码，或者在看不清的变量上打断点。
4. **验证假设**：先说清「我认为原因是 X，如果改这里，表现应该从 A 变成 B」，再动手。改完对照预测，而不是「好像好了」。
5. **修复并回归**：修完把相关流程再走一遍，确认没有引入新问题。顺手补一个校验或默认值，防止同类问题再来。

「改一行试试」是最慢的方式。没有假设的修改，即使碰巧修好了，你也不知道为什么，下次换个地方还会犯。

## 常见误区清单

| 写法 | 结果 | 为什么 |
| --- | --- | --- |
| `try { ... } catch (e) {}` | 错误彻底消失，问题留到线上 | 空 catch 吞掉了所有信息，至少记录或兜底 |
| `catch` 里只 `console.log` | 用户界面停在原地 | 日志给开发者看，用户需要提示或状态恢复 |
| 用 `try/catch` 包住整个函数 | 错误位置模糊，bug 被掩盖 | 只包可能失败且能处理的那几行 |
| 调用 async 函数不加 `await` | 外层 `catch` 抓不到拒绝 | 错误在 Promise 里，必须 `await` 或 `.catch` |
| 以为 `fetch` 404 会进 `catch` | 不会，代码继续跑 | 4xx/5xx 不 reject，要查 `res.ok` |
| `throw '出错了'` | `catch` 拿到字符串，没有栈 | 抛 `Error` 对象才有 `message` 和 `stack` |
| `finally` 里写 `return` | 覆盖 `try` 的返回值 | `finally` 只做收尾，不决定结果 |
| 用 `||` 给数字兜底 | `0` 被替换成默认值 | `0` 是假值，用 `??` |
| 把 `?.` 当万能保护 | 必填数据缺失被推迟到更远处才炸 | 该报错的地方要报错，可选才用 `?.` |
| 提交前不删 `debugger` | 打开开发者工具的用户页面卡住 | `debugger` 只适合临时排查 |
| 只看控制台最后一行红字 | 错过真正的错误类型和位置 | 先看第一行的 `name`、`message` 和第一帧 |

## 通勤自测

:::quiz 下面这个函数调用后输出什么？
`function f() { try { return 'try'; } finally { console.log('finally'); } }`，然后 `console.log(f());`
先输出 `finally`，再输出 `try`。`try` 里的返回值先算好，`finally` 执行完，函数才真正返回。
:::

:::quiz 下面这段代码，`catch` 会执行吗？
`async function load() { throw new Error('挂了'); }`，然后 `try { load(); } catch (e) { console.log('catch'); }`
不会。`load()` 返回一个已拒绝的 Promise，但没有 `await`，拒绝不会同步抛出。加上 `await load()` 才能被 `catch` 接住。
:::

:::quiz `0 ?? 10` 和 `0 || 10` 分别输出什么？
分别输出 `0` 和 `10`。`??` 只在 `null` / `undefined` 时取右边，`||` 把 `0`、`''`、`false` 也当假值。
:::

:::quiz `console.log(notDeclared)` 报什么错？如果 `const a = 1` 之前就 `console.log(a)` 呢？
第一句报 `ReferenceError: notDeclared is not defined`；第二句报 `ReferenceError: Cannot access 'a' before initialization`。前者是变量不存在，后者是暂时性死区。
:::

:::quiz `const user = {}; user.profile.name;` 报什么错？
报 `TypeError: Cannot read properties of undefined (reading 'name')`。`user` 存在，但 `user.profile` 是 `undefined`，读它的 `name` 就炸了。改成 `user.profile?.name` 或先补默认值。
:::

:::quiz `throw '出错了'` 之后，`catch (err)` 里的 `err` 是什么？有什么问题？
`err` 就是字符串 `'出错了'`，不是 Error 对象。它没有 `stack`，你无法知道抛出位置，也不能用 `instanceof` 区分类型。应该 `throw new Error('出错了')`。
:::

:::quiz `fetch` 返回 500，`try/catch` 能抓到吗？
不能。500 是正常完成的 HTTP 响应，Promise 会 resolve。要在 `try` 里判断 `if (!res.ok) throw new Error(...)`，才会进入 `catch`。
:::

:::quiz `const a = null; console.log(a?.b.c);` 会报错吗？
不会，输出 `undefined`。可选链遇到 `null` 会短路整个链条，后面的 `.c` 不再求值。但 `a` 存在、`b` 不存在时，`a?.b.c` 仍然会报错，因为 `?.` 只保护了 `a` 这一层。
:::

## 动手练习（到电脑上做）

**必做**

1. 在一个 HTML 文件里故意制造五种错误：读 undefined 的属性、调用不存在的方法、使用未声明变量、给 `const` 重新赋值、无限递归。每次只留一种，记录控制台的 `name`、`message` 和栈的第一帧，然后修掉。
   验收：能不看答案说出五种错误的类型；能指出每种错误在栈里的第一帧；修复后页面不再报错。

2. 写 `safeJsonParse(text, fallback)`：解析成功返回对象，失败返回 `fallback`，并 `console.warn` 记录原因。分别用合法 JSON、`'{bad'`、空字符串、`'null'` 测试。
   验收：四种输入都不抛错；坏数据时返回默认值；警告里能看到原始错误信息。

3. 写一个 `register(user)` 函数，校验 `name` 是非空字符串、`age` 是 0 到 120 的整数。校验失败抛自定义 `ValidationError`，带 `field` 字段。调用方根据 `field` 把错误显示到对应输入框。
   验收：两种字段错误分别能触发；`err instanceof ValidationError` 为 `true`；错误提示落在正确的输入框下方。

**进阶**

4. 做一组异步错误实验：让一个 async 函数直接 `throw`，分别用「不加 `await`」「加 `await`」「`.catch()`」三种方式调用，记录哪种能抓到。再加一个 `unhandledrejection` 监听，观察未处理拒绝何时触发。
   验收：能解释三种方式的差异；控制台不再出现未处理的拒绝；监听器只作为兜底，不替代具体处理。

5. 用断点排查一段求和代码：构造一个数组，其中一项的 `price` 是字符串 `'10'`，导致总和变成字符串拼接。在循环里设条件断点（如 `typeof items[i].price !== 'number'`），用 Watch 观察 `total` 的变化，再用 Step over / Step into 各走一遍。
   验收：能定位到具体哪一项；能说出 `total` 在哪一步从数字变成字符串；修完后总和是数字，并给数据加了校验。

:::tip
这一章的工具不会只用在「修 bug」上。你读别人代码、接手项目、上线后看用户反馈，靠的都是同一套动作：读报错、缩小范围、验证假设。

到这里，语言、浏览器、存储、网络、调试五块能力都齐了。第 18 章会把它们合成一个完整的待办清单：DOM 渲染、事件委托、localStorage 持久化、空状态和错误提示，一个都不少。写项目时卡住，就回到这一章的排查流程，一步一步来。
:::
