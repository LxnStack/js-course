---
id: 05
title: 函数：把逻辑装进盒子
summary: 三种函数写法怎么选、参数与返回值的真实规则、回调为什么到处都是，以及纯函数与递归的用法。
minutes: 36
keywords: 函数 函数声明 函数表达式 箭头函数 参数 默认值 返回值 回调 纯函数 递归
---

> 第 4 章的分支和循环已经能写出完整逻辑了，但所有代码都堆在一起，改一处要通读全篇。
>
> 这一章讲函数：给一段逻辑起名字、规定输入和输出，之后只管调用。它是继变量之后的第二层抽象，也是你从「能跑」走向「能维护」的分界线。
>
> 学完你应该能：在三种写法之间做出选择、说清参数少传和多传会发生什么、写出没有副作用的工具函数，并且用递归处理嵌套结构。

## 为什么需要它

假设商品页要显示三件商品打折后的价格，折扣统一是 8 折，保留两位小数。

不用函数，最直接的写法是每件商品算一遍：

```js
const price1 = 199;
const price2 = 89;
const price3 = 1299;

console.log((price1 * 0.8).toFixed(2));   // 输出: 159.20
console.log((price2 * 0.8).toFixed(2));   // 输出: 71.20
console.log((price3 * 0.8).toFixed(2));   // 输出: 1039.20

// 改成函数后，规则只写一次
function discounted(price) {
  return (price * 0.8).toFixed(2);
}
console.log(discounted(199));    // 输出: 159.20
console.log(discounted(89));     // 输出: 71.20
console.log(discounted(1299));   // 输出: 1039.20
```

三件商品时，重复的代价还不明显。等到有三十件、三个页面都在用同一个折扣规则时，问题就来了：运营说折扣改成 7.5 折，你得把每个 `0.8` 都找出来改一遍；漏掉一处，页面上的价格就对不上，而且不会报错。

函数解决的就是这件事：**把「一段有输入、有输出的逻辑」变成一个可以反复调用的名字**。折扣规则只存在于 `discounted` 里面，改的时候只改一处。

这和第 2 章的变量是同一个思路的不同层级。变量给「一个值」起名字，函数给「一段过程」起名字。再往上，第 7 章的对象给「一组数据和操作」起名字。

函数还有一层容易被忽略的价值：它是一份**写在代码里的约定**。名字 `discounted` 加上参数 `price`，就说明了「传一个价格进来，拿一个字符串出去」。以后你接手别人的代码，或者三个月后回看自己的代码，只要名字和参数写得清楚，就不必逐行读实现。调用时你只关心「给它什么、它还你什么」，不必关心里面用的是 `for` 还是 `if`。这种只看边界的思维方式，会一直用到第 14 章的模块化：一个模块本质上就是一组函数的集合。

## 三种写法

JS 里定义一个函数有三种写法，先看全貌：

```js
// 1. 函数声明
function add(a, b) {
  return a + b;
}

// 2. 函数表达式
const sub = function (a, b) {
  return a - b;
};

// 3. 箭头函数
const mul = (a, b) => {
  return a * b;
};

// 单表达式可以省掉 return 和花括号
const div = (a, b) => a / b;

// 想直接返回对象，必须用小括号把对象包住
const makeUser = (name) => ({ name });

console.log(add(6, 2), sub(6, 2), mul(6, 2), div(6, 2));
// 输出: 8 4 12 3
console.log(makeUser('小明'));
// 输出: { name: '小明' }
```

三者的区别不在「能不能用」，而在几个细节上：

| 对比项 | 函数声明 | 函数表达式 | 箭头函数 |
| --- | --- | --- | --- |
| 定义前能否调用 | 能，会提升 | 不能 | 不能 |
| 有没有自己的 `this` | 有 | 有 | 没有，用外层的 |
| 能不能用 `new` 创建实例 | 能 | 能 | 不能 |
| 有没有 `arguments` 对象 | 有 | 有 | 没有 |
| 常见用途 | 顶层工具函数 | 需要条件定义时 | 回调、短逻辑 |

日常选择可以按这个顺序判断：

1. 要写在文件顶层、希望任何位置都能调用，用**函数声明**。
2. 需要根据条件决定「定义哪个函数」，或者想把函数赋给一个变量再传出去，用**函数表达式**。
3. 作为回调传进别的函数、或者只有一两行的短逻辑，用**箭头函数**。

三种写法都能实现同一件事，差别只在细节。初学阶段不必纠结哪种「更高级」，先用函数声明把逻辑跑通，再按上面三条调整。

### 提升（hoisting）

函数声明会被「提升」：整个声明在代码执行前就已经准备好了，所以在定义之前调用也合法。

```js
console.log(add(1, 2));   // 输出: 3，定义在后面也能调用

function add(a, b) {
  return a + b;
}

// console.log(sub(3, 1));   // ReferenceError: Cannot access 'sub' before initialization
const sub = function (a, b) {
  return a - b;
};
```

函数表达式赋给 `const`，它就和普通变量一样有「暂时性死区」：声明之前访问会直接报错。报错信息里的 `Cannot access ... before initialization` 就是在说这件事。

这条差异在实际开发里影响很大：把工具函数写成声明，放在文件底部也能被上面的代码调用；写成 `const`，就必须先定义后使用。团队里通常统一用函数声明写工具函数，用箭头函数写回调和短逻辑。

### `this` 和 `arguments`：先知道有这回事

箭头函数没有自己的 `this`，它用的是**定义时外层**的 `this`：

```js
const user = {
  name: '小明',
  sayHi() {
    console.log(this.name);         // 输出: 小明
  },
  sayHiArrow: () => {
    console.log(this.name);         // 输出: undefined（浏览器里可能是空字符串）
  },
};

user.sayHi();
user.sayHiArrow();
```

`sayHi` 是普通函数，调用时 `this` 指向 `user`；`sayHiArrow` 是箭头函数，它的 `this` 来自定义它的那一层（这里是文件顶层），跟 `user` 无关。

`this` 是第 10 章的主题，现在只需要记住一条使用规则：**对象的方法用普通函数，回调和短逻辑用箭头函数**。搞反了，`this` 就会指向别处。

### 箭头函数返回对象要加括号

上面 `makeUser` 那一行的小括号不能省。写成 `const bad = (name) => { name };` 时，`{ name }` 会被当成**函数体**，里面只有一个表达式语句 `name;`，没有 `return`，所以 `bad('小明')` 得到 `undefined`。

括号的作用是把 `{ ... }` 从「函数体」变回「一个对象的字面量」。这是箭头函数最高频的写法错误：看到箭头函数返回 `undefined`，先检查是不是想返回对象却漏了括号。

## 参数：比你想的灵活

函数定义时括号里的名字叫**形参（parameter）**，调用时真正传进去的值叫**实参（argument）**。`function discounted(price)` 里的 `price` 是形参，`discounted(199)` 里的 `199` 是实参。JS 按位置一一对应：第一个实参给第一个形参，第二个给第二个。

这种对应方式很直接，也很脆弱——位置一错，值就错，而且不会报错。下面几种情况值得单独说清。

### 默认值

参数可以写默认值，调用时没传或传 `undefined` 就用它：

```js
function greet(name = '访客', greeting = '你好') {
  return `${greeting}，${name}`;
}

console.log(greet());                  // 输出: 你好，访客
console.log(greet('小明'));             // 输出: 你好，小明
console.log(greet('小明', '早上好'));    // 输出: 早上好，小明
console.log(greet(undefined, '嗨'));    // 输出: 嗨，访客
console.log(greet(null, '嗨'));         // 输出: 嗨，null
```

最后两行是重点：**只有 `undefined` 会触发默认值，`null` 不会**。传 `null` 时，函数里的 `name` 就是 `null`，模板字符串把它拼成了 `'null'`。

如果业务上「用户明确传了 null」也算没填，默认值要写成 `name = name ?? '访客'` 之类，或者在函数里自己判断。这个区别和第 3 章 `??` 的规则是一致的。

### 少传和多传

JS 不会因为参数个数不对而报错：

```js
function add(a, b) {
  return a + b;
}
console.log(add(1));            // 输出: NaN，b 是 undefined
console.log(add(1, 2, 3));      // 输出: 3，第三个参数被忽略

function sum(...nums) {
  let total = 0;
  for (const n of nums) total += n;
  return total;
}
console.log(sum());             // 输出: 0
console.log(sum(1, 2, 3));      // 输出: 6

function log(level, ...messages) {
  console.log(`[${level}]`, ...messages);
}
log('info', '用户', '登录');   // 输出: [info] 用户 登录
```

少传时，缺的那个形参是 `undefined`，参与算术就变 `NaN`——这是「明明传了值，结果却是 NaN」的常见原因。多传的值不会报错，只是没人接。

`...nums` 叫**剩余参数（rest parameter）**，把「剩下的所有参数」收成一个真正的数组。和它长得像的展开运算符 `...` 是反方向的操作：一个收，一个铺开。`log` 里 `...messages` 在调用 `console.log` 时就是铺开。

剩余参数有两条硬规则：只能放在参数列表最后，一个函数只能有一个。

### 参数一多就改成对象

参数按位置传递，调用处只看得见一堆值，看不出含义：

```js
// 位置参数：四个值分别是什么，只能去翻定义
function createUser(name, age, city, isVip) {
  return `${name}（${age} 岁，${city}）${isVip ? '会员' : '普通用户'}`;
}
console.log(createUser('小明', 18, '上海', true));
// 输出: 小明（18 岁，上海）会员

// 对象参数：调用处自带说明，顺序也不重要
function createUserFrom(options) {
  return `${options.name}（${options.age} 岁，${options.city}）`;
}
console.log(createUserFrom({ city: '上海', age: 18, name: '小明' }));
// 输出: 小明（18 岁，上海）
```

超过三个参数时，对象参数几乎总是更好的选择：调用处能看出每个值是什么，加参数也不用改所有调用点。第 7 章会讲参数解构，让函数内部取值更短。

## 返回值

### 没有 return 就是 undefined

```js
function log(msg) {
  console.log(msg);
}
const result = log('hi');   // 先打印 hi
console.log(result);        // 输出: undefined

function checkAge(age) {
  if (age < 0) return '年龄不合法';
  if (age < 18) return '未成年';
  return '成年';
}
console.log(checkAge(-1));   // 输出: 年龄不合法
console.log(checkAge(10));   // 输出: 未成年
console.log(checkAge(20));   // 输出: 成年

// return 后面换行，等于在这里就结束了
function bad() {
  return
  42;
}
console.log(bad());          // 输出: undefined
```

`log` 只负责打印，没有 `return`，所以返回值是 `undefined`。**打印和返回是两件事**：打印是给别人看的副作用，返回是给调用者的数据。初学者常把 `console.log(result)` 当成「函数返回值」，其实只是把 `undefined` 打印了一遍。

`checkAge` 展示了 `return` 的第二个作用：**立即结束函数**。`-1` 进来命中第一行就返回，后面两行不会执行。这正是第 4 章「提前 return 减少嵌套」能成立的原因。

### return 后面不要换行

上面 `bad` 函数看起来应该返回 42，实际返回 `undefined`。JS 有自动分号插入（ASI）：`return` 后面换行时，引擎会自动补一个分号，函数在这里就结束了，`42` 成了下一行永远执行不到的语句。

返回值必须和 `return` 写在同一行。这类 bug 不会报错，只会让你对着 `undefined` 发呆。

### 想返回多个值就包成对象

一个函数只能返回一个值。需要多个结果时，用对象或数组装起来：

```js
function splitName(fullName) {
  const parts = fullName.split(' ');
  return { first: parts[0], last: parts[1] };
}
console.log(splitName('Ming Xiao'));
// 输出: { first: 'Ming', last: 'Xiao' }
```

返回对象的好处是调用处按名字取值，不用记顺序。第 2 章讲的引用传递在这里也适用：返回的对象就是新建的那个，调用者改它不会影响函数内部的其他数据。

## 形参是局部变量

函数的参数和函数内部声明的变量，都只在这个函数里存在：

```js
function change(num) {
  num = 100;      // 改的是形参，不是外面的变量
  return num;
}
let x = 1;
console.log(change(x));   // 输出: 100
console.log(x);           // 输出: 1

const price = 100;
function show() {
  const price = 50;       // 同名局部变量，遮住外面的
  console.log(price);     // 输出: 50
}
show();
console.log(price);       // 输出: 100
```

第一段是第 2 章「值传递」的直接结果：`num` 拿到的是 `x` 的副本，改副本不影响原值。如果传的是对象，函数内部改属性就会影响外面，因为复制的是地址。

第二段是同名变量遮蔽（shadowing）：函数里的 `price` 是新的局部变量，和外面的 `price` 毫无关系。第 9 章讲作用域时会解释查找规则，现在记住「函数内部是独立的小世界」就够了。

## 函数是值

JS 里函数是「一等公民（first-class citizen）」：它可以赋给变量、作为参数、作为返回值，和数字、字符串没有本质区别。

```js
// 1. 赋给变量
const say = function (msg) { console.log(msg); };
const alias = say;
alias('hello');    // 输出: hello

// 2. 作为参数
function doTwice(fn, value) {
  return fn(fn(value));
}
console.log(doTwice((n) => n * 2, 3));   // 输出: 12

// 3. 作为返回值
function makeCounter() {
  let count = 0;
  return function () {
    count += 1;
    return count;
  };
}
const next = makeCounter();
console.log(next());   // 输出: 1
console.log(next());   // 输出: 2
```

第三段值得多看两眼：`makeCounter` 返回的函数记住了 `count`，即使 `makeCounter` 已经执行完毕，`count` 也没有被销毁。这叫**闭包（closure）**，第 9 章会专门讲。现在只要知道「函数可以把状态包在里面带出来」。

## 回调函数

既然函数能当参数，就出现了**回调（callback）**：把「接下来要做什么」交给另一个函数，等它在合适的时机调用。

```js
setTimeout(function () {
  console.log('1 秒后执行');
}, 1000);
console.log('先执行的是我');
// 输出: 先执行的是我
// 输出: 1 秒后执行（约 1 秒后）

const nums = [1, 2, 3, 4, 5];
console.log(nums.filter((n) => n % 2 === 0));   // 输出: [ 2, 4 ]
console.log(nums.map((n) => n * 2));            // 输出: [ 2, 4, 6, 8, 10 ]
```

`setTimeout` 接收一个函数和一个毫秒数，它的工作是「等 1 秒，然后调用这个函数」。你把「要做什么」交出去，它负责「什么时候做」。

数组的 `filter` 和 `map` 同理：它们负责遍历，你只负责提供「判断规则」和「转换规则」。第 6 章会把这类方法讲全，现在只需要看懂「参数位置放的是一个函数」。

从「什么时候被调用」看，回调分两种：

- **同步回调**：`filter`、`map` 会当场把数组遍历完，你的函数被立刻调用很多次，全部结束后才返回结果。
- **异步回调**：`setTimeout` 先把函数存起来，等计时结束再调用。所以 `先执行的是我` 会抢在它前面打印。

第 13 章讲异步时会展开「为什么要排队」。现在只要记住：看到回调，先问一句「它什么时候会被调用」，这决定了代码的打印顺序。

一个必须分清的细节：**传函数本身，不要加括号**。

```js
function handleClick() {
  console.log('点击了');
}

// 正确：把函数交给浏览器，点击时才调用
// button.addEventListener('click', handleClick);

// 错误：handleClick() 会立刻执行，把返回值（undefined）交给浏览器
// button.addEventListener('click', handleClick());
```

加括号就是「现在调用」，不加括号才是「把这段逻辑交给别人」。这个差别在第 15 章绑定事件时会反复出现，也是初学者最常见的「为什么页面一打开就执行了」的原因。

## 纯函数与副作用

**纯函数（pure function）** 要同时满足两条：相同输入永远得到相同输出；不修改函数之外的任何东西。

**副作用（side effect）** 就是「除了返回值之外，还改变了外部世界」：改外部变量、改传入的对象、发请求、操作 DOM、打印日志、读写文件。

同一个功能写成两个版本，差别立刻可见：

```js
// 有副作用：修改了传入的数组
function addItem(list, item) {
  list.push(item);
  return list;
}

// 纯函数：返回新数组，原数组不动
function addItemPure(list, item) {
  return [...list, item];
}

const a = ['苹果'];
addItem(a, '香蕉');
console.log(a);   // 输出: [ '苹果', '香蕉' ]

const b = ['苹果'];
const c = addItemPure(b, '香蕉');
console.log(b);   // 输出: [ '苹果' ]
console.log(c);   // 输出: [ '苹果', '香蕉' ]
```

两个函数都能「加一个元素」，但 `addItem` 悄悄改了调用者的数组。调用者如果后续还要用原数组，就会拿到一份被污染的数据，而且没有任何提示。

另一种不纯来自「依赖外部变量」：

```js
let rate = 0.8;

// 不纯：结果依赖外部 rate
function priceWithRate(price) {
  return price * rate;
}
console.log(priceWithRate(100));   // 输出: 80
rate = 0.5;
console.log(priceWithRate(100));   // 输出: 50

// 纯：所有输入都从参数来
function priceWithRatePure(price, rate) {
  return price * rate;
}
console.log(priceWithRatePure(100, 0.8));   // 输出: 80
```

同样的 `100`，第一次得 80，第二次得 50。这种函数在读代码时无法单独理解，必须知道 `rate` 此刻是多少，测试时也要先把外部状态摆好。

现实里不可能所有函数都纯：渲染页面要改 DOM，保存数据要发请求，这些必然是副作用。可行的做法是把代码分成两层——**核心计算尽量纯**，**副作用集中在少数几个地方**。比如「算出折扣价」写成纯函数，「把价格写进页面」放在另一个函数里。这样测试时只跑纯函数那一部分，不必启动浏览器。

还有一个判断技巧：看函数有没有**隐藏的输入**。只读参数的函数，输入全写在调用处；读外部变量的函数，输入藏在你没看见的地方。隐藏输入越多，排查问题时就越难还原现场。

为什么要在意纯函数？因为它**好测试、好复用、好排查**。给定输入就能断言输出，不需要模拟浏览器、不需要准备数据库。真实项目里的做法是：把计算、格式化、校验写成纯函数，把请求、渲染、改状态这些副作用集中在少数几个地方。第 6 章的 `map` / `filter` 之所以好用，就是因为它们要求你传一个纯的转换规则。

## 递归

函数调用自己，叫**递归（recursion）**。它适合处理「结构和自己相似」的问题：阶乘、树、嵌套的评论、文件夹。

```js
function factorial(n) {
  if (n <= 1) return 1;      // 终止条件
  return n * factorial(n - 1);
}
console.log(factorial(5));   // 输出: 120

function fib(n) {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}
console.log(fib(10));        // 输出: 55
```

`factorial(5)` 的执行过程可以先在纸上拆开：

| 调用 | 展开 | 结果 |
| --- | --- | --- |
| `factorial(5)` | `5 * factorial(4)` | 120 |
| `factorial(4)` | `4 * factorial(3)` | 24 |
| `factorial(3)` | `3 * factorial(2)` | 6 |
| `factorial(2)` | `2 * factorial(1)` | 2 |
| `factorial(1)` | 命中终止条件，返回 1 | 1 |

每一层都在等下一层的结果，直到最底层返回一个确定的值，再一层层乘回来。这就是递归的两个必备部分：**终止条件**和**向终止条件靠近的调用**。

`fib` 的写法更短，但效率很差：`fib(30)` 会把同一批子问题重复算几十万次。真实项目里要么加缓存，要么改成循环。这里只是用它说明「递归不总是最优解」。

### 忘了终止条件会栈溢出

```js
function countdown(n) {
  return countdown(n - 1);   // 忘了写终止条件
}
// countdown(1);   // RangeError: Maximum call stack size exceeded
```

每次函数调用都会占用一小块调用栈，递归不停止，栈就会被填满，最终抛出 `RangeError: Maximum call stack size exceeded`。浏览器里表现为「页面卡死一下然后报错」，Node 里直接中断脚本。

两种常见写错方式：完全忘了终止条件；或者终止条件方向写反，比如 `if (n === 1) return 1` 却一直传 `n + 1`，永远碰不到 1。

递归在业务里最常见的地方是树形结构，比如统计一条评论下所有回复的数量：

```js
function countComments(comment) {
  let total = 1;                              // 自己算一条
  for (const reply of comment.replies) {
    total += countComments(reply);            // 每条回复继续往下数
  }
  return total;
}

const data = {
  text: '第一条',
  replies: [
    { text: '回复 A', replies: [] },
    { text: '回复 B', replies: [{ text: '回复 B1', replies: [] }] },
  ],
};
console.log(countComments(data));   // 输出: 4
```

这段代码不需要知道嵌套有几层，结构有多少层它就递归多少层。第 7 章处理嵌套对象、第 18 章处理树形分类时，都会用到同样的思路。

递归和循环大多能互相改写：`factorial` 用 `for` 从 1 乘到 `n` 也能得到同样结果，而且不占调用栈。选哪个看数据结构——线性的列表用循环更直接，树形或嵌套结构用递归更省心，因为你不需要提前知道它有多深。

## 函数命名与单一职责

命名和拆分，比语法更影响代码能不能维护。

命名规则很朴素：**动词开头 + 说清做什么**。

```js
getUserById();      // 取用户
formatPrice();      // 格式化价格
isValidEmail();     // 返回布尔，用 is / has / can 开头
calculateTotal();   // 计算总和
```

反例是 `data()`、`handle()`、`process()`、`doSomething()`：它们什么也没说，三个月后你自己都要点进去看实现。

单一职责的意思是「一个函数只做一件事」。判断标准很实际：**能不能用一句话说清它做了什么，而不出现「并且」**。

```js
// 不好：校验、格式化、发请求、改页面，四件事挤在一起
function handleUser(data) {
  // ...
}

// 好：拆成四个能单独测试的函数
validateUser(data);
const formatted = formatUser(data);
saveUser(formatted);
renderUser(formatted);
```

拆开之后，每个函数都能单独调用、单独测试。校验规则变了，只动 `validateUser`，不会牵连渲染逻辑。这就是纯函数和单一职责配合起来的效果。

还有一条实践：**函数尽量短**。超过一屏（大约 40 行）的函数，通常说明里面藏了两三件事，值得拆开。短函数还有个附带好处——名字容易起准。如果一句话说不清它做什么，往往不是取名水平不够，而是因为它真的做得太多。

## 常见误区清单

| 写法 | 结果 | 为什么 |
| --- | --- | --- |
| 函数没有 `return` | 返回 `undefined` | 没有返回值时默认就是 undefined |
| `return` 后换行 | 返回 `undefined` | 自动分号插入，return 提前结束 |
| `() => { name: 1 }` | 返回 `undefined` | `{}` 被当成函数体，返回对象要加括号 |
| 定义前调用函数表达式 | ReferenceError | `const` 有暂时性死区，不提升 |
| 定义前调用函数声明 | 正常执行 | 函数声明会整体提升 |
| `greet(null)` 想用默认值 | 默认值不生效 | 只有 `undefined` 触发默认参数 |
| 少传一个参数 | 该形参是 `undefined`，运算得 `NaN` | JS 不检查参数个数 |
| `addEventListener('click', fn())` | 立即执行 | 加括号是调用，应传 `fn` |
| 箭头函数当对象方法 | `this` 不是该对象 | 箭头函数没有自己的 `this` |
| 递归没有终止条件 | 栈溢出 | 每次调用都压栈，永不返回 |
| 函数里修改传入的数组 | 外面原数组被改 | 对象按引用传递，产生副作用 |

## 通勤自测

:::quiz 下面两行分别会发生什么？
```js
console.log(add(1, 2));
console.log(sub(3, 1));

function add(a, b) { return a + b; }
const sub = function (a, b) { return a - b; };
```
第一行正常输出 `3`，函数声明会提升；第二行抛 `ReferenceError: Cannot access 'sub' before initialization`，因为 `const` 声明的函数表达式在定义前不可用。
:::

:::quiz 这段代码输出什么？
```js
function greet(name = '访客') {
  return '你好，' + name;
}
console.log(greet());
console.log(greet(null));
```
第一行 `你好，访客`，第二行 `你好，null`。默认参数只在实参是 `undefined`（或没传）时生效，`null` 不会触发。
:::

:::quiz 这段代码输出什么？
```js
function doTwice(fn, value) {
  return fn(fn(value));
}
console.log(doTwice((n) => n + 3, 1));
```
输出 `7`。先算 `fn(1)` 得 4，再算 `fn(4)` 得 7。
:::

:::quiz 箭头函数的 `() => ({ a: 1 })` 和 `() => { a: 1 }` 有什么区别？
前者返回对象 `{ a: 1 }`；后者把 `{ a: 1 }` 当成函数体，里面只有一个标签语句，函数返回 `undefined`。
:::

:::quiz 下面的 `result` 是什么？为什么？
```js
function f() {
  return
  42;
}
const result = f();
```
`undefined`。`return` 后面换行，JS 自动插入分号，函数在这里就结束了，`42` 永远不会执行。
:::

:::quiz 为什么 `button.addEventListener('click', handleClick())` 是错的？
加括号表示立刻调用 `handleClick`，然后把它的返回值（通常是 `undefined`）传给 `addEventListener`。应该传函数本身：`handleClick`，让浏览器在点击时再调用。
:::

:::quiz 下面的 `addItem` 是纯函数吗？怎么改？
```js
function addItem(list, item) {
  list.push(item);
  return list;
}
```
不是。它修改了传入的数组，属于副作用，相同输入在不同调用者手里还会互相影响。改成 `return [...list, item]`，返回新数组，原数组不动。
:::

:::quiz `fib(10)` 的结果是多少？为什么 `fib(40)` 会很慢？
`55`。递归版会把同一个子问题重复计算很多次，`fib(40)` 的调用次数是指数级的，所以慢；实际项目里要加缓存或改成循环。
:::

## 动手练习（到电脑上做）

**必做**

1. 写 `formatPrice(cents, symbol = '¥')`，接收「分」为单位的整数，返回带两位小数的价格字符串。
   验收：`formatPrice(1200)` 得 `'¥12.00'`，`formatPrice(5)` 得 `'¥0.05'`，`formatPrice(1200, '$')` 得 `'$12.00'`。

2. 写 `sum(...nums)` 支持任意个数字求和，再写 `average(...nums)` 复用它。要求 `average()` 不传参数时返回 `null`，而不是 `NaN`。
   验收：`sum(1, 2, 3)` 得 `6`；`average(1, 2, 3)` 得 `2`；`average()` 得 `null`。

3. 写一个函数 `addItemPure(list, item)`，返回「加了新元素的新数组」。调用后打印原数组和新数组，证明原数组没变。
   验收：原数组仍是 `['苹果']`，新数组是 `['苹果', '香蕉']`，并能说出这和 `push` 版本的区别。

**进阶**

4. 用递归把嵌套对象展开成「路径 → 值」的扁平对象：`{ a: 1, b: { c: 2, d: { e: 3 } } }` 变成 `{ a: 1, 'b.c': 2, 'b.d.e': 3 }`。
   验收：输出与目标完全一致；能处理任意深度；遇到空对象时不会多出奇怪的键。

5. 写 `once(fn)`，返回一个新函数：无论调用多少次，真正传入的 `fn` 只执行一次，之后都返回第一次的结果。
   验收：`const init = once(() => { console.log('执行'); return 42; });`，调用 `init()` 两次只打印一次「执行」，两次都返回 `42`；并说明这用到了闭包的什么特性。

:::tip
函数是你后面所有内容的载体：第 6 章的数组方法接收回调，第 9 章用闭包解释 `makeCounter`，第 10 章讲 `this` 怎么丢，第 13 章的 `Promise` 和 `async` 本质上也是把函数交给别人在合适的时机调用。

现在最值得练的不是递归，而是两个习惯：**参数超过三个就改对象**、**能写纯函数就不改传入的数据**。这两个习惯会在你写第一个真实项目时救你很多次。
:::
