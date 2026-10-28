---
id: 14
title: 模块化与 npm
summary: 从全局变量互相覆盖讲起，把 ESM 与 CommonJS 的写法、package.json 每个字段、npm 命令和版本号规则一次说清。
minutes: 38
keywords: 模块化 ESM CommonJS npm package.json 依赖 语义化版本 node_modules
---

> 一个人写 demo，所有代码塞进一个 HTML 也能跑。但只要开始做真项目，就必须拆文件、用别人的包。
>
> 这一章解决两个问题：**自己的代码怎么拆、怎么互相引用**，以及**别人的代码怎么装、怎么管版本**。
>
> 内容看起来偏「配置」，但它是后面所有项目的地基。第 15 章要把脚本放进页面，第 16 章要发请求，第 18 章要搭一个完整项目，全都依赖这里的 `import` 和 `package.json`。

## 为什么需要模块

先看没有模块时的真实麻烦。假设你写了两个脚本，都放在页面里：

```js
// a.js
var count = 0;

function formatPrice(cents) {
  return '¥' + (cents / 100).toFixed(2);
}

// b.js
var count = 'hello';        // 悄悄覆盖了 a.js 的 count

function formatPrice(n) {   // 又定义了一次，后加载的赢
  return n + ' 元';
}
```

页面里这样引入：

```html
<script src="./a.js"></script>
<script src="./b.js"></script>
```

因为普通 `<script>` 共享同一个全局作用域，`b.js` 里的 `count` 和 `formatPrice` 直接把 `a.js` 的覆盖了。而且谁赢完全取决于**加载顺序**：把两个标签调换一下，结果就反过来。这种 bug 不会报错，只会让某一块功能悄悄算错。

把所有代码堆在一个文件里也有类似的问题：变量名越起越长（`userListPageSize`、`userListPageSizeCache`），改一处要上下翻两千行，两个人同时改必然冲突。

模块化（modularization）解决的就是这三件事：

- **作用域隔离**：每个文件有自己的作用域，不主动导出，外面就看不见。
- **依赖明确**：文件开头写清楚「我用了谁」，不用再靠 `<script>` 的顺序猜。
- **可复用**：一个格式化函数写好，所有项目都能引。

一个模块就是一个文件，它**只暴露自己该暴露的东西**，其余内部细节全部藏起来。

拆得太碎也有代价：一个功能跨五个文件，跳来跳去看得很累。判断标准是「职责」，不是「行数」。一个文件只负责一件事，哪怕只有三十行，也是一个清楚的模块；反过来，一个文件里又发请求、又算数据、又改 DOM，就算只有一百行，也该拆。

## ES Module：现代标准

ES Module（简称 ESM）是语言层面的模块规范，浏览器和 Node 都支持。它有两个关键字：`export` 负责输出，`import` 负责输入。

### 命名导出

```js
// math.js
export const PI = 3.14159;

export function add(a, b) {
  return a + b;
}

export const multiply = (a, b) => a * b;
```

在另一个文件里按名字取：

```js
// main.js
import { add, PI } from './math.js';

console.log(add(2, 3));   // 输出: 5
console.log(PI);          // 输出: 3.14159

// 改名
import { add as sum, PI as pi } from './math.js';
console.log(sum(1, 1), pi);   // 输出: 2 3.14159

// 整体导入
import * as math from './math.js';
console.log(math.multiply(2, 4));   // 输出: 8
```

命名导出（named export）的规则：

- 一个模块可以有任意多个命名导出。
- 导入时名字必须对上，想换名字用 `as`。
- `import * as math` 把所有命名导出收进一个对象，用 `math.add` 访问。
- 用不到的东西不用导入，打包工具能把没用的代码删掉（tree-shaking）。

这里有一个初学者经常踩的坑：`import { add } from './math.js'` 的大括号**不是解构赋值**，只是语法长得很像。它不能写默认值，也不能嵌套，名字对不上就是 `undefined`。

### 默认导出

一个模块可以指定一个「主要的东西」作为默认导出：

```js
// logger.js
export default function log(message) {
  console.log('[log]', message);
}

// main.js
import log from './logger.js';
import writeLog from './logger.js';   // 名字随便取，指向同一个函数

log('开始');        // 输出: [log] 开始
writeLog('结束');   // 输出: [log] 结束
```

默认导出（default export）的特点：

- 一个模块**只能有一个**，写两个直接 `SyntaxError`。
- 导入时不用大括号，名字由导入方随便起。
- 上面同时用两个名字导入只是演示「名字自由」，真实项目里选一个就行。

默认导出和命名导出可以同时存在：

```js
// config.js
export const API_URL = 'https://api.example.com';
export const TIMEOUT = 5000;
export default { retry: 3, debug: false };

// main.js
import config, { API_URL, TIMEOUT } from './config.js';

console.log(API_URL);        // 输出: https://api.example.com
console.log(TIMEOUT);        // 输出: 5000
console.log(config.retry);   // 输出: 3
```

注意顺序：默认导出的名字写在**大括号外面、最前面**，命名导出放在大括号里。写成 `import { config, API_URL }` 会拿不到默认导出。

### 转出口与动态导入

有时候你希望做一个「统一入口」，让别处只从一个路径导入：

```js
// utils/index.js
export { add } from './math.js';
export * from './format.js';

// 注意：export * 只转发命名导出，不会把 format.js 的 default 一起导出
```

`export { add } from './math.js'` 是「导入再导出」，本文件并不会拿到 `add` 这个变量，只是把别人家的东西转手暴露出去。`export *` 会把目标模块所有命名导出都转发。

默认导出没法用 `export *` 转发，要单独写 `export { default } from './format.js'`。

还有一种**动态导入（dynamic import）**，用在「点了按钮才加载」的场景：

```js
button.addEventListener('click', async () => {
  const { drawChart } = await import('./chart.js');
  drawChart();
});
```

`import()` 是函数调用，返回 Promise，所以能 `await`。它和静态 `import` 的区别是：静态导入在文件加载时就要解析，动态导入可以晚一点，甚至根据条件决定加载哪个文件。图表、编辑器这类体积大又未必用到的功能，常用它做懒加载。

### 默认导出还是命名导出

| 对比项 | 命名导出 | 默认导出 |
| --- | --- | --- |
| 一个模块能有几个 | 任意多个 | 只能一个 |
| 导出写法 | `export const x` 或 `export { x }` | `export default ...` |
| 导入写法 | `import { x }`，名字必须对 | `import 任意名字` |
| 改名 | `import { x as y }` | 直接写想要的名字 |
| 编辑器跳转、重命名 | 好 | 差，名字是导入方起的 |
| 适合 | 工具函数、常量、多个相关功能 | 一个文件只负责一件事，比如组件、类 |

选择建议：

- 公共工具库、`utils` 目录，优先命名导出。名字固定，搜索和重构都方便。
- 一个文件就是一个组件或一个类，用默认导出更自然，React 和 Vue 项目里很常见。
- 不管选哪种，**一个项目里保持一致**。混着用会让别人猜「这个文件到底该怎么导入」。

ESM 还有一个容易被忽略的优点：导入是**静态**的。打包工具在你运行之前就能画出完整的依赖图，所以能做 tree-shaking、能做代码分割。CommonJS 的 `require` 是运行时才执行的，打包工具只能靠猜。

### 浏览器里的 ESM

浏览器原生支持 ESM，但必须声明 `type="module"`：

```html
<script type="module" src="./main.js"></script>
```

这个属性的行为和一普通脚本不同：

- **延迟执行**：默认相当于加了 `defer`，等 HTML 解析完才执行，不会阻塞页面。
- **严格模式**：模块代码自动运行在 `'use strict'` 下，未声明变量直接报错。
- **独立作用域**：模块里的顶层变量不会挂到 `window` 上，不会污染全局。
- **只执行一次**：同一个模块被多个文件导入，也只执行一遍。
- **必须通过服务器访问**：直接双击打开 `file://` 的 HTML，导入会因跨域被拦，报 CORS 错误。用 `npx serve` 或 VS Code 的 Live Server 起一个本地服务即可。CORS 是浏览器的安全策略，`file://` 被视为不安全的来源；这不是代码写错了，起服务就能解决。
- **路径要写全**：`./math.js` 不能写成 `./math`。

:::warn
浏览器原生 ESM 不认识「裸模块名」。写 `import dayjs from 'dayjs'` 会直接报错，因为浏览器不知道去 `node_modules` 里找。真实项目里这一步由 Vite、webpack 这类打包工具处理，或者用 `importmap` 手动映射。第 19 章会讲构建工具。
:::

## CommonJS：Node 的老标准

Node 刚出现时还没有 ESM，它自己实现了一套模块系统，叫 CommonJS（简称 CJS）。写法是 `require` 加 `module.exports`：

```js
// math.cjs
const add = (a, b) => a + b;
const PI = 3.14159;

module.exports = { add, PI };

// main.cjs
const { add, PI } = require('./math.cjs');

console.log(add(1, 2));   // 输出: 3
console.log(PI);          // 输出: 3.14159
```

几个要点：

- `module.exports` 决定这个文件输出什么，可以是一个对象，也可以直接是一个函数：`module.exports = add`。
- `require` 是同步执行的，执行到那一行才去加载文件。
- `require('./math')` 可以省略 `.js`，Node 会自动补全，也会自动找目录下的 `index.js`。
- `require` 返回的就是 `module.exports` 那个值，可以直接解构。

Node 生态里两种模块长期共存。判断一个项目用哪种，看两点：

- 文件后缀：`.mjs` 一定是 ESM，`.cjs` 一定是 CommonJS，`.js` 看 `package.json` 的 `type`。
- `package.json` 里 `"type": "module"` 表示 `.js` 按 ESM 解析；不写或写 `"commonjs"` 则按 CommonJS 解析。

| 对比项 | ESM | CommonJS |
| --- | --- | --- |
| 语法 | `import` / `export` | `require` / `module.exports` |
| 加载时机 | 静态解析，加载前就确定依赖 | 运行时执行到 `require` 才加载 |
| 导入的值 | 只读的实时绑定 | `module.exports` 上的值，解构后是拷贝 |
| 顶层 await | 支持 | 不支持 |
| 严格模式 | 默认开启 | 默认关闭 |
| 浏览器 | 原生支持 `type="module"` | 不支持，需要打包 |
| 典型场景 | 前端项目、新 Node 项目 | 老 Node 项目、部分工具链 |

新项目一律用 ESM。看到老代码里的 `require`，知道它是 CommonJS 就行，不用特意去改。

为什么还要学它？因为大量老项目、脚手架配置和 Node 工具链仍在用 CommonJS。你看到 `require` 和 `module.exports` 时不至于发懵，也能判断一个报错是不是模块规范不匹配造成的。

:::warn
ESM 文件里不能直接用 `require`，会报 `ReferenceError: require is not defined`。反过来，CommonJS 里也不能直接写 `import`。一个项目里两种语法不能混在同一个文件里（动态 `import()` 除外，它在两种模块里都能用）。
:::

## package.json：项目的身份证

每个 Node 项目根目录都有一个 `package.json`，它记录项目叫什么、怎么跑、依赖哪些包。

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "node --watch server.js",
    "start": "node server.js"
  },
  "dependencies": {
    "dayjs": "^1.11.10"
  },
  "devDependencies": {
    "eslint": "^8.57.0"
  }
}
```

逐个字段说：

- `name`：包名。只能小写，不能有空格，发布到 npm 时还必须全局唯一。本地项目随便起，但别用中文。
- `version`：版本号，格式是「主版本.次版本.修订号」，下面会细讲。
- `type`：决定 `.js` 文件按哪种模块解析。写 `"module"` 就是 ESM，不写就是 CommonJS。这一行是新手最常见的「import 报错」来源。代码里写了 `import`，运行却报 `SyntaxError: Cannot use import statement outside a module`，九成就是漏了它。
- `scripts`：命令别名。`npm run dev` 实际执行的就是这里的 `node --watch server.js`。
- `dependencies`：**运行时**需要的包。代码里 `import` 了谁，谁就该在这里。
- `devDependencies`：只在开发、构建、测试时用的包，比如 ESLint、Vite、测试框架。它们不会被打进最终产物。

为什么要把两类依赖分开？因为部署时服务器只需要 `dependencies`。构建工具装到 `devDependencies`，生产环境就能少装几百 MB，也不会把只在本地用的东西带上去。

判断标准很简单：**这段代码在用户打开网页时还会运行吗？** 会，就是 `dependencies`；只在开发时跑，就是 `devDependencies`。

`npm init -y` 会生成一个最小 `package.json`，`-y` 表示所有问题都用默认值，不再一条条问你。

## npm 常用命令

npm 是 Node 自带的包管理器。下面这些命令覆盖日常 95% 的操作：

```bash
npm init -y              # 生成 package.json
npm install dayjs        # 安装到 dependencies
npm install -D eslint    # 安装到 devDependencies
npm uninstall dayjs      # 卸载，同时从 package.json 移除
npm install             # 不带包名：按 package.json 和 lock 还原全部依赖
npm ls --depth=0         # 只看顶层装了哪些包
```

拿到别人的项目，第一步永远是 `npm install`。它会读 `package.json`，再结合 `package-lock.json` 把依赖装进 `node_modules`。不带包名时，它先按 `package.json` 里的范围解析，再让 lock 文件把版本钉死；两者不一致时，以 `package.json` 为准并更新 lock。

CI 环境更推荐 `npm ci`：它要求 lock 与 `package.json` 完全一致，装完不改 lock，速度也更快，适合自动化流程。

运行脚本和临时工具：

```bash
npm run dev              # 执行 scripts 里的 dev
npm run build            # 执行 scripts 里的 build
npx eslint .             # 运行本地装的 eslint，不用全局安装
npx create-vite my-app   # 临时下载脚手架并执行
```

`npm run` 只能执行 `scripts` 里定义过的名字，写错会提示「Missing script」。`npx` 则会先找本地 `node_modules/.bin`，找不到再临时下载，用完即走，不会污染全局环境。

## 语义化版本：`^` 和 `~` 到底放多宽

版本号 `1.11.10` 读作「主版本 1、次版本 11、修订号 10」。语义化版本（semver）约定：

- 主版本变了：可能有**不兼容**的改动，升级要小心。
- 次版本变了：新增功能，向后兼容。
- 修订号变了：修 bug，向后兼容。

`package.json` 里写的往往不是一个精确版本，而是一个范围：

```json
{
  "dependencies": {
    "dayjs": "^1.11.10",
    "echarts": "~5.5.1",
    "lodash": "4.17.21"
  }
}
```

| 写法 | 允许的范围 | 含义 |
| --- | --- | --- |
| `^1.11.10` | `>=1.11.10 <2.0.0` | 不跨主版本，次版本和修订号都可以升 |
| `~5.5.1` | `>=5.5.1 <5.6.0` | 只允许修订号升级 |
| `4.17.21` | 只有 `4.17.21` | 精确锁定 |
| `*` 或 `latest` | 任意版本 | 不要用，今天能跑明天可能就崩 |

`npm install dayjs` 默认写入 `^`，这是 npm 认为比较安全的策略：修 bug 和新功能自动拿，破坏性改动不碰。

但 `^` 有一个特殊情况：**主版本是 0 时，它更保守**。`^0.2.3` 的范围是 `>=0.2.3 <0.3.0`，因为 0.x 被视为「还在不稳定阶段」，次版本也可能破坏兼容。`^0.0.3` 更窄，只允许 `0.0.3` 本身。

理解这些符号的实际意义：`^` 不是「随便升」，`~` 也不是「完全锁定」。真正锁定精确版本的是 lock 文件。

## package-lock.json 与 node_modules

`package.json` 写的是「我想要什么范围」，`package-lock.json` 记录的是「上次实际装了什么」：

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "lockfileVersion": 3,
  "packages": {
    "node_modules/dayjs": {
      "version": "1.11.13",
      "resolved": "https://registry.npmjs.org/dayjs/-/dayjs-1.11.13.tgz"
    }
  }
}
```

它包含每个包的确切版本、下载地址、完整性校验值，以及完整的依赖树。作用是**让所有人装出一模一样的依赖**。没有它，你写 `^1.11.10`，同事下周装可能拿到 `1.11.14`，线上又是另一个版本，出现「我这能跑你那不能跑」。

所以：`package-lock.json` **必须提交到 Git**。CI 环境用 `npm ci` 安装，它只按 lock 文件装，不会修改 lock，速度也更快。

判断一个仓库是否规范，看两件事就够了：有没有 lock 文件，`.gitignore` 里有没有 `node_modules`。这两条能避免大部分「在我电脑上能跑」的问题。

`node_modules` 则是依赖实际解压后的目录：

- 体积巨大，几万个文件很常见。
- 包含平台相关的二进制文件，换操作系统可能不适用。
- 可以完全由 `package.json` + lock 文件还原，没必要存进 Git。

因此项目根目录要有 `.gitignore`：

```text
node_modules/
dist/
.env
```

`dist/` 是构建产物，同样能重新生成；`.env` 存密钥，绝对不能提交。这三个是前端项目最常见的忽略项。

:::warn
不要手动修改 `node_modules` 里的代码。下次 `npm install` 一覆盖就没了，而且别人拉下来也不会有你的改动。确实需要修补第三方包，用 `patch-package` 或在本地 fork，别直接改。
:::

## 本地依赖与全局安装

| 方式 | 命令 | 装在哪 | 谁能用 |
| --- | --- | --- | --- |
| 本地 | `npm install dayjs` | 项目 `node_modules` | 只有当前项目 |
| 全局 | `npm install -g pnpm` | 系统目录 | 所有项目 |
| 临时 | `npx vite` | 缓存，用完即走 | 这一次 |

建议：

- **项目依赖一律本地装**，版本写进 `package.json`，别人 `npm install` 就能还原。
- **命令行工具优先用 `npx`**，避免全局装一堆版本冲突的东西。
- 只有包管理器本身（pnpm、yarn）或确实需要全局命令的工具，才用 `-g`。

全局安装最大的问题是版本只有一个。项目 A 要 Vite 4，项目 B 要 Vite 5，全局装哪个都不对。本地安装则每个项目互不影响。

还有一个细节：全局包的版本不受项目控制，团队成员之间很难对齐。把命令写进 `scripts`，所有人执行 `npm run xxx` 时用的就是项目本地版本，这才是可复现的做法。

## `import` 路径的规则

路径写错是模块化阶段最常见的报错。规则其实不多：

```js
import './polyfill.js';                        // 只为执行，不取任何变量
import { add } from './math.js';               // 同级目录，必须 ./ 开头
import { formatPrice } from '../utils/format.js';
import dayjs from 'dayjs';                     // 裸模块名，去 node_modules 找
import { readFile } from 'node:fs/promises';   // Node 内置模块
```

- **相对路径必须以 `./` 或 `../` 开头**。写 `'math.js'` 会被当成包名，去 `node_modules` 里找，然后报找不到。
- **Node 的 ESM 必须写扩展名**。`./math` 不行，要 `./math.js`。浏览器原生 ESM 同理。
- **ESM 不会自动找目录下的 `index.js`**。`./utils` 不行，要 `./utils/index.js`。
- 裸模块名（bare specifier）指包名，比如 `dayjs`，由 Node 或打包工具负责解析。
- `node:` 前缀表示 Node 内置模块，比如 `node:fs`、`node:path`，加上前缀能避免和同名第三方包混淆。
- `@/` 这类别名不是语言特性，需要打包工具或 `tsconfig` 配置，浏览器原生不认识。

:::warn
CommonJS 的 `require` 宽松得多：可以省 `.js`，可以指向目录自动找 `index.js`。所以从老项目迁到 ESM 时，一批「本来能跑」的导入会突然报 `ERR_MODULE_NOT_FOUND`。这不是 ESM 坏了，是它不再帮你猜。
:::

## 一个最小的 ESM 项目

把上面的知识拼起来，一个能跑的项目长这样：

```text
my-app/
  package.json
  src/
    main.js
    utils/
      format.js
```

```js
// src/utils/format.js
export function formatPrice(cents) {
  return '¥' + (cents / 100).toFixed(2);
}

// src/main.js
import { formatPrice } from './utils/format.js';

console.log(formatPrice(4998));   // 输出: ¥49.98
```

```bash
node src/main.js
# 输出: ¥49.98
```

要让这段代码跑起来，`package.json` 里必须有 `"type": "module"`。否则 Node 会把 `main.js` 当 CommonJS 解析，遇到 `import` 直接报：

```text
SyntaxError: Cannot use import statement outside a module
```

这句话的意思是「你在一个非模块文件里用了 import」。九成的解决办法就是加 `"type": "module"`，或者把文件后缀改成 `.mjs`。

注意 `formatPrice` 接收的是「分」，输出时除以 100。这个约定来自第 2 章讲的浮点精度问题：金额用整数分存储和计算，只在展示时转成元。

## 常见误区清单

| 写法 | 结果 | 为什么 |
| --- | --- | --- |
| 忘了 `"type": "module"` 就在 `.js` 里写 `import` | `SyntaxError: Cannot use import statement outside a module` | Node 默认按 CommonJS 解析 `.js` |
| Node ESM 里 `import { add } from './math'` | `ERR_MODULE_NOT_FOUND` | ESM 不猜扩展名，要写 `./math.js` |
| 模块只有默认导出，却写 `import { log }` | `log` 是 `undefined` | 默认导出要用 `import log from` |
| 一个文件写两个 `export default` | `SyntaxError` | 默认导出只能有一个 |
| 用 `export *` 想连带默认导出 | 默认导出不会出现 | `export *` 只转发命名导出 |
| 把 `node_modules` 提交到 Git | 仓库巨大、冲突不断 | 可由 lock 文件还原，且含平台相关文件 |
| `npm install -D dayjs` 后在运行时代码里用 | 生产环境可能找不到模块 | 开发依赖不会装进生产依赖 |
| `^0.2.3` 以为能升到 `0.9` | 实际只到 `0.2.x` | 0.x 视为不稳定，只放宽修订号 |
| 在 ESM 里写 `require` | `ReferenceError: require is not defined` | ESM 没有 `require`，要用 `import` |
| 循环导入时立刻使用对方的值 | 可能得到 `undefined` | 对方模块还没执行完，绑定尚未初始化 |
| `import './utils'` 指望自动找 `index.js` | 找不到模块 | ESM 不自动补目录和扩展名 |

## 通勤自测

:::quiz `export default` 和 `export const` 有什么区别？
`export default` 每个模块只能有一个，导入时名字随便取、不用大括号；`export const` 是命名导出，可以有多个，导入时必须用对应名字，想改名用 `as`。
:::

:::quiz 一个模块只写了 `export default function log() {}`，另一个文件写 `import { log } from './logger.js'`，会发生什么？
`log` 是 `undefined`，调用时才会报 `log is not a function`。默认导出必须用 `import log from './logger.js'`，不能加大括号。
:::

:::quiz `^1.2.3` 和 `^0.2.3` 分别允许升到哪个范围？
`^1.2.3` 允许 `>=1.2.3 <2.0.0`；`^0.2.3` 允许 `>=0.2.3 <0.3.0`。主版本为 0 时，npm 认为还不稳定，caret 只放宽修订号。
:::

:::quiz `node_modules` 为什么不提交到 Git？删掉后项目还能恢复吗？
它体积大、文件多、含平台相关二进制，而且能由 `package.json` 加 `package-lock.json` 完整还原。删掉后执行 `npm install` 即可恢复。
:::

:::quiz `npm install dayjs` 和 `npm install -D dayjs` 有什么区别？
前者写入 `dependencies`，表示运行时需要；后者写入 `devDependencies`，只在开发、构建、测试时需要。装错会影响生产环境安装和产物体积。
:::

:::quiz 在 Node 里写 `import { add } from './math.js'` 报 `Cannot use import statement outside a module`，最可能的原因是什么？
`package.json` 里没有 `"type": "module"`，Node 把 `.js` 当成了 CommonJS。加上这一行，或把后缀改成 `.mjs`。
:::

:::quiz `export * from './format.js'` 会把 `format.js` 的默认导出一起转出去吗？
不会。`export *` 只转发命名导出。要转发默认导出，得单独写 `export { default } from './format.js'`。
:::

## 动手练习（到电脑上做）

**必做**

1. 新建一个空文件夹，执行 `npm init -y`，安装 `dayjs`，在 `package.json` 里加上 `"type": "module"`，写 `main.js` 用 `dayjs` 打印当前时间。
   验收：`node main.js` 能输出格式化后的时间；`dependencies` 里有 `dayjs`；`node_modules` 目录存在。

2. 把上一章练习里的「格式化金额」和「打印结果」拆成两个文件：`utils/format.js` 用命名导出，`main.js` 用 `import { formatPrice } from './utils/format.js'` 引入。
   验收：`node main.js` 输出 `¥49.98`；把 `format.js` 改名为 `format.js` 以外的名字后，导入路径同步修改才能跑，说明依赖是显式的。

3. 在 `package.json` 的 `scripts` 里加 `"hello": "node main.js"`，用 `npm run hello` 执行。
   验收：`npm run hello` 输出与 `node main.js` 一致；故意写 `npm run helo` 会提示缺少脚本。

**进阶**

4. 建一个 `utils/index.js`，用 `export { formatPrice } from './format.js'` 和 `export * from './math.js'` 做统一出口，`main.js` 只从 `./utils/index.js` 导入。
   验收：`main.js` 里不出现 `./utils/format.js`；两个模块的函数都能正常调用；能解释为什么 `export *` 不会带上默认导出。

5. 找一个开源前端项目的 `package.json`，列出 `dependencies` 和 `devDependencies` 各三个包，说明它们分别做什么；再看它的版本范围，指出哪个包允许跨次版本升级。
   验收：能正确区分运行时依赖和构建依赖；能说出 `^` 与 `~` 在该项目里的实际范围；能指出 `package-lock.json` 是否存在。

:::tip
这一章的命令和配置，第一次做会觉得琐碎，但它们是后面每一章的起点：第 15 章会往 `index.html` 里放 `<script type="module">`，第 16 章的 `fetch` 要跑在本地服务器上，第 18 章会把待办项目拆成多个模块，第 19 章会用 Vite 管理依赖和构建。

真正需要形成肌肉记忆的只有四件事：**导入路径写全 `./` 和扩展名**、**`type: module` 别忘了**、**运行时依赖和开发依赖分开放**、**`node_modules` 不进 Git**。其余细节遇到再查。
:::
