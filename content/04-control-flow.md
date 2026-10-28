---
id: 04
title: 流程控制：条件与循环
summary: if 与 switch 怎么选、for 的三段式怎么执行、break 与 continue 的边界，以及死循环是怎么来的。
minutes: 38
keywords: 流程控制 if else switch for while do-while break continue 遍历 死循环
---

> 第 3 章解决的是「一个值怎么算」，但真实程序面对的是「很多种情况、很多条数据」。
>
> 这一章讲两件事：什么时候执行哪一段（分支），以及把同一段执行很多遍（循环）。`if` 和 `for` 加起来，能覆盖你写业务代码时八成以上的控制逻辑。
>
> 学完你应该能：把一坨嵌套 `if` 改成提前 `return`、在 `switch` 里正确使用 `break`、用 `for...of` 安全遍历数组，并且在死循环把浏览器卡死之前知道怎么退出来。

## 为什么需要它

假设你要把三条待办渲染成列表。最直接的做法是复制三遍：

```js
const todos = ['买菜', '写作业', '跑步'];

console.log('<li>' + todos[0] + '</li>');
console.log('<li>' + todos[1] + '</li>');
console.log('<li>' + todos[2] + '</li>');

// 每条待办还有完成状态，完成的要加一个 class
const done = true;
if (done) {
  console.log('<li class="done">买菜</li>');
} else {
  console.log('<li>买菜</li>');
}
```

三条还能忍，三十条就要复制三十行，而且用户新增一条，你的代码不会跟着变。循环解决的正是这个问题：

```js
for (const todo of todos) {
  console.log('<li>' + todo + '</li>');
}
// 输出: <li>买菜</li>
// 输出: <li>写作业</li>
// 输出: <li>跑步</li>
```

而 `if` 决定「同一条数据在不同状态下长什么样」。分支和循环组合起来，就是「一屏内容」的生成方式。第 15 章操作 DOM 时，你会用同样的结构把数据变成页面。

任何程序的执行都只有三种结构：顺序、分支、重复。你写的代码默认就是顺序——上一行执行完再执行下一行；`if` 让某几行「可能不执行」；循环让某几行「执行很多遍」。把这三件事分清楚，读代码时就能先看主干，再钻细节，而不至于陷在缩进里。

这也是为什么第 5 章要把「一段逻辑」装进函数：当分支和循环多到一定程度，必须靠函数把它们切块，否则一个文件会变成几百行没人敢改的迷宫。

## if / else if / else

最基本的分支结构长这样：

```js
const score = 85;

if (score >= 90) {
  console.log('优秀');
} else if (score >= 60) {
  console.log('及格');
} else {
  console.log('不及格');
}
// 输出: 及格
```

规则很简单：从上往下判断，**命中第一个为 true 的条件后就跳过后面所有分支**。`else` 是可选的，`else if` 可以有很多个。

还有一个容易忽略的差别：`else if` 之间是**互斥**的，几个独立的 `if` 是**各判各的**。如果你只想要一个结果（等级、状态），必须用 `else if`；如果几件事可以同时成立（比如给一条数据同时打多个标签），才用多个 `if`。把互斥条件写成多个 `if`，同一段逻辑可能被执行两次。

条件位置放什么都可以，JS 会按第 2 章讲的真假值规则转成布尔。`if ([])` 会进入，因为空数组是真值；判断空数组要写 `if (arr.length === 0)`。这类坑在第 2 章列过，这里不再重复，只提醒一句：**条件尽量写成明确的比较**，不要依赖隐式转换。

### 条件里不要写赋值

这是新手最常犯、也最难查的错误：

```js
// 1. 顺序反了：大范围的条件放前面，会把小范围的全部吞掉
const score = 95;
if (score >= 60) {
  console.log('及格');
} else if (score >= 90) {
  console.log('优秀');   // 永远走不到
}
// 输出: 及格

// 2. 条件里误写成赋值
let isLogin = false;
if (isLogin = true) {
  console.log('当成已登录');   // 输出: 当成已登录
}
```

第一段的问题不在语法，而在顺序：`95 >= 60` 成立，后面的 `>= 90` 就没机会了。写多档判断时，**条件要从严到宽**，先写最难满足的。

第二段把 `===` 写成了 `=`。赋值表达式的值是赋进去的那个值，`true` 是真值，所以条件永远成立，而且 `isLogin` 被永久改成了 `true`。编辑器通常会给出警告，但你不能指望它。

### 大括号能省，但别省

只有一行语句时，JS 允许写成 `if (ok) console.log('通过');`。这种压缩会埋两个雷。

一是后面补第二行时容易忘加大括号。`if (ok) a(); b();` 看起来两句都在条件里，实际只有 `a()` 受控制，`b()` 不管 `ok` 是什么都会执行。

二是「悬空 else」：`else` 永远配对最近的 `if`。写成 `if (a) if (b) x(); else y();` 时，缩进会让人以为 `else` 配的是外层，实际它配的是内层 `if (b)`，也就是「a 为真但 b 为假」时才走 `y()`。

团队规范里通常要求**一律写大括号**，省下的两行不值得换一次线上 bug。

## 嵌套 if 与提前 return

判断条件一多，最自然的写法是一层层往里缩：

```js
function getDiscount(user) {
  if (user) {
    if (user.isVip) {
      if (user.level >= 3) {
        return 0.7;
      }
    }
  }
  return 1;
}

console.log(getDiscount({ isVip: true, level: 3 }));   // 输出: 0.7
console.log(getDiscount(null));                        // 输出: 1
```

这段代码是对的，但读它的时候，你的脑子要同时记住三层条件，还得记住每层不成立时会掉到哪。行数不多，心智负担不小。

把「不满足就提前退出」的条件挪到最前面，叫**卫语句（guard clause）**：

```js
function getDiscount(user) {
  if (!user) return 1;              // 没用户，原价
  if (!user.isVip) return 1;        // 不是会员，原价
  if (user.level < 3) return 1;     // 等级不够，原价
  return 0.7;                       // 剩下的就是会员折扣
}

console.log(getDiscount({ isVip: true, level: 3 }));   // 输出: 0.7
console.log(getDiscount({ isVip: true, level: 1 }));   // 输出: 1
console.log(getDiscount(null));                        // 输出: 1
```

改完之后，主逻辑平铺在最后一行，前面全是「什么情况下不算」。这种写法能一路用到写接口、写页面逻辑，是后面所有章节的默认风格。

它依赖 `return`，而 `return` 只能在函数里用。第 5 章会系统讲函数，现在先记住：**能提前退出，就别往里嵌套**。

## switch

当一个值要和好几个固定值比较时，`switch` 比一长串 `else if` 干净：

```js
const status = 'paid';

switch (status) {
  case 'pending':
    console.log('等待支付');
    break;
  case 'paid':
    console.log('已支付');
    break;
  case 'shipped':
    console.log('已发货');
    break;
  default:
    console.log('未知状态');
}
// 输出: 已支付
```

执行逻辑是：拿 `status` 和一个一个 `case` 做**严格相等**比较，命中后开始执行，直到遇到 `break` 或 `switch` 结束。`default` 是没有命中任何 `case` 时的兜底，位置可以放最后，也可以放中间。

### break 与「穿透」

漏写 `break` 不会报错，但会继续执行下一个 `case` 的代码，这叫**穿透（fallthrough）**：

```js
// 忘记 break：从命中的 case 一路往下执行
const level = 'B';
switch (level) {
  case 'A':
    console.log('A');
  case 'B':
    console.log('B');
  case 'C':
    console.log('C');
    break;
  default:
    console.log('默认');
}
// 输出: B
// 输出: C

// 故意不写 break：多个值共用同一段逻辑
const size = 2;
switch (size) {
  case 1:
  case 2:
  case 3:
    console.log('小号或中号');
    break;
  default:
    console.log('其他');
}
// 输出: 小号或中号
```

第一段里，`'B'` 命中后打印 B，因为没有 `break`，继续打印 C 才停。这就是很多「莫名其妙执行了两段逻辑」的来源。

第二段是有意为之：`case 1`、`case 2` 后面什么都不写，让它们直接落到共用逻辑上。这是 `switch` 少数值得保留的用法，但**必须加一行注释说明「这里是故意的」**，否则下一个人会以为是漏写。

### 值必须是同一个，且用 === 比较

先看一个表单场景的坑：`switch ('1')` 配 `case 1` 不会命中。`switch` 用的是严格相等，字符串 `'1'` 和数字 `1` 类型不同，直接掉进 `default`。**用 `switch` 处理用户输入时，先把值转成数字**。

```js
// 按月份判断天数，正好利用穿透
const month = 2;
switch (month) {
  case 1:
  case 3:
  case 5:
  case 7:
  case 8:
  case 10:
  case 12:
    console.log('31 天');
    break;
  case 4:
  case 6:
  case 9:
  case 11:
    console.log('30 天');
    break;
  case 2:
    console.log('28 或 29 天');   // 输出: 28 或 29 天
    break;
  default:
    console.log('月份不合法');
}
```

`case` 可以堆叠，天然表达「这几个值归为一类」。月份这种「一个结果对应多个输入」的场景，用 `if` 要重复写六次 `month === 1 || month === 3 || ...`，用 `switch` 一眼就能看出分组。

### switch 还是 if

选择标准只有两条：

- **一个值 vs 多个固定值**：用 `switch`。比如状态码、订单状态、星期几。
- **范围判断或复合条件**：用 `if`。比如 `score >= 60 && score < 90`。

用 `if` 硬写十个 `===` 会很啰嗦；用 `switch` 硬写范围判断则根本写不出来，因为 `case` 只接受值，不接受表达式（`case score >= 60:` 是合法的语法，但比较的是 `true === (score >= 60)`，几乎不会是你想要的）。

另外，`switch` 在函数里可以省略 `break`，改成每个 `case` 直接 `return`，例如 `case 'paid': return '已支付';`。少了 `break`，也就没有穿透的机会，这是写状态映射时最稳的形态。

## for 循环

`for` 是唯一能精确控制「跑几次」的循环：

```js
for (let i = 0; i < 3; i++) {
  console.log('第 ' + i + ' 轮');
}
// 输出: 第 0 轮
// 输出: 第 1 轮
// 输出: 第 2 轮
```

括号里用两个分号隔开三段：初始化、条件、每轮结束后的更新。它们不是同时执行的，顺序固定：

| 顺序 | 执行内容 | 时机 |
| --- | --- | --- |
| 1 | `let i = 0` | 循环开始前，只执行一次 |
| 2 | `i < 3` | 每轮开始前判断 |
| 3 | 循环体 `console.log(...)` | 条件为 true 时 |
| 4 | `i++` | 循环体结束后 |
| 5 | 回到第 2 步 | 直到条件为 false |

由此可以推出：`i` 第一次进循环体时是 0，最后一次是 2，循环结束后变成 3。任何「为什么少跑一次 / 多跑一次」的问题，都可以用这张表推出来。

两层循环的阅读方法是固定的：先看外层在遍历什么，再看内层每次做什么。外层是行，内层是列；外层是分组，内层是组内元素。卡住的时候，用 3 条小数据在纸上画一遍执行过程，比盯着代码看快得多。

`for` 适合「次数确定」或「需要用下标」的场景：遍历数组、生成 1 到 n、倒序删除。次数不确定、只知道退出条件时，用 `while` 更自然。两者可以互相改写，选更贴近问题描述的那个。

三段都可以省略。`for (;;)` 是合法的，等于无限循环；`for (let i = 0; ; i++)` 则需要靠 `break` 退出。初学阶段不建议省略条件，很容易写出死循环。

### 差一错误（off-by-one）

索引从 0 开始，所以「最后一个元素」的下标是 `length - 1`。把 `<=` 写成 `<` 或反过来，是循环里最高频的 bug：

```js
const list = ['a', 'b', 'c'];

// 想从后往前处理，倒序最安全
for (let i = list.length - 1; i >= 0; i--) {
  console.log(i, list[i]);
}
// 输出: 2 c
// 输出: 1 b
// 输出: 0 a

// 边界写错：多跑一轮，最后拿到 undefined
for (let i = 0; i <= list.length; i++) {
  console.log(list[i]);
}
// 输出: a
// 输出: b
// 输出: c
// 输出: undefined
```

倒序遍历在做「边遍历边删除」时特别有用。正序遍历删元素，后面的元素会往前补位，你刚跳过的那个下标正好装着新元素，于是漏删一半。第 6 章讲数组方法时会给出更省心的替代方案。

`undefined` 出现在最后一行，不会报错，所以这种 bug 很隐蔽——页面只是多了一个空项，你要盯很久才能发现。

### 循环变量用 let，不要用 var

```js
for (let i = 0; i < 3; i++) {
  setTimeout(function () {
    console.log(i);
  }, 0);
}
// 输出: 0
// 输出: 1
// 输出: 2

for (var j = 0; j < 3; j++) {
  setTimeout(function () {
    console.log(j);
  }, 0);
}
// 输出: 3
// 输出: 3
// 输出: 3
```

同一段逻辑，`let` 打印 0、1、2，`var` 打印三个 3。原因是 `var` 声明的 `j` 在整个作用域里只有一份，等定时器真的要执行时，循环早已跑完，`j` 停在 3。

第 9 章会用作用域（scope）和闭包（closure）解释这个现象，现在先记住结论：**循环变量一律用 `let`**。第 2 章说过 `var` 不要用，这是它在实际代码里最常造成事故的地方。

## while 与 do...while

`while` 适合「不知道要跑几次，只知道什么时候停」：

```js
let i = 0;
while (i < 3) {
  console.log('while', i);
  i += 1;          // 忘写这行就是死循环
}
// 输出: while 0
// 输出: while 1
// 输出: while 2

let n = 0;
do {
  console.log('do', n);
  n += 1;
} while (n < 0);
// 输出: do 0   ← 条件一开始就是 false，仍然执行了一次
```

`while` 先判断再执行，`do...while` 先执行再判断：

| 对比 | while | do...while |
| --- | --- | --- |
| 判断时机 | 先判断，后执行 | 先执行，后判断 |
| 可能一次都不执行 | 是 | 否 |
| 适合 | 次数未知，可能为 0 | 至少要执行一次 |

「必须执行一次」的场景比你想的多。比如让用户输入，至少要先问一次才能判断输入是否合法。下面两段都是 `while` 家族在业务里的典型形态：

```js
// 至少问一次，直到输入合法
let answer;
do {
  answer = prompt('请输入 yes 或 no');
} while (answer !== 'yes' && answer !== 'no');

// 重试直到成功，或达到次数上限
let retry = 0;
let success = false;
while (!success && retry < 3) {
  retry += 1;
  success = tryRequest();
}
```

用 `while` 写第一段，得在循环外面先写一遍 `prompt`，再把同样的代码放进循环里，重复且容易改漏。

第一段还藏着一个坑：用户点「取消」时 `prompt` 返回 `null`，条件永远成立，循环就出不来了。真实项目里要么加 `answer === null` 的退出判断，要么加最大尝试次数。

第二段里的 `tryRequest` 是假想函数，完整写法要到第 13 章讲异步时才出现。这里先体会结构：**条件里放两个变量，一个控制业务状态，一个兜底防止无限重试**。这种「业务条件 + 次数上限」的组合，是后面写网络请求重试的标准模板。

## break 与 continue

两个词都只影响循环，区别是范围：

- `continue`：跳过本轮剩下的代码，直接进入下一轮。
- `break`：整个循环立刻结束。

```js
for (const n of [1, 2, 3, 4, 5]) {
  if (n === 2) continue;   // 跳过本次
  if (n === 4) break;      // 结束整个循环
  console.log(n);
}
// 输出: 1
// 输出: 3

// break 只跳出内层，外层继续
for (let i = 1; i <= 3; i++) {
  for (let j = 1; j <= 3; j++) {
    if (j === 2) break;
    console.log(i, j);
  }
}
// 输出: 1 1
// 输出: 2 1
// 输出: 3 1

// 想一次跳出两层：把循环放进函数，用 return
function findPair() {
  for (let i = 1; i <= 3; i++) {
    for (let j = 1; j <= 3; j++) {
      if (i * j === 4) return i + ' x ' + j;
    }
  }
  return '没找到';
}
console.log(findPair());   // 输出: 2 x 2

// 带标签的 break 也能做到，但少用
outer:
for (let i = 1; i <= 3; i++) {
  for (let j = 1; j <= 3; j++) {
    if (i * j === 4) break outer;
  }
}
console.log('跳出来了');   // 输出: 跳出来了
```

`n` 是 1 时正常打印；2 被 `continue` 跳过；3 打印；4 触发 `break`，后面全不执行。

第二段里，内层每次到 `j === 2` 就退出，外层继续下一轮，所以每轮只打印一次。这就是 `break` 的边界：**它只结束最近的一层循环**，外面的 `for` 完全不受影响。

第三段是推荐做法：把「找一对数」这件事封装成函数，`return` 天然能结束整个函数，也就结束了里面所有循环。可读性比标签好得多。

第四段的 `outer:` 是**标签（label）**，`break outer` 能直接跳出指定那层。语法合法，但阅读时要上下找标签，团队里通常不鼓励。知道有这个写法即可，真遇到时优先改成函数。

## for...of：遍历值

遍历数组最推荐的写法：

```js
const fruits = ['苹果', '香蕉', '橙子'];

for (const fruit of fruits) {
  console.log(fruit);
}
// 输出: 苹果
// 输出: 香蕉
// 输出: 橙子

// 需要索引时用 entries()
for (const entry of fruits.entries()) {
  console.log(entry[0], entry[1]);
}
// 输出: 0 苹果
// 输出: 1 香蕉
// 输出: 2 橙子

// 字符串也能遍历
for (const ch of 'abc') {
  console.log(ch);
}
// 输出: a
// 输出: b
// 输出: c
```

`for...of` 直接给你**值**，不用管下标，也就没有差一错误。`entries()` 返回 `[下标, 值]` 的小数组，需要序号时用它。

需要注意两点。第一，循环变量写 `const` 就行，每轮都是一个新变量，重新赋值会报错，正好防止你误改。第二，`for...of` 只能用于**可迭代对象**，普通对象不能用，`for (const x of { a: 1 })` 会抛 `TypeError: {} is not iterable`。

和普通 `for` 比，`for...of` 省掉了下标，但也少了两个能力：拿不到索引（要 `entries()`），也不能随意改步长。日常遍历数组九成用 `for...of`，需要「倒着走」「隔一个取一个」时才退回普通 `for`。

`for...of` 还有一个好处：可以用 `break` 和 `continue`。第 6 章会讲 `forEach`，代码更短，但中途退出不了。两种写法各有场合，看到 `forEach` 里想 `break` 的时候，换成 `for...of` 就行。

## for...in：遍历键，以及它的坑

`for...in` 遍历的是**属性名**，主要给对象用。把它用在数组上，问题立刻暴露：

```js
const user = { name: '小明', age: 18 };
for (const key in user) {
  console.log(key, user[key]);
}
// 输出: name 小明
// 输出: age 18

// 换成数组，拿到的是字符串下标
const arr = ['a', 'b'];
for (const key in arr) {
  console.log(typeof key, key);
}
// 输出: string 0
// 输出: string 1

// 原型链上的属性也会被算进来
const base = { inherited: '来自原型' };
const obj = Object.create(base);
obj.own = '自己的';
for (const key in obj) {
  console.log(key);
}
// 输出: own
// 输出: inherited

// 更稳的做法：只取自己的属性
console.log(Object.keys(obj));      // 输出: [ 'own' ]
console.log(Object.entries(obj));   // 输出: [ [ 'own', '自己的' ] ]
```

拿到的是字符串 `'0'`、`'1'`，不是数字。做 `key + 1` 会变成 `'01'`，做 `arr[key]` 虽然能取到值，但任何依赖数字下标的运算都会出错。**遍历数组请用 `for...of` 或普通 `for`**。

第二个坑是原型链。`Object.create(base)` 造出来的对象会继承 `base` 的属性，`for...in` 把这些继承来的属性也算进循环，上面那段就是证明。你只想要自己的 `own`，结果多出一个 `inherited`，后续渲染或统计就全错了。第 7 章讲对象时会详细说属性和原型，第 11 章讲原型链（prototype chain）时会解释 `Object.create` 到底做了什么。

结论：**遍历对象用 `Object.keys` / `Object.entries`，遍历数组用 `for...of`**。`for...in` 只在明确需要「连同继承属性一起看」时才有用，日常几乎用不到。

## 用嵌套循环打印图形

两层循环是理解「外层管行、内层管列」的最好练习。九九乘法表：

```js
// 九九乘法表
for (let i = 1; i <= 9; i++) {
  let line = '';
  for (let j = 1; j <= i; j++) {
    line += j + '×' + i + '=' + (i * j) + ' ';
  }
  console.log(line);
}
// 输出（前 3 行，行尾各有一个空格）:
// 1×1=1 
// 1×2=2 2×2=4 
// 1×3=3 2×3=6 3×3=9 

// 星号金字塔
for (let row = 1; row <= 5; row++) {
  const spaces = ' '.repeat(5 - row);
  const stars = '*'.repeat(row * 2 - 1);
  console.log(spaces + stars);
}
// 输出:
//     *
//    ***
//   *****
//  *******
// *********
```

乘法表里，外层 `i` 控制「第几行」，内层 `j` 从 1 跑到 `i`，所以第 3 行只有 3 个算式。`line` 每行重新清空，这一点如果忘了，上一行的内容会一直累加。

第一行 4 个空格加 1 个星，第二行 3 个空格加 3 个星，规律是「空格数 = 总层数 - 当前层，星数 = 当前层 * 2 - 1」。找出这个规律，比背代码重要——所有图案题都是这个套路。

## 死循环：怎么产生，怎么中断

死循环是条件永远为 true，循环体永远结束不了。最常见的三种来源：

```js
// 1. 忘了更新条件（不要直接运行）
// let i = 0;
// while (i < 5) {
//   console.log(i);
// }

// 2. 条件恒为 true，靠 break 退出（这种写法是合法的）
let guard = 0;
while (true) {
  guard += 1;
  if (guard > 100) {
    console.log('保险触发');   // 输出: 保险触发
    break;
  }
}

// 3. 浮点步进跳过了终点
let count = 0;
for (let x = 0; x !== 1; x += 0.1) {
  count += 1;
  if (count > 20) break;   // 没有这行会一直跑
}
console.log(count);   // 输出: 21
```

第一种是忘了 `i += 1`，条件永远成立。第二种是主动写的无限循环，本身合法，但必须有 `break` 出口。第三种最隐蔽：`x += 0.1` 累加到最后是 `0.9999999999999999`，再下一步直接跳到 `1.0999999999999999`，永远不会等于 1，条件永远成立。这类循环要用 `x < 1` 而不是 `x !== 1`。

循环真的卡住时，中断方式分两种：

- **浏览器**：标签页会转圈、点不动，直接关闭这个标签页。Chrome 有时会弹「页面无响应」，可以选「结束」。刷新也会中断，但页面状态会丢。
- **Node**：在终端里按 `Ctrl + C`。

死循环不总是错误。事件循环、服务器监听、游戏主循环，本质上都是「一直跑，直到收到退出信号」，所以 `while (true)` 是合法写法，前提是里面有明确的 `break`。真正的问题是「你以为是有限循环，实际条件永远成立」，这类 bug 往往在数据为空或某个值异常时才会出现。

排查时先做一件事：在循环体第一行打印循环变量。如果它一直不变，说明更新那行没执行；如果它疯涨，说明终止条件写错了；如果它是 `NaN`，说明参与计算的某个值有问题。

预防比中断重要。写循环时养成三个习惯：先用小数据（3 次、5 条）验证；`while` 里确认有变量在向终止条件靠近；不确定时加一个计数器当保险丝，比如 `let tries = 0;` 配合 `if (tries > 10000) break;`，宁可少做一点，也别把浏览器卡死。

## 常见误区清单

| 写法 | 结果 | 为什么 |
| --- | --- | --- |
| `if (x = 1)` | 条件永远成立 | 赋值结果是 1，真值；应写 `===` |
| `if (arr)` 判断空数组 | 会进入 | 数组是对象，恒为真；用 `length === 0` |
| 大范围条件写在小范围前面 | 后面的分支走不到 | 命中第一个 true 就结束判断 |
| `switch` 漏写 `break` | 继续执行下一个 `case` | 穿透（fallthrough）行为 |
| `switch ('1')` 配 `case 1` | 不匹配 | `switch` 用严格相等比较 |
| `for (let i = 0; i <= arr.length; i++)` | 多跑一轮，拿到 `undefined` | 最后一个下标是 `length - 1` |
| `for...in` 遍历数组 | 下标是字符串 | 用 `for...of` |
| `for...in` 遍历对象 | 可能多出原型属性 | 用 `Object.keys` |
| `while` 忘了更新变量 | 死循环 | 条件永远成立 |
| `forEach` 里写 `break` | 语法错误 | 用 `for...of` 或 `some` |
| `do...while` 条件写反 | 多执行一次 | 先执行后判断 |

## 通勤自测

:::quiz 这段代码输出什么？
```js
const score = 75;
if (score >= 60) {
  console.log('及格');
} else if (score >= 90) {
  console.log('优秀');
}
```
输出 `及格`。`75 >= 60` 先成立，后面的分支不会再判断。要想输出「优秀」，必须把 `>= 90` 写在前面。
:::

:::quiz 这段代码输出什么？
```js
const type = 'b';
switch (type) {
  case 'a':
    console.log('A');
  case 'b':
    console.log('B');
  case 'c':
    console.log('C');
    break;
  default:
    console.log('默认');
}
```
输出 `B` 和 `C`。`'b'` 命中后因为没有 `break`，会继续往下执行 `case 'c'` 的代码，到 `break` 才停。这就是穿透。
:::

:::quiz 下面两层循环一共打印多少次？
```js
for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 2; j++) {
    console.log(i, j);
  }
}
```
6 次。外层 3 轮，每轮内层完整跑 2 次，2 × 3 = 6。输出顺序是 `0 0`、`0 1`、`1 0`、`1 1`、`2 0`、`2 1`。
:::

:::quiz 这段代码输出什么？
```js
let n = 5;
do {
  console.log(n);
  n += 1;
} while (n < 3);
```
只输出 `5`。`do...while` 先执行再判断，第一次一定会跑；判断时 `6 < 3` 为 false，循环结束。
:::

:::quiz 为什么不能用 `for...in` 遍历数组？
它拿到的是字符串形式的下标 `'0'`、`'1'`，不是数字，做算术会变成字符串拼接；而且数组上被人为添加的属性也会被遍历出来。遍历数组用 `for...of`。
:::

:::quiz `break` 和 `continue` 有什么区别？嵌套循环里 `break` 会跳出几层？
`continue` 只跳过本轮剩余代码，进入下一轮；`break` 结束整个循环。嵌套时 `break` 只跳出**最近的一层**，想跳出所有层应把循环封装成函数用 `return`。
:::

:::quiz 下面这个循环为什么停不下来？
```js
for (let x = 0; x !== 1; x += 0.1) { }
```
浮点数累加得不到精确的 1，`x` 会从 `0.9999999999999999` 直接跳到 `1.0999999999999999`，`x !== 1` 永远成立。条件应改成 `x < 1`。
:::

:::quiz 用户点「取消」后，下面这段代码会怎样？
```js
let answer;
do {
  answer = prompt('请输入 yes 或 no');
} while (answer !== 'yes' && answer !== 'no');
```
会陷入死循环。`prompt` 被取消时返回 `null`，`null` 既不等于 `'yes'` 也不等于 `'no'`，条件永远成立。需要额外判断 `answer === null` 并退出。
:::

## 动手练习（到电脑上做）

**必做**

1. 写 `getLevel(score)`，用 `if / else if / else` 实现四档：90 及以上「优秀」，80 到 89「良好」，60 到 79「及格」，其余「不及格」。
   验收：`90` 得「优秀」，`89` 得「良好」，`60` 得「及格」，`59` 得「不及格」，四个边界全部正确。

2. 写 `fizzBuzz(n)`，用 `for` 输出 1 到 n：能被 3 整除输出 `Fizz`，能被 5 整除输出 `Buzz`，同时被 3 和 5 整除输出 `FizzBuzz`，其余输出数字本身。
   验收：1 到 30 的输出中，15 和 30 是 `FizzBuzz`，9 是 `Fizz`，10 是 `Buzz`，7 是 `7`。注意判断顺序——先判断 15 的倍数，否则 `FizzBuzz` 永远出不来。

3. 用两层 `for` 打印 5 层星号金字塔，要求第 1 行 1 个星、第 5 行 9 个星，且整体居中。
   验收：肉眼看上去是等腰三角形，每行星号数为 `2 * row - 1`，前面空格数为 `5 - row`。

**进阶**

4. 给定 `const nums = [3, 8, 5, 12, 7, 10]`，用**倒序** `for` 循环删除所有偶数，打印结果。
   验收：输出 `[ 3, 5, 7 ]`；再用正序循环试一次，解释为什么结果会漏删，把原因写在注释里。

5. 写一个猜数字游戏：答案固定为 42，用 `while` 让用户通过 `prompt` 反复输入，每次提示「大了」或「小了」，猜中后输出总次数。如果用户取消（`null`）或输入非数字，要能安全退出或提示重输。
   验收：猜 50、25、42 时依次提示「大了」「小了」「猜中，共 3 次」；点取消时不会卡死。

:::tip
这一章的结构会反复出现在后面的项目里：第 6 章的 `map` / `filter` 是「循环 + 回调」的封装，第 15 章渲染列表是「循环 + 创建 DOM」，第 18 章的待办项目则是「数组 + 分支 + 循环」的组合。

如果 `switch` 的穿透和 `break` 只跳一层这两件事还觉得绕，不用急着背。写代码时先把每个 `case` 的 `break` 补齐，把嵌套循环改写成函数加 `return`，这两条习惯能挡掉绝大多数事故。
:::
