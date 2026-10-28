---
id: 06
title: 数组与常用方法
summary: 从下标和增删讲起，分清 splice 与 slice，再把 map、filter、reduce、sort 练熟。
minutes: 36
keywords: 数组 length push pop splice slice map filter reduce sort 遍历 链式调用
---

> 第 5 章把逻辑装进了函数，这一章开始处理「一批数据」。
>
> 真实项目里很少有单个值：待办是一列、商品是一页、搜索结果是一组。数组（array）就是装这批数据的容器，而 `map`、`filter`、`reduce` 是处理它们的三把主刀。
>
> 学完这一章，你应该能看懂页面上大部分数据处理的代码，并且知道哪些方法会悄悄改掉原数组。

## 为什么需要它

假设你要记录五笔支出，还没学数组时，只能一个值起一个名字：

```js
const expense1 = 35.5;
const expense2 = 12;
const expense3 = 88;
const expense4 = 6.5;
const expense5 = 20;

const total = expense1 + expense2 + expense3 + expense4 + expense5;
console.log(total);   // 输出: 162
```

能算，但问题很明显。第一，支出变成六笔、十笔时，变量会越写越多，代码越写越长。第二，你没法写一句「把每一笔都加起来」，只能手写五个加法。第三，这些名字里只有编号，没有顺序之外的任何含义。

数组（array）解决的正是「一批同类的值」这个问题：

```js
const expenses = [35.5, 12, 88, 6.5, 20];

let total = 0;
for (const n of expenses) {
  total += n;
}

console.log(total);   // 输出: 162
```

现在无论有 5 笔还是 500 笔，循环都只有这三行。数据变了，代码不用变，这是数组带来的第一层价值。

第二层价值在方法上。假设你要从一页商品里筛出「已上架」的，再把价格打八折，最后算总价。用 `for` 循环也能写，但要准备好几个临时数组、写三段循环。用数组方法可以连成一句：

```js
const products = [
  { price: 100, onSale: true },
  { price: 200, onSale: false },
];

const total = products
  .filter(p => p.onSale)
  .map(p => p.price * 0.8)
  .reduce((sum, price) => sum + price, 0);

console.log(total);   // 输出: 80
```

这三行分别回答「留哪些」「每项变成什么」「怎么合成一个数」。读代码的人不需要在循环细节里绕，直接看到业务意图。这一章的目标，就是让你看到这种代码不再发怵，而且自己能写出来。

## 创建数组与访问元素

最常用的是方括号字面量，把值用逗号隔开：

```js
const scores = [90, 85, 77];
const mixed = ['小明', 18, true];
const empty = [];
const grid = [[1, 2], [3, 4]];

const fromString = 'abc'.split('');       // ['a', 'b', 'c']
const zeros = new Array(3).fill(0);       // [0, 0, 0]
```

数组里的元素类型可以不同，`mixed` 同时装了字符串、数字和布尔值。语法允许，但业务代码里尽量让一个数组只装同一种东西，否则后面每个方法都要先判断类型，很难维护。

`grid` 是二维数组，可以理解成「数组里再装数组」。表格数据、矩阵、棋盘都长这样，后面处理表格时经常遇到。

访问元素靠下标（index），从 0 开始数：

```js
const scores = [90, 85, 77];

console.log(scores.length);              // 输出: 3
console.log(scores[0]);                  // 输出: 90
console.log(scores[2]);                  // 输出: 77
console.log(scores[3]);                  // 输出: undefined
console.log(scores[scores.length - 1]);  // 输出: 77
console.log(scores.at(-1));              // 输出: 77
console.log(typeof []);                  // 输出: object
console.log(Array.isArray([]));          // 输出: true
```

这里有三个必须记住的点。

第一，下标从 0 开始，所以最后一个元素的下标是 `length - 1`，不是 `length`。新手最常见的越界写法就是 `arr[arr.length]`，它不会报错，只会返回 `undefined`。

第二，访问不存在的下标不会抛错，而是返回 `undefined`。这和访问不存在的变量完全不同。好处是代码不会突然崩，坏处是错误会被悄悄带到后面，直到某处调用 `undefined` 的方法才炸。

第三，`at(-1)` 是较新的写法，负数表示从末尾倒着数，`at(-1)` 就是最后一个，`at(-2)` 是倒数第二个。老代码里更常见的是 `arr[arr.length - 1]`，两种都要认识。

数组本质上也是对象，所以 `typeof []` 返回的是 `'object'`，分不出数组和普通对象。判断数组一定用 `Array.isArray`，不要用 `typeof`。这一点第 2 章讲过，在处理接口数据时会反复用到。

## 增删元素：四个方法都会改原数组

往数组两头加减元素，有四个方法。它们都会**直接修改原数组**，返回值又各不相同，初学时必须逐个记清：

```js
const list = ['a', 'b', 'c'];

console.log(list.push('d'));      // 输出: 4，返回新长度
console.log(list);                // 输出: ['a', 'b', 'c', 'd']

console.log(list.pop());          // 输出: d，返回被删掉的元素
console.log(list);                // 输出: ['a', 'b', 'c']

console.log(list.unshift('z'));   // 输出: 4，返回新长度
console.log(list);                // 输出: ['z', 'a', 'b', 'c']

console.log(list.shift());        // 输出: z，返回被删掉的元素
console.log(list);                // 输出: ['a', 'b', 'c']
```

用一张表记返回值：

| 方法 | 加在哪一端 | 删哪一端 | 返回值 |
| --- | --- | --- | --- |
| `push(x)` | 末尾 | — | 新长度 |
| `pop()` | — | 末尾 | 被删的元素 |
| `unshift(x)` | 开头 | — | 新长度 |
| `shift()` | — | 开头 | 被删的元素 |

最容易错的是把 `push` 的返回值当成数组。`list.push('d')` 返回的是数字 `4`，所以 `list.push('d').map(...)` 会直接报错，因为数字没有 `map` 方法。

:::warn
第 2 章讲过，`const` 只限制「不能重新赋值」，不限制修改内容。`const list = [1, 2]; list.push(3)` 完全合法，只有 `list = [4, 5]` 这种整个换掉的写法才会报错。想禁止修改内容，需要 `Object.freeze`，第 7 章会讲，但它对数组也只冻结第一层。
:::

`shift` 和 `unshift` 要移动后面所有元素的位置，数据量大时会比 `push`、`pop` 慢。日常几百条数据感觉不到，知道有这回事即可。

### splice：万能，但参数最容易错

`splice` 能在任意位置删除、插入、替换，是数组里权力最大的方法。它的参数是：

```text
arr.splice(起始下标, 删除个数, 要插入的值...)
```

三种典型用法，逐个看输出：

```js
// 删除：从下标 1 开始，删 2 个
const a = ['a', 'b', 'c', 'd'];
console.log(a.splice(1, 2));   // 输出: ['b', 'c']
console.log(a);                // 输出: ['a', 'd']

// 插入：从下标 1 开始，删 0 个，插入 'x'
const b = ['a', 'b', 'c'];
console.log(b.splice(1, 0, 'x'));   // 输出: []
console.log(b);                     // 输出: ['a', 'x', 'b', 'c']

// 替换：从下标 1 开始，删 1 个，插入 'y'
const c = ['a', 'b', 'c'];
console.log(c.splice(1, 1, 'y'));   // 输出: ['b']
console.log(c);                     // 输出: ['a', 'y', 'c']
```

读 `splice` 的口诀是：**站在哪个下标，删掉几个，原地塞进什么**。它的返回值永远是被删掉的那些元素组成的新数组，没删东西就是空数组。这一点和 `push` 返回长度、`pop` 返回元素都不一样。

第二个参数是「删除几个」，不是「删到哪个下标」。这是最高频的错误。想删掉下标 1 和 2 两个元素，要写 `splice(1, 2)`；写成 `splice(1, 3)` 会连下标 3 一起删掉。

如果省略第二个参数，会从起始下标一直删到末尾：`[1, 2, 3, 4].splice(2)` 返回 `[3, 4]`，原数组只剩 `[1, 2]`。这个行为很容易在「只想删一个」时误伤后面所有元素，所以建议每次都把删除个数写出来，哪怕写 `0`。

### slice 与 splice：一字之差，行为相反

`slice` 是切片，`splice` 是手术。名字只差一个字母，作用却完全相反：

```js
const nums = [1, 2, 3, 4, 5];

console.log(nums.slice(1, 3));   // 输出: [2, 3]
console.log(nums);               // 输出: [1, 2, 3, 4, 5]，原数组没变

const copy = nums.slice();       // 不传参数就是整个复制一份
console.log(copy);               // 输出: [1, 2, 3, 4, 5]
```

`slice(1, 3)` 取的是下标 1 和 2，**不包含结束下标 3**。这个「左闭右开」的规则在字符串的 `slice` 里也一样，第 8 章会再遇到。

两者对比：

| 对比项 | `slice(start, end)` | `splice(start, count, ...items)` |
| --- | --- | --- |
| 是否改原数组 | 否 | 是 |
| 参数含义 | 取到 end 之前，不含 end | count 是删除个数 |
| 返回值 | 截取出的新数组 | 被删除的元素数组 |
| 负下标 | 从末尾倒着算 | 从末尾倒着算 |
| 典型用途 | 复制、分页、取前 N 个 | 删除、插入、替换 |

记忆方法：**slice 不破坏，splice 搞破坏**。日常业务里，能用 `slice`、`map`、`filter` 解决的就不要用 `splice`，因为不改原数组的代码更容易排查问题。

## 查找元素：七个方法各管一件事

数组查找的方法很多，选错的根源是没搞清楚「你想拿到什么」。先看简单值：

```js
const fruits = ['苹果', '香蕉', '苹果'];

console.log(fruits.indexOf('香蕉'));      // 输出: 1
console.log(fruits.lastIndexOf('苹果'));  // 输出: 2
console.log(fruits.indexOf('西瓜'));      // 输出: -1
console.log(fruits.includes('苹果'));     // 输出: true
console.log([NaN].indexOf(NaN));          // 输出: -1
console.log([NaN].includes(NaN));         // 输出: true
```

`indexOf` 返回第一次出现的下标，找不到返回 `-1`；`lastIndexOf` 从后往前找；`includes` 只回答「在不在」，返回布尔值。判断「有没有」时优先用 `includes`，因为 `-1` 在条件里是真值，`if (fruits.indexOf('西瓜'))` 会永远成立。

这三个方法用严格相等比较，所以 `indexOf` 找不到 `NaN`，而 `includes` 用的是另一套相等规则，能找到。日常判断简单值在不在，`includes` 更省心。

要找对象，或者要按条件找，就得用接收回调函数（callback）的四个方法：

```js
const users = [
  { id: 1, name: '小明', age: 18, active: true },
  { id: 2, name: '小红', age: 22, active: false },
  { id: 3, name: '小刚', age: 16, active: true },
];

console.log(users.find(u => u.id === 2).name);     // 输出: 小红
console.log(users.find(u => u.id === 9));          // 输出: undefined
console.log(users.findIndex(u => u.id === 2));     // 输出: 1
console.log(users.findIndex(u => u.id === 9));     // 输出: -1
console.log(users.some(u => u.age < 18));          // 输出: true
console.log(users.every(u => u.age >= 18));        // 输出: false
```

把「想得到什么」和「找不到时返回什么」放在一张表里：

| 你想知道 | 用哪个 | 找到时 | 找不到时 |
| --- | --- | --- | --- |
| 这个值在不在 | `includes` | `true` | `false` |
| 第一次出现在哪 | `indexOf` | 下标 | `-1` |
| 哪个元素满足条件 | `find` | 元素本身 | `undefined` |
| 满足条件的元素在哪 | `findIndex` | 下标 | `-1` |
| 是否至少有一个满足 | `some` | `true` | `false` |
| 是否全部都满足 | `every` | `true` | `false` |

`find` 和 `filter` 的区别要特别注意：`find` 找到第一个就停，返回那个元素；`filter` 会走完整个数组，返回所有满足条件的元素组成的新数组。只想判断「有没有符合条件的」用 `some`，它比 `filter` 更早停止，也更直接。

:::warn
空数组的 `every` 返回 `true`。因为「所有元素都满足」在没有元素时没有被违反，数学上叫真空真。做权限或校验时，如果数组可能为空，要先判断 `arr.length > 0`，否则会得到误判的真值。
:::

## 遍历与转换：for、forEach、map、filter

遍历（iteration）数组有四种常见方式，各有各的适用场景。`for` 和 `for...of` 第 4 章讲过，这里只快速回顾，重点放在后三个方法上。

```js
const nums = [10, 20, 30];

for (let i = 0; i < nums.length; i++) {
  console.log(i, nums[i]);
}
// 输出:
// 0 10
// 1 20
// 2 30
```

需要下标、需要倒序遍历、需要中途 `break` 时，用 `for`。只是依次取出每个值，用第 4 章推荐的 `for...of` 更简洁。

### forEach：只负责「每个都做一遍」

`forEach` 接收一个回调函数，对每个元素执行一次。它没有返回值，或者说返回 `undefined`：

```js
const names = ['小明', '小红'];

const result = names.forEach((name, index) => {
  console.log(index, name);
});
// 输出:
// 0 小明
// 1 小红

console.log(result);   // 输出: undefined
```

回调可以接收三个参数：当前元素、当前下标、原数组。大部分时候只用前两个。

`forEach` 有两个限制。第一，回调里的 `return` 只相当于 `continue`，跳过本次，不会结束整个循环。第二，不能用 `break`，写了会直接报 `SyntaxError: Illegal break statement`。需要提前退出时，换成 `for...of`，或者用 `some`、`find` 这类会在命中后停止的方法。

### map：一对一转换，返回新数组

`map` 对每个元素做一次转换，把返回值收集成一个**长度相同的新数组**：

```js
const prices = [10, 20, 30];
const withTax = prices.map(price => price * 1.1);

console.log(withTax);   // 输出: [11, 22, 33]
console.log(prices);    // 输出: [10, 20, 30]，原数组没变

const users = [
  { name: '小明', age: 18 },
  { name: '小红', age: 22 },
];
console.log(users.map(user => user.name));   // 输出: ['小明', '小红']

const bad = [1, 2, 3].map(n => { n * 2; });
console.log(bad);   // 输出: [undefined, undefined, undefined]
```

`map` 不会改变长度，也不会丢掉元素。原来 3 个，结果还是 3 个，只是每个都换成了回调的返回值。

最后两行是最常见的错误：回调用了大括号却忘记 `return`。大括号代表函数体，没有 `return` 就返回 `undefined`。要么写成单行表达式 `n => n * 2`，要么在大括号里明确写 `return n * 2`。

### filter：筛出满足条件的元素

`filter` 的回调返回真值就保留这个元素，返回假值就丢掉。它返回新数组，长度通常比原数组短：

```js
const nums = [1, 2, 3, 4, 5, 6];
console.log(nums.filter(n => n % 2 === 0));   // 输出: [2, 4, 6]

const users = [
  { name: '小明', active: true },
  { name: '小红', active: false },
  { name: '小刚', active: true },
];
console.log(users.filter(u => u.active).map(u => u.name));   // 输出: ['小明', '小刚']
```

`filter` 只负责留不留，不负责改内容。想改内容要接一个 `map`。上面的链式写法就是先筛人，再取名字。

一个常用简写是 `filter(Boolean)`，它会丢掉所有假值，包括 `0`、空字符串、`null`、`undefined`、`NaN` 和 `false`。清理表单里的空选项时很好用，但要注意 `0` 也会被丢掉。

### map 与 forEach 的对比

同一个需求「把每个分数翻倍」，两种写法都实现一遍：

```js
const scores = [60, 80, 95];

// 写法一：forEach，需要自己准备数组并 push
const doubled1 = [];
scores.forEach(score => {
  doubled1.push(score * 2);
});
console.log(doubled1);   // 输出: [120, 160, 190]

// 写法二：map，直接得到新数组
const doubled2 = scores.map(score => score * 2);
console.log(doubled2);   // 输出: [120, 160, 190]
```

输出一样，但意图不同。`forEach` 的写法里，「准备空数组」和「往里面 push」是两件额外的事，读的人要先在脑子里模拟一遍才知道结果是什么。`map` 一行就说明了「每个元素变成两倍，结果是一个新数组」。

选择标准很简单：

- 需要**新数组**，用 `map`
- 只是**做副作用**，比如打印日志、修改 DOM、发请求，用 `forEach`
- 需要**中途退出**，两个都别用，用 `for...of`

## reduce：把一堆值压成一个

`reduce` 是数组方法里最强、也最容易读不懂的一个。它的形状是 `arr.reduce((累加器, 当前值) => 新的累加器, 初始值)`。第一个参数叫累加器（accumulator），习惯写成 `acc`；第二个参数是当前元素，习惯写成 `cur`。每次回调的返回值，会成为下一轮的 `acc`。

求和是最直观的例子：

```js
const nums = [1, 2, 3, 4];

const total = nums.reduce((acc, cur) => {
  return acc + cur;
}, 0);

console.log(total);   // 输出: 10
```

把每一轮拆开看：

| 轮次 | acc（上一轮的返回值） | cur | 本轮 return |
| --- | --- | --- | --- |
| 第 1 轮 | 0（初始值） | 1 | 1 |
| 第 2 轮 | 1 | 2 | 3 |
| 第 3 轮 | 3 | 3 | 6 |
| 第 4 轮 | 6 | 4 | 10 |

循环结束后，`reduce` 返回最后一轮的返回值 `10`。`acc` 不是某种特殊变量，它只是「上一轮的结果」，你返回什么，下一轮就拿什么。

初始值可以省略，这时第一轮直接拿第一个元素当 `acc`，从第二个元素开始遍历，`[1, 2, 3].reduce((acc, cur) => acc + cur)` 仍然得到 `6`。但空数组省略初始值会直接抛出 `TypeError: Reduce of empty array with no initial value`，因为连第一轮的 `acc` 都找不到。

所以建议**永远写初始值**。求和的初始值是 `0`，求字符串的初始值是 `''`，统计的初始值是 `{}`。这样既不会在空数组上崩，也让人一眼知道结果的类型。

### 计数：用对象当累加器

统计每个元素出现的次数，是 `reduce` 最经典的用法之一：

```js
const words = ['a', 'b', 'a', 'c', 'a'];

const counts = words.reduce((acc, word) => {
  acc[word] = (acc[word] || 0) + 1;
  return acc;
}, {});

console.log(counts);   // 输出: { a: 3, b: 1, c: 1 }
```

第一轮 `acc` 是空对象，`acc['a']` 是 `undefined`，`undefined || 0` 得到 `0`，加 1 变成 `1`。后面再遇到 `'a'`，就取到已有的 `1` 再加 1。每次都必须 `return acc`，否则下一轮的累加器就变成 `undefined`。

### 按字段分组：把数组变成对象

接口返回一列订单，你想按状态分成几组，也可以用 `reduce`：

```js
const orders = [
  { id: 1, status: 'paid' },
  { id: 2, status: 'pending' },
  { id: 3, status: 'paid' },
];

const groups = orders.reduce((acc, order) => {
  if (!acc[order.status]) {
    acc[order.status] = [];
  }
  acc[order.status].push(order);
  return acc;
}, {});

console.log(Object.keys(groups));      // 输出: ['paid', 'pending']
console.log(groups.paid.length);       // 输出: 2
console.log(groups.pending.length);    // 输出: 1
```

思路是「结果对象里还没有这个状态的桶，就先建一个空数组；然后把当前订单放进去」。第 7 章会详细讲对象，这里只要看懂 `acc[order.status]` 这个方括号访问。

:::warn
判断要不要用 `reduce`，看结果是不是「一个值」。求和得到一个数字，计数得到一个对象，分组得到一个对象，这些适合 `reduce`。如果结果是一个新数组，用 `map` 或 `filter` 更清楚。不要为了炫技把简单的筛选写成 `reduce`。
:::

## sort：默认按字符串排序

`sort` 是坑最多的数组方法。先看默认行为：

```js
const nums = [10, 9, 1, 100, 2];

console.log(nums.sort());
// 输出: [1, 10, 100, 2, 9]

console.log(nums.sort((a, b) => a - b));
// 输出: [1, 2, 9, 10, 100]

console.log(nums.sort((a, b) => b - a));
// 输出: [100, 10, 9, 2, 1]

const users = [
  { name: '小明', age: 22 },
  { name: '小红', age: 18 },
  { name: '小刚', age: 25 },
];

const byAge = [...users].sort((a, b) => a.age - b.age);
console.log(byAge.map(u => u.name));   // 输出: ['小红', '小明', '小刚']
```

第一行得到 `[1, 10, 100, 2, 9]`，看起来完全不对。原因是 `sort` 默认会把每个元素转成字符串，再按字符编码逐位比较。字符串 `'10'` 的第一个字符是 `'1'`，比 `'2'` 小，所以 `10` 排在 `2` 前面。`100` 同理，排在 `10` 后面、`2` 前面。

数字排序必须传比较函数 `(a, b) => a - b`。规则是：

- 返回负数：`a` 排在 `b` 前面
- 返回正数：`b` 排在 `a` 前面
- 返回 0：两者顺序不变

`a - b` 在 `a` 小于 `b` 时得到负数，所以是升序；`b - a` 反过来，得到降序。

对象数组按字段排序也是同一个套路，上面那段代码的后半部分就是例子：先 `[...users]` 复制，再用 `a.age - b.age` 按年龄升序。字符串字段不能用减法，会得到 `NaN`。这时用 `a.name.localeCompare(b.name, 'zh')`，它会按本地语言的规则比较，返回值同样是负数、0 或正数。具体顺序受运行环境的排序规则影响，不要求背。

:::warn
`sort` 会**原地修改**原数组，并且返回的还是同一个数组。上面写 `[...users].sort(...)`，就是为了先复制一份，别动原始数据。`reverse` 也一样会改原数组。业务里如果原数组后面还要用，先 `slice()` 或展开复制。
:::

## 连接、拆分与扁平化

四个处理「数组和字符串互相转换」以及「数组套数组」的方法，其中 `flat` 负责扁平化（flatten）：

```js
console.log([1, 2, 3].join('-'));   // 输出: 1-2-3
console.log([1, 2, 3].join(''));    // 输出: 123

console.log('1,2,3'.split(','));    // 输出: ['1', '2', '3']
console.log('abc'.split(''));       // 输出: ['a', 'b', 'c']

console.log([1, 2].concat([3, 4])); // 输出: [1, 2, 3, 4]

console.log([1, [2, [3, 4]]].flat());          // 输出: [1, 2, [3, 4]]
console.log([1, [2, [3, 4]]].flat(2));         // 输出: [1, 2, 3, 4]
console.log([1, [2, [3, 4]]].flat(Infinity));  // 输出: [1, 2, 3, 4]
```

`join` 把数组拼成字符串，参数是分隔符，不传默认用逗号。`split` 是它的逆操作，把字符串按分隔符切成数组，第 8 章会展开。`concat` 拼接数组，不改原数组。`flat` 拍平嵌套数组，默认只拍一层，传数字表示层数，`Infinity` 表示拍到不能再拍。

`split('')` 和 `join('')` 经常成对出现，比如反转字符串：`'abc'.split('').reverse().join('')` 得到 `'cba'`。注意 `reverse` 会改中间那个临时数组，但因为它是 `split` 新建的，不影响原字符串。

## 会改原数组 / 不改原数组：一张总表

这张表建议截图存下来，写代码前扫一眼：

| 方法 | 是否改原数组 | 返回什么 |
| --- | --- | --- |
| `push` / `pop` / `shift` / `unshift` | 是 | 新长度 / 被删元素 |
| `splice` | 是 | 被删除元素的数组 |
| `sort` / `reverse` | 是 | 原数组（已排序/反转） |
| `slice` | 否 | 新数组 |
| `concat` | 否 | 新数组 |
| `map` / `filter` | 否 | 新数组 |
| `reduce` | 否 | 累加结果，类型任意 |
| `join` | 否 | 字符串 |
| `find` / `findIndex` | 否 | 元素 / 下标 |
| `includes` / `indexOf` | 否 | 布尔 / 下标 |
| `some` / `every` | 否 | 布尔 |

规律可以这样记：**「增删改排序」多半会动原数组，查询和转换多半返回新东西**。`splice`、`sort`、`reverse` 是三个最容易被忘掉的「破坏者」。

## 链式调用：把三步合成一句

因为 `filter`、`map`、`slice` 都返回新数组，所以可以接着调用下一个方法，形成链式调用（method chaining）。下面这段代码筛选已付款订单、计算每项小计、再求总价：

```js
const orders = [
  { name: '键盘', price: 299, count: 1, status: 'paid' },
  { name: '鼠标', price: 99, count: 2, status: 'paid' },
  { name: '显示器', price: 1299, count: 1, status: 'pending' },
  { name: '鼠标垫', price: 29, count: 3, status: 'paid' },
];

const paidTotal = orders
  .filter(order => order.status === 'paid')
  .map(order => order.price * order.count)
  .reduce((sum, subtotal) => sum + subtotal, 0);

console.log(paidTotal);   // 输出: 584
```

拆开看，每一步的中间结果都很清楚：

1. `filter` 留下键盘、鼠标、鼠标垫三个订单
2. `map` 把它们变成 `299`、`198`、`87` 三个小计
3. `reduce` 把三个数加成 `584`

链式调用的价值是「每一步只做一件事」，读起来像在描述业务流程，而不是在跟踪循环变量。写的时候也有一个实用建议：**先 `filter` 再 `map`**，这样后面的转换只处理需要的数据，少做无用功。

:::tip
每调用一次 `map` 或 `filter` 都会创建一个新数组。数据量几百上千条时，这点开销完全可以忽略，可读性更重要。只有处理十万级数据、并且在意性能时，才需要考虑合并循环或改用 `for`。
:::

## 常见误区清单

| 写法 | 结果 | 为什么 |
| --- | --- | --- |
| `arr[arr.length]` | `undefined` | 最后一个下标是 `length - 1` |
| `[10, 9, 1].sort()` | `[1, 10, 9]` | 默认转字符串按字符比较 |
| `arr.splice(1, 2)` 以为删到下标 2 | 实际删 2 个元素 | 第二个参数是删除个数 |
| `arr.slice(1, 3)` 以为改了原数组 | 原数组不变 | `slice` 返回新数组 |
| `map(n => { n * 2 })` | `[undefined, ...]` | 大括号里没有 `return` |
| `forEach` 里写 `break` | 语法错误 | `forEach` 不支持中途退出 |
| `[].every(n => n > 0)` | `true` | 空数组的 `every` 是真空真 |
| `[].reduce((a, b) => a + b)` | 抛 `TypeError` | 空数组且没有初始值 |
| `arr.indexOf(NaN)` | `-1` | 严格相等找不到 `NaN`，用 `includes` |
| `arr.push(4)` 当成返回数组 | 返回数字 4 | 返回的是新长度，不能接着链式调用 |
| `users.sort(...)` 后又用原顺序 | 原数组已被打乱 | `sort` 原地排序，先复制 |
| `const arr = [1]; arr.push(2)` | 合法 | `const` 不禁止修改内容 |

## 通勤自测

:::quiz 下面这段代码输出什么？
```js
const arr = [1, 2, 3];
console.log(arr.push(4));
console.log(arr);
```
第一行输出 `4`，因为 `push` 返回新长度；第二行输出 `[1, 2, 3, 4]`，原数组被改了。
:::

:::quiz 下面这段代码输出什么？
```js
const result = [5, 2, 8, 1]
  .filter(n => n > 2)
  .map(n => n * 10);
console.log(result);
```
输出 `[50, 80]`。`filter` 先留下 `5` 和 `8`，`map` 再把它们各乘 10。每一步都返回新数组，所以能链起来。
:::

:::quiz 下面这段代码输出什么？
```js
const arr = ['a', 'b', 'c', 'd'];
console.log(arr.splice(1, 2));
console.log(arr);
```
第一行输出 `['b', 'c']`，这是被删掉的元素；第二行输出 `['a', 'd']`，原数组被改成了剩下的两个元素。
:::

:::quiz `slice(1, 3)` 和 `splice(1, 3)` 分别做什么？
`slice(1, 3)` 返回下标 1、2 两个元素组成的新数组，不修改原数组。`splice(1, 3)` 从下标 1 开始删除 3 个元素，修改原数组，并返回被删掉的三个元素。区别在于「取」和「删」。
:::

:::quiz `map` 和 `forEach` 该怎么选？
需要新数组就用 `map`，它的返回值是长度相同的新数组。只想逐个执行副作用（打印、改 DOM、发请求）用 `forEach`，它返回 `undefined`，也不能 `break`。需要中途退出就用 `for...of`。
:::

:::quiz 用 `reduce` 统计 `['x', 'y', 'x']` 每个元素出现次数，结果是什么？
输出 `{ x: 2, y: 1 }`。初始值是空对象，第一次遇到某个键时 `acc[cur]` 是 `undefined`，`|| 0` 把它变成 0 再加 1；以后就在已有计数上累加。
:::

:::quiz `[10, 9, 1].sort()` 的结果是什么？为什么？怎么改？
结果是 `[1, 10, 9]`。`sort` 默认把元素转成字符串，按字符编码比较，`'10'` 的第一个字符 `'1'` 小于 `'9'`。数字排序要传 `(a, b) => a - b`，得到 `[1, 9, 10]`。
:::

:::quiz `find` 和 `filter` 有什么区别？
`find` 返回第一个满足条件的元素，找到就停止，找不到返回 `undefined`。`filter` 走完整个数组，返回所有满足条件的元素组成的新数组，找不到时返回空数组。
:::

## 动手练习（到电脑上做）

**必做**

1. 给定 `const nums = [3, 1, 4, 1, 5, 9, 2, 6, 5];`，用数组方法求出总和、最大值、平均值，以及所有大于 3 的数的平方组成的新数组。
   验收：四个结果分别是 `36`、`9`、`4`、`[16, 25, 81, 36]`（顺序按原数组），并且原始 `nums` 没有被修改。

2. 用 `filter` 加 `indexOf`（或 `includes`）给 `[1, 2, 1, 3, 2, 4]` 去重，要求不修改原数组。
   验收：输出 `[1, 2, 3, 4]`，并且能解释为什么 `filter` 的回调里要比较 `indexOf` 和当前下标。

3. 给定一个订单数组，字段有 `name`、`price`、`count`、`status`。筛出 `status === 'paid'` 的订单，计算总金额，再按金额从高到低排序，最后只输出名字数组。
   验收：金额计算正确，排序后顺序正确，最终得到类似 `['键盘', '鼠标']` 的名字数组；原订单数组顺序没变。

**进阶**

4. 用 `reduce` 把订单按 `status` 分组，输出每个状态下的订单数量与总金额，形状类似 `{ paid: { count: 3, total: 584 }, pending: { count: 1, total: 1299 } }`。
   验收：每个状态的数量和金额都能对上，空数组时返回 `{}` 而不是报错。

5. 写一个 `topN(list, n)`，按 `score` 从高到低取前 `n` 名，要求不修改原数组，并且当 `n` 大于数组长度时返回全部元素。
   验收：`topN` 返回新数组，原数组顺序不变；`n = 0` 时返回 `[]`，`n` 超过长度时不报错。

:::tip
这一章的方法会和后面反复打照面：第 7 章处理对象数组时会继续用 `map` 和 `reduce`，第 12 章的 `Set` 能一行去重，第 15 章把数组渲染成 DOM 节点靠的也是 `map` 加 `join`。

现在不必背下所有方法，先把 `map`、`filter`、`reduce`、`sort` 四个写熟。遇到「要新数组」「要一个结果」「要排序」这三种需求时，能立刻想到对应的方法，就已经达到这一章的要求了。
:::
