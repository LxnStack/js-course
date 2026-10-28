---
id: 13
title: 异步：回调、Promise、async/await
summary: 从单线程为什么会被卡住讲起，用事件循环、Promise 三种状态和 async/await 把「等」这件事彻底说清。
minutes: 38
keywords: 异步 事件循环 宏任务 微任务 Promise async await 并发 回调
---

> 前端所有「等」的操作都是异步：等接口返回、等定时器到点、等用户点按钮。这一章决定你能不能写出不卡顿的页面。
>
> 前面十二章的代码都是「从上往下立刻执行完」。这一章要引入一个新的时间维度：有些代码现在开始，过一会儿才结束。
>
> 学完你能看懂面试里最常见的那道输出顺序题，能写出正确的 Promise 链，也知道什么时候该用 `Promise.all`、什么时候必须串行。第 16 章的 `fetch` 会直接建立在这一章之上。

## 为什么需要它

JS 是**单线程（single thread）** 的：同一时刻只能执行一件事。这不是缺陷，而是设计选择——单线程不用处理多线程的锁和竞态，写起来简单。但它带来一个必须面对的问题：**任何耗时的操作，都会把整个页面卡住**。

先看一个极端的例子。假设你要「等 3 秒」，最直接的想法是写一个循环：

```js
console.log('1 开始请求');

const start = Date.now();
while (Date.now() - start < 3000) {
  // 空转 3 秒，模拟一个耗时操作
}

console.log('2 数据到了');
```

输出是 `1 开始请求`，三秒后 `2 数据到了`。看起来没问题，但在这三秒里，主线程一直在跑那个 `while`，它没空做任何别的事：你点按钮没反应，滚动页面不动，输入框打不出字，浏览器甚至会弹出「页面无响应」。

这就是**同步阻塞**。耗时操作不结束，后面的代码一行都执行不了。

真实的网络请求不由你控制，可能 100 毫秒，也可能 10 秒。你不可能让页面陪着等。所以 JS 的做法是：把「等」这件事交给浏览器（或 Node）的后台能力，主线程先继续往下跑，等结果回来了再通知你。

```js
console.log('1 开始请求');

setTimeout(() => {
  console.log('2 数据到了');
}, 3000);

console.log('3 我可以先干别的');
```

这次的输出顺序是：

```text
1 开始请求
3 我可以先干别的
2 数据到了        ← 约 3 秒后
```

`setTimeout` 把回调函数交给计时器，自己立刻返回，主线程继续执行 `console.log('3 ...')`。三秒后计时器到点，把回调放进队列，主线程空了才去执行它。

这套机制叫**异步（asynchronous）**。它的核心不是「同时做多件事」，而是「不等着，先做别的，结果回来再处理」。

## 同步与异步的执行顺序

初学者最容易凭直觉判断顺序，然后出错。看这段：

```js
console.log('A');

setTimeout(() => console.log('B'), 0);

console.log('C');

// 输出: A C B
```

很多人以为 `0` 毫秒就是「立刻」，应该输出 `A B C`。实际是 `A C B`。

原因：`setTimeout` 的第二个参数是「至少等多久」，不是「多久之后立刻插队执行」。哪怕写 0，回调也只是被放进**任务队列**，必须等当前这段同步代码全部跑完、主线程空了，才有机会执行。

所以判断顺序的第一条规则是：**同步代码永远先跑完，异步回调排在后面**。

那异步回调之间谁先谁后？这就涉及事件循环。

## 事件循环：宏任务与微任务

先把三个概念摆出来：

- **调用栈（call stack）**：当前正在执行的函数。JS 一次只执行栈顶那一个。
- **宏任务队列（macrotask queue）**：`setTimeout`、`setInterval`、I/O、用户事件回调都排在这里。
- **微任务队列（microtask queue）**：`Promise.then`、`queueMicrotask` 排在这里。

规则只有一条，但要理解透：**每执行完一个宏任务，就把微任务队列整个清空，然后才取下一个宏任务**。注意是「清空」，不是「取一个」。

事件循环（event loop）就是不断重复这个过程：取宏任务 → 执行 → 清空微任务 → 再取下一个。

看一道完整的题。建议你先把答案写在纸上，再往下看：

```js
console.log('1');

setTimeout(() => {
  console.log('2');
  Promise.resolve().then(() => console.log('3'));
}, 0);

Promise.resolve()
  .then(() => {
    console.log('4');
    setTimeout(() => console.log('5'), 0);
  })
  .then(() => console.log('6'));

console.log('7');
```

输出是：

```text
1
7
4
6
2
3
5
```

逐条推演：

1. 主线程同步执行：打印 `1`；登记一个 `setTimeout` 回调（宏任务）；`Promise.resolve().then(A)` 把回调 A 放进微任务队列；打印 `7`。此刻输出 `1 7`。
2. 同步代码结束，开始清空微任务：执行 A，打印 `4`，同时把 `setTimeout(() => console.log('5'))` 登记成宏任务。A 返回 `undefined`，链上的下一个 `then(B)` 被加入微任务队列。
3. 微任务队列还没空，继续执行 B，打印 `6`。这一步很关键：**同一个微任务批次里新加的微任务也要一起清掉**。
4. 微任务清空，取第一个宏任务（最开始那个 `setTimeout`）：打印 `2`，并把 `Promise.then(() => console.log('3'))` 加入微任务队列。
5. 这个宏任务结束，再次清空微任务：打印 `3`。
6. 取下一个宏任务（A 里登记的那个）：打印 `5`。

最终 `1 7 4 6 2 3 5`。

三个容易记错的地方：

- `7` 在 `4` 前面，因为同步代码优先。
- `6` 在 `2` 前面，因为微任务要整批清空。
- `3` 在 `2` 后面，因为它是「宏任务里新产生的微任务」，要等这个宏任务执行完才轮到。

:::warn
`setTimeout(fn, 0)` 不代表 0 毫秒后立刻执行。浏览器对嵌套定时器有最小延迟限制，实际通常是 4 毫秒左右；更重要的是，它必须排队。所以用它做「立即执行」是错的，想要「本轮同步代码之后、下一轮宏任务之前」执行，用 `queueMicrotask` 或 `Promise.resolve().then`。
:::

## 回调函数与回调地狱

在 Promise 出现之前，异步全靠**回调函数（callback）**：你把「结果回来之后要做什么」写成一个函数，传给那个异步操作。

```js
function loadUser(id, onSuccess) {
  setTimeout(() => {
    onSuccess({ id, name: '小明' });
  }, 500);
}

loadUser(1, (user) => {
  console.log('拿到用户:', user.name);
});

// 0.5 秒后输出: 拿到用户: 小明
```

这个写法本身没问题，Node 里至今大量使用。问题出在「一步依赖一步」的时候：

```js
getUser(1, (user) => {
  getOrders(user.id, (orders) => {
    getOrderDetail(orders[0].id, (detail) => {
      getComments(detail.id, (comments) => {
        render(comments);
      });
    });
  });
});
```

这就是**回调地狱（callback hell）**。它有四个实际麻烦：

- 每多一步就多一层缩进，五步之后代码已经贴到屏幕右边缘。
- 错误处理要在每一层单独写，漏一层就吞掉异常。
- 中间结果（`user`、`orders`）只能靠闭包带下去，想提前返回或跳出很难。
- 两步互不依赖的请求也没法并行，因为回调天然是串行的。

Promise 就是为了解决这几个问题：把嵌套改成链式，把错误集中到 `catch`，把「等待」变成一个可以传递的值。

## Promise：把「等」变成一个对象

Promise 是一个对象，代表「一个还没有结果、但将来会有结果的操作」。你可以把它想成一张取餐小票：现在给你一张纸，做好了你凭票来取。

### 三种状态

一个 Promise 只有三种状态：

- **pending（进行中）**：还没有结果。
- **fulfilled（已成功）**：有了结果。
- **rejected（已失败）**：出错了。

状态只能从 `pending` 变成 `fulfilled` 或 `rejected`，**一旦变了就不可逆**，也不会再变回去。这叫「已落定（settled）」。

```js
const p = new Promise((resolve, reject) => {
  setTimeout(() => {
    const ok = true;
    if (ok) {
      resolve('订单数据');
    } else {
      reject(new Error('请求失败'));
    }
  }, 1000);
});

p.then(data => console.log('成功:', data))
 .catch(err => console.log('失败:', err.message))
 .finally(() => console.log('结束'));

// 1 秒后输出:
// 成功: 订单数据
// 结束
```

`resolve` 把状态改成 fulfilled，`reject` 改成 rejected。`then` 处理成功，`catch` 处理失败，`finally` 不管成败都执行（常用来关 loading）。

### executor 是同步执行的

`new Promise((resolve, reject) => { ... })` 里那个函数叫 **executor（执行器）**。它有一个非常关键的行为：**立刻同步执行**。

```js
console.log('1');

const p = new Promise((resolve, reject) => {
  console.log('2');        // executor 同步执行
  resolve('第一次');
  reject(new Error('第二次'));
  resolve('第三次');
});

console.log('3');

p.then(v => console.log('4', v));

console.log('5');

// 输出: 1 2 3 5 4 第一次
```

这段同时说明了两件事：

- `2` 出现在 `3` 之前，说明 executor 是同步跑的，不是「过一会儿再跑」。
- 后面两次调用 `resolve` / `reject` 全部无效，`then` 只拿到第一次的 `'第一次'`。状态一旦落定，后面的调用被静默忽略——不报错，也不改变结果。

很多初学者以为 `new Promise` 里的代码是异步的，于是写出「在 executor 里做耗时计算」的代码，结果照样阻塞页面。真正异步的是 `resolve` 之后回调的调度，不是 executor 本身。

### then、catch、finally

上面那个例子里已经用到了三个方法。如果把 `resolve` 换成 `reject(new Error('接口 500'))`，`then` 就会被跳过，`catch` 打印错误，`finally` 照样执行。

三个方法的分工：

- `then` 只接收成功的结果。前面是 rejected 时，它的回调被跳过。
- `catch` 接收错误。它等价于 `.then(undefined, onRejected)`，但语义更清楚。
- `finally` 不接收参数，成功失败都执行，适合清理工作。

注意 `catch` 之后还可以继续 `.then`，因为 `catch` 也返回一个新的 Promise。错误被处理掉之后，链就恢复成 fulfilled 了。

### 链式调用：返回值会传下去

`then` 永远返回一个**新的 Promise**。这个新 Promise 的状态由回调的返回值决定：

- 返回普通值 → 新 Promise 变成 fulfilled，值是它。
- 返回 Promise → 等这个 Promise 落定，状态和值跟它一致。
- 抛出异常 → 新 Promise 变成 rejected。

```js
Promise.resolve(1)
  .then(v => {
    console.log('第一步', v);
    return v + 1;
  })
  .then(v => {
    console.log('第二步', v);
    return new Promise(r => setTimeout(() => r(v + 1), 100));
  })
  .then(v => console.log('第三步', v));

// 输出:
// 第一步 1
// 第二步 2
// 第三步 3
```

每一步的 `return` 就是下一步的输入。没有 `return` 的话，下一个 `then` 拿到的是 `undefined`——这是 Promise 链里最常见的 bug。比如回调里写了 `v + 1` 却没写 `return`，下一步就只能拿到 `undefined`。

错误也会沿着链传下去，中间的 `then` 全被跳过：

```js
Promise.resolve(1)
  .then(() => {
    throw new Error('这一步出错');
  })
  .then(() => console.log('被跳过'))
  .catch(err => console.log('接到:', err.message));

// 输出: 接到: 这一步出错
```

所以链式写法的标准结构是：一串 `then`，最后跟一个 `catch`，需要的话再加 `finally`。**不要在每个 then 里各写一个 catch**，那会丢掉错误的传播能力。

### 四个组合方法

单个 Promise 好办，真实场景往往要同时处理多个。四个方法的分工必须分清：

```js
const ok = (value, ms) => new Promise(r => setTimeout(() => r(value), ms));
const fail = (message, ms) => new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms));

Promise.all([ok('用户', 100), ok('订单', 50)])
  .then(([user, orders]) => console.log('全部成功:', user, orders));

Promise.all([ok('用户', 100), fail('订单接口挂了', 50)])
  .catch(err => console.log('整体失败:', err.message));

// 50 毫秒时输出: 整体失败: 订单接口挂了
// 100 毫秒时输出: 全部成功: 用户 订单
```

`Promise.all` 等全部成功，结果数组的顺序**和传入顺序一致**，不是完成顺序。上面 `订单` 先回来，但结果里仍然是 `[用户, 订单]`。

第二个调用的特点是「一个失败就整体失败」：50 毫秒时第二个就失败了，整个 `all` 立刻变成 rejected，不再等第一个。这适合「这些数据都拿到才能渲染」的场景：缺一个就没法显示，早点失败早点报错。

如果每个结果都要，不管成败，用 `allSettled`：

```js
Promise.allSettled([ok('用户', 100), fail('订单接口挂了', 50)])
  .then(results => {
    results.forEach(r => {
      console.log(r.status, r.status === 'fulfilled' ? r.value : r.reason.message);
    });
  });

// 输出:
// fulfilled 用户
// rejected 订单接口挂了
```

`allSettled` **永远不会失败**，它等所有 Promise 都落定，返回一个数组，每项是 `{ status, value }` 或 `{ status, reason }`。适合「批量上传，各自显示成功失败」这种互不影响的场景。

`race` 和 `any` 都是「谁先有结果用谁」，但一个看「落定」，一个只看「成功」。假设两个 Promise，一个 20 毫秒后失败，一个 100 毫秒后成功：`Promise.race` 会在 20 毫秒拿到失败，`Promise.any` 会忽略这次失败，等到 100 毫秒拿到成功。

`race` 是第一个**落定**的说了算，成功或失败都算；`any` 会忽略失败，等第一个**成功**的。如果全部失败，`any` 抛一个 `AggregateError`，里面用 `.errors` 存放所有错误。

| 方法 | 什么时候成功 | 什么时候失败 | 典型用途 |
| --- | --- | --- | --- |
| `Promise.all` | 全部成功 | 任意一个失败，立刻失败 | 首屏要多个接口都拿到才渲染 |
| `Promise.allSettled` | 永远成功，返回结果数组 | 不会失败 | 批量操作，各自展示成败 |
| `Promise.race` | 第一个落定的是成功 | 第一个落定的是失败 | 超时控制 |
| `Promise.any` | 第一个成功 | 全部失败 | 多个镜像源，取最快可用的 |

## async / await

Promise 链比回调好，但一串 `then` 读起来还是不像同步代码。`async/await` 是在 Promise 之上的一层语法糖，让异步代码写成同步的样子。

### async 函数一定返回 Promise

```js
async function getCount() {
  return 42;
}

const result = getCount();

console.log(result instanceof Promise);   // 输出: true
result.then(v => console.log(v));          // 输出: 42
```

只要加了 `async`，函数的返回值就被自动包成 Promise。`return 42` 等于 `return Promise.resolve(42)`；抛出异常等于 `return Promise.reject(error)`。

这条规则意味着：**调用 async 函数，拿到的永远是 Promise，不是结果本身**。这一点在下一节的「忘记 await」里会变成一个坑。

### await 的本质：暂停函数，不暂停线程

```js
async function demo() {
  console.log('A');

  const value = await Promise.resolve('B');

  console.log(value);
  console.log('C');
}

demo();
console.log('D');

// 输出: A D B C
```

执行过程：

1. 调用 `demo()`，同步执行到 `await`，打印 `A`。
2. `await` 让**这个函数**暂停，把后面的代码注册成微任务，然后 `demo` 立刻返回一个 Promise。
3. 主线程继续执行外面的 `console.log('D')`，打印 `D`。
4. 微任务执行，`demo` 恢复，打印 `B`、`C`。

关键理解：`await` 暂停的是**函数**，不是**线程**。主线程该干什么干什么，所以 `D` 会插到 `B` 前面。

`await` 后面跟 Promise 时，等它落定并取出值；跟普通值时，也会异步恢复（仍然让出一次微任务），只是不用等。所以 `await 1` 后面的代码也不是立刻执行。

### 用 try/catch 捕获错误

`await` 把 rejected 的 Promise 变成了「像抛出异常一样」的行为，所以可以用熟悉的 `try/catch`：

```js
async function load() {
  try {
    const data = await Promise.reject(new Error('网络断了'));
    console.log('不会走到这里', data);
  } catch (err) {
    console.log('捕获:', err.message);
  } finally {
    console.log('收尾');
  }
}

load();

// 输出:
// 捕获: 网络断了
// 收尾
```

对比 Promise 链的 `.catch()`，`try/catch` 的好处是能覆盖整段逻辑：多个 `await` 中任何一个失败，都会跳到 `catch`，不用给每个都挂 `.catch`。

但要注意：`try/catch` 只能捕获 `await` 的错误。如果你调用了一个 async 函数却**没有 await**，它返回的 Promise 里的错误不会被这里捕获，会变成「未处理的 Promise 拒绝（unhandled rejection）」。

比如 `try { load(); } catch (err) {}` 里少写一个 `await`，`load` 内部的错误就跑到了外面，`catch` 什么也抓不到。

## 串行与并行：别把无关的 await 串起来

这是最容易拿到的性能优化，也是最容易被忽略的。

```js
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function measure() {
  let start = Date.now();

  await sleep(500);
  await sleep(500);
  console.log('串行:', Date.now() - start, 'ms');

  start = Date.now();

  await Promise.all([sleep(500), sleep(500)]);
  console.log('并行:', Date.now() - start, 'ms');
}

measure();

// 输出（数字会有几毫秒浮动）:
// 串行: 1000 ms
// 并行: 500 ms
```

两个 500 毫秒的操作，串行写要 1 秒，并行只要 0.5 秒。判断标准很简单：**后一个操作依赖前一个的结果吗？**

- 依赖：必须串行。比如先登录拿 token，再拿用户信息。
- 不依赖：用 `Promise.all` 并行。比如同时拿用户信息和配置。

串行处理数组时，`for...of` 加 `await` 是正确写法，它会一个接一个等：`for (const item of items) { results.push(await save(item)); }`。

如果顺序无所谓，用 `await Promise.all(items.map(item => save(item)))` 并发。但要注意并发量：几百个请求同时发出去，接口和浏览器都受不了，需要限流。这是第 19 章工程化会讲的内容。

## 三个必须记住的坑

### 坑一：`forEach` 里的 `await` 无效

```js
const ids = [1, 2, 3];
const saved = [];

ids.forEach(async (id) => {
  await sleep(100);
  saved.push(id);
});

console.log(saved);   // 输出: []，一个都没保存完
```

为什么？`forEach` 的设计是「对每个元素调用回调，然后立刻返回」。它**不关心回调返不返回 Promise**，也不会等。每个回调确实都异步跑了，但 `forEach` 自己早就结束了，所以 `console.log` 立刻执行，看到的是空数组。

同样的问题也出现在 `map` 上：`items.map(async ...)` 得到的是「一堆 Promise」，不是结果数组。必须再套 `Promise.all` 才有用。

需要等待就用 `for...of`（串行），或者 `await Promise.all(items.map(...))`（并行）。`forEach` 只适合「不关心结果、也不需要等」的副作用。

### 坑二：忘记 `await`，拿到的是 Promise

```js
async function getCount2() {
  return 42;
}

async function main() {
  const count = getCount2();       // 忘了 await
  console.log(count);              // 输出: Promise { 42 }
  console.log(count === 42);       // 输出: false

  const real = await getCount2();
  console.log(real === 42);        // 输出: true
}

main();
```

浏览器控制台里，第一个 `count` 会显示成 `Promise {<fulfilled>: 42}`，Node 里显示 `Promise { 42 }`。不管显示成什么样，它都不是数字 42。拿它做运算、比较、渲染，结果全是错的，而且**不报错**——这是最难受的地方。

养成习惯：调用 async 函数时，问自己一句「我要的是 Promise，还是里面的值？」要值就必须 `await`，或者 `.then`。

### 坑三：`fetch` 不会因为 4xx 抛错

```js
async function getUser(id) {
  const res = await fetch(`/api/users/${id}`);

  console.log(res.ok);       // 404 时输出: false
  console.log(res.status);   // 404 时输出: 404

  if (!res.ok) {
    throw new Error(`请求失败: ${res.status}`);
  }

  return res.json();
}
```

`fetch` 只有在**网络层失败**时才 reject，比如断网、DNS 解析不了、跨域被拦。服务器返回 404、500 时，它认为「请求成功完成了，只是结果是错误状态」，所以 `await fetch(...)` 不抛错，你必须自己检查 `res.ok`。

不检查的后果：后面 `res.json()` 可能解析失败，或者拿到一个 `{ error: 'not found' }` 当成正常数据渲染，页面显示一堆 `undefined`。第 16 章会完整讲 `fetch` 和 HTTP 状态码。

## 手写 `sleep` 与失败重试

`sleep` 是异步练习里最有用的小工具，它的写法就是一行：`const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));`，上一节的 `measure` 里已经定义过。有了它，任何「等待」都能写成 `await sleep(1000)`，不用再嵌套 `setTimeout`。

失败重试是另一个真实需求。接口偶尔抖一下，重试两三次往往就好了：

```js
async function retry(fn, times = 3, delay = 300) {
  let lastError;

  for (let i = 1; i <= times; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.log(`第 ${i} 次失败: ${err.message}`);
      if (i < times) await sleep(delay);
    }
  }

  throw lastError;
}

let attempt = 0;

retry(async () => {
  attempt += 1;
  if (attempt < 3) throw new Error('服务暂时不可用');
  return `第 ${attempt} 次成功`;
}).then(v => console.log(v));

// 输出:
// 第 1 次失败: 服务暂时不可用
// 第 2 次失败: 服务暂时不可用
// 第 3 次成功
```

这个函数有几个值得注意的设计：

- `return await fn()` 让成功时直接结束整个重试，不再往下走。
- 每次失败后 `await sleep(delay)`，避免立刻重试把服务打得更惨。
- 循环结束后 `throw lastError`，把最后一次错误交给调用方，而不是吞掉。
- 参数有默认值，调用方只传一个函数也能用（第 12 章的默认参数在这里派上用场）。

真实项目里还要加「只重试可恢复的错误」「指数退避」「最多等多久」，但骨架就是这个 `for` 循环加 `try/catch`。

## 常见误区清单

| 写法 | 结果 | 为什么 |
| --- | --- | --- |
| `setTimeout(fn, 0)` 以为立刻执行 | 排在同步代码和微任务之后 | 它只是把回调放进宏任务队列 |
| 在 executor 里写耗时循环 | 照样卡住页面 | executor 是同步执行的 |
| `then` 里忘了 `return` | 下一个 `then` 拿到 `undefined` | 链上的值靠返回值传递 |
| `Promise.all` 里一个失败 | 整体立刻失败，其他结果拿不到 | 它是「全部成功才算成功」 |
| `forEach(async () => { await ... })` | 循环立刻结束，没等到结果 | `forEach` 不处理回调返回的 Promise |
| `const x = asyncFn()` | `x` 是 Promise，不是数据 | async 函数永远返回 Promise |
| `await fetch()` 后不检查 `res.ok` | 404 被当成成功 | `fetch` 只在网络层失败时 reject |
| `try/catch` 里调用 async 函数但没 await | 错误抓不到 | 错误在返回的 Promise 里 |
| 两个无关请求写成两个 `await` | 耗时相加 | 没有依赖就该用 `Promise.all` |
| `await` 写在普通函数里 | 语法错误 | `await` 只能在 async 函数或模块顶层用 |

## 通勤自测

:::quiz 下面这段输出什么？
```js
setTimeout(() => console.log('A'), 0);
Promise.resolve().then(() => console.log('B'));
console.log('C');
```
输出 `C B A`。同步的 `C` 先执行；同步结束后清空微任务，打印 `B`；最后才轮到宏任务 `A`。
:::

:::quiz `await` 会阻塞整个页面吗？
不会。它只暂停当前这个 async 函数，把后续代码注册成微任务，主线程继续执行其他代码。真正会阻塞页面的是同步的耗时循环，或者 executor 里的重计算。
:::

:::quiz `async function f() { return 1; }`，那么 `f() === 1` 成立吗？`f()` 到底是什么？
不成立。`f()` 返回的是一个 fulfilled 的 Promise，值是 1。要拿到 1 必须 `await f()` 或 `f().then(v => ...)`。
:::

:::quiz 三个接口中有一个可能失败，但你想拿到全部三个的结果分别展示，用哪个方法？
用 `Promise.allSettled`。它等全部落定，返回每项的状态和值/原因，不会因为一个失败就整体失败。`Promise.all` 在这种情况下会直接 reject。
:::

:::quiz 下面这段输出什么？为什么？
```js
[1, 2, 3].forEach(async n => {
  await null;
  console.log(n);
});
console.log('done');
```
先输出 `done`，再输出 `1`、`2`、`3`。`forEach` 不等回调里的 `await`，自己先返回，所以 `done` 先打印；三个回调随后在微任务里按顺序恢复。
:::

:::quiz `Promise.race` 和 `Promise.any` 的区别是什么？
`race` 取第一个**落定**的结果，成功或失败都算；`any` 忽略失败，取第一个**成功**的结果，全部失败才抛 `AggregateError`。做超时控制用 `race`，做多源容错用 `any`。
:::

:::quiz 下面这段输出什么？
```js
async function run() {
  console.log(1);
  await 1;
  console.log(2);
}
run();
console.log(3);
```
输出 `1 3 2`。`await` 任何值都会让出一次微任务，`run` 暂停后外面的 `console.log(3)` 先执行，之后才恢复打印 2。
:::

## 动手练习（到电脑上做）

**必做**

1. 写 `sleep(ms)`，再用它实现 `delayLog`：依次打印「开始」，等 1 秒打印「1 秒」，再等 1 秒打印「2 秒」，最后打印「结束」。
   验收：总耗时约 2 秒；四行输出顺序正确；代码里没有嵌套 `setTimeout`。

2. 写 `loadAll(ids)`，用 `Promise.all` 并行「请求」多个用户（用 `sleep` 加随机延迟模拟），全部成功后按传入顺序返回名字数组。
   验收：返回顺序与 `ids` 顺序一致，不受完成先后影响；总耗时接近最慢的那个，而不是所有延迟之和。

3. 把一段三层回调嵌套的代码改写成 async/await，并用 `try/catch` 统一处理错误。
   验收：没有出现三层以上的缩进；任意一层抛错都能被同一个 `catch` 捕获；`finally` 里能正确关闭 loading 状态。

**进阶**

4. 写 `withTimeout(promise, ms)`，超过时间就抛「超时」错误。提示：用 `Promise.race` 和一个「到点就 reject」的 Promise。
   验收：传入一个 500 毫秒才完成的 Promise、超时设为 200 毫秒时，200 毫秒左右抛错；正常完成时不抛错。

5. 写 `retry(fn, times, delay)` 并测试三种情况：第一次就成功、第三次才成功、三次都失败。
   验收：成功时返回结果且不重复执行；失败时抛出最后一次的错误；每次重试之间有延迟；总调用次数等于 `times`。

:::tip
这一章是后面所有「与服务器打交道」的地基。第 16 章的 `fetch`、第 18 章的待办项目、第 19 章的构建脚本，本质都是「发一个异步操作，等结果，再处理」。

如果只记三句话：**同步先跑，微任务清空，宏任务排队**；**async 函数永远返回 Promise**；**无关的 await 要并行**。把这三条变成本能，90% 的异步 bug 就不会发生在你身上。
:::
