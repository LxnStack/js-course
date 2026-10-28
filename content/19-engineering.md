---
id: 19
title: 从脚本到工程
summary: 把三个文件的练手项目变成可维护的工程：目录职责、npm 脚本、Vite 构建、代码规范、Git 版本管理与静态部署的完整流程。
minutes: 38
keywords: 工程化 目录结构 package.json Vite 构建 dist Prettier ESLint gitignore Git 部署 README
---

> 第 18 章的待办清单能跑，但它只有三个文件、一百多行代码。真实项目会有十几个页面、几十个文件，可能还有别人和你一起改。
>
> 这一章讲「能跑」到「可维护」之间差的那一层：目录怎么分、命令怎么跑、代码怎么统一风格、版本怎么管、产物怎么发出去。
>
> 学完你能把一个散装脚本改造成标准项目，推到 GitHub，并得到一个可以发给别人的网址。

## 为什么需要它

先看一个典型的三文件项目，所有逻辑都在 `app.js` 里：

```js
// app.js：所有东西挤在一个文件里
const form = document.querySelector('#todo-form');
const input = document.querySelector('#todo-input');
const list = document.querySelector('#todo-list');
let todos = JSON.parse(localStorage.getItem('todos') ?? '[]');

function render() {
  list.innerHTML = todos
    .map((todo) => `<li data-id="${todo.id}">${todo.text}</li>`)
    .join('');
}

function save() {
  localStorage.setItem('todos', JSON.stringify(todos));
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (text === '') return;

  todos.push({ id: Date.now(), text, done: false });
  input.value = '';
  save();
  render();
});

list.addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li) return;

  todos = todos.filter((todo) => todo.id !== Number(li.dataset.id));
  save();
  render();
});

render();
```

```text
第一周：不到 40 行，找 render 只要往上看两屏
三个月后：600 行，render 里藏了 4 个函数，save 被调用 7 次，formatDate 没人记得在哪
```

同样的功能拆成三个文件，每个只有十几行：`store.js` 管 `todos` 和存取，`render.js` 只管画，`main.js` 只绑事件。改筛选逻辑打开 `render.js`，改存储格式打开 `store.js`，互不牵连。这不是「文件多显得专业」，而是把「改一处要先读懂一整片」变成「改一处只看一个文件」。

代码本身没有变坏，是**规模**变了。几十行时，所有东西在一个文件里反而最快；六百行时，你每次改动都要先读懂一整片，改完还不知道有没有碰坏别处。

工程化解决的正是这件事，它不产生新功能，只让项目在变大之后仍然能改：

| 问题 | 散装脚本的做法 | 工程化的做法 |
| --- | --- | --- |
| 文件太多找不到 | 全堆在一个文件 | 按职责分目录，改功能只开一个文件夹 |
| 换电脑跑不起来 | 口头说「先装个东西」 | `package.json` 记录依赖，一条 `npm install` 还原 |
| 改坏了想退回 | 手动复制备份，`app-final-2.js` | Git 提交记录，随时回滚 |
| 上线要手动拷文件 | 拖进服务器，漏一个就白屏 | `npm run build` 生成固定产物，整包上传 |
| 两个人格式打架 | 互相改缩进 | Prettier 统一格式，ESLint 拦问题 |

这一章按真实项目的顺序走：先定目录，再跑命令，再管代码和版本，最后发出去。

工程化不是一张「必须全部配齐」的清单。三个文件的小项目，`npm install` 都不用跑，直接开服务器就能写；等到文件超过十个、开始有依赖、需要给别人看时，再一项一项加。判断标准是「这件事有没有开始让你重复劳动或反复出错」：每次都手动改接口地址，就该上环境变量；每次部署都漏文件，就该用构建命令。

## 目录结构：先定边界，再写代码

Vite 建出来的项目自带一套结构，先认识它：

```text
todo-app/
├── index.html              # 入口 HTML，Vite 会直接用它
├── package.json            # 项目说明 + 依赖 + 命令
├── vite.config.js          # 构建与开发服务器配置（需要时新建）
├── public/                 # 原样拷贝到产物的静态文件
│   └── favicon.ico
├── src/
│   ├── main.js             # 入口：只负责启动
│   ├── style.css
│   ├── components/         # 界面组件
│   │   ├── TodoItem.js
│   │   └── TodoFilters.js
│   ├── utils/              # 纯函数工具
│   │   ├── storage.js
│   │   └── format.js
│   └── api/                # 请求封装
│       └── todos.js
└── dist/                   # 构建产物，不提交
```

| 路径 | 放什么 | 不该放什么 |
| --- | --- | --- |
| `index.html` | 页面骨架、`<script type="module">` 入口 | 大段业务逻辑 |
| `src/main.js` | 启动代码：查元素、绑事件、调渲染 | 具体业务规则 |
| `src/components/` | 可复用的界面单元 | 全局状态、请求 |
| `src/utils/` | 与界面无关的纯函数 | 依赖 DOM 的代码 |
| `src/api/` | 请求函数、接口地址 | 直接改页面的代码 |
| `public/` | 不会被处理的静态文件 | 需要 `import` 的模块 |
| `dist/` | 构建结果 | 手改这里的文件 |

`public/` 和 `src/` 的区别值得单独记：`public/` 里的文件会被**原样**拷到产物根目录，路径直接写 `/favicon.ico`；`src/` 里的文件会经过 Vite 处理、改名、加 hash，必须用 `import` 引入。放错地方的典型症状是「图片在开发时能显示，构建后 404」。

### 按功能拆，不是按类型堆

小项目用 `components/`、`utils/` 这种按类型分的方式没问题。项目一大，问题就出来了：`utils/` 会变成垃圾场，三十个不相关的函数挤在一起，谁也不敢删。

更耐用的分法是按功能：

```text
src/
├── main.js
├── todo/
│   ├── todoStore.js        # 数据和增删改
│   ├── todoList.js         # 列表渲染
│   ├── todoItem.js         # 单条渲染
│   └── todo.css            # 只属于待办模块的样式
├── auth/
│   ├── authStore.js
│   └── loginForm.js
└── shared/
    ├── storage.js          # 多个功能都用得到的
    └── format.js
```

判断标准很实际：**改一个功能时，你希望只打开一个目录**。删掉一个功能时，直接删掉整个文件夹，不用去五个地方找残留。`shared/` 只放真的被两个以上功能用到的东西，只有一个功能用，就放在那个功能目录里。

## package.json 的 scripts

项目怎么启动、怎么构建，不该靠口头传递，而该写进 `package.json`：

```json
{
  "name": "todo-app",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "format": "prettier --write ."
  }
}
```

- `private: true` 防止手滑把项目发布到 npm
- `type: "module"` 让 `.js` 按 ESM 解析，能直接写 `import`（第 14 章讲过）
- `scripts` 里每一行都是「命令别名」，`npm run dev` 实际执行的就是 `vite`

| 命令 | 实际执行 | 什么时候用 |
| --- | --- | --- |
| `npm run dev` | 启动开发服务器 | 每次写代码 |
| `npm run build` | 打包到 `dist/` | 准备部署 |
| `npm run preview` | 本地预览 `dist/` | 部署前自检 |
| `npm run lint` | 检查代码问题 | 提交前 |
| `npm run format` | 格式化全部文件 | 提交前，或第一次接手项目 |

`npm run` 不带参数会列出所有可用脚本，记不住名字时先跑它。写错名字会提示 `Missing script: xxx`，不是代码错了，是名字对不上。

## Vite：现代前端项目的起点

从零建一个项目，只需要一条命令：

```bash
# 在你想放项目的父目录执行，例如 D:\code
npm create vite@latest todo-app -- --template vanilla

# 进入新建的项目目录
cd todo-app

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

终端会打印本地地址，通常是 `http://localhost:5173/`。版本号和启动耗时以你实际看到的为准。打开这个地址就能看到模板页面。

`--template vanilla` 是纯 JS 模板，适合先理解结构。熟悉之后可以换 `vanilla-ts`、`vue`、`react`。模板之间差的是语法和目录，工程流程是一样的。

### Vite 到底解决了什么

在 Vite 之前，前端项目要自己拼一套工具链：打包器、开发服务器、热更新、代理，配置动辄上百行。Vite 把这些收进一个配置文件，默认就能用：

| 能力 | 开发时 | 构建时 |
| --- | --- | --- |
| 开发服务器 | 启动快，改文件自动刷新 | 不参与 |
| 热更新（HMR） | 改样式不丢页面状态 | 不参与 |
| 模块解析 | 直接 `import` npm 包，不用写完整路径 | 把依赖打进产物 |
| 构建优化 | 不参与 | 压缩、合并、加 hash、按需拆分 |
| 代理 | 把 `/api` 转发到后端，绕开跨域 | 不参与 |
| 环境变量 | 读取 `.env` 文件 | 把值写进产物 |

热更新（Hot Module Replacement）值得体会一次：改 CSS 时页面不刷新、输入框里的字还在；改 JS 时只替换那个模块。这个小体验会直接影响你写代码的速度。

### 三个命令，各管一段

```bash
# 都在 todo-app 目录执行

npm run dev        # 开发：本地服务器 + 热更新，代码不压缩
npm run build      # 构建：压缩、加 hash，输出到 dist/
npm run preview    # 预览：用本地服务器跑 dist/，模拟线上
```

`dev` 和 `build` 产出的东西不一样。开发时为了快，模块是分开加载的、代码不压缩、带完整的调试信息；构建时为了省流量和加载速度，会合并、压缩、删掉没用到的代码，文件名带上内容 hash。所以「开发时能跑」不等于「构建后能跑」，`preview` 就是用来提前发现这种落差的。

### 配置文件：base 与 proxy

Vite 默认不需要配置。遇到下面两种情况才新建 `vite.config.js`：

```js
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/todo-app/',
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
```

`base` 管部署路径。项目放在域名根目录（`https://example.com/`）时不用写；放在子路径（`https://example.com/todo-app/`）时必须写，否则构建产物里的 `/assets/...` 会去域名根目录找文件，页面白屏。

`server.proxy` 管开发时的跨域。页面在 `5173`，接口在 `3000`，端口不同就是跨源（第 16 章讲过）。浏览器看来 `/api/todos` 和页面同源，实际由 Vite 转发给后端。**代理只在开发时生效**，上线后要靠后端配 CORS 或同域部署。

改完配置文件要重启 `npm run dev`，热更新不会重载配置。

### dist 是什么，为什么不能双击打开

构建之后，项目根目录多出一个 `dist/`：

```text
dist/
├── index.html
└── assets/
    ├── index-B1x2y3.js
    └── index-C4z5w6.css
```

里面的文件就是最终要上传的东西。`assets` 后面的 `B1x2y3` 是内容 hash：文件内容一变，名字就变，浏览器就不会拿旧缓存。这是构建工具替你做的缓存策略。

新手最容易卡在这里：双击 `dist/index.html`，页面白屏，控制台报错。原因有两个，同时存在：

- 构建后的 HTML 引用的是 `/assets/index-B1x2y3.js` 这种**绝对路径**，`file://` 下会被解析成磁盘根目录，找不到文件
- 构建后的脚本是 `type="module"`，`file://` 下源是 `null`，浏览器按跨源规则直接拦截

正确做法是用服务器打开：

```bash
# 在 todo-app 目录执行
npm run preview
```

它会启动一个本地静态服务器，行为和线上一致。想验证部署效果，就用它，而不是双击文件。

:::warn
不要手动改 `dist/` 里的文件。下次 `npm run build` 会把整个目录覆盖，改动全部消失。要改就改 `src/`，再重新构建。
:::

## 代码风格：Prettier 与 ESLint

两个人写代码，最先吵起来的往往是格式：用单引号还是双引号、要不要分号、缩进两格还是四格。这类争论没有意义，交给工具。

| 工具 | 管什么 | 不管什么 | 怎么处理 |
| --- | --- | --- | --- |
| Prettier | 格式：缩进、引号、换行、行宽 | 逻辑错误 | 直接改写文件 |
| ESLint | 问题：未使用变量、可疑比较、可能的 bug | 缩进好不好看 | 报告，部分可自动修 |

一句话区分：**Prettier 让代码长得一样，ESLint 让代码少犯错**。两个都要，不要用一个替代另一个。

```bash
# 在项目根目录执行
npm install -D prettier eslint @eslint/js
```

`-D` 表示装进 `devDependencies`：它们只在开发和检查时用，不会进最终产物（第 14 章讲过两类依赖的区别）。

Prettier 的配置放在项目根目录的 `.prettierrc` 里，内容是一段 JSON：`{"singleQuote": true, "semi": true, "printWidth": 100}`。团队统一用单引号、保留分号、一行最多 100 个字符，之后谁也不用再讨论。

```js
// eslint.config.js
import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    rules: {
      'no-unused-vars': 'warn',
    },
  },
];
```

这是 ESLint 9 起的扁平配置（flat config），数组里每一项都是一组规则。`js.configs.recommended` 是官方推荐规则，先从这里开始，别一上来把规则开到最严——你会花一整天改格式，而不是学东西。

在 VS Code 里装 ESLint 和 Prettier 两个插件，打开 `editor.formatOnSave`，保存时自动格式化。团队协作时，这两个工具能消掉大部分无关 diff。

:::warn
不要让 Prettier 和 ESLint 的格式规则互相打架。格式全部交给 Prettier，ESLint 只留代码质量规则，关掉它里面所有和排版相关的规则。否则保存一次，两个工具来回改。
:::

## .gitignore 与环境变量

有些文件不该进仓库。项目根目录建一个 `.gitignore`：

```text
node_modules/
dist/
.env
.env.local
.DS_Store
*.log
```

| 条目 | 为什么忽略 |
| --- | --- |
| `node_modules/` | 几万个文件、几百 MB，可由 `package.json` 加 lock 文件完整还原 |
| `dist/` | 构建产物，每次构建都变，提交只会制造巨大 diff |
| `.env` | 可能含密钥、本地地址，不同人不一样 |
| `.env.local` | 个人本机配置，优先级高于 `.env` |
| `.DS_Store` | macOS 自动生成的目录元数据，与项目无关 |
| `*.log` | 运行日志，随时会变 |

`package-lock.json` 则**必须提交**。它锁定每个依赖的确切版本，没有它，你和同事装出来的依赖可能不是同一套（第 14 章讲过）。

### 环境变量：同一份代码，不同地址

本地接口在 `localhost:3000`，线上在别的域名。把地址写死在代码里，每次部署都要改一遍，迟早出错。Vite 的做法是读 `.env` 文件：

```bash
# 在项目根目录新建 .env.local，这个文件不提交
VITE_API_BASE=http://localhost:3000/api
```

```js
const base = import.meta.env.VITE_API_BASE;
console.log(base);

// 输出: http://localhost:3000/api
```

规则只有两条：

- 只有 `VITE_` 开头的变量会被注入前端代码，其他的读不到
- 变量值在**构建时**就被替换成字符串，不是运行时查询

第二条决定了一件重要的事：**前端没有秘密**。构建后的 JS 是公开文件，任何人打开开发者工具都能看到里面的字符串。把 API 密钥、数据库密码写进 `VITE_XXX`，等于把它贴在网页上。

```js
// 错误：以为藏在前端里就安全
const key = import.meta.env.VITE_SECRET_KEY;

// 正确：密钥留在后端，前端只调自己的接口
const res = await fetch('/api/weather');
```

需要保密的调用，一律由后端代发。前端只知道「调哪个接口」，不知道密钥。

## Git 最小工作流

Git 是版本管理工具。你不需要精通分支模型，先掌握这一组命令，就能覆盖日常开发的大部分场景：

```bash
# 都在项目根目录执行

git init                              # 把当前目录变成 Git 仓库，只需一次
git status                            # 看哪些文件改了、哪些已暂存
git add index.html src/main.js        # 把指定文件放进暂存区
git commit -m "feat: 完成添加和删除"    # 生成一次提交
git log --oneline                     # 看提交历史，一行一条
git branch                            # 列出本地分支，当前分支带 *
git switch -c feature-filter          # 新建并切换到 feature-filter 分支
git switch main                       # 切回 main
git merge feature-filter              # 把 feature-filter 合并进当前分支
git remote add origin <仓库地址>       # 给远程仓库起名 origin，只需一次
git push -u origin main               # 第一次推送，并建立跟踪关系
git pull                              # 拉取远程的新提交并合并
```

`git status` 是你最该常用的命令。不确定现在是什么状态、哪些文件会被提交，先跑它，输出会直接告诉你下一步该 `add` 还是 `commit`。默认分支名可能是 `main`，也可能是 `master`，用 `git branch` 确认，后面命令里照着自己仓库的名字写。

### 四个区域，理解这张图就够了

| 区域 | 东西在哪 | 对应命令 |
| --- | --- | --- |
| 工作区 | 你正在编辑的文件 | 改完就是「已修改」 |
| 暂存区 | 准备进下一次提交的改动 | `git add` |
| 本地仓库 | 已经提交的历史 | `git commit` |
| 远程仓库 | GitHub 上的副本 | `git push` / `git pull` |

`git add` 是「挑选」，`git commit` 是「存档」。没有暂存内容时，`git commit` 会提示没有要提交的改动；`add` 了不想提交的文件，`git restore --staged <文件>` 可以拿出来。

### 分支：给改动开一条支线

`main` 是主线，能跑的版本放这里。做新功能时开一条分支，做完再合并：

```bash
# 在项目根目录执行
git switch -c feature-filter     # 从当前分支切一条新分支
# ... 改代码、add、commit ...
git switch main                  # 回到主线
git merge feature-filter         # 把支线合并进来
git branch -d feature-filter     # 合并完删掉支线
```

分支的意义是隔离：功能写到一半发现主线有急 bug，先把支线上的改动 `commit`，再切回 `main` 修；未完成的部分留在支线上，不会互相污染。一个人开发也用得上，它是「同时只做一件事」的工具。

### commit message 怎么写

提交信息不是写给机器看的，是写给三天后的自己看的。用前缀标明这次改动的性质：

| 前缀 | 用于 | 例子 |
| --- | --- | --- |
| `feat:` | 新功能 | `feat: 支持按状态筛选` |
| `fix:` | 修 bug | `fix: 刷新后完成状态丢失` |
| `docs:` | 文档 | `docs: 补充部署步骤` |
| `refactor:` | 重构，行为不变 | `refactor: 把渲染拆成 renderList` |
| `style:` | 只改格式 | `style: 统一缩进` |
| `chore:` | 依赖、配置等杂事 | `chore: 升级 vite` |

```text
# 三天后看不懂的提交
update
修改
aaa
再改一下

# 一眼知道改了什么
feat: 支持按状态筛选待办
fix: 刷新后完成状态丢失
refactor: 把渲染逻辑从 main.js 拆出去
```

一条好的提交信息说清「做了什么」，不要写「优化代码」这种无法验证的话。一次提交只做一件事，回滚时才好挑。

## README 该写什么

别人打开你的仓库，第一眼看到的就是 README。它要回答三个问题：这是什么、怎么跑起来、长什么样。

```text
# 待办清单

一个用原生 JS 写的待办应用，支持添加、删除、筛选和本地保存。

## 功能

- 添加、删除、勾选完成
- 全部 / 未完成 / 已完成 筛选
- 数据保存在浏览器本地，刷新不丢

## 本地运行

npm install
npm run dev

打开终端提示的地址（通常是 http://localhost:5173）。

## 构建与部署

npm run build
产物在 dist/，上传到任意静态托管平台即可。

## 技术栈

原生 JS、Vite、localStorage

## 截图

（这里放一张真实截图）
```

四件事缺一不可：一句话说明、功能列表、运行命令、一张截图。截图比十行描述有效，招聘方和同学都先看图。

不要写开发日志。README 是给「第一次来的人」看的，不是给你自己记进度用的。进度用 commit 记录。

## 部署：把 dist 交给托管平台

静态网站不需要服务器程序，只要有人帮你把文件放到能访问的地方：

```bash
# 在项目根目录执行
npm run build      # 生成 dist/
npm run preview    # 本地确认 dist/ 能正常跑
```

确认没问题后，把整个 `dist/` 上传。常见选择：

| 平台 | 适合 | 要注意 |
| --- | --- | --- |
| GitHub Pages | 个人项目、作品集，免费 | 子路径要配 `base`，单页应用要处理刷新 404 |
| Vercel / Netlify / Cloudflare Pages | 连仓库，推送自动部署 | 构建命令填 `npm run build`，输出目录填 `dist` |
| 对象存储 + CDN | 国内访问稳定，成本低 | 需要自己配 HTTPS 和缓存策略 |

选平台时先看两件事：能不能连上 Git 仓库自动部署，以及你的访问者主要在哪里。自己练手用免费平台足够，不必先买服务器——静态站点没有后端，买服务器只是多一份要维护的东西。

部署后最常见的两个问题：

**首页白屏。** 九成是 `base` 没配。项目地址是 `https://name.github.io/todo-app/`，资源却按 `/assets/...` 请求，跑到了 `name.github.io/assets`。在 `vite.config.js` 里写 `base: '/todo-app/'`，重新构建再上传。

**刷新 404。** 单页应用的路由由前端管，服务器上并没有 `/todo/1` 这个文件。刷新时服务器找不到，返回 404。需要在托管平台配置「找不到就返回 `index.html`」，GitHub Pages 上常见的做法是复制一份 `index.html` 改名 `404.html`。

:::warn
上线前把 `localhost` 从代码里清干净。接口地址、图片地址、跳转链接，只要有一个还指向本机，别人打开就是坏的。用环境变量管理地址，构建前检查一遍。
:::

## 一次完整的交付流程

把上面的内容串起来，从零到上线是这五步：

```bash
# 1. 建项目（只需一次），在父目录执行
npm create vite@latest todo-app -- --template vanilla
cd todo-app
npm install

# 2. 开发（每次开始工作），在项目根目录执行
npm run dev

# 3. 提交（每完成一个小功能）
git add .
git commit -m "feat: 支持筛选和计数"
git push

# 4. 构建与自检
npm run build
npm run preview

# 5. 把 dist/ 上传到静态托管平台
```

第一次执行第 3 步之前，要先在 GitHub 建一个空仓库，并在项目里跑一次 `git remote add origin <仓库地址>` 和 `git push -u origin main`。之后每条功能提交完，直接 `git push` 就行。

这套流程走通一次，你就具备了「把东西做出来并让别人看到」的能力。它比多背 100 个 API 有用，因为面试和合作看的都是能打开的链接，而不是你「学过」。

## 常见误区清单

| 写法 | 结果 | 为什么 |
| --- | --- | --- |
| 把 `node_modules` 提交 | 仓库几百 MB，克隆极慢 | 依赖可由 lock 文件还原 |
| 提交 `dist/` | 每次构建产生大量无意义 diff | 产物由源码生成，不该进版本库 |
| 把 `.env` 提交 | 密钥、内网地址泄露 | 用 `.env.example` 给模板，真实值本地填 |
| 双击 `dist/index.html` 预览 | 白屏、模块被拦截 | 绝对路径加 `file://` 跨源限制，用 `preview` |
| 全局安装 Vite 当项目依赖 | 换电脑跑不起来 | 装进 `devDependencies`，由 `package.json` 记录 |
| 改代码不提交就切分支 | 改动被带到别的分支或丢失 | 先 `commit` 或 `git stash` |
| ESLint 规则一上来开到最严 | 一天都在改格式 | 先用 recommended，按需加 |
| 部署子路径不配 `base` | 资源 404、首页白屏 | 构建时资源路径要带仓库名前缀 |
| README 只写「测试项目」 | 没人知道怎么跑 | 写功能、命令、截图 |
| 手动修改 `dist/` | 下次构建全部覆盖 | 改源码，重新构建 |
| 把接口密钥写进 `VITE_` 变量 | 打开控制台就能看到 | 前端产物是公开的，密钥放后端 |

## 通勤自测

:::quiz `npm run dev` 和 `npm run build` 分别做什么？产物有什么区别？
`dev` 启动开发服务器，模块分开加载、不压缩、带调试信息，支持热更新；`build` 打包压缩、合并、加内容 hash，输出到 `dist/`。开发产物求快，构建产物求小和可缓存，所以构建后必须再验一遍。
:::

:::quiz 执行下面这组命令后，`git status` 会显示什么？
```bash
git add .
git commit -m "feat: 支持筛选"
git status
```
显示 `nothing to commit, working tree clean`，也就是工作区干净。`git add .` 把改动放进暂存区，`commit` 把它们存进本地仓库，再查状态时已经没有未提交的改动。被 `.gitignore` 忽略的文件不会出现在提示里。
:::

:::quiz 构建后的 `dist/index.html` 里有这样一行，双击打开会发生什么？
```text
<script type="module" src="/assets/index-a1b2.js"></script>
```
脚本加载失败，页面白屏。`/assets/...` 是绝对路径，`file://` 下会去找磁盘根目录；同时 `type="module"` 在 `file://` 下因为源是 `null` 被跨源规则拦截。用 `npm run preview` 或静态服务器打开。
:::

:::quiz `.gitignore` 里为什么要写 `.env`？
`.env` 通常含接口地址、密钥、个人配置，不同人不一样，提交会泄露也可能覆盖别人的配置。团队一般提交一份 `.env.example` 作为模板，真实值本地填。
:::

:::quiz 把 API 密钥写成 `VITE_API_KEY` 放在 `.env` 里，安全吗？
不安全。只有 `VITE_` 开头的变量会被注入前端，而且是在构建时替换成字符串，最终会出现在公开的 JS 文件里。前端没有秘密，密钥必须留在后端。
:::

:::quiz Prettier 和 ESLint 各自解决什么问题？能互相替代吗？
Prettier 只管格式（缩进、引号、换行），直接改写文件；ESLint 管代码质量（未使用变量、可疑写法），报告问题。不能互相替代，格式交给 Prettier，质量问题交给 ESLint。
:::

:::quiz 部署到 `https://name.github.io/todo-app/` 后首页白屏，最可能是什么原因？怎么改？
`base` 没配。资源按 `/assets/...` 请求到了域名根目录，而不是 `/todo-app/assets/...`。在 `vite.config.js` 里设置 `base: '/todo-app/'`，重新 `npm run build` 再上传。
:::

:::quiz 下面这个 `package.json` 片段里，执行 `npm run build` 实际跑的是什么？
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  }
}
```
实际执行 `vite build`。`npm run` 只是查找 `scripts` 里的同名键并执行对应命令，不会自动加参数，也不会回退到 `dev`。名字写错会报 `Missing script`。
:::

## 动手练习（到电脑上做）

**必做**

1. 用 Vite 建一个 vanilla 项目，把第 18 章的待办清单搬进去，拆成 `src/main.js`、`src/store.js`、`src/render.js` 和 `src/style.css`。
   验收：`npm run dev` 能跑，功能与第 18 章完全一致；`main.js` 只负责启动，`store.js` 不碰 DOM，`render.js` 不改数据；每个文件都能用一句话说清职责。

2. 初始化 Git 仓库，写好 `.gitignore`，分三次提交：项目骨架、添加删除、筛选与持久化。推到 GitHub。
   验收：`git log --oneline` 正好三条；仓库里没有 `node_modules` 和 `dist`；三条提交信息都带前缀，能看出每次做了什么。

3. 安装并配置 Prettier 与 ESLint，加 `lint` 和 `format` 两个脚本；故意留一个声明了但没用的变量。
   验收：`npm run lint` 能报出未使用变量；`npm run format` 后代码风格统一；VS Code 保存时自动格式化。

**进阶**

4. 执行 `npm run build`，把 `dist/` 部署到 GitHub Pages 或 Vercel，配好 `base`，把链接发给一个朋友。
   验收：线上能添加、勾选、刷新不丢；直接刷新子路径不 404；README 里有线上地址和截图。

5. 给项目加环境变量：本地 `.env.local` 指向 `https://jsonplaceholder.typicode.com`，生产 `.env.production` 指向另一个地址；把请求地址从硬编码改成 `import.meta.env.VITE_API_BASE`。
   验收：切换环境重新构建后，`dist` 里的地址跟着变；源码里搜不到硬编码的完整地址；`.env.local` 没有被提交。

:::tip
这一章没有新语法，但它决定了你后面能走多远。第 20 章会在这个项目上继续加东西：用 TypeScript 给它加类型，用 Node.js 给它写一个真接口，再把同一套逻辑搬进小程序。

现在最值得做的一件事，是把第 18 章的待办真正部署上线一次。看到那个网址的瞬间，「学编程」才变成「做东西」。
:::
