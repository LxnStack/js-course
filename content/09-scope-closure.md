---
id: 09
title: 作用域、闭包与变量提升
summary: 变量到底住在哪里，为什么循环里的回调总打印同一个值，闭包能做什么、什么时候会拖住内存。
minutes: 36
keywords: 作用域 闭包 变量提升 TDZ 作用域链 内存 循环 IIFE
---

> 前八章里，你写下的每个变量都住在一个看不见的「房间」里。房间的范围决定了谁能看见它、它能活多久。
>
> 这一章讲三件事：变量在哪里生效（作用域）、为什么有些变量在声明前就能被访问（提升）、函数为什么能记住出生地的变量（闭包）。
>
> 学完你能解释「循环里三个回调打印同一个值」这类怪现象，也能用闭包写出计数器、私有变量和防抖函数。这是高级部分的第一章，第 10 章的 `this`、第 11 章的原型都会反复用到「作用域」这个概念。

## 为什么需要它

先看一个真实会发生的事故。你和另一个模块的同事各自写了一段代码，都用 `name` 存名字：

```js
// 用户模块
var name = '小明';

// 三百行之后，商品模块
var name = '耳机';

console.log(name);   // 输出: 耳机
```

第一行的 `name` 被悄悄覆盖了，没有任何报错。等页面显示出问题，你要在一千行代码里找「谁改了 name」。

如果这两个 `name` 各自待在自己的「房间」里，互不干扰，事故就不会发生。**作用域（scope）就是变量的房间**：它规定了变量在哪段代码里可见、能被谁读写、什么时候销毁。

再看一个更隐蔽的例子，很多人第一次遇到会以为是浏览器出了故障：

```js
for (var i = 0; i < 3; i++) {
  setTimeout(function () {
    console.log(i);
  }, 0);
}
// 输出: 3 3 3
```

循环明明跑了三次，为什么打印的全是 3？这不是 `setTimeout` 的错，而是三个回调共享了同一个 `i`。要解释它，必须先搞清楚作用域。

## 三种作用域

JS 里变量的「房间」有三种：全局、函数、块级。它们像小区、房间和抽屉，一层套一层。

### 全局作用域

写在脚本最外层、不在任何函数或 `{}` 里的变量，属于全局作用域。比如在文件第一行写 `const siteName = '我的自学笔记';`，文件里任何一个函数都能直接读它，不需要传参。

全局变量像放在小区广场上的公共物品，谁都能拿，谁都能换。项目一大，命名冲突几乎必然发生。浏览器里用 `var` 声明的全局变量还会挂到 `window` 上，和页面上的 `id`、老库的变量互相干扰，这是老项目常见的故障源。

### 函数作用域

函数内部声明的变量，只在这个函数里可见：

```js
function calcTotal() {
  const total = 42;
  console.log(total);   // 输出: 42
}

calcTotal();

// console.log(total);   // ReferenceError: total is not defined
```

每次调用函数，都会创建一个新的「房间」。两次调用之间的局部变量互不影响，这也是函数能反复使用的原因。

### 块级作用域

任何一对 `{}` 都是一个块：`if`、`for`、`while`、单独写的 `{}` 都算。用 `let` 和 `const` 声明的变量，只在这个块里可见。在 `if` 里写 `const message = '只在 if 里存在';`，块内能打印，出了 `}` 再访问就是 `ReferenceError: message is not defined`。

`let` 和 `const` 是第 2 章讲过的内容。那时只说「不要用 `var`」，这一章补上原因：块级作用域让变量只在需要它的那一小段代码里存在，减少撞名，也让「这个变量在哪被改过」更容易追查。

### 内层能看外层，外层看不到内层

三种作用域是嵌套的，像房间里的柜子、柜子里的抽屉：

```js
const building = '小区';

function room() {
  const desk = '书桌';

  function drawer() {
    const pen = '钢笔';
    console.log(building, desk, pen);   // 输出: 小区 书桌 钢笔
  }

  drawer();
  // console.log(pen);   // ReferenceError: pen is not defined
}

room();
```

`drawer` 能看见自己的 `pen`，也能看见外层 `room` 的 `desk`，还能看见最外层 `building`。反过来，`room` 看不见 `pen`。

这条「从内往外看」的路径叫**作用域链（scope chain）**，后面会专门讲它的查找规则。

## var 没有块级作用域：两个真实事故

`var` 只有函数作用域，没有块级作用域。写在 `{}` 里的 `var`，会「泄漏」到块外面。

### 事故一：if 里的变量跑了出来

```js
if (true) {
  var leaked = '我不该出来';
  let safe = '我只在块里';
}

console.log(leaked);   // 输出: 我不该出来
// console.log(safe);  // ReferenceError: safe is not defined
```

`leaked` 虽然写在 `if` 里，但 `var` 不认 `{}` 的边界，它实际属于整个函数（这里是全局）。如果后面还有人写 `var leaked`，两者会互相覆盖。

### 事故二：for 循环里的回调共享同一个 i

回到开头那段代码：

```js
for (var i = 0; i < 3; i++) {
  setTimeout(function () {
    console.log(i);
  }, 0);
}
// 输出: 3 3 3
```

逐步拆开看：

1. `var i` 只有一个，整个循环共用它。三轮循环只是反复给同一个 `i` 赋值。
2. `setTimeout` 把回调放进任务队列，并不会立刻执行。具体机制第 13 章讲，现在只要知道「回调是等循环跑完才执行的」。
3. 循环结束时 `i` 变成 3，三个回调这时才依次执行，读到的都是同一个 `i`，所以打印三次 3。

把 `var` 换成 `let`，结果立刻正常：

```js
for (let i = 0; i < 3; i++) {
  setTimeout(function () {
    console.log(i);
  }, 0);
}
// 输出: 0 1 2
```

原因是 `let` 在每一轮循环都会创建一个**新的绑定**，三轮循环有三个独立的 `i`，每个回调记住自己那一轮的。

这不是 `let` 的特殊魔法，而是块级作用域的自然结果：循环体是一个块，每轮进入块都新建一次变量。

:::warn
不要记成「`let` 在循环里会复制一份 `i`」。准确说法是：每一轮迭代有独立的词法环境，`i` 在每轮开始时被赋值为当前值。闭包记住的是各自那一轮的 `i`。
:::

## 词法作用域：出生地决定，不是调用地

这是本章最容易被忽略、但最重要的一条规则：**函数能访问哪些变量，在它定义的时候就确定了，和它在哪里被调用无关**。

```js
function createLogger() {
  const label = '来自 createLogger';
  return function () {
    console.log(label);
  };
}

const logger = createLogger();

function runInAnotherPlace() {
  const label = '来自 runInAnotherPlace';
  logger();
}

runInAnotherPlace();   // 输出: 来自 createLogger
```

调用点在 `runInAnotherPlace` 里，那里也有一个 `label`，但 `logger` 根本不看它。**作用域是「写代码时的位置」决定的，不是「运行时谁调用」决定的**。这种规则叫词法作用域（lexical scope），也叫静态作用域。

生活里的类比：你从小在家里学会的方言，不会因为你去外地工作就变成当地话。函数带着它的「出生地记忆」到处跑。

这也解释了一个常见困惑：为什么把函数传给 `setTimeout`、数组的 `map`、事件监听之后，它还能访问原来的变量。传过去的只是函数本身，函数身上带着「定义时环境」的引用。

## 作用域链：从内往外找

访问一个变量时，JS 的查找顺序是固定的：

1. 先找当前作用域自己有没有；
2. 没有就去外层作用域找；
3. 再往外，直到全局；
4. 全局也没有，报 `ReferenceError`。

```js
const level = 'global';

function outer() {
  const level = 'outer';

  function inner() {
    const level = 'inner';
    console.log(level);   // 输出: inner
  }

  inner();
}

outer();
```

`inner` 自己有 `level`，找到就停，不会继续往外看。这叫**遮蔽（shadowing）**：内层变量把外层同名的挡住了。如果把 `inner` 里的声明删掉，就会拿到 `outer` 的 `level`；再删掉 `outer` 的，才会拿到全局的 `global`。

查找只认「最近的那一层」。这也是为什么给内层变量起一个和外层一样的名字很危险：你以为改的是外层，实际创建了一个新的内层变量，外层的值根本没动。遇到「明明赋值了却没生效」，先检查是不是不小心遮蔽了。

如果三层都没有：

```js
function readUnknown() {
  console.log(unknownVar);
}

readUnknown();   // ReferenceError: unknownVar is not defined
```

注意报错文案是 `is not defined`，意思是「整条作用域链都没找到这个变量」。这和「变量找到了但值是 `undefined`」是两回事，后者不会报错。

生活类比：你在自己抽屉里找钥匙，没有就去客厅找，再去物业问，最后都没有，才会被告知「没有这个东西」。你不会一上来就去物业。

## 变量提升：声明先跑到顶上

JS 在执行一段代码前，会先扫一遍，把变量声明和函数声明「提」到所在作用域的顶部。这个行为叫**提升（hoisting）**。

### var：声明提升，赋值不提升

```js
console.log(a);   // 输出: undefined
var a = 1;
```

没有报错，但也不是 1。因为上面这段代码实际等价于：先执行 `var a;`，再执行 `console.log(a)`，最后执行 `a = 1`。只有「声明」被提上去，「赋值」留在原处，所以声明前访问得到 `undefined`。

这个行为会造成很隐蔽的 bug：

```js
var price = 100;

function getPrice() {
  console.log(price);   // 输出: undefined，不是 100
  var price = 200;
  return price;
}

getPrice();   // 输出: 200
```

函数里也声明了 `price`，这个声明被提升到函数顶部，把外层的 `price` 遮蔽了。打印时局部 `price` 还没赋值，所以是 `undefined`。很多人会以为这里能读到全局的 100。

### 函数声明整体提升，函数表达式不提升

用 `function` 关键字声明的函数，整个函数体都会被提升，所以可以在定义之前调用。把函数赋给变量则没有这个待遇：

```js
sayHi();   // 输出: 你好

function sayHi() {
  console.log('你好');
}

// sayBye();   // TypeError: sayBye is not a function
var sayBye = function () {
  console.log('再见');
};
```

`var sayBye` 的变量声明被提升了，值是 `undefined`，调用 `undefined()` 就得到 `TypeError: sayBye is not a function`。如果换成 `const sayBye`，报错会变成 `ReferenceError: Cannot access 'sayBye' before initialization`，原因就是下一节的暂时性死区。

## 暂时性死区 TDZ

`let` 和 `const` 也会提升，但提升后到声明语句执行前，这个变量处于**暂时性死区（TDZ, Temporal Dead Zone）**，访问它会直接报错：

```js
console.log(user);   // ReferenceError: Cannot access 'user' before initialization
let user = '小明';
```

报错文案值得记一下：`Cannot access 'user' before initialization`，意思是「在初始化之前不能访问」。注意它和 `user is not defined` 不同——变量确实存在，只是还没初始化。

`typeof` 在 TDZ 里也不安全。第 2 章说过 `typeof` 对没声明的变量不会报错，但 TDZ 里的变量是「已声明、未初始化」，`typeof user` 照样抛出同一个 `ReferenceError`。所以不要用 `typeof` 去探测一个还没声明的 `let` 变量。

TDZ 的范围是从进入块开始，到声明语句执行完、变量完成初始化为止。可以把它想成一个还没验收的房间：门牌已经挂上了，但验收之前你不能进去拿东西。

这个设计看起来麻烦，实际是在帮你：把「先使用、后声明」这种错误立刻暴露出来，而不是像 `var` 那样偷偷给你一个 `undefined`，让你在几百行之后才发现问题。

## 闭包：函数背走了它的房间

现在可以正式说闭包（closure）了。

**闭包 = 函数 + 它定义时记住的词法环境**。函数被返回或传递到别处后，仍然能访问定义时所在作用域的变量。

```js
function createCounter() {
  let count = 0;

  return function () {
    count += 1;
    return count;
  };
}

const counter = createCounter();

console.log(counter());   // 输出: 1
console.log(counter());   // 输出: 2
console.log(counter());   // 输出: 3
```

`createCounter()` 执行完，`count` 按理应该随函数一起销毁，但返回的那个函数还引用着它，所以它被保留了下来。外部无法直接读写 `count`，只有通过返回的函数才能操作。

这里不是把 `count` 的值复制进了函数，而是函数一直持有那个词法环境的引用。所以多个函数共享同一个闭包时，它们看到的是同一份 `count`；而重新调用 `createCounter()` 会创建新的环境，互不相干。

生活类比：你离开家去外地，背包里带着家里的一张便签。家已经不在了，但便签上的内容你随时能看、能改，别人却看不到。

每次调用 `createCounter()` 都会创建一套全新的环境，所以多个计数器互不干扰：

```js
const counterA = createCounter();
const counterB = createCounter();

console.log(counterA());   // 输出: 1
console.log(counterA());   // 输出: 2
console.log(counterB());   // 输出: 1
```

`counterB` 从 1 开始，因为它有自己的 `count`。

### 用途一：私有变量

JS 的对象没有真正的私有属性（`#` 私有字段要等到第 11 章），闭包可以实现类似效果：

```js
function createWallet(initial) {
  let balance = initial;

  return {
    deposit(amount) {
      balance += amount;
      return balance;
    },
    getBalance() {
      return balance;
    },
  };
}

const wallet = createWallet(100);

console.log(wallet.deposit(50));    // 输出: 150
console.log(wallet.getBalance());   // 输出: 150
console.log(wallet.balance);        // 输出: undefined
```

`balance` 只能通过 `deposit` 和 `getBalance` 访问，外部既读不到也改不了。这比把余额挂在对象属性上安全得多。

### 用途二：缓存与记忆化

同一个参数算过一次，就把结果记下来，下次直接返回。缓存放在闭包里，不会污染全局：

```js
function memoize(fn) {
  const cache = {};

  return function (n) {
    if (n in cache) {
      return cache[n];
    }
    const result = fn(n);
    cache[n] = result;
    return result;
  };
}

const slowSquare = function (n) {
  console.log('计算一次', n);
  return n * n;
};

const fastSquare = memoize(slowSquare);

console.log(fastSquare(5));
// 输出: 计算一次 5
// 输出: 25

console.log(fastSquare(5));
// 输出: 25（没有再次计算）
```

第二次调用时 `cache` 里已经有 5 的结果，直接返回，`slowSquare` 根本没执行。`cache` 是 `memoize` 的局部变量，函数返回后依然活着，这就是闭包在起作用。

### 用途三：防抖 debounce

搜索框每输入一个字符就发一次请求，服务器会被打爆。防抖（debounce）的做法是：用户停下来一段时间后，才真正执行。

```js
function debounce(fn, delay) {
  let timer = null;

  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(function () {
      fn(...args);
    }, delay);
  };
}

const onSearch = debounce(function (keyword) {
  console.log('发送搜索请求:', keyword);
}, 500);

onSearch('j');
onSearch('ja');
onSearch('jav');
// 500ms 后只输出一次: 发送搜索请求: jav
```

每次调用 `onSearch` 都清掉上一个定时器，重新计时。`timer` 保存在闭包里，多次调用共享同一个计时器。这个函数会在第 15 章做搜索框时真正用上，第 13 章会讲 `setTimeout` 的细节。

### 用途四：让循环里的每个回调记住自己的值

`let` 已经解决了大部分循环闭包问题，但你可能在老代码里看到立即执行函数的写法：

```js
for (var i = 0; i < 3; i++) {
  (function (j) {
    setTimeout(function () {
      console.log(j);
    }, 0);
  })(i);
}
// 输出: 0 1 2
```

每轮循环都调用一次这个函数，把当前的 `i` 作为参数 `j` 传进去。`j` 是每次调用新建的局部变量，三个回调各自记住自己的 `j`。

## 闭包与内存：变量为什么没被回收

正常情况，函数执行完，局部变量就该被垃圾回收。闭包打破了这个规则：只要还有函数引用着变量，它就不会被回收。

这不是 bug，是闭包能工作的前提。但如果你把一个很大的对象挂在长期存在的闭包里，它就会一直占内存：

```js
function attachHandler() {
  const bigData = new Array(1000000).fill('数据');

  window.onclick = function () {
    console.log(bigData.length);   // 回调一直引用 bigData
  };
}

attachHandler();
```

`attachHandler` 执行完后，`bigData` 本该释放，但 `window.onclick` 这个回调一直存在，闭包就一直拽着 `bigData`。只要不取消这个监听，这块内存就回收不了。

定时器是另一个常见来源。`setInterval` 的回调只要没被 `clearInterval`，就会一直执行，它引用到的页面元素、大数组也就一直留着。

处理原则很简单：**谁创建，谁负责清理**。组件销毁、页面切换、路由跳转时，把定时器 `clearInterval`、把事件监听 `removeEventListener`。

判断标准不是「用了闭包没有」，而是「这个引用还需不需要」。如果一个回调只活到本次操作结束，用完自然释放；如果它会一直存在到页面关闭，就要检查它拽着的数据是不是真的有必要留那么久。

:::tip
「闭包会导致内存泄漏」这个说法不准确。闭包只是延长了变量的生命周期，真正的问题是「该释放的引用没释放」。现代浏览器的垃圾回收已经能处理循环引用，不要因为怕泄漏就不敢用闭包。
:::

## IIFE：一个正在退场的技巧

你可能在老代码里见过这种写法：

```js
(function () {
  var privateValue = 1;
  console.log('立即执行', privateValue);   // 输出: 立即执行 1
})();
```

函数外面包一层括号，末尾再加 `()`，定义完立刻执行。这叫**立即执行函数表达式（IIFE, Immediately Invoked Function Expression）**。

外面那对括号的作用是把 `function` 变成表达式。如果直接写 `function () {}()`，JS 会把它当成函数声明，报语法错误。

IIFE 在 ES6 之前很流行，因为那时没有块级作用域，也没有模块系统，大家用函数造一个临时帐篷，避免变量污染全局。现在有 `let` / `const` 和 ES module（第 14 章），它的用武之地已经很小。看到能看懂就行，新代码不必主动写。

顺带把它和块级作用域对比一下：IIFE 造出的是一个函数作用域，连 `var` 都关得住；`{}` 造出的是块级作用域，只关得住 `let` 和 `const`。两种写法都能隔离变量，只是隔离的力度不同。

## 常见误区清单

| 写法 | 结果 | 为什么 |
| --- | --- | --- |
| `if (true) { var a = 1 } console.log(a)` | `1` | `var` 没有块级作用域 |
| `if (true) { let a = 1 } console.log(a)` | `ReferenceError` | `let` 只在块内可见 |
| `console.log(a); var a = 1` | `undefined` | 声明提升，赋值没提升 |
| `console.log(a); let a = 1` | `ReferenceError` | TDZ，初始化前不能访问 |
| `typeof a; let a = 1` | `ReferenceError` | TDZ 里 `typeof` 也会抛错 |
| `fn(); function fn() {}` | 正常执行 | 函数声明整体提升 |
| `fn(); var fn = function () {}` | `TypeError` | 变量是 `undefined`，不是函数 |
| `for (var i...) setTimeout(...)` | 打印同一个最终值 | 所有回调共享一个 `i` |
| `for (let i...) setTimeout(...)` | 打印 0、1、2 | 每轮迭代有独立绑定 |
| 函数在别处调用却读到定义处的变量 | 正常 | 词法作用域由定义位置决定 |
| 闭包返回后仍能读写外层变量 | 正常 | 变量被闭包引用，未回收 |
| 把大对象挂在长期监听器里 | 内存不释放 | 闭包一直引用它，需要手动清理 |

## 通勤自测

:::quiz 下面这段代码输出什么？
```js
for (var i = 0; i < 3; i++) {
  setTimeout(function () {
    console.log(i);
  }, 0);
}
```
输出 `3 3 3`。`var` 只有一个 `i`，三轮循环共用；回调在循环结束后才执行，读到的都是最终的 3。
:::

:::quiz 把上一题的 `var` 改成 `let`，输出什么？为什么？
输出 `0 1 2`。`let` 是块级作用域，每一轮循环创建一个新的绑定，三个回调各自记住自己那一轮的 `i`。
:::

:::quiz 下面这段代码输出什么？
```js
function outer() {
  const x = 'outer';
  return function () {
    console.log(x);
  };
}

const fn = outer();

function another() {
  const x = 'another';
  fn();
}

another();
```
输出 `outer`。词法作用域在函数定义时就确定了，`fn` 访问的是它出生地 `outer` 里的 `x`，和调用位置无关。
:::

:::quiz `console.log(a); var a = 1;` 和 `console.log(b); let b = 1;` 分别是什么结果？
第一段输出 `undefined`：`var` 的声明被提升，赋值没提升。第二段报 `ReferenceError: Cannot access 'b' before initialization`：`let` 有暂时性死区。
:::

:::quiz 下面这段代码输出什么？
```js
function createCounter() {
  let count = 0;
  return function () {
    count += 1;
    return count;
  };
}

const c1 = createCounter();
const c2 = createCounter();
console.log(c1());
console.log(c1());
console.log(c2());
```
输出 `1`、`2`、`1`。每次调用 `createCounter` 都创建独立的 `count`，`c1` 和 `c2` 互不影响。
:::

:::quiz 闭包是什么？用一句话说，并指出它和普通函数的区别。
闭包是「函数 + 它定义时记住的词法环境」。普通函数执行完，局部变量随作用域销毁；闭包因为被外部引用，外层变量在函数返回后仍然存活，可以被继续读写。
:::

:::quiz 函数声明和函数表达式在「提升」上有什么区别？
函数声明整体提升，可以在定义之前调用；函数表达式只提升变量声明，函数本身没有提上去。用 `var` 时变量是 `undefined`，提前调用报 `TypeError: ... is not a function`；用 `const` 时则落入 TDZ，报 `ReferenceError`。
:::

:::quiz 为什么说「闭包会导致内存泄漏」这个说法不准确？
闭包本身只是延长变量生命周期，这是它正常工作的机制。真正的泄漏是「不再需要的引用没有解除」，比如定时器没清、事件监听没移除、大对象挂在长期存在的闭包里。该清理的清理掉，闭包不会无故泄漏。
:::

## 动手练习（到电脑上做）

**必做**

1. 复现 `for` 循环闭包问题：先用 `var + setTimeout` 写出打印 `3 3 3` 的版本，再改成 `let` 得到 `0 1 2`，最后用 IIFE 把 `var` 版本修好。
   验收：三段代码都能运行，输出与预期一致；能口头解释 `var` 和 `let` 的差异。

2. 写 `createCounter(start)`，返回一个对象，包含 `increment()`、`decrement()`、`value()` 三个方法，内部计数不能被外部直接修改。
   验收：`const c = createCounter(10); c.increment(); c.value()` 返回 `11`；`c.count` 是 `undefined`。

3. 写 `memoize(fn)`，用一个对象做缓存，让一个带 `console.log` 的慢函数在相同参数第二次调用时不再打印。
   验收：连续调用两次 `fastSquare(6)`，控制台只出现一次「计算一次 6」，两次返回值都是 `36`。

**进阶**

4. 写 `debounce(fn, delay)`，绑定到一个输入框的 `input` 事件上（可以先用 `setTimeout` 模拟连续输入），验证快速输入三次只触发一次。
   验收：500ms 内连续触发三次，最终只执行一次，且拿到的是最后一次的参数。

5. 写一个 `createLogger(prefix)`，返回的函数每次调用输出 `[prefix] 消息`，并且能累计调用次数。再创建两个 logger，证明它们的计数互不影响。
   验收：`logA('a')` 与 `logB('b')` 的计数各自独立，输出格式正确。

:::tip
作用域是后面所有章节的地基。第 10 章的 `this` 之所以会「丢失」，本质是函数的调用环境和定义环境脱节；第 11 章的原型链，也是一条从对象往外的查找链，和这里的作用域链是同一个思路。

如果你现在只记住三件事，就记：`var` 没有块级作用域、`let` 有 TDZ、闭包让外层变量活得更久。其余细节可以在写代码时回来查。
:::
