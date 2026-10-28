---
id: 20
title: 下一步：TypeScript、Node 与小程序
summary: 学完 JS 之后往哪走：用 TypeScript 提前发现错误、用 Node 写第一个接口、用小程序把作品装进微信，并给出三个月路线与项目清单。
minutes: 42
keywords: TypeScript Node Express 接口 小程序 Taro uni-app 学习路线 查文档 提问
---

> 第 20 章走到这里，你已经能独立做出一个能上线的静态应用。但「会 JS」只是起点，真正的工作方向还有三条：把代码写得更可靠、让代码跑在服务器上、让代码跑进微信里。
>
> 这一章不教你全部语法，而是给你三张地图：每张图标出「先学什么、暂时不用学什么、学到什么程度算入门」。
>
> 学完你能给自己排出一条三个月的路线，也知道遇到问题时去哪里查、怎么问。

## 为什么需要它

假设朋友让你做一个「活动报名表」：收集姓名和电话、导出名单、别人不能乱改。你现在的工具箱是三样：DOM 画界面、`localStorage` 存数据、`fetch` 调接口。

界面你能做出来，但会卡在三个地方：

- 报名数据存在每个访客自己的浏览器里，你一条也收不到
- 没有登录，任何人打开都能删掉别人的报名
- 想在微信里传播，网页分享出去后打开得没有那么顺

也就是说，**静态页面不等于产品**。产品需要有人替你保管数据、判断谁能改、还需要一个用户已经装好的入口。

这正好对应三个方向：TypeScript 让代码在变大后仍然可靠，Node.js 让你能写那个「保管数据」的服务，小程序给你另一个客户端。先把手里已有的东西盘一遍：

| 层面 | 已经会 | 对应章节 | 还缺 |
| --- | --- | --- | --- |
| 语言 | 变量、类型、函数、数组对象、闭包、`this`、class、Promise | 2 到 13 | 类型系统、测试 |
| 浏览器 | DOM、事件、存储、`fetch`、错误调试 | 15 到 17 | 复杂状态管理、性能 |
| 工程 | 模块、npm、Vite、Git、部署 | 14、19 | 自动化检查、CI |
| 服务端 | 只知道前端怎么调接口 | 16 | 写接口、数据库、鉴权 |
| 小程序 | 还没接触 | — | 运行时差异、审核发布 |

给自己做一次自查，任何一条含糊都建议回看对应章节：

- 能解释 `let`、`const`、`var` 的区别，以及暂时性死区（第 2、9 章）
- 能手写 `map`、`filter`、`reduce`，说清返回的是新数组还是原数组（第 6 章）
- 能说清闭包是什么、`this` 由调用方式决定（第 9、10 章）
- 能读写 Promise 链和 `async/await`，知道微任务的执行顺序（第 13 章）
- 能用原生 DOM 独立写出第 18 章的待办，并部署上线（第 18、19 章）

五条都过了，再往下走。顺序建议是 **TypeScript → Node → 小程序**：TS 立刻能用在现有项目上，Node 补的是服务端思维，小程序是换一个运行时的前端，放在最后最容易上手。

## TypeScript：把错误提前到写代码时

先看一段很普通的 JS：

```js
function formatPrice(price) {
  return '¥' + price.toFixed(2);
}

formatPrice(19.9);    // 输出: '¥19.90'
formatPrice('19.9');  // TypeError: price.toFixed is not a function
```

第二行报错，是因为字符串没有 `toFixed`。问题在于：这段代码只有**真的执行到这一行**才会暴露错误。如果它藏在「用户点了某个不常用的支付方式」的分支里，测试没走到，上线后才会炸。

TypeScript（简称 TS）在 JS 上加了一层类型标注。它不是新语言，是 JS 的超集：

```ts
function formatPrice(price: number): string {
  return '¥' + price.toFixed(2);
}

formatPrice('19.9');
```

这段代码根本不用运行，编辑器在你写下 `'19.9'` 的瞬间就标红，提示 `Argument of type 'string' is not assignable to parameter of type 'number'.`。类型在编译后会被完全抹掉，运行时还是普通 JS，所以 TS 不改变程序行为，只把「运行时才发现的错误」提前到「写代码时」。

对自学者来说，它最大的价值不是「显得专业」，而是**编辑器会告诉你下一步该写什么**。输入 `todo.` 之后弹出的属性列表，比任何文档都快。

### 类型注解与推断

```ts
let name: string = '小明';          // 手写注解
let age = 18;                       // 推断为 number，不用写
const ids: number[] = [1, 2, 3];    // 数字数组
const user: { name: string; age: number } = { name: '小明', age: 18 };
```

大多数局部变量不需要写类型，TS 能从右边的值推断出来。真正值得手写的是两处：

- **函数参数**：TS 猜不到调用方会传什么，必须由你声明
- **公共函数的返回值**：别人调用时不用进函数体就能知道拿到什么

```ts
function total(prices: number[]): number {
  return prices.reduce((sum, price) => sum + price, 0);
}
```

不写参数类型，TS 会把 `price` 当成 `any`，等于放弃检查；不写返回类型，改坏实现时调用方也发现不了。

### interface 与 type

描述一个对象长什么样，有两种写法：

```ts
interface Todo {
  id: number;
  text: string;
  done: boolean;
  createdAt?: number;      // 问号表示可选
}

type Filter = 'all' | 'active' | 'done';

const filter: Filter = 'all';
// const bad: Filter = 'finished';   // 编译报错
```

| 维度 | `interface` | `type` |
| --- | --- | --- |
| 描述对象结构 | 可以 | 可以 |
| 联合类型 | 不行 | 可以，如 `'a'` 或 `'b'` |
| 交叉合并 | `extends` | `&` |
| 声明合并 | 支持，同名会自动合并 | 不支持 |
| 适合 | 对象、接口返回、公共类型 | 联合、函数类型、工具类型 |

选择规则不用纠结：**描述对象用 `interface`，其他用 `type`**。两者在大多数场景可以互换，团队里统一一种就行，别在同一个文件里来回换。

`createdAt?: number` 表示这个属性可以没有。读取时它的类型是 `number | undefined`，TS 会强迫你先判断再使用，这正是第 2 章讲的 `undefined` 在类型层面的体现。

### 联合类型与收窄

```ts
type Filter = 'all' | 'active' | 'done';

function match(todo: Todo, filter: Filter): boolean {
  if (filter === 'active') return !todo.done;
  if (filter === 'done') return todo.done;
  return true;
}
```

`filter` 只能是这三个字符串之一，写成 `'finished'` 立刻报错。这比运行时才发现「筛选按钮点了没反应」早得多。

在 `if (filter === 'active')` 里面，TS 知道 `filter` 一定是 `'active'`，这叫**类型收窄**（narrowing）。所以你不用为每个分支再写一次类型。

### 函数类型与泛型入门

```ts
type Formatter = (value: number) => string;

const money: Formatter = (value) => `¥${value.toFixed(2)}`;
```

`(value: number) => string` 读作「接收一个 number，返回一个 string 的函数」。参数名可以省略，类型不能省。

泛型是「类型也当参数传」：

```ts
function identity<T>(value: T): T {
  return value;
}

const n = identity(42);        // n 的类型是 number
const s = identity('hello');   // s 的类型是 string
```

`<T>` 是类型参数，调用时 TS 从实参推断出具体类型。如果写成 `function identity(value: any): any`，调用方拿到的也是 `any`，后面所有检查都失效了。泛型的意义是：**一个函数服务多种类型，但不丢失类型信息**。

业务里真正高频的只有四样：`interface` 描述对象、联合类型表示枚举、可选属性、泛型函数。剩下的工具类型、条件类型，用到再查。

### tsconfig.json 的关键项

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

| 配置 | 作用 | 建议 |
| --- | --- | --- |
| `target` | 编译到哪个 JS 版本 | 现代项目用 `ES2022` |
| `module` | 模块格式 | 前端用 `ESNext` |
| `moduleResolution` | 怎么找模块 | 配合 Vite 用 `bundler` |
| `strict` | 打开全部严格检查 | 新项目直接 `true` |
| `noEmit` | 只检查，不输出文件 | 交给 Vite 打包时设 `true` |
| `skipLibCheck` | 跳过依赖包的类型检查 | 建议开，能显著加快速度 |
| `include` | 检查哪些文件 | 写 `["src"]`，别把 `dist` 扫进来 |

`strict` 是分水岭。它包含 `strictNullChecks`、`noImplicitAny` 等一组检查，会把「可能为 `undefined`」「隐式 `any`」都变成错误。新项目一开始就开，老项目最后再开。

### 渐进迁移：从叶子文件开始

不要停下来把整个项目重写一遍。按这个顺序，每天迁一点：

1. 装 TypeScript，生成配置，先设 `allowJs: true`，让 `.js` 和 `.ts` 共存
2. 从**没有依赖别人的文件**开始改：`utils/` → `api/` → `store/` → `render/` → `main.js`
3. 给函数参数和接口返回值加类型，这是收益最大的两处
4. 打开 `strict`，一次只修一类错误，修完再开下一类
5. 入口文件最后改，因为它是所有模块的汇合点

```bash
# 在项目根目录执行
npm install -D typescript
npx tsc --init
npx tsc --noEmit
```

`npx tsc --noEmit` 只做类型检查，不生成文件。Vite 的开发服务器会直接运行 `.ts`，但它**不做类型检查**，所以 npm 脚本里要单独留一条检查命令，提交前跑一次。

:::warn
不要用 `any` 和 `as` 让报错消失。`any` 会传染，一个变量是 `any`，从它取出来的所有东西都是 `any`；`as` 是「我保证它是这个类型」，保证错了运行时照样崩。类型对不上时，先改数据结构和函数签名，最后才考虑断言。
:::

## Node.js：让 JS 离开浏览器

Node.js 是 JS 的另一个运行环境。语言一样，能用的东西不一样：

| 能力 | 浏览器 | Node.js |
| --- | --- | --- |
| `document`、`window` | 有 | 没有 |
| 全局对象 | `window` | `globalThis` |
| 读写文件 | 不能直接读 | `fs` |
| 路径处理 | 无 | `path` |
| 进程与环境变量 | 受限 | `process` |
| 启动方式 | 浏览器加载页面 | `node server.js` |
| 网络请求 | `fetch`、XHR | `fetch`（Node 18 起） |

```js
// 在 Node 里运行
console.log(typeof document);    // 输出: undefined
console.log(typeof window);      // 输出: undefined
console.log(process.version);    // 输出: v22.x.x，以你安装的版本为准
```

同样一段数组排序、Promise、`JSON.parse`，两边都能跑。不能跑的是所有和「页面」有关的东西——Node 里没有 DOM，`document` 本身就不存在，直接写 `document.querySelector` 会抛 `TypeError`。这也是为什么第 15 章的代码不能直接搬到服务器上。

### 起一个后端项目

```json
{
  "name": "todo-api",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node --watch server.js"
  },
  "dependencies": {
    "express": "^5.0.0",
    "cors": "^2.8.5"
  }
}
```

`type: "module"` 让 Node 按 ESM 解析 `.js`，能写 `import`（第 14 章讲过）。`node --watch` 会在文件变化时自动重启，省得每次手动 `Ctrl + C`。

```bash
# 在 todo-api 目录执行
npm init -y
npm pkg set type=module
npm pkg set scripts.dev="node --watch server.js"
npm install express cors
npm run dev
```

### 原生 http：20 行写一个接口

不装任何框架，Node 自带的 `http` 就能起服务：

```js
// server.js
import http from 'node:http';

const todos = [{ id: 1, text: '读第 20 章', done: false }];

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'GET' && req.url === '/api/todos') {
    res.end(JSON.stringify(todos));
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ message: 'Not Found' }));
});

server.listen(3000, () => {
  console.log('http://localhost:3000/api/todos');
});
```

运行 `node server.js`，终端会打印 `http://localhost:3000/api/todos`，浏览器打开就返回 `[{"id":1,"text":"读第 20 章","done":false}]`。这段代码做了四件事：监听端口、读请求方法和路径、设响应头、写响应体。你能看到框架要解决的问题：路由靠 `if` 手写、读 POST 的请求体要自己收集数据流、每个响应都要手动设 `Content-Type`。接口一多，这些重复代码会淹没业务。

### Express：同样的接口，少写样板代码

```js
// server.js
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());           // 开发阶段允许跨源请求
app.use(express.json());   // 自动解析 JSON 请求体

const todos = [{ id: 1, text: '读第 20 章', done: false }];

app.get('/api/todos', (req, res) => {
  res.json(todos);
});

app.post('/api/todos', (req, res) => {
  const text = String(req.body.text ?? '').trim();
  if (text === '') {
    return res.status(400).json({ message: 'text 不能为空' });
  }

  const todo = { id: Date.now(), text, done: false };
  todos.push(todo);
  res.status(201).json(todo);
});

app.listen(3000, () => {
  console.log('http://localhost:3000/api/todos');
});
```

`app.use(...)` 注册的是**中间件**（middleware）：请求进入路由之前，先经过这些函数。`express.json()` 把请求体解析成对象，`cors()` 加上跨源响应头。没有 `express.json()`，`req.body` 是 `undefined`；没有 `cors()`，浏览器会拦下跨源请求。

`res.json()` 自动设 `Content-Type` 并序列化，`res.status(400).json(...)` 可以链式写完状态码和响应体。对比原生版本，路由、解析、响应三件事都被收进了一行。

### 接口基础：前后端怎么约定

REST 是一套命名习惯，用「资源 + 方法」表达操作：

| 方法 | 路径 | 作用 | 成功状态码 |
| --- | --- | --- | --- |
| `GET` | `/api/todos` | 取列表 | 200 |
| `GET` | `/api/todos/1` | 取单条 | 200，找不到 404 |
| `POST` | `/api/todos` | 新建 | 201 |
| `PUT` | `/api/todos/1` | 整体替换一条 | 200 |
| `PATCH` | `/api/todos/1` | 只改部分字段 | 200 |
| `DELETE` | `/api/todos/1` | 删除 | 204 |

状态码不用背全，记住四类：2xx 成功、3xx 重定向、4xx 客户端问题、5xx 服务端问题。前端最常处理的是 400（参数不对）、401（没登录）、404（不存在）、500（服务端崩了），具体含义第 16 章列过。

新建时请求体是一段 JSON，例如 `{"text": "买牛奶"}`；请求头还要声明 `Content-Type: application/json`，服务器才知道该按 JSON 解析（第 16 章讲过漏写这个头的后果）。

页面调用自己的接口，和第 16 章调公开接口一样：

```js
async function createTodo(text) {
  const res = await fetch('http://localhost:3000/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}

createTodo('买牛奶').then((todo) => console.log(todo));
// 返回的对象类似：{ id: 1730000000000, text: '买牛奶', done: false }
// id 来自 Date.now()，每次调用都不同
```

页面在 `5173`，接口在 `3000`，端口不同就是跨源，浏览器会拦。两种解决办法：后端 `app.use(cors())`（开发时够用），或者用第 19 章的 Vite 代理，让浏览器以为请求的是同源。

:::warn
`cors()` 不带参数等于允许所有来源。上线前要限制成自己的域名，否则任何网站都能调你的接口。需要登录态的接口还要处理 cookie 的跨源设置，这件事等做登录时再查文档，不要凭感觉配。
:::

### 数据库一句话

接口现在把数据放在一个数组里，重启就没了。真实项目要落盘：

| 数据库 | 形态 | 适合 | 一句话理解 |
| --- | --- | --- | --- |
| SQLite | 单个文件 | 本地、小项目、原型 | 不用装服务，一个文件就是一个库 |
| MySQL / PostgreSQL | 服务进程 + SQL | 正式业务、多人并发 | 表和表用外键关联，生态成熟 |
| MongoDB | 文档 | 结构常变、快速迭代 | 存 JSON 一样的文档，字段可以不一样 |

学习顺序建议：先用 SQLite 把「建表、插入、查询、更新、删除」跑一遍，SQL 语法在 MySQL 上基本通用。不要一上来研究分库分表，那是数据量到千万级才需要的事。

## 小程序：另一套运行时

小程序不是「手机上的网页」。它有自己的文件格式、组件体系和视图更新方式。

### 原生小程序的目录

```text
mini-todo/
├── app.js                  # 小程序启动逻辑
├── app.json                # 全局配置：页面列表、窗口样式
├── app.wxss                # 全局样式
├── project.config.json     # 开发者工具的项目配置
└── pages/
    └── index/
        ├── index.js        # 页面逻辑
        ├── index.json      # 页面配置
        ├── index.wxml      # 结构，类似 HTML
        └── index.wxss      # 样式，类似 CSS
```

```json
{
  "pages": ["pages/index/index"],
  "window": {
    "navigationBarTitleText": "我的待办"
  }
}
```

`app.json` 的 `pages` 数组决定有哪些页面，第一项就是启动页。新增页面要在这里登记，否则打不开。

### 一个页面：用 setData 驱动视图

```js
Page({
  data: {
    todos: [],
    input: '',
  },

  onInput(e) {
    this.setData({ input: e.detail.value });
  },

  addTodo() {
    const text = this.data.input.trim();
    if (text === '') return;

    this.setData({
      todos: [...this.data.todos, { id: Date.now(), text, done: false }],
      input: '',
    });
  },
});
```

`data` 是页面的状态，`this.setData(...)` 修改它并触发视图更新。你不能像 Web 那样 `document.querySelector` 找到节点改内容，因为小程序根本没有 DOM。

页面还有自己的**生命周期**：`onLoad` 在页面首次加载时执行，适合取数据；`onShow` 每次页面显示时执行，适合刷新状态；`onUnload` 在页面关闭时执行，适合清理定时器。Web 里没有这套东西，页面打开就是打开，你只能靠 `DOMContentLoaded` 或路由事件模拟。

一个常见错误是直接改 `this.data.todos.push(...)`：数据变了，但视图不会更新，因为 `setData` 没被调用。这和第 18 章「只改数据不 render」是同一类错误，只是这里 `setData` 同时承担了两件事。

### 请求接口

```js
// 在页面的某个方法里调用，例如 onLoad
wx.request({
  url: 'https://api.example.com/todos',
  method: 'GET',
  success: (res) => {
    this.setData({ todos: res.data });
  },
  fail: (err) => {
    console.error(err);
  },
});
```

`wx.request` 是回调风格，不是 Promise。它和 `fetch` 最大的区别在域名：小程序要求接口是 HTTPS，并且提前在后台配置「request 合法域名」，`localhost` 不行。开发时可以在开发者工具里勾选「不校验合法域名」，但真机预览会恢复校验。

### Taro 与 uni-app

如果想一套代码同时跑微信、支付宝和 H5，可以用 Taro（React 语法）或 uni-app（Vue 语法）。它们把小程序的原生写法包了一层，编译到不同平台。

建议顺序是：**先写一遍原生小程序，再用框架**。否则出现「样式在 H5 正常、在微信错位」「这个 API 在支付宝没有」时，你不知道是框架的问题还是平台的问题。原生写过一遍，你才知道框架替你做了什么。

### 和 Web 的核心差异

| 维度 | Web | 微信小程序 |
| --- | --- | --- |
| 结构 | HTML + CSS + JS | WXML + WXSS + JS + JSON |
| DOM | 有，可随意操作 | 没有，只能 `setData` |
| 事件 | `addEventListener` | `bindtap` 等，写在标签上 |
| 请求 | `fetch` | `wx.request` |
| 路由 | 地址栏、History | `wx.navigateTo` 等 API |
| 尺寸单位 | `px`、`rem`、`vw` | `rpx`，按 750 设计稿等比缩放 |
| 发布 | 部署即上线 | 提交审核，通过才上线 |

## 学习路线：三个阶段

### 第一阶段：把 JS 用顺（2 到 4 周）

- 不看教程，独立重写第 18 章的待办，并加上编辑和截止日期
- 用 `fetch` 做两个小页面，完整处理加载、失败、空三种状态
- 看到一段报错，能说出先看 `name`、`message` 还是调用栈

验收：给你一个没做过的静态页面需求，你能在一天内做出可用的版本。

### 第二阶段：工程与类型（3 到 4 周）

- 用 Vite 建项目、用 Git 管理、把产物部署到线上
- 给第 18 章的代码加 TS 类型，打开 `strict` 后清零报错
- 写一份能让人照着跑起来的 README，配一张截图

验收：你的 GitHub 上有一个带线上地址、带说明、提交记录干净的项目。

### 第三阶段：后端与小程序（4 到 6 周）

- 用 Express 写 4 个接口，接上 SQLite，能增删改查
- 让第 18 章的前端改成调自己的接口，处理失败和空数据
- 用原生小程序做一个只有列表和添加的页面，真机预览通过

验收：一个「前端 + 自己的接口 + 数据库」的完整项目，以及一个能在微信里打开的小程序。

## 5 个练手项目

难度递增，每个都能写进作品集：

| 难度 | 项目 | 关键点 | 验收一句话 |
| --- | --- | --- | --- |
| 入门 | 番茄钟 | `setInterval`、开始暂停重置、状态切换 | 25 分钟倒计时准确，暂停后时间不继续跑 |
| 入门 | 天气卡片 | `fetch`、三态界面、城市切换 | 换城市能更新，断网时有提示而不是空白 |
| 进阶 | 记账本 | 表单、分类汇总、`localStorage`、筛选 | 月度合计正确，刷新不丢，能按分类看 |
| 进阶 | 带登录的待办 | Express、SQLite、密码哈希、会话 | 两个账号数据互不可见，未登录返回 401 |
| 挑战 | 小程序待办 | 原生小程序、接口或云开发 | 真机可添加和勾选，体验版能打开 |

每个项目都要求：能在线访问、有 README、有截图。作品比证书有用，因为别人点开就能判断你会不会。

## 怎么查文档

最常用的文档是 MDN（`developer.mozilla.org`）。查一个方法，按这个顺序看：

1. 搜「MDN Array filter」，进中文页
2. 先看语法签名：`filter(callbackFn, thisArg)`，再看 `callbackFn` 接收 `(element, index, array)` 三个参数
3. 看返回值：返回新数组，不改变原数组
4. 看示例，复制到控制台改一改
5. 最后看浏览器兼容性表

读签名有个小技巧：括号里的参数、方括号表示可选、`...` 表示剩余参数、箭头右边的 `string` 是返回类型。看不懂的示例，直接粘到控制台跑：

```js
const arr = [1, 2, 3, 4];

arr.filter((n) => n % 2 === 0);   // 输出: [2, 4]
arr;                              // 输出: [1, 2, 3, 4]，原数组没变
```

其他常用入口：Node 的 API 查 `nodejs.org/api`，微信小程序查 `developers.weixin.qq.com`，TypeScript 查官方 Handbook。查文档的能力比记住 API 重要，因为 API 会变，查法不会。

## 怎么提问

提问不是「把问题丢给别人」，而是「把问题缩小到别人一眼能看懂」。一个能被回答的提问包含三部分：

- **最小复现代码**：10 到 20 行，能直接跑，去掉业务和无关样式
- **报错全文**：`name`、`message`，以及调用栈的前几行；不要只发一句「报错了」
- **期望与实际**：你以为会发生什么，实际发生了什么，已经试过什么

```text
# 没人能回答
我的代码不行，怎么办？

# 能回答
环境：Chrome 最新版，Node 22
期望：点删除只删掉那一条
实际：点删除后两条都没了，控制台没有报错
最小复现：
const todos = [{ id: 1 }, { id: 1 }];
todos = todos.filter((t) => t.id !== 1);
console.log(todos.length);   // 0，两条 id 相同
已试过：在 handler 里打印 id，发现两条都是 1
```

最后那段「已试过」很关键，它说明你不是在等答案，而是在排查。大多数时候，把最小复现写出来的过程中，你自己就找到原因了。

## 常见误区清单

| 做法 | 结果 | 为什么 |
| --- | --- | --- |
| 先学框架再补语言 | 只会抄 API，报错看不懂 | 框架解决组织问题，语言才是底座 |
| 只看不写 | 看得懂，写不出 | 阅读是输入，写代码是另一项技能 |
| 收藏一堆教程 | 一直在准备，从没开始 | 一份跟到底比十份看开头强 |
| 等「学完」再做项目 | 永远开始不了 | 项目会逼你补上真正缺的那块 |
| 报错只看第一行 | 定位不到原因 | `name`、`message`、调用栈要一起看 |
| 把 TS 当新语言从头学 | 卡在类型体操 | 先 `interface`、联合、可选属性、泛型函数 |
| 后端一上来学分布式 | 用不上，也理解不了 | 先 HTTP、一个框架、一个数据库 |
| 小程序直接用 Taro | 平台问题查不动 | 先写原生，再用框架 |
| 复制粘贴跑通就算会 | 换个需求就不会 | 关掉教程重写一遍才算掌握 |
| 只学不部署 | 没有能看的作品 | 上线才算交付 |

## 通勤自测

:::quiz 下面这段 TS 会怎样？
```ts
function add(a: number, b: number): number {
  return a + b;
}

add('1', 2);
```
编译报错：`Argument of type 'string' is not assignable to parameter of type 'number'`。如果去掉类型注解，JS 会返回 `'12'`，运行时不报错，但结果错了。TS 的价值就是把这类错误提前。
:::

:::quiz 描述一个对象结构，用 `interface` 还是 `type`？联合类型用哪个？
描述对象两者都行，团队里通常用 `interface`，可读性好、支持 `extends`。联合类型只能用 `type`，例如 `type Filter = 'all' | 'active' | 'done'`。不要在同一个文件里来回换。
:::

:::quiz 在 Node.js 里执行下面这段代码，输出什么？为什么？
```js
console.log(typeof document);
console.log(typeof window);
```
输出两行 `undefined`。Node 没有浏览器 DOM，`document` 和 `window` 都不存在；`typeof` 对不存在的变量不会抛错，只会返回 `'undefined'`。直接写 `document.querySelector` 才会抛 `ReferenceError`。
:::

:::quiz 小程序里为什么不能 `document.querySelector`？那怎么改界面？
小程序没有 DOM，视图层由框架管理。页面状态放在 `data` 里，通过 `this.setData(...)` 修改，框架根据新数据重新渲染。直接改 `this.data` 不会触发更新。
:::

:::quiz 把密钥写成 `VITE_API_KEY` 放在前端，安全吗？
不安全。构建时变量会被替换成字符串，打进公开的 JS 文件，任何人打开控制台都能看到。密钥必须留在后端，前端只调自己的接口。
:::

:::quiz 页面在 `localhost:5173`，接口在 `localhost:3000`，`fetch` 为什么会失败？两种解法？
端口不同就是跨源，浏览器按同源策略拦截。解法：后端加 CORS 响应头（`app.use(cors())`），或开发时用 Vite 的 `server.proxy` 把 `/api` 转发到 3000，让浏览器看来是同源。
:::

:::quiz 下面这段代码的运行结果和类型分别是什么？
```ts
function identity<T>(value: T): T {
  return value;
}

const result = identity('hello');
console.log(result);
```
运行时输出 `hello`；`result` 的类型被推断为 `string`。泛型让同一个函数适配多种类型，同时保留具体的类型信息，而不是退化成 `any`。
:::

:::quiz 学完 JS 之后，应该先学框架还是先做项目？
先做两三个不依赖框架的原生项目，把语言、DOM、异步、请求练熟。框架解决的是组织代码的问题，底层能力不牢时，遇到问题只能猜。项目做完再学框架，会快得多。
:::

## 动手练习（到电脑上做）

**必做**

1. 用 `npx tsc --init` 建一份配置，把第 18 章的 `app.js` 改成 `app.ts`：给 `Todo` 写 `interface`，给 `addTodo`、`render`、`load` 的参数和返回值加类型，打开 `strict`。
   验收：`npx tsc --noEmit` 零报错；故意传一个字符串给数字参数，编辑器立刻标红；页面功能不变。

2. 用 Express 写 4 个接口：列表、新建、改完成状态、删除。用 `curl` 或页面的 `fetch` 逐个验证。
   验收：新建返回 201，空 `text` 返回 400，删除返回 204，不存在的 `id` 返回 404；重启服务后数据消失（正常，下一步才接数据库）。

3. 用微信开发者工具建一个原生小程序，做一个只有「输入 + 添加 + 列表」的页面。
   验收：模拟器里能添加，输入框清空，列表即时更新；把 `setData` 改成直接改 `this.data`，能观察到视图不更新。

**进阶**

4. 把第 18 章的前端接到自己的 Express 接口，去掉 `localStorage`；接口失败时显示提示和重试。
   验收：刷新后数据从接口读回；停掉后端时页面有错误提示而不是空白；CORS 或代理配置正确。

5. 用 Taro 或 uni-app 建一个项目，把待办页面跑通 H5 和微信小程序两端。
   验收：两端都能添加和勾选；平台差异（如请求 API）有单独处理；能说清框架替你做了哪些事。

:::tip
这一章没有让你「学完」，只是把三条路标出来。真正拉开差距的不是你知道 TypeScript、Node、小程序这三个词，而是你有没有把其中一个跑通一遍。

最省力的下一步：打开第 18 章的项目，花一个晚上把它改成 `.ts`。不用学完类型体操，只给 `Todo` 加一个 `interface`，你就会第一次感受到「编辑器在帮你写代码」。
:::
