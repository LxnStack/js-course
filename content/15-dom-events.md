---
id: 15
title: DOM 与事件
summary: 从「浏览器把 HTML 变成树」讲起，学会选中、改写、增删页面元素，再用事件、冒泡与委托让页面真正响应操作。
minutes: 36
keywords: DOM querySelector textContent innerHTML classList dataset 事件 冒泡 委托 表单 defer
---

> 前 14 章写的代码，结果都停在控制台里。从这一章起，代码开始作用在页面上：点一下按钮，列表多一行；输入两个字，标题跟着变。
>
> DOM 是 JS 和 HTML 之间的唯一通道，事件是页面「会动」的原因。这两件事学会，你才能把第 5 章的函数、第 6 章的数组真正用到用户看得见的地方。
>
> 第 18 章会用一个完整的待办清单把这些知识组装起来，这一章先把每一块零件讲清楚。

## 为什么需要它

你在第 2 章学过变量，第 5 章学过函数，第 6 章学过数组。到现在为止，所有结果都打印在控制台里。控制台是给开发者看的，用户看不到。

用户看到的是页面。页面上的数字要变、列表要加一行、按钮要变色，这些都不能靠改 HTML 文件完成——服务器上的 HTML 是死的，不会因为你点了一下就自己变。

最小的一个例子是一个计数器按钮：

```html
<button id="count-btn">点了 0 次</button>

<script>
  const btn = document.querySelector('#count-btn');
  let count = 0;

  btn.addEventListener('click', () => {
    count = count + 1;
    btn.textContent = `点了 ${count} 次`;
  });
</script>
```

```text
初始：点了 0 次
点 1 次：点了 1 次
点 3 次：点了 3 次
刷新页面：回到「点了 0 次」
```

这段代码只做了三件事：**找到按钮、监听点击、改按钮上的文字**。DOM 负责「找到和改」，事件负责「什么时候改」。整个前端交互，都是这三件事的不同组合。

但真写起来，麻烦都在细节里：选择器打错一个字符，拿到 `null`，后面全崩；用 `innerHTML` 拼了用户输入，被人注入脚本；表单提交忘了拦，页面一刷新数据全没。这一章就是把这些细节一个个拆开。

## DOM 是什么：浏览器把 HTML 变成一棵树

浏览器收到 HTML 之后，不是把源码当字符串存着，而是逐字解析，把每个标签、每段文字变成对象，再按嵌套关系连成一棵树。这棵树叫 DOM（Document Object Model，文档对象模型）。

假设页面是这样：

```html
<head>
  <title>我的待办</title>
</head>
<body>
  <h1>我的待办</h1>
  <ul id="list">
    <li class="item">买牛奶</li>
    <li class="item">写作业</li>
  </ul>
  <button id="add">添加</button>
</body>
```

浏览器在内存里把它变成：

```text
document
└─ html
   ├─ head
   │  ├─ title
   │  └─ style
   └─ body
      ├─ h1             「我的待办」
      ├─ ul#list
      │  ├─ li.item     「买牛奶」
      │  └─ li.item     「写作业」
      └─ button#add     「添加」
```

图中每一行是一个节点（node）。`html` 是 `document` 的子节点，`head` 和 `body` 是兄弟节点，两个 `li` 是 `ul` 的子节点。缩进表示父子关系，同一层表示兄弟关系。文字「买牛奶」也是一个节点，叫文本节点，只是平时我们更关心它外面的元素节点。

你写的 JS 操作的从来不是 HTML 文本，而是这棵树。改一个节点的文字，浏览器立刻重绘对应区域。

```js
document.title;                                   // 输出: 我的待办
document.body.children.length;                    // 输出: 3（h1、ul、button）
document.querySelector('#list').children.length;  // 输出: 2
```

`children` 只算元素；`childNodes` 会把标签之间的换行、空格也当成文本节点算进去，所以经常得到比预期大的数字。日常统计子元素用 `children`。

这里要建立一个重要认知：DOM 是内存里的活对象，不是磁盘上的 `.html` 文件。你在控制台改的东西，刷新就没了。想让数据留下来，要看第 16 章的存储。

## 选中元素：querySelector 家族

要改一个元素，先得选中它。还是用上一节那个列表，最常用的是 CSS 选择器，规则和写 CSS 时完全一样：`.item` 选 class，`#list` 选 id，`ul li` 选后代。

```js
document.getElementById('list');        // 按 id 选，参数不带 #
document.querySelector('.item');        // 第一个匹配的元素
document.querySelectorAll('.item');     // 全部匹配，返回 NodeList
document.querySelector('#list .item');  // 组合选择器，选 list 里的 item
```

`querySelector` 返回第一个匹配的元素，找不到返回 `null`；`querySelectorAll` 返回全部，找不到时返回一个空的 NodeList，不是 `null`。这个区别很关键：空 NodeList 可以安全地 `.length`、`.forEach`，`null` 一碰就报错。

`getElementById` 的参数不带 `#`，而 `querySelector('#list')` 要带。混用不会报错，只会静默返回 `null`，然后你在下一行收到一个莫名其妙的错误。

### 选不到就是 null

这段代码是前端出现频率最高的报错，没有之一：

```js
const title = document.querySelector('.title');
title.textContent = '新标题';
// 报错: Uncaught TypeError: Cannot read properties of null (reading 'textContent')
```

意思是「在一个不存在的东西上读 `textContent`」。三种常见原因：选择器拼错；脚本执行时元素还没被解析出来；元素根本在另一个页面或模板里。

写的时候先假设「它可能不在」，代码就稳了：

```js
const title = document.querySelector('.title');

if (!title) {
  console.warn('页面上没有 .title，跳过');
} else {
  title.textContent = '新标题';
}
```

用 `if (!el) return` 提前退出，比让错误炸到控制台好。也可以用可选链读 `el?.textContent`，但赋值不能写成 `el?.textContent = 'x'`，那是语法错误。读用可选链，写用 if。

### NodeList 不是数组

```js
const items = document.querySelectorAll('.item');

items.length;                       // 输出: 2
items.map((el) => el.textContent);  // 报错: items.map is not a function

const arr = Array.from(items);      // 或 [...items]
arr.map((el) => el.textContent);    // 输出: ['买牛奶', '写作业']
```

NodeList 有 `length`、有下标、有 `forEach`，但没有 `map`、`filter`、`reduce`。它长得像数组，用起来差一半，这是初学者非常容易踩的坑。

转成真数组有两种写法，`Array.from(items)` 和 `[...items]`，效果一样。转完就能用第 6 章学的所有数组方法。

还有一点：`querySelectorAll` 返回的是调用那一刻的快照。之后新加的元素不会自动出现在旧结果里，要拿最新列表就再查一次。对比一下 `getElementsByClassName`，它返回实时的 HTMLCollection，DOM 一变它跟着变；实时听起来方便，实际更容易写出难查的 bug，新代码统一用 `querySelectorAll` 就好。

## 读取与改写文本

选中之后，最常改的是文字。`textContent` 和 `innerHTML` 长得像，行为完全不同。

```js
const box = document.querySelector('#box');

box.textContent = '<b>你好</b>';
// 页面显示：<b>你好</b>（尖括号是字面上的字符）

box.innerHTML = '<b>你好</b>';
// 页面显示：你好（加粗）
```

`textContent` 把内容当纯文本。你给它 `<b>你好</b>`，页面上就显示这串字符，尖括号也在。`innerHTML` 把内容当 HTML 源码，浏览器会解析它，生成真正的 `<b>` 元素。

想要读取时，差别同样存在：

| 属性 | 读到什么 | 会解析 HTML 吗 | 速度 |
| --- | --- | --- | --- |
| `textContent` | 内部所有文字，包括隐藏元素 | 不会，标签也算文字 | 快 |
| `innerText` | 只算渲染后可见的文字 | 不会 | 慢，会触发排版 |
| `innerHTML` | 内部完整的 HTML 字符串 | 会 | 中等 |

日常读文字用 `textContent`，不要用 `innerText`，后者受 CSS 影响，同一段代码在不同布局下结果可能不同。

### innerHTML 与 XSS

这个区别不只是显示效果，还是安全问题。假设页面上有个评论区，你把用户输入直接塞进 `innerHTML`：

```js
const userInput = '<img src="x" onerror="alert(document.cookie)">';
box.innerHTML = `<p>${userInput}</p>`;
// 图片加载失败，onerror 里的代码被执行
```

用户提交的不是文字，而是一段 HTML。浏览器解析到 `img`，去加载一个不存在的图片，加载失败触发 `onerror`，里面的 JS 就被执行了。这段代码能读 cookie、发请求、改页面内容，甚至冒充用户操作。

这类攻击叫 XSS（Cross-Site Scripting，跨站脚本）。最容易被忽略的是：攻击代码不一定来自「恶意用户」，也可能来自别人分享的一条链接参数、第三方接口返回的某个字段。你信任数据来源，但数据在传输途中可能已经被换掉了。

记住一条底线：**任何不是你自己写死的内容，都不要进 `innerHTML`**。用户输入、URL 参数、接口返回，统统用 `textContent`。

如果确实要渲染富文本，比如后台编辑的文章，必须用专门的清洗库，例如 DOMPurify，先过滤再插入。自己写正则过滤 HTML 基本防不住，攻击者有一百种绕过方式。

`innerHTML` 还有一个副作用：赋值会**销毁原有的所有子节点**，绑在子节点上的事件监听也一起没了。第 18 章做待办清单时，这就是「重新渲染后按钮点不动」的根本原因。

## 属性、data-* 与 classList

文本之外，元素上还有属性。HTML 里写的 `href`、`src`、`disabled`，在 DOM 里都能读写。

```html
<a id="link" href="/home" data-user-id="42" class="btn primary">首页</a>
```

```js
const link = document.querySelector('#link');

link.getAttribute('href');          // 输出: '/home'
link.setAttribute('href', '/about');
link.removeAttribute('href');
link.hasAttribute('data-user-id');  // 输出: true

link.dataset.userId;                // 输出: '42'（字符串）
link.dataset.userId = '99';         // 写回 data-user-id="99"

link.classList.add('active');
link.classList.remove('primary');
link.classList.toggle('active');    // 没有就加，有就删
link.classList.contains('active');  // 输出: false（刚被 toggle 删掉）

const input = document.querySelector('#nickname');
input.getAttribute('value');        // 输出: '小明'（HTML 上写的初始值）
input.value;                        // 用户改成「小红」后是 '小红'
```

`getAttribute` 返回字符串或 `null`；`setAttribute` 会把值转成字符串；`removeAttribute` 删掉整个属性。

`data-*` 是 HTML 允许你自定义的属性，专门用来携带数据。`data-user-id` 在 JS 里通过 `dataset.userId` 访问：去掉 `data-`，剩下的中划线转成驼峰。所有值都是字符串，要当数字用得自己转。反过来，`dataset.userId = '99'` 会写回 `data-user-id="99"`。属性名在 HTML 里会被转小写，所以别写 `data-userId`。

### attribute 与 property 不是一回事

`getAttribute('value')` 读的是 HTML 上写的初始值，`input.value` 读的是当前状态。用户打字改变的是 property，attribute 一直没动。表单相关的状态一律用 property，比如 `value`、`checked`、`selected`。

同理，`a.href` 返回浏览器补全后的绝对地址，`a.getAttribute('href')` 返回你写的那串相对路径。调试时看到两个不一样，不用怀疑自己。

### classList

`classList` 是操作 class 的标准方式。`toggle` 最常用：有就删，没有就加，一行实现开关。第二个参数可以强制方向：`toggle('active', true)` 一定加上，`false` 一定删掉。

不要用 `className = 'active'`，它会把原来的 class 全冲掉，`btn primary` 变成 `active`，样式直接崩。也不要 `classList.add('a b')`，一个字符串里带空格会直接报错，要分成两次 add。

## 样式：style 与切换 class

```js
const card = document.querySelector('.card');

card.style.display = 'none';
card.style.backgroundColor = 'red';             // CSS 的 background-color 转驼峰
card.style.setProperty('--main-color', '#0af'); // 自定义属性用 setProperty

card.style.display;                  // ''，没有内联样式时是空字符串
getComputedStyle(card).display;      // 'block'，最终生效的值
```

`el.style.xxx` 对应内联样式。CSS 里的 `background-color` 在 JS 里要写成驼峰 `backgroundColor`，因为属性名里不能有中划线。

读 `el.style.display` 只能读到内联样式，读不到 CSS 文件里定义的。想知道元素最终生效的样式，要用 `getComputedStyle(el)`。

### 优先切 class

同样一个高亮效果，两种写法：

```css
.card {
  padding: 16px;
  border: 1px solid #ddd;
}

.card.is-active {
  border-color: #0a84ff;
  box-shadow: 0 0 0 2px #cfe4ff;
}
```

JS 只写一行 `card.classList.toggle('is-active')`，样式全交给 CSS。好处有三个：样式集中写在 CSS 里，改一处全站生效；可以用 `:hover`、媒体查询、过渡动画；不会因为内联样式优先级过高而难以覆盖。

什么时候用 inline style？只有值在运行时才算得出来的时候，比如进度条宽度 `percent + '%'`、拖拽元素的位置。即便如此，也优先写 CSS 变量，用 `style.setProperty('--progress', value)` 传值，让 CSS 决定怎么用。

:::warn
内联样式的优先级高于普通 CSS 选择器。你调试时发现「CSS 里改了没用」，先看 Elements 面板里这个元素是不是带着 `style="..."`。
:::

## 创建、插入与删除节点

页面不能只有写死的结构。用户添加一条待办，就得在 DOM 里真的创建一个节点。

```js
const li = document.createElement('li');
li.className = 'item';
li.textContent = '新项目';

const list = document.querySelector('#list');

list.append(li);         // 加到末尾，可一次传多个节点或字符串
list.prepend(li);        // 移到开头（同一个节点是移动，不是复制）

li.before('前面的文字');  // 插到 li 前面
li.after('后面的文字');   // 插到 li 后面
li.remove();             // 从页面移除自己，不需要父元素

// 批量拼一个列表：先全部放进 fragment，再一次性插入
const todos = ['买牛奶', '写作业', '跑步'];
list.innerHTML = '';

const fragment = document.createDocumentFragment();

for (const text of todos) {
  const item = document.createElement('li');
  item.className = 'item';
  item.textContent = text;
  fragment.append(item);
}

list.append(fragment);   // 只插入一次，只触发一次布局计算
```

`append` 和 `prepend` 接受节点，也接受字符串；`appendChild` 只接受节点，返回被插入的节点。日常用 `append` 更顺手。`before` 和 `after` 则是在某个元素的前后插入兄弟节点。

有一个容易误解的行为：把一个已经存在于页面上的节点 append 到别处，是**移动**，不是复制。想复制用 `cloneNode(true)`，参数 `true` 表示连子节点一起复制。

### 用 fragment 批量插入

每次往正在显示的 DOM 里插入节点，浏览器都可能重新计算布局（reflow）。三条数据无所谓，三百条就能感觉到卡。

`DocumentFragment` 是一个不在页面上的临时容器。先用 `document.createDocumentFragment()` 创建它，循环里把节点 append 进去，最后一次性 append 到页面，就只触发一次布局。上面代码的后半段就是这个做法。

另一种常见写法是拼 HTML 字符串再赋给 `innerHTML`，代码更短、速度也快，但只要数据里有用户输入就有 XSS 风险。安全和省事之间，先选安全：`createElement` + `textContent`。

## 事件：让页面响应

页面能改还不够，要能响应操作。事件就是「发生了什么事」的通知：点击、输入、提交、滚动、按键。

```html
<button id="save"><span>保存</span></button>
```

```js
const btn = document.querySelector('#save');

btn.addEventListener('click', (e) => {
  console.log(e.type);           // 输出: click
  console.log(e.target.tagName); // 点文字时输出: SPAN
  console.log(e.currentTarget.id); // 输出: save
});

document.addEventListener('keydown', (e) => {
  console.log(e.key);            // 按 Esc 时输出: Escape
  if (e.key === 'Escape') btn.blur();
});
```

绑事件有三种写法：HTML 里写 `onclick="..."`、给 `el.onclick` 赋值、用 `addEventListener`。前两种都只能挂一个处理函数，后写的会覆盖前面的；`addEventListener` 可以挂多个，还能精确移除，所以统一用它。

事件触发时，浏览器会调用你的函数，并传一个事件对象。里面字段很多，先掌握四个：

| 字段 / 方法 | 含义 |
| --- | --- |
| `e.target` | 实际被点中的元素，可能是个子元素 |
| `e.currentTarget` | 监听器绑在谁身上，也就是 `addEventListener` 的调用者 |
| `e.key` | 键盘事件里按下的键，如 `'Enter'`、`'Escape'`、`'a'` |
| `e.preventDefault()` | 取消浏览器对该事件的默认动作 |

`target` 和 `currentTarget` 只有在「监听器绑在父元素、点在子元素」时才不同。点按钮上的文字，`target` 是 `span`，`currentTarget` 永远是 `button`。写事件委托时全靠这个区别。

`key` 用于键盘事件。判断回车不要用 `keyCode`，那是老写法，用 `e.key === 'Enter'`。

`preventDefault()` 取消默认动作：链接跳转、表单提交刷新、右键菜单、复选框勾选。注意它只取消「浏览器本来要做的事」，不影响你自己的代码。

移除监听要用同一个函数引用。先用 `function` 或具名变量定义 `onClick`，再 `addEventListener('click', onClick)`，之后 `removeEventListener('click', onClick)` 才有效。换成两个匿名函数就删不掉，因为每次都是新的函数对象。

只想触发一次，不用手动移除，加 `{ once: true }` 就行。

## 冒泡、捕获与两个「阻止」

事件不是只在目标元素上跑一遍。它先从最外层一路传到目标，再从目标一路传回最外层：

```text
点击 button 时的传播路径：

捕获：window → document → body → div → button
目标：button 上的监听器
冒泡：button → div → body → document → window
```

默认 `addEventListener` 只监听冒泡阶段。同一段 HTML，三个监听器：

```js
const outer = document.querySelector('#outer');
const inner = document.querySelector('#inner');

outer.addEventListener('click', () => console.log('outer 捕获'), true);
inner.addEventListener('click', () => console.log('inner'));
outer.addEventListener('click', () => console.log('outer 冒泡'));

// 点击按钮，输出顺序：
// outer 捕获
// inner
// outer 冒泡
```

第三个参数传 `true`，或者传 `{ capture: true }`，就在捕获阶段触发。实际开发里捕获用得少，主要用在「我要在子元素之前拦下这个事件」的场景。理解它主要是为了看懂事件顺序，以及在别人的代码里看到 `true` 时不懵。

### stopPropagation 与 preventDefault

这两个方法经常被混，其实管的是两件不同的事：

| 方法 | 阻止什么 | 不影响什么 |
| --- | --- | --- |
| `e.stopPropagation()` | 事件继续传给祖先元素 | 浏览器的默认行为照常发生 |
| `e.preventDefault()` | 浏览器对该事件的默认行为 | 事件仍然继续冒泡 |

一个链接放在 div 里，点它时：只调 `stopPropagation`，链接照样跳转；只调 `preventDefault`，div 的监听照样收到。两个都要拦，就两个都调。

:::warn
不要习惯性地在每个 handler 结尾写 `stopPropagation`。它会让父级的事件委托、埋点统计、全局快捷键全部失效，而且出问题时很难查到源头。多数时候你要的是「在 handler 里加一个条件判断」，不是把事件掐断。
:::

## 事件委托：一个监听器管所有行

列表里有删除按钮，最直接的做法是用 `querySelectorAll('.delete')` 查出所有按钮，再用 `forEach` 一个个 `addEventListener`。

三个问题：第一，新加的行没有监听器，删不掉；第二，一百行就是一百个监听器，占内存；第三，每次重新渲染列表，旧节点被销毁，监听器也跟着没了。

事件委托（event delegation）把监听器绑在父元素上，利用冒泡统一处理：

```html
<ul id="todo-list">
  <li data-id="1">买牛奶 <button class="delete">删除</button></li>
  <li data-id="2">写作业 <button class="delete">删除</button></li>
</ul>
```

```js
const list = document.querySelector('#todo-list');

list.addEventListener('click', (e) => {
  const btn = e.target.closest('.delete');
  if (!btn) return;                 // 点的不是删除按钮，忽略

  const li = btn.closest('li');
  const id = li.dataset.id;
  li.remove();
  console.log('删除', id);
});
```

点击删除按钮，事件冒泡到 `ul`，父元素上的监听器被触发。`closest('.delete')` 从 `e.target` 自己开始往上找最近的匹配元素，找到就返回，找不到返回 `null`。所以点在按钮内部的图标、文字上也能找到按钮，比判断 `tagName === 'BUTTON'` 可靠得多。

`if (!btn) return` 这一行不能省。用户点在 li 的空白处，事件同样会冒泡上来，`closest` 返回 `null`，后面 `btn.dataset` 就会报错。

| 对比项 | 每个按钮单独绑定 | 事件委托 |
| --- | --- | --- |
| 新增的元素 | 要重新绑定才生效 | 自动生效 |
| 监听器数量 | 有多少按钮就多少个 | 父元素上只有一个 |
| 重新渲染列表 | 监听器随旧节点丢失 | 不受影响 |
| 代码位置 | 分散在每个创建按钮的地方 | 集中在一处 |

委托的核心优势是「监听器与元素解耦」：不管列表以后加多少行、怎么重渲染，那一个监听器一直在父元素上，新行自动生效。第 18 章的待办清单就靠这个处理删除和勾选。

## 表单

```html
<form id="login">
  <input id="email" name="email" type="email" placeholder="邮箱">
  <input id="password" name="password" type="password" placeholder="密码">
  <button type="submit">登录</button>
</form>
<p id="hint"></p>
```

```js
const form = document.querySelector('#login');
const email = document.querySelector('#email');
const hint = document.querySelector('#hint');

form.addEventListener('submit', (e) => {
  e.preventDefault();                 // 阻止整页刷新

  const value = email.value.trim();
  if (!value.includes('@')) {
    hint.textContent = '邮箱格式不对';
    return;                           // 提前结束，不提交
  }

  console.log('提交', value);
  form.reset();                       // 清空表单
});
```

表单的默认提交行为是「把数据发给当前地址，然后整页刷新」。在单页应用里，这意味着你辛苦维护的页面状态全部丢失。所以 submit 处理函数的第一行几乎总是 `e.preventDefault()`。

`input.value` 永远是字符串。即使用户输入的是 `18`，拿到的也是 `'18'`。要计算就先 `Number()` 或 `parseFloat()`，这个坑第 2 章讲过。空输入框的值是空字符串 `''`，不是 `null`，判断「有没有填」用 `value.trim() === ''`。

| 事件 | 触发时机 | 适合做什么 |
| --- | --- | --- |
| `input` | 每次输入、粘贴、删除都触发 | 实时预览、字数统计、搜索联想 |
| `change` | 文本框值改变且失去焦点；下拉框和复选框一变就触发 | 表单校验、保存设置 |
| `blur` | 失去焦点 | 校验单个字段 |
| `submit` | 表单提交 | 收集数据、统一校验 |

用 `input` 事件做实时统计很合适：给 `title` 绑一个 `input` 监听，处理函数里写 `counter.textContent = title.value.length + ' / 20'`，每敲一个字都会更新。复选框则用 `change` 加 `checked`，值只有 `true` 和 `false` 两种；`checkbox.value` 永远是 HTML 上写的字符串，通常还是 `'on'`，不能用它判断有没有勾选。

字段多的时候，一个个 querySelector 很啰嗦。给每个 input 加上 `name`，用 `new FormData(form)` 一次性收集，再 `Object.fromEntries` 转成普通对象。第 16 章提交接口时会再用到它。

## 脚本放在哪：defer 与 DOMContentLoaded

把 `script` 放在 `head` 里且不加 `defer`，浏览器解析到它时会立刻执行，此时下面的 `button` 还没被解析出来，`querySelector` 返回 `null`，下一行就报 `Cannot read properties of null`。

三种解法：把 script 放到 `</body>` 前；给 script 加 `defer`；用 `DOMContentLoaded` 包起来。

```html
<head>
  <script src="app.js" defer></script>
</head>
```

`defer` 让脚本在后台下载，等 HTML 解析完再按顺序执行，执行时 DOM 一定齐了。这是现代项目最常用的写法。`async` 则是下载完立刻执行，不保证顺序，适合统计脚本这种独立、不依赖 DOM 的代码。

| 写法 | 执行时机 | 能拿到完整 DOM 吗 | 顺序 |
| --- | --- | --- | --- |
| head 里的普通 script | 立即，阻塞解析 | 不能 | 按出现顺序 |
| body 末尾的 script | 解析到末尾时 | 能 | 按出现顺序 |
| `defer` | HTML 解析完 | 能 | 按出现顺序 |
| `async` | 下载完就执行 | 不一定 | 不保证 |

如果脚本没有 defer 又放在 head，就用事件等 DOM 就绪：`document.addEventListener('DOMContentLoaded', ...)`，回调里再查询元素。

`DOMContentLoaded` 不等图片和样式，`load` 要等所有资源加载完，通常太晚。日常用 `defer` 就够了，`DOMContentLoaded` 主要出现在老项目和第三方脚本里。

## 常见误区清单

| 写法 | 结果 | 为什么 |
| --- | --- | --- |
| 选择器拼错后直接 `.textContent` | `Cannot read properties of null` | 没判断 `querySelector` 可能返回 null |
| `querySelectorAll(...).map()` | `map is not a function` | NodeList 不是数组，用 `Array.from` 转 |
| `el.innerHTML = 用户输入` | 可能执行任意脚本 | XSS，用户输入一律用 `textContent` |
| `el.className = 'active'` | 原有 class 全丢 | 用 `classList.add/remove/toggle` |
| `el.style.display` 读 CSS 类里的值 | 得到空字符串 | 只能读内联样式，用 `getComputedStyle` |
| 表单 submit 不 `preventDefault` | 页面刷新，状态全丢 | 默认提交会导航到新地址 |
| 给每个删除按钮单独绑事件 | 新增的行删不掉 | 新节点没有监听器，用事件委托 |
| 把 `e.target` 直接当按钮用 | 点到内部文字就出错 | 用 `e.target.closest('button')` |
| script 放 head 直接查元素 | 拿到 null | 元素还没解析，用 `defer` 或放 body 末尾 |
| `addEventListener('click', fn())` | 事件没绑上，函数立刻执行 | 传的是调用结果，不是函数本身 |
| 用匿名函数 `removeEventListener` | 移除无效 | 两次是不同函数，要传同一个引用 |
| 用 `innerHTML` 重渲染列表 | 按钮点不动了 | 子节点被销毁，监听器一起没了 |

## 通勤自测

:::quiz 下面这行执行后，页面上显示什么？
`box.textContent = '<b>粗体</b>';`
页面上原样显示 `<b>粗体</b>`，连尖括号一起显示。`textContent` 把内容当纯文本，不会解析标签；想让它变粗要用 `innerHTML`，但只在你完全信任这段内容时才这么做。
:::

:::quiz 点击内层按钮，下面三个监听器的输出顺序是什么？
父元素先注册一个捕获监听（第三参数 `true`），再注册一个冒泡监听；子元素注册一个冒泡监听。
顺序是「父捕获 → 子 → 父冒泡」。捕获从外向内，冒泡从内向外，目标元素上的监听器在两者之间执行。
:::

:::quiz 点击按钮里的 `<span>` 时，`e.target` 和 `e.currentTarget` 分别是什么？
`e.target` 是那个 `span`，`e.currentTarget` 是绑定监听器的 `button`。`target` 跟着实际点中的元素变，`currentTarget` 始终是 `addEventListener` 的调用者，所以委托里要用 `closest` 往上找。
:::

:::quiz `document.querySelectorAll('.item')` 的结果能直接 `.map()` 吗？
不能，会报 `map is not a function`。它返回的是 NodeList，只有 `length`、下标和 `forEach`。先 `Array.from(...)` 或 `[...nodeList]` 转成数组，再用数组方法。
:::

:::quiz 对同一个元素连续调用两次 `classList.toggle('active')`，最后 class 是什么状态？
回到初始状态。第一次没有就加上，第二次有就删掉。`toggle` 是开关，不是「只加不删」；想强制加用 `toggle('active', true)`。
:::

:::quiz `stopPropagation` 和 `preventDefault` 分别阻止什么？
前者阻止事件继续冒泡到祖先元素，后者阻止浏览器对该事件的默认行为（链接跳转、表单提交）。两者互不影响，需要同时阻止就两个都调用。
:::

:::quiz 为什么事件委托对「后来新增的列表项」也有效？
监听器绑在父元素上，新增的项点击后事件照样冒泡到父元素，父元素用 `e.target.closest()` 找到具体元素再处理。所以不需要给新元素补绑监听器。
:::

:::quiz 页面报 `Cannot read properties of null (reading 'addEventListener')`，最可能的原因是什么？
`querySelector` 没找到元素。常见原因是选择器写错、脚本在元素解析前执行、或者元素根本不在当前页面。先打印选择器结果确认，再检查 script 位置和 `defer`。
:::

## 动手练习（到电脑上做）

**必做**

1. 做一个「添加 + 删除」的最小列表：一个输入框、一个添加按钮、一个 `ul`。点添加把输入内容作为新 `li` 加到末尾，点任意 `li` 里的删除按钮把它删掉，删除必须用事件委托。
   验收：连续添加 5 条都能删；手动在控制台往 `ul` 里插一个新 `li`，它的删除按钮也能用；输入为空时不会添加空行。

2. 做一个实时搜索框：页面上放 10 个商品名，输入关键词时只显示包含关键词的项，清空输入恢复全部。
   验收：输入「书」只剩含「书」的项；大小写不敏感；用 `input` 事件而不是 `change`；过滤时不要重建整个列表，用 `hidden` 属性或 `classList` 控制显隐。

3. 做一个注册表单，包含邮箱、密码、确认密码三个字段。提交时阻止默认刷新，校验邮箱含 `@`、密码至少 6 位、两次密码一致，错误信息显示在对应输入框下方。
   验收：三种错误分别能触发；错误提示用 `textContent` 写入；全部通过后打印收集到的对象并清空表单。

**进阶**

4. 用 `document.createElement` + `DocumentFragment` 渲染 1000 条数据，再用 `console.time` / `console.timeEnd` 对比「拼 HTML 字符串一次 innerHTML」的耗时。两种方式各跑三次，记录结果。
   验收：能说出两种方式各自快慢的原因；能解释为什么字符串方式在数据来自用户时有风险。

5. 做一个可折叠卡片列表：点卡片标题展开/收起内容，点卡片里的「删除」按钮只删除卡片、不触发折叠。整个列表只用一个点击监听器。
   验收：折叠和删除互不干扰；新增卡片自动具备两种行为；删除时不依赖按钮在 DOM 里的层级，用 `closest` 找卡片。

:::tip
这一章的两个错误会反复出现在你后面的项目里：`null` 上读属性，以及 `e.target` 不是你以为的元素。写完任何一段 DOM 代码，先问自己两句：这个选择器一定选得到吗？用户可能点到哪个子元素？

下一章给页面加上记忆和网络：用 `localStorage` 存住数据，用 `fetch` 从服务器取数据。第 17 章会教你在这些代码出错时怎么快速定位，第 18 章则把这三章合成一个能用的待办清单。
:::
