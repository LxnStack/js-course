---
id: 16
title: 浏览器存储与网络请求
summary: 把数据留在浏览器里，再用 fetch 从服务器取回来：localStorage 与 JSON 封装、HTTP 状态码、超时取消、CORS 与加载三态界面的完整写法一次讲清。
minutes: 38
keywords: localStorage sessionStorage cookie IndexedDB JSON fetch POST 状态码 CORS AbortController
---

> 第 15 章做的页面已经能响应操作了，但一刷新，所有改动都没了；页面上的内容也只能是你事先写死的。
>
> 这一章补上两件事：**记住数据**和**向服务器要数据**。学完你能做出「刷新还在」的待办、能调用公开接口渲染列表，也能在请求失败时给用户一个像样的提示。
>
> 第 13 章讲过 `async/await`，这一章是它在浏览器里最主要的用武之地。第 17 章会接着讲这些请求出错时怎么排查。

## 为什么需要它

第 15 章的待办清单，数据存在一个数组里。你添加三条，页面显示三条，看起来很好。按 F5 刷新，数组被重新创建，页面回到空白。

这不是代码写错了，而是**内存本来就留不住东西**。变量活在当前页面这一次运行里，页面一关，内存回收，数据消失。想让数据活过刷新，必须把它写到内存之外的地方——浏览器的存储，或者远端的服务器。

另一件事是数据来源。你不可能把全国天气写死在 HTML 里，也不可能自己维护一个商品库。这些数据在别人的服务器上，页面要通过网络去取。

所以一个「真正能用」的网页，通常长这样：

1. 打开时从存储里读出上次的状态，先渲染出来
2. 同时向服务器请求最新数据
3. 请求成功就更新界面，失败就提示，并保留本地数据
4. 用户操作后，把新状态写回存储，必要时再发给服务器

这一章按这个顺序讲：先存，再取，最后处理取不到的情况。

## 四种存储方式一览

浏览器提供了四种常见的本地存储，各有各的适用场景：

| 方式 | 容量 | 生命周期 | 是否随请求发送 | 同步 / 异步 | 典型用途 |
| --- | --- | --- | --- | --- | --- |
| `cookie` | 约 4KB | 可设过期时间，默认关浏览器失效 | 是，同源请求自动带上 | 同步 | 登录态、少量标记 |
| `localStorage` | 约 5MB | 永久，除非用户清理或代码删除 | 否 | 同步 | 主题、草稿、少量离线数据 |
| `sessionStorage` | 约 5MB | 当前标签页，关闭标签即清除 | 否 | 同步 | 多步表单、一次性草稿 |
| `IndexedDB` | 几十 MB 到数百 MB，受浏览器配额限制 | 永久，除非清理 | 否 | 异步 | 大量结构化数据、离线缓存 |

`cookie` 的特殊之处是**每次同源请求都会自动带上**，所以服务器靠它识别「你是谁」。也正因为如此，它容量必须很小，否则每个请求都拖着几 KB 数据。

`cookie` 里的 `HttpOnly` 标记会让 JS 读不到它，这是保护登录凭证的正确做法。你在 JS 里能读到的 cookie，XSS 攻击也能读到。

`localStorage` 和 `sessionStorage` 是这一章的重点：API 简单，适合存几百 KB 以内的业务数据。`IndexedDB` 能存大量数据、支持索引和事务，但 API 复杂，通常配合 `idb` 这类库使用，等你做离线应用时再学。

## localStorage 的基本操作

```js
localStorage.setItem('theme', 'dark');
localStorage.getItem('theme');      // 输出: 'dark'
localStorage.getItem('nope');       // 输出: null

localStorage.setItem('count', 1);
localStorage.getItem('count');      // 输出: '1'，不是数字 1

localStorage.removeItem('theme');   // 删一个键
localStorage.clear();               // 清空当前站点全部
localStorage.length;                // 还剩几项
```

四个方法对应增、查、删、清空。`getItem` 在键不存在时返回 `null`，不是 `undefined`，也不是空字符串。

注意第三组：`setItem` 接受数字，但读出来是字符串。存储层不保存类型，只保存文本。这一点下面会展开。

想直观看到存了什么，打开开发者工具的 Application 面板，左侧找到 Local Storage，按域名展开。写代码时也可以在那里手动删键，排查「怎么改都不生效」很有用。

## 只能存字符串：JSON 转换

`localStorage` 的键和值都只能是字符串。你传别的类型，它会先偷偷转成字符串：

```js
localStorage.setItem('user', { name: '小明', age: 18 });
localStorage.getItem('user');   // 输出: '[object Object]'

localStorage.setItem('list', [1, 2, 3]);
localStorage.getItem('list');   // 输出: '1,2,3'
```

`[object Object]` 和 `1,2,3` 都救不回来，信息已经丢了。所以对象和数组必须先序列化成 JSON 字符串：

```js
const user = { name: '小明', age: 18, tags: ['新生'] };

localStorage.setItem('user', JSON.stringify(user));

const raw = localStorage.getItem('user');
const restored = JSON.parse(raw);
console.log(restored.name);   // 输出: 小明
```

`JSON.stringify` 把对象变成字符串，`JSON.parse` 把字符串还原成对象。第 7 章讲过这两个方法，这里是它们最常用的场景。

JSON 转换会丢东西，存之前要知道：

| 原值 | 存进去再读出来 |
| --- | --- |
| `undefined`、函数 | 属性直接消失 |
| `Date` 对象 | 变成 ISO 格式字符串，不再是 Date |
| `Map`、`Set` | 变成 `{}`，内容全丢 |
| 循环引用的对象 | `JSON.stringify` 直接抛 `TypeError` |

如果存的是日期，读出来要自己 `new Date(str)` 还原；如果存的是 `Map`，得先转成数组再存。

还有一个隐蔽的坑：`getItem` 可能返回 `null`，而 `JSON.parse(null)` 会返回 `null`，不会报错；但如果存储里的字符串被改坏了，`JSON.parse` 会直接抛 `SyntaxError`。所以解析一定要包 `try/catch`。

## 把读写封装起来

业务代码里到处写 `JSON.parse(localStorage.getItem(...))` 很快就会乱：没有默认值、坏数据直接崩、存满了没提示。封装两个函数，一次解决：

```js
function loadJSON(key, fallback = null) {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;

  try {
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`localStorage 中的 ${key} 不是合法 JSON，已忽略`, err);
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn('保存失败，可能空间不足', err);
    return false;
  }
}
```

```js
saveJSON('cart', [{ id: 1, count: 2 }]);

const cart = loadJSON('cart', []);   // 没有数据时得到空数组
console.log(cart[0].id);             // 输出: 1
```

`loadJSON` 的第二个参数是默认值。键不存在、内容损坏，都返回它，调用方不用再判断 `null`。`saveJSON` 返回布尔值，让调用方知道有没有存成功。

存满时抛的错误 `name` 是 `QuotaExceededError`。你可以据此给用户更准确的提示，比如「本地空间已满，请清理后重试」，而不是笼统的「保存失败」。

`JSON.stringify` 本身也可能抛错，最常见的是循环引用。两种异常都被同一个 `catch` 接住，因为对调用方来说，结果都是「没存上」。

## localStorage 的三个硬限制

**第一，它是同步的。** `setItem`、`getItem` 都会阻塞主线程，直到读写完成。存一个小字符串感觉不到，存一个几 MB 的数组再 `JSON.parse`，页面会明显卡一下。所以不要在 `input` 事件里每敲一个字就写一次，也不要在滚动事件里写。需要频繁保存时加防抖，或者只在提交时写。

**第二，容量约 5MB。** 这是按「源」计算的，不是按页面。字符串在内存里按 UTF-16 存，实际占用大约是字符数的两倍。存图片、大段文章不合适，那些应该放 IndexedDB 或服务器。

**第三，按源隔离。** 源（origin）由协议、域名、端口三部分组成。`http://localhost:5173` 和 `http://localhost:3000` 是两个源，存储互不相通；`http` 和 `https` 也不相通。你本地调试时存的数据，部署上线后读不到，这是正常的。

用 `file://` 直接双击打开 HTML 时，存储行为在不同浏览器下不一致，不要依赖。开发时起一个本地服务器，地址统一用 `http://localhost:...`，能避免一大半「存了但读不到」的怪问题。

:::warn
不要把密码、身份证号、长期有效的 token 明文放进 `localStorage`。页面上的任何 JS 都能读它，一旦出现 XSS，这些数据会被直接拿走。登录凭证优先让后端用 `HttpOnly` + `Secure` 的 cookie 管理。
:::

## sessionStorage：关掉标签就没了

```js
sessionStorage.setItem('step', '2');
sessionStorage.getItem('step');     // 输出: '2'

sessionStorage.setItem('draft', '写到一半的内容');
// 刷新页面还在；关闭这个标签页后再打开，没了
```

API 和 `localStorage` 一模一样，区别只在生命周期：它属于当前标签页。刷新、前进后退都还在，关掉标签就清空。

适合放「一次性的过程数据」：注册流程走到第几步、表单填了一半的草稿、上一个页面的筛选条件。这些数据不该在三天后还留着。

`localStorage` 则是同源的所有标签页共享：你在 A 标签页改了主题，B 标签页刷新后也是新主题。`sessionStorage` 不共享，新开的标签页读不到旧标签页的数据。

## fetch：从服务器取数据

`fetch` 是浏览器内置的网络请求函数，返回 Promise。第 13 章讲的 `async/await` 在这里天天用：

```js
async function loadPosts() {
  const res = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=3');

  console.log(res.status);    // 输出: 200
  console.log(res.ok);        // 输出: true

  const posts = await res.json();
  console.log(posts.length);  // 输出: 3
}

loadPosts();
```

这段代码可以直接贴进浏览器控制台跑。如果你把它写在普通 `script` 文件里，顶层 `await` 会报语法错误，要像上面这样包在 `async` 函数里，或者把脚本标成 `type="module"`。

`fetch` 分两步：先拿到响应头，返回一个 `Response` 对象；再读响应体。`res.json()` 也是一个 Promise，因为它要等整个 body 下载完再解析。

`Response` 上常用的东西：

| 属性 / 方法 | 含义 |
| --- | --- |
| `res.status` | 状态码数字，如 200、404、500 |
| `res.ok` | 状态码在 200~299 之间时为 `true` |
| `res.statusText` | 状态短语，如 `OK`、`Not Found` |
| `res.headers.get('content-type')` | 响应类型，如 `application/json` |
| `res.json()` | 把响应体按 JSON 解析 |
| `res.text()` | 把响应体当纯文本读 |
| `res.blob()` | 读成二进制，用于图片、文件 |

响应体**只能读一次**。调用过 `res.json()` 之后再 `res.text()` 会报 `TypeError`，提示 `body stream already read`。确实要读两次，先用 `res.clone()` 复制一份。

接口返回的数据通常长这样：

```json
[
  {
    "userId": 1,
    "id": 1,
    "title": "sunt aut facere repellat provident occaecati excepturi optio reprehenderit",
    "body": "quia et suscipit\nsuscipit recusandae consequuntur expedita et cum"
  }
]
```

`res.json()` 解析完就是数组，可以直接用第 6 章的 `map`、`filter`。如果返回的是一个对象，就按对象取属性。

## 用 POST 发送数据

GET 是把参数放在 URL 上「要数据」，POST 是把数据放在请求体里「交数据」。提交表单、创建订单、登录都用 POST。

```js
async function createPost() {
  const res = await fetch('https://jsonplaceholder.typicode.com/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: '学习 fetch',
      body: '第一次用 POST 发数据',
      userId: 1,
    }),
  });

  console.log(res.status);   // 输出: 201
  const data = await res.json();
  console.log(data.id);      // 输出: 101，示例接口分配的 id
}

createPost();
```

三个地方不能少：

- `method: 'POST'`，不写默认是 GET
- `headers: { 'Content-Type': 'application/json' }`，告诉服务器「请求体是 JSON」
- `body: JSON.stringify(...)`，请求体必须是字符串，不能直接传对象

漏掉 `Content-Type`，服务器可能按纯文本或表单去解析，拿到的字段全是空。这个错误不会报错，只会表现为「后端说没收到参数」，很难查。

如果提交的是文件或普通表单，用 `FormData`，这时**不要**手动设 `Content-Type`，浏览器要自己加一段 boundary：

```js
const formData = new FormData();
formData.append('title', '标题');
formData.append('file', fileInput.files[0]);

await fetch('/api/upload', {
  method: 'POST',
  body: formData,
  // 不要写 Content-Type
});
```

GET 带查询参数时，不要手动拼字符串，用 `URLSearchParams` 处理编码：

```js
const params = new URLSearchParams({
  page: '1',
  size: '20',
  keyword: 'js 入门',
});

const res = await fetch(`/api/search?${params}`);
// 实际请求：/api/search?page=1&size=20&keyword=js+%E5%85%A5%E9%97%A8
```

自己拼 `?keyword=` + 变量，遇到空格、中文、`&` 就会出错。`URLSearchParams` 会正确编码。

## HTTP 状态码怎么读

服务器用三位数字告诉你结果。前端不需要背全部，记住这几类：

| 状态码 | 含义 | 前端通常怎么处理 |
| --- | --- | --- |
| 200 | 请求成功 | 正常渲染 |
| 201 | 创建成功，常用于 POST | 提示成功，把新数据加进列表 |
| 204 | 成功但没有响应体 | 不要再调 `res.json()`，直接当成功 |
| 301 / 302 | 永久 / 临时重定向 | 浏览器一般自动跟随 |
| 304 | 内容没变，用缓存 | 正常，不算错误 |
| 400 | 请求参数有问题 | 展示后端返回的具体错误 |
| 401 | 未登录或凭证失效 | 跳登录页，或提示重新登录 |
| 403 | 已登录但没有权限 | 提示「无权访问」，不要跳登录 |
| 404 | 资源不存在 | 检查 URL；展示「没找到」 |
| 429 | 请求太频繁，被限流 | 提示稍后再试，别立刻重试 |
| 500 | 服务器内部错误 | 提示「服务异常」，上报日志 |
| 502 / 503 | 网关错误 / 服务不可用 | 提示稍后重试，可自动重试一次 |

前两位数字代表大类：2xx 成功、3xx 重定向、4xx 客户端问题、5xx 服务端问题。记不住具体含义时，先看大类就能判断「是谁的锅」。

## fetch 不会因为 404 抛错

这是初学者最常踩的网络坑，单独拿出来讲：

```js
async function loadMissing() {
  const res = await fetch('https://jsonplaceholder.typicode.com/posts/999999');

  console.log(res.status);   // 输出: 404
  console.log(res.ok);       // 输出: false

  // 代码继续往下走，没有进入 catch；这是正常 resolve 的响应
}

loadMissing();
```

`fetch` 只在**网络层失败**时 reject：断网、DNS 解析失败、请求被 CORS 拦截、被 `AbortController` 取消。服务器返回 404、500，说明「请求到达了服务器，服务器也回复了」，这依然是一次成功的网络通信，Promise 会 resolve。

所以下面这种写法是错的：

```js
try {
  const res = await fetch('/api/user/999');
  const user = await res.json();   // 404 时可能是 HTML 或空对象
  render(user.name);               // 这里才炸，错误信息完全对不上
} catch (err) {
  console.log('请求失败');          // 404 根本不会走到这里
}
```

正确的做法是每次请求后自己检查 `res.ok`：

```js
const res = await fetch('/api/user/999');

if (!res.ok) {
  throw new Error(`请求失败：HTTP ${res.status}`);
}

const user = await res.json();
```

`res.ok` 为 `false` 时主动 `throw`，错误才会进入你的 `catch`，也才有机会给用户正确提示。

:::warn
另一个相关坑：404 时直接 `res.json()`，如果服务器返回的是 HTML 错误页，你会收到 `SyntaxError: Unexpected token '<'`。看起来像语法错误，实际是「把 HTML 当 JSON 解析了」。先判断 `res.ok`，再决定要不要解析。
:::

## 超时与取消：AbortController

`fetch` 默认没有超时。服务器一直不响应，请求就一直挂着，用户看着转圈，不知道发生了什么。生产代码必须自己加超时。

浏览器提供的工具是 `AbortController`：它有一个 `signal`，传给 `fetch`，调用 `abort()` 就能中止请求。

```js
async function fetchWithTimeout(url, ms = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  try {
    const res = await fetch(url, { signal: controller.signal });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`请求超时（${ms} ms）`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
```

请求正常结束时，`finally` 里的 `clearTimeout` 把定时器清掉，避免它到点后无故 abort 一个已经完成的请求。请求超时被 abort 时，`fetch` 抛出 `name` 为 `'AbortError'` 的异常，你把它翻译成用户能看懂的话。

取消不只是超时。搜索框输入时，每敲一个字发一次请求，后发的可能先回来，界面就会闪回旧结果。做法是保存上一个 `controller`，发新请求前先 `abort()` 旧的，只渲染最后一次的结果。

现代浏览器还提供了更短的写法 `AbortSignal.timeout(5000)`，效果类似，但兼容性不如手动创建 controller，初学阶段先用上面这套。

## CORS：为什么本地请求会失败

浏览器有**同源策略**（same-origin policy）：协议、域名、端口三者完全相同，才算同源。

| 页面地址 | 请求地址 | 是否同源 | 原因 |
| --- | --- | --- | --- |
| `http://localhost:5173` | `http://localhost:5173/api` | 是 | 三项都一样 |
| `http://localhost:5173` | `http://localhost:3000/api` | 否 | 端口不同 |
| `https://shop.com` | `http://shop.com/api` | 否 | 协议不同 |
| `https://shop.com` | `https://api.shop.com` | 否 | 域名不同 |

跨源请求默认会被浏览器拦截，控制台里出现这样一段红字：

```text
Access to fetch at 'http://localhost:3000/api/posts' from origin 'http://localhost:5173'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
on the requested resource.
```

CORS（Cross-Origin Resource Sharing，跨源资源共享）是服务器给浏览器的「许可」。服务器在响应头里写 `Access-Control-Allow-Origin: http://localhost:5173`，浏览器才允许页面读取这个响应。

带 JSON 的 POST 还会先发一个 `OPTIONS` 预检请求，问服务器「允不允许这个来源、这个方法、这个 Content-Type」。服务器要正确响应预检，真正的 POST 才会发出。这就是为什么「Postman 能通，浏览器不行」——Postman 不受同源策略约束。

解决方式按顺序试：

1. 后端加 CORS 响应头，允许你的开发地址
2. 开发环境配代理，让前端服务器把 `/api` 转发到后端，浏览器看来是同源
3. 只在开发时用浏览器插件临时关闭同源策略，不要带到生产

### 为什么双击 HTML 文件请求会失败

双击打开 HTML，地址栏是 `file:///.../index.html`。这时页面的源是 `null`，既不是 `http` 也不是 `https`。

用 `fetch('./data.json')` 读同目录的文件，浏览器会拦截：`file://` 协议下的跨源请求不被允许。请求远程接口同样不行，因为 `Origin: null` 通常不在服务器的允许列表里。相对路径 `/api/posts` 还会被解析成磁盘路径，根本发不到服务器。

这不是代码写错了，是运行方式不对。解决方式只有一个：**起一个本地服务器**。VS Code 的 Live Server 插件、`npx serve`、Vite 开发服务器都行。地址变成 `http://localhost:5500/index.html` 之后，同目录的 `data.json` 就是同源资源，能正常请求。

第 18 章的项目也会要求你用本地服务器打开，原因就在这里。

## 三态 UI：加载中、失败、空

网络请求需要时间，也可能失败。界面至少有三种非成功状态要处理：

- 加载中：告诉用户「正在等」，不要让页面看起来死了
- 失败：告诉用户「没拿到」，给一个重试入口
- 空：请求成功，但结果就是 0 条

空数据最容易被误当成失败。新用户还没有订单，接口返回 `[]`，这是正常结果，不该显示「加载失败」。

```html
<section class="panel">
  <p id="status" hidden></p>
  <ul id="list"></ul>
  <button id="retry" hidden>重试</button>
</section>
```

```js
const statusEl = document.querySelector('#status');
const listEl = document.querySelector('#list');
const retryBtn = document.querySelector('#retry');

function setStatus(text, canRetry = false) {
  statusEl.hidden = text === '';
  statusEl.textContent = text;
  retryBtn.hidden = !canRetry;
}

function renderPosts(posts) {
  listEl.innerHTML = '';

  if (posts.length === 0) {
    setStatus('还没有内容');
    return;
  }

  setStatus('');
  for (const post of posts) {
    const li = document.createElement('li');
    li.textContent = post.title;
    listEl.append(li);
  }
}

async function load() {
  setStatus('加载中…');

  try {
    const res = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=5');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const posts = await res.json();
    renderPosts(posts);
  } catch (err) {
    setStatus(`加载失败：${err.message}`, true);
  }
}

retryBtn.addEventListener('click', load);
load();
```

几个细节：状态文字用 `textContent` 写入，因为 `err.message` 可能包含服务器返回的内容；`hidden` 属性控制显隐，比改 `style.display` 更语义化；重试按钮复用同一个 `load` 函数，不用重写逻辑。

请求期间最好把触发按钮禁用，避免用户连点发出十个请求。请求结束后再恢复，这个「开关」思路在第 18 章会反复用到。

## 封装一个 request 函数

每个页面都写一遍 `fetch`、判断 `ok`、解析 JSON、加超时，代码会重复得很难维护。封装成一个 `request`，以后只关心「URL 和参数」：

```js
async function request(url, options = {}) {
  const { timeout = 8000, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, { ...rest, signal: controller.signal });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 120)}`);
    }

    if (res.status === 204) return null;

    const type = res.headers.get('content-type') || '';
    return type.includes('application/json') ? res.json() : res.text();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`请求超时（${timeout} ms）`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
```

这个函数做了五件事：加超时、检查 `res.ok`、把错误响应体带进错误信息、处理 204 无响应体、按 `Content-Type` 决定怎么解析。

```js
const API = 'https://jsonplaceholder.typicode.com';

async function main() {
  try {
    const posts = await request(`${API}/posts?_limit=3`);
    console.log(posts.length);   // 输出: 3
  } catch (err) {
    console.error(err.message);  // 给用户看的提示
  }
}

main();
```

`throw err` 这一行不能省。`catch` 里只处理超时，其他错误原样抛出去，让调用方决定怎么展示。如果你在 `catch` 里 `return null`，调用方就永远不知道请求失败了。

## 可以拿来练手的公开接口

- `https://jsonplaceholder.typicode.com/posts`：假数据，支持 GET / POST / PUT / DELETE，最适合练手
- `https://jsonplaceholder.typicode.com/posts/1`：单条数据
- `https://api.github.com/users/octocat`：GitHub 用户信息，无需登录
- `https://api.github.com/search/repositories?q=javascript`：搜索仓库

GitHub 的接口对未登录请求有限流，大约每小时 60 次，练手够用，频繁刷新会收到 403。这正好可以用来观察 403 和错误提示。

## 常见误区清单

| 写法 | 结果 | 为什么 |
| --- | --- | --- |
| `setItem('obj', { a: 1 })` | 读出 `'[object Object]'` | 只能存字符串，对象要先 `JSON.stringify` |
| `setItem('n', 1)` 后 `typeof getItem('n')` | `'string'` | 存储层不保留类型 |
| 不判断 `null` 就 `JSON.parse` | 可能得到 `null`，后续读属性报错 | 先判断 `raw === null` |
| 坏数据直接 `JSON.parse` | 抛 `SyntaxError`，页面中断 | 解析包 `try/catch`，给默认值 |
| 在 `input` 里每次写 `localStorage` | 输入卡顿 | 同步 API 阻塞主线程，加防抖或提交时写 |
| 把 token 明文放 `localStorage` | XSS 可直接偷走 | 用 `HttpOnly` cookie 存凭证 |
| `fetch` 404 以为会进 `catch` | 不会，Promise 正常 resolve | 4xx/5xx 不 reject，必须查 `res.ok` |
| `res.json()` 后再 `res.text()` | `Body has already been read` | 响应体只能读一次，需要时先 `clone()` |
| POST 不写 `Content-Type` | 后端收不到字段 | 服务器不知道请求体是 JSON |
| 204 响应调 `res.json()` | `SyntaxError`，空 body 解析失败 | 204 没有响应体，直接返回 `null` |
| 双击 HTML 直接 `fetch('./data.json')` | CORS / 协议错误 | `file://` 下源是 null，要起本地服务器 |
| 把空数组当失败处理 | 新用户看到「加载失败」 | 空数据是成功结果，单独显示空状态 |

## 通勤自测

:::quiz `localStorage.setItem('n', 1); typeof localStorage.getItem('n')` 的结果是什么？
结果是 `'string'`。存储层只保存文本，数字 1 被转成了字符串 `'1'`。要当数字用，读出后 `Number(...)`。
:::

:::quiz 直接 `localStorage.setItem('user', { name: '小明' })`，再读出来是什么？
读出来是字符串 `'[object Object]'`，对象信息已经丢失。正确做法是先 `JSON.stringify(user)` 再存，读的时候 `JSON.parse`。
:::

:::quiz `fetch` 请求返回 404，会进入 `catch` 吗？为什么？
不会。404 说明服务器正常回复了，只是一次「没找到」的响应，Promise 会 resolve。只有网络层失败（断网、CORS、abort）才 reject。要自己判断 `res.ok` 或 `res.status`。
:::

:::quiz `res.ok` 什么时候是 `true`？
状态码在 200 到 299 之间时为 `true`。301、304、404、500 都是 `false`。注意 304 是正常缓存结果，但 `ok` 依然是 `false`，不要把它当错误。
:::

:::quiz `localStorage` 和 `sessionStorage` 最核心的区别是什么？
生命周期。`localStorage` 永久保存，除非手动清理；`sessionStorage` 只属于当前标签页，关闭标签就清空。两者 API 完全一样，容量也相近。
:::

:::quiz 为什么双击打开 HTML 后 `fetch('./data.json')` 会失败？怎么解决？
因为页面地址是 `file://`，源是 `null`，浏览器不允许这种跨源请求。起一个本地服务器，用 `http://localhost:...` 打开页面就行。
:::

:::quiz 接口返回 204，应该怎么处理响应体？
不要调用 `res.json()`，204 没有响应体，解析会抛 `SyntaxError`。直接把这次请求当成功，返回 `null` 或跳过渲染即可。
:::

:::quiz 请求超时被 `AbortController` 取消后，捕获到的错误 `name` 是什么？
是 `'AbortError'`。据此可以和真正的网络错误区分，给用户显示「请求超时」而不是「网络异常」。
:::

## 动手练习（到电脑上做）

**必做**

1. 给第 15 章的页面加一个主题切换按钮：点一下在浅色和深色之间切换，刷新后保持上次选择。主题 class 加在 `body` 上，存储键用 `theme`。
   验收：刷新后主题不丢；打开 Application 面板能看到 `theme` 键；清掉这个键后刷新回到默认主题。

2. 做一个「最近搜索」模块：每次提交搜索词，把它加到数组最前面，去重，最多保留 5 条，用 `saveJSON` 存、`loadJSON` 读，并渲染成列表。
   验收：重复的词不会出现两次；超过 5 条时最旧的被挤掉；手动把存储值改成 `'{oops'` 后刷新，页面不崩，显示空列表。

3. 用 `fetch` 请求 `jsonplaceholder` 的 `/posts?_limit=10`，渲染标题列表，完整处理加载中、失败、空数据三种状态，失败时显示重试按钮。
   验收：把 URL 改成 `/posts999` 能看到失败提示；点重试能重新请求；把 `_limit=10` 改成 `_limit=0` 时显示空状态而不是失败。

**进阶**

4. 用 `AbortController` 给 `request` 加 3 秒超时，然后请求一个响应很慢的地址（例如 `https://httpbin.org/delay/10`），确认 3 秒后界面提示「请求超时」，而不是一直转圈。
   验收：控制台能区分超时和 404 两种错误；超时后定时器被清理；页面不会因为未捕获的 Promise 拒绝而报错。

5. 做一个搜索框：输入时请求 `https://jsonplaceholder.typicode.com/posts?title_like=关键词`，每次发新请求前取消上一个。快速连续输入，最终只渲染最后一次的结果。
   验收：Network 面板里能看到被取消的请求（状态显示 canceled）；慢速输入和快速输入结果一致；清空输入时恢复完整列表。

:::tip
存储和网络是「应用」和「玩具」的分界线。你现在已经具备做一个真实小应用的全部基础能力：DOM 负责界面，存储负责记忆，fetch 负责数据。

下一章讲错误处理与调试。这一章里那些 `try/catch`、`res.ok`、`AbortError`，下一章会从「怎么写」上升到「怎么排查」：看到一段红色报错，知道先看哪一行、用什么工具定位。第 18 章会把这三章合成一个带持久化和空状态的待办清单。
:::
