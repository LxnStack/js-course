---
id: 08
title: 字符串、Math、Date 与正则
summary: 模板字符串与常用方法、Math 取整与随机数、Date 的时区坑，以及只做格式校验的正则入门。
minutes: 38
keywords: 字符串 模板字符串 Math random toFixed Date 时间戳 正则 regex test match 分组
---

> 第 7 章处理的是「结构」，这一章处理的是「文本、数字和时间」。
>
> 用户输入的是字符串，页面上显示的是字符串，接口里的日期也常常是字符串。把它们洗干净、算准确、显示对，是日常开发里出现频率最高的一类工作。
>
> 这一章还会第一次接触正则（regular expression）。它像一把很锋利的刀，用对了能省几十行代码，用错了连自己都读不懂。

## 为什么需要它

假设你要做一个注册表单：用户输入昵称和手机号，你需要在页面上显示「你好，某某」，校验手机号格式，再记录注册时间。

拆开看，每一步都落在这章的知识点上：

- 昵称前后可能有空格，要用 `trim` 去掉
- 问候语要拼接，用模板字符串最清楚
- 手机号是不是 11 位、以 1 开头，用正则校验
- 注册时间要显示成 `2026-10-27`，用 `Date` 取值再补零
- 距离现在几天，用两个时间戳相减

这些操作单独看都不难，难在细节：`replace` 默认只替换第一个、`getMonth` 从 0 开始、`toFixed` 返回字符串、正则不加锚点会匹配到一半。这一章会把这些坑一个个点出来。

字符串、数字、日期在 JS 里都是原始类型或内置对象，不需要安装任何库，浏览器和 Node 都自带。先把这些基础工具用熟，后面做页面和接口时才不会在格式转换上卡住。

## 字符串：模板字符串与常用方法

第 2 章已经见过模板字符串（template literal），用反引号包住，`${}` 里可以放任意表达式：

```js
const name = '小明';
const score = 92;

console.log(`${name} 的成绩是 ${score} 分`);   // 输出: 小明 的成绩是 92 分
console.log(`总分：${score + 8}`);              // 输出: 总分：100
console.log(`第一行
第二行`);
// 输出:
// 第一行
// 第二行
```

模板字符串比用 `+` 拼接好在三点：变量和文字分得清、可以换行、表达式可以直接算。拼接三个以上变量时，模板字符串的可读性优势非常明显。

要注意 `$` 和花括号只有写在反引号里才生效。`'${name}'` 用单引号包住时只是一段普通文字，会原样输出 `${name}`，不会替换成变量值。另外，`${}` 里可以放函数调用和三元表达式，但不要塞太长的逻辑，超过一行就先把结果算出来再放进模板。

字符串是不可变的。所有方法都返回新字符串，不会改原字符串：

```js
const text = '  Hello  ';
const trimmed = text.trim();

console.log(text);      // 输出: '  Hello  '
console.log(trimmed);   // 输出: 'Hello'
```

这一点和第 6 章的数组不同。数组的 `push`、`splice` 会改原数组，字符串的方法一律返回新值。所以处理字符串时，记得把返回值接住：`text.trim()` 单独写一行是没有效果的，必须 `const clean = text.trim()`。

### 常用方法速查表

下面这些方法覆盖了日常八成的字符串处理。每个都给了一行示例和返回值，建议先扫一遍，用的时候再回来查：

| 方法 | 示例 | 返回 |
| --- | --- | --- |
| `trim()` | `'  hi  '.trim()` | `'hi'` |
| `includes(s)` | `'hello'.includes('ell')` | `true` |
| `startsWith(s)` | `'hello'.startsWith('he')` | `true` |
| `endsWith(s)` | `'hello'.endsWith('lo')` | `true` |
| `indexOf(s)` | `'hello'.indexOf('l')` | `2` |
| `slice(a, b)` | `'hello'.slice(1, 3)` | `'el'` |
| `substring(a, b)` | `'hello'.substring(1, 3)` | `'el'` |
| `replace(a, b)` | `'a-b-c'.replace('-', '/')` | `'a/b-c'` |
| `replaceAll(a, b)` | `'a-b-c'.replaceAll('-', '/')` | `'a/b/c'` |
| `split(s)` | `'a,b'.split(',')` | `['a', 'b']` |
| `repeat(n)` | `'ab'.repeat(2)` | `'abab'` |
| `toUpperCase()` | `'hi'.toUpperCase()` | `'HI'` |
| `toLowerCase()` | `'HI'.toLowerCase()` | `'hi'` |
| `padStart(n, s)` | `'5'.padStart(3, '0')` | `'005'` |
| `padEnd(n, s)` | `'5'.padEnd(3, '0')` | `'500'` |

`includes`、`startsWith`、`endsWith` 都返回布尔值，适合做条件判断。`indexOf` 返回下标，找不到返回 `-1`，和第 6 章的数组同名方法规则一致。`padStart` 和 `padEnd` 在补零、对齐编号时特别有用，日期格式化马上就会用到。

### slice 与 substring：负下标不同

两个方法都能截取子串，参数都是「起始下标，结束下标」，并且不含结束下标。区别在负数和参数顺序：

```js
const s = 'JavaScript';

console.log(s.slice(0, 4));            // 输出: Java
console.log(s.slice(-6));              // 输出: Script
console.log(s.slice(-6, -3));          // 输出: Scr
console.log(s.substring(4, 0));        // 输出: Java
console.log('abc'.substring(-1, 2));   // 输出: ab
```

`slice` 支持负下标，`-6` 表示从末尾往前数第 6 个字符。`substring` 不支持负数，负数会被当成 `0`，而且它会自动把两个参数中较小的放前面，所以 `substring(4, 0)` 等价于 `substring(0, 4)`。

日常截取建议统一用 `slice`，行为更可预测。只有在维护老代码时才需要区分 `substring`。

### replace 默认只替换第一个

这是字符串里最容易踩的坑之一：

```js
const date = '2026-10-27';

console.log(date.replace('-', '/'));      // 输出: 2026/10-27
console.log(date.replaceAll('-', '/'));   // 输出: 2026/10/27
console.log(date.replace(/-/g, '/'));     // 输出: 2026/10/27
```

`replace` 只替换第一个匹配项，想替换全部有三个办法：用 `replaceAll`（新方法，Node 15+ 和现代浏览器支持），或者用带 `g` 标志的正则，或者写循环。替换日期分隔符时，`replaceAll` 最直观。

`replaceAll` 的第一个参数也可以是正则，但正则必须带 `g`，否则会报错。这一点和 `replace` 不同。

### split 与 join：字符串和数组互转

`split` 把字符串切成数组，`join` 把数组拼回字符串，两者互为逆操作：

```js
const csv = '苹果,香蕉,橙子';
const fruits = csv.split(',');

console.log(fruits);            // 输出: ['苹果', '香蕉', '橙子']
console.log(fruits.join('、'));  // 输出: 苹果、香蕉、橙子
console.log('abc'.split(''));    // 输出: ['a', 'b', 'c']
console.log('abc'.split('').reverse().join(''));   // 输出: cba
```

`split('')` 按字符切开，配合 `reverse` 和 `join('')` 可以反转字符串。注意 `reverse` 会改中间那个临时数组，但因为它是 `split` 新建的，不影响原字符串。

`split('')` 有一个隐藏问题：它按 UTF-16 编码单元切，不是按人眼看到的字符切。遇到 emoji 或部分生僻字就会切坏：

```js
console.log('😀'.length);        // 输出: 2
console.log([...'😀'].length);   // 输出: 1
console.log('中文'.length);      // 输出: 2
```

大部分中文汉字在 UTF-16 里占 1 个单元，所以 `'中文'.length` 是 `2`，符合直觉。但 emoji 和一些扩展区汉字占 2 个单元，`length` 会翻倍。要数「用户看到的字符」，用展开运算符 `[...str].length` 或 `Array.from(str).length`，它们按码点切分。

:::warn
`'😀'.split('')` 会得到两个乱码半截字符，不是得到一个 emoji。处理用户昵称、评论内容时，如果允许 emoji，截断和计数都要用 `[...str]`，不能直接用下标和 `length`。
:::

## Math：取整、最值与随机数

`Math` 是一个内置对象，提供数学常量和函数。常用的几个：

| 表达式 | 结果 | 说明 |
| --- | --- | --- |
| `Math.abs(-3)` | `3` | 绝对值 |
| `Math.round(2.5)` | `3` | 四舍五入到整数 |
| `Math.round(-1.5)` | `-1` | 向正无穷方向取整 |
| `Math.floor(2.9)` | `2` | 向下取整 |
| `Math.floor(-1.2)` | `-2` | 向下取整，负数会更小 |
| `Math.ceil(2.1)` | `3` | 向上取整 |
| `Math.max(1, 5, 3)` | `5` | 最大值 |
| `Math.min(1, 5, 3)` | `1` | 最小值 |
| `Math.pow(2, 10)` | `1024` | 幂，等价于 `2 ** 10` |
| `Math.sqrt(16)` | `4` | 平方根 |

`Math.round` 的规则是「向正无穷方向舍入」，所以 `2.5` 变成 `3`，`-1.5` 变成 `-1`，不是 `-2`。`floor` 和 `ceil` 在负数上也不对称：`Math.floor(-1.2)` 是 `-2`，因为向下就是往更小的方向走。

`Math.max()` 不传参数返回 `-Infinity`，`Math.min()` 不传参数返回 `Infinity`。处理数组时不能直接 `Math.max(arr)`，要展开：`Math.max(...arr)`。数组很大时展开可能栈溢出，那就用第 6 章的 `reduce` 比较。

### 生成指定范围的随机整数

`Math.random()` 返回 `[0, 1)` 之间的浮点数（floating point），包含 0，不包含 1。每次调用结果都不同，适合做抽奖、验证码、模拟数据。

要生成 `min` 到 `max` 之间的整数（包含两端），标准公式是：

```js
console.log(Math.random());   // 输出: 0 到 1 之间的小数，每次不同

const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

console.log(randomInt(1, 6));   // 输出: 1 到 6 之间的整数，模拟骰子
```

为什么是 `(max - min + 1)`？拆开看：

1. `Math.random()` 给出 `[0, 1)`，乘上区间长度 `max - min + 1` 后得到 `[0, 长度)`。
2. `Math.floor` 向下取整，得到 `0` 到 `长度 - 1` 的整数，一共 `长度` 个可能值。
3. 再加上 `min`，范围平移到 `min` 到 `max`。

以骰子为例，`min = 1`、`max = 6`，长度是 `6`，`floor` 得到 `0` 到 `5`，加 1 就是 `1` 到 `6`。如果不加 1，长度变成 `5`，`floor` 只能到 `4`，加 1 后最大是 `5`，`6` 永远抽不到。

### toFixed：返回字符串，还有浮点坑

`toFixed(n)` 把数字保留 `n` 位小数，但返回值是**字符串**：

```js
console.log((3.14159).toFixed(2));          // 输出: 3.14
console.log(typeof (3.14159).toFixed(2));   // 输出: string
console.log((1.005).toFixed(2));            // 输出: 1.00
console.log((2.5).toFixed(0));              // 输出: 3
console.log((-1.5).toFixed(0));             // 输出: -2
console.log(Math.round(-1.5));              // 输出: -1
```

两个坑要记住。

第一，返回值是字符串。`(3.14).toFixed(2) + 1` 会得到 `'3.141'`，不是 `4.14`。要继续算数，先 `Number(...)` 或 `parseFloat(...)` 转回来。

第二，`1.005` 保留两位得到 `1.00`，不是 `1.01`。原因是 `1.005` 在二进制里无法精确表示，实际存的是略小于 `1.005` 的数，舍入时自然往下走。涉及金额时不要用浮点数直接算，最好用「分」为单位的整数，显示时再除 100。

另外，`toFixed` 和 `Math.round` 对负数的处理并不一致：`(-1.5).toFixed(0)` 得到 `'-2'`，而 `Math.round(-1.5)` 得到 `-1`。需要可预测的取整时，优先用 `Math.round`、`Math.floor`、`Math.ceil`，`toFixed` 只用来格式化显示。

## Date：创建、取值与格式化

`Date` 是 JS 内置的日期对象。创建方式主要有四种：

```js
const now = new Date();                    // 当前时间
const fromStamp = new Date(1704067200000); // 从毫秒时间戳创建
const fromString = new Date('2026-10-27T08:00:00'); // 从字符串创建
const fromParts = new Date(2026, 9, 27);   // 从年、月、日创建

console.log(now instanceof Date);          // 输出: true
console.log(fromStamp.toISOString());      // 输出: 2024-01-01T00:00:00.000Z
console.log(fromString.getHours());        // 输出: 8
console.log(fromParts.getMonth());         // 输出: 9
```

`new Date(2026, 9, 27)` 里的 `9` 表示 10 月，因为月份从 0 开始。这是 `Date` 最容易错的地方：写 10 月要传 `9`，写 12 月要传 `11`。

时间戳（timestamp）是「从 1970 年 1 月 1 日 00:00:00 UTC 起经过的毫秒数」。`Date.now()` 直接返回当前时间戳，比 `new Date().getTime()` 更短：

```js
console.log(Date.now());   // 输出: 当前毫秒时间戳，类似 1793000000000

const start = new Date('2026-10-27T00:00:00');
const end = new Date('2026-10-30T00:00:00');
console.log((end - start) / 86400000);   // 输出: 3

function formatDate(date = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

console.log(formatDate(new Date(2026, 0, 5)));   // 输出: 2026-01-05
```

两个日期相减，会自动转成时间戳的差值，单位是毫秒。一天的毫秒数是 `24 * 60 * 60 * 1000 = 86400000`，所以差值除以它，得到天数。

`formatDate` 是日常最常手写的函数之一：`getFullYear()` 拿四位年份，`getMonth()` 拿 0 到 11 的月份，显示时要 `+ 1`，`getDate()` 拿几号。`padStart(2, '0')` 把 `5` 补成 `'05'`，保证格式统一。

时间戳相减只适合算「两个时刻之间隔了多久」。如果要算「三个月后」「下个月 1 号」这种日历上的加减，直接给时间戳加固定天数并不可靠，因为夏令时、月底天数、闰年都会让结果偏移。这种需求要么用 `setMonth`、`setDate` 让 `Date` 自己进位，要么引入专门的日期库。

常用的取值方法还有：

| 方法 | 返回 | 注意 |
| --- | --- | --- |
| `getFullYear()` | 四位年份 | 不要用 `getYear()` |
| `getMonth()` | 0 到 11 | 显示时加 1 |
| `getDate()` | 1 到 31 | 是「几号」，不是星期 |
| `getDay()` | 0 到 6 | 0 是周日，6 是周六 |
| `getHours()` | 0 到 23 | 本地时区 |
| `getTime()` | 毫秒时间戳 | 等价于 `Date.now()` 的值 |

### 时区：同一时刻，不同显示

`Date` 内部存的是 UTC 时间戳，但 `getFullYear`、`getHours` 这些方法按运行环境的本地时区（timezone）来解释。同一个时间戳，在北京和伦敦显示的小时数不同。

更隐蔽的是字符串解析。只有日期的字符串按 UTC 解析，带时间的字符串按本地时区解析：

```js
console.log(new Date('2026-10-27').toISOString());
// 输出: 2026-10-27T00:00:00.000Z

console.log(new Date('2026-10-27T00:00:00').toISOString());
// 输出: 2026-10-26T16:00:00.000Z
```

上面第二行是在东八区运行的结果。`'2026-10-27T00:00:00'` 没有写时区，被当成北京时间零点，转成 UTC 就减了 8 小时，变成前一天的 16:00。

所以做国际化或跨时区业务时，接口最好统一传带 `Z` 或明确偏移量的 ISO 字符串，比如 `'2026-10-27T00:00:00.000Z'`，再用 `toISOString()` 或 `Intl.DateTimeFormat` 显示。只写 `'2026-10-27'` 时，记得它会被当成 UTC 零点。

### 无效日期

日期字符串写错不会抛错，会得到一个 `Invalid Date`：

```js
const bad = new Date('不是日期');
console.log(bad.toString());              // 输出: Invalid Date
console.log(Number.isNaN(bad.getTime())); // 输出: true
```

`Invalid Date` 的 `getTime()` 返回 `NaN`，任何对它的取值也全是 `NaN`，格式化出来就是 `NaN-NaN-NaN`。收到用户输入或接口数据时，先用 `Number.isNaN(date.getTime())` 检查一下，能挡掉很多后续的显示问题。

## 正则：只做格式校验的入门

正则表达式就是用来描述「字符串长什么样」的规则。它不负责理解语义，只负责匹配格式。这一节只讲够用的部分，不追求写复杂的表达式。

读正则的诀窍是分段看：先找锚点（anchor），知道从哪里开始、到哪里结束；再看有几个分组（group）；最后看每组里用了哪些字符类（character class）和量词（quantifier）。不要一行读完就猜意思，拆开之后大部分模式都能用中文念出来。写正则时也一样，先写能匹配的最小版本，再用测试字符串逐步加限制。

### 字面量与构造函数

创建正则有两种写法：

```js
const literal = /hello/i;
console.log(literal.test('Hello World'));   // 输出: true

const keyword = 'hello';
const built = new RegExp(keyword, 'i');
console.log(built.test('Hello World'));     // 输出: true
```

字面量 `/hello/i` 写在两条斜杠之间，适合规则固定的场景，解析一次就复用。`new RegExp('hello', 'i')` 适合规则来自变量的场景，比如根据用户选择的字段动态生成。

用构造函数时，字符串里的反斜杠要写两个：`new RegExp('\\d+')` 才表示 `\d+`。字面量里只写一个 `\d+`。这是两种写法最容易混淆的地方。

### test、exec、match、replace

四个方法各有用处：

```js
const re = /(\d{4})-(\d{2})-(\d{2})/;

console.log(re.test('今天是 2026-10-27'));   // 输出: true

const m = re.exec('今天是 2026-10-27');
console.log(m[0]);      // 输出: 2026-10-27
console.log(m[1]);      // 输出: 2026
console.log(m.index);   // 输出: 4

const m2 = '今天是 2026-10-27'.match(re);
console.log(m2[2]);     // 输出: 10
```

`test` 只回答「匹配不匹配」，返回布尔值，校验格式时最常用。`exec` 返回一个数组，`[0]` 是完整匹配，`[1]` 开始是各分组，数组上还带 `index` 属性表示匹配位置。`match` 是字符串的方法，非全局正则下返回的结构和 `exec` 一样；带 `g` 标志时返回所有匹配的字符串数组。

`replace` 可以把匹配到的内容换掉，第二个参数可以是字符串，也可以是函数：

```js
console.log('2026-10-27'.replace(/-/g, '/'));          // 输出: 2026/10/27
console.log('a1b2c3'.replace(/\d/g, d => `[${d}]`));   // 输出: a[1]b[2]c[3]
```

用函数替换时，函数的参数是匹配到的内容，返回值会成为替换后的文本。处理模板变量、给数字加括号、脱敏手机号，都靠这种写法。

### 标志：g、i、m

标志（flag）写在正则最后一条斜杠后面，可以组合：

```js
console.log(/a/.test('A'));    // 输出: false
console.log(/a/i.test('A'));   // 输出: true

console.log('a1b2'.match(/\d/g));   // 输出: ['1', '2']

console.log('first\nsecond'.match(/^second/));    // 输出: null
console.log('first\nsecond'.match(/^second/m));   // 输出: ['second']
```

- `g`（global）：找全部匹配，不是找到第一个就停
- `i`（ignore case）：忽略大小写
- `m`（multiline）：让 `^` 和 `$` 匹配每一行的开头和结尾，而不是整个字符串的首尾

不加 `g` 时，`match` 只返回第一个匹配及其分组；加了 `g`，返回所有匹配的字符串，但不再返回分组和位置。

### 字符类、量词与锚点

这三组符号是正则的骨架：

```js
console.log(/\d/.test('abc123'));   // 输出: true
console.log(/\w/.test('___'));      // 输出: true
console.log(/\s/.test('a b'));      // 输出: true
console.log(/./.test('\n'));        // 输出: false

console.log(/^\d{4}$/.test('2026'));    // 输出: true
console.log(/^\d{2,4}$/.test('123'));   // 输出: true
console.log(/^ab*$/.test('a'));         // 输出: true
console.log(/^ab+$/.test('a'));         // 输出: false
console.log(/^ab?$/.test('a'));         // 输出: true
```

字符类：

- `\d` 匹配一个数字，等价于 `[0-9]`
- `\w` 匹配字母、数字、下划线，等价于 `[A-Za-z0-9_]`
- `\s` 匹配空白，包括空格、制表符、换行
- `.` 匹配除换行之外的任意一个字符

量词控制出现次数：

- `*` 表示 0 次或多次
- `+` 表示 1 次或多次
- `?` 表示 0 次或 1 次
- `{n}` 表示恰好 n 次
- `{n,m}` 表示 n 到 m 次

锚点控制位置：`^` 表示字符串开头，`$` 表示字符串结尾。加上锚点，才是「整串必须完全符合」；不加锚点，只要字符串里有一段符合就算匹配：

```js
console.log(/\d{3}/.test('abc123def'));     // 输出: true
console.log(/^\d{3}$/.test('abc123def'));   // 输出: false
```

第一行在 `abc123def` 里找到了连续三位数字，所以是 `true`。第二行要求整串只有三位数字，所以是 `false`。做表单校验时，几乎都要加 `^` 和 `$`，否则用户输入 `123abc` 也能通过。

### 贪婪与非贪婪

量词默认是贪婪（greedy）的，会尽可能多匹配。在量词后面加 `?` 就变成非贪婪（lazy），尽可能少匹配：

```js
const html = '<b>加粗</b>';
console.log(html.match(/<.+>/)[0]);    // 输出: <b>加粗</b>
console.log(html.match(/<.+?>/)[0]);   // 输出: <b>
```

`/.+/` 从第一个 `<` 一直吃到最后一个 `>`，所以整个标签串都被匹配。`/.+?/` 吃到第一个 `>` 就停，只匹配开头的 `<b>`。解析 HTML 不建议用正则，但这个例子能帮你理解「贪婪」到底贪在哪。

### 分组与捕获

用圆括号把一部分模式包起来，就叫分组。分组会捕获匹配到的内容，出现在结果数组的 `[1]`、`[2]` 里：

```js
const date = '2026-10-27';
const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);

console.log(m[1]);   // 输出: 2026
console.log(m[2]);   // 输出: 10
console.log(m[3]);   // 输出: 27
```

分组还可以配合 `|` 表示「或」，比如 `/(cat|dog)/`。`?:` 开头的是非捕获分组，只分组不捕获，结果数组里不会多一项。这些进阶用法先知道名字，遇到再查。

### 常用模式：手机号、邮箱、日期

下面是三个最常见的校验模式：

```js
const phoneRe = /^1[3-9]\d{9}$/;
console.log(phoneRe.test('13812345678'));   // 输出: true
console.log(phoneRe.test('12812345678'));   // 输出: false

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
console.log(emailRe.test('a@b.com'));   // 输出: true
console.log(emailRe.test('a@@b.com'));  // 输出: false

const dateRe = /^\d{4}-\d{2}-\d{2}$/;
console.log(dateRe.test('2026-10-27')); // 输出: true
console.log(dateRe.test('2026-99-99')); // 输出: true
```

手机号模式的意思是：以 `1` 开头，第二位是 `3` 到 `9`，后面再跟 9 个数字，总共 11 位。

邮箱模式的意思是：开头一段不含空格和 `@` 的字符，一个 `@`，中间一段不含空格和 `@` 的字符，一个点，最后一段不含空格和 `@` 的字符。它只能挡住明显错误的输入，不能保证邮箱真实存在。真正验证邮箱要靠发送验证码。

日期模式只检查「四位数字-两位数字-两位数字」的形状。最后一行 `2026-99-99` 也能通过，因为 99 月完全符合 `\d{2}`。要判断日期是否真实存在，还得用 `Date` 解析后检查 `Invalid Date`。

:::warn
正则只做格式校验，不做业务校验。手机号格式对不代表号码存在，邮箱格式对不代表能收到信，日期形状对不代表 2 月有 30 号。不要用正则去验证身份证校验位、银行卡 Luhn 算法这类需要计算的规则。
:::

### g 正则的 lastIndex 陷阱

带 `g` 标志的正则对象会记住上次匹配的位置，存在 `lastIndex` 属性里。重复用同一个正则做 `test`，结果会在真真假假之间跳：

```js
const re = /a/g;

console.log(re.test('a'));   // 输出: true
console.log(re.lastIndex);   // 输出: 1
console.log(re.test('a'));   // 输出: false
console.log(re.lastIndex);   // 输出: 0
console.log(re.test('a'));   // 输出: true
```

第一次从下标 0 开始，找到 `a`，`lastIndex` 变成 1。第二次从下标 1 开始，字符串已经到末尾，找不到，返回 `false`，`lastIndex` 重置为 0。第三次又从 0 开始，所以又是 `true`。

做格式校验时，正则不要带 `g`，就不会有这个问题。如果确实需要复用带 `g` 的正则，每次测试前把 `re.lastIndex = 0` 重置，或者干脆每次新建一个正则。

## 常见误区清单

| 写法 | 结果 | 为什么 |
| --- | --- | --- |
| `'abc'.length()` | 报错 | `length` 是属性，不是方法 |
| `'a-b-c'.replace('-', '/')` | `'a/b-c'` | `replace` 默认只换第一个，用 `replaceAll` |
| `'abc'.split('')` 处理 emoji | 切坏 | `split('')` 按编码单元切，用 `[...str]` |
| `'abc'.substring(-1, 2)` | `'ab'` | 负数被当成 0，负下标用 `slice` |
| `(1.005).toFixed(2)` | `'1.00'` | 浮点存储误差，金额用整数分 |
| `'3.14'.toFixed(2)` | 报错 | `toFixed` 是数字的方法，字符串要先转数字 |
| `Math.round(-1.5)` | `-1` | 向正无穷舍入，不是四舍五入到更远 |
| `new Date(2026, 10, 1)` 以为 10 月 | 实际 11 月 | 月份从 0 开始 |
| `new Date('2026-10-27')` 当本地零点 | 实际是 UTC 零点 | 纯日期字符串按 UTC 解析 |
| `/^\d{4}$/` 写成 `/\d{4}/` | `'12345'` 也通过 | 没有锚点只要求包含 |
| 复用 `/a/g` 做 `test` | 结果交替真假 | `lastIndex` 会累积 |
| `Math.floor(Math.random() * 6) + 1` 求 1 到 6 | 正确 | 但 1 到 5 忘了加 1 就取不到 5 |
| `new Date('不是日期').getFullYear()` | `NaN` | 无效日期所有取值都是 `NaN` |

## 通勤自测

:::quiz 下面这段代码输出什么？
```js
console.log('2026-10-27'.replace('-', '/'));
console.log('2026-10-27'.replaceAll('-', '/'));
```
第一行输出 `2026/10-27`，`replace` 只替换第一个 `-`；第二行输出 `2026/10/27`，`replaceAll` 替换全部。
:::

:::quiz 下面这段代码输出什么？
```js
const d = new Date(2026, 9, 27);
console.log(d.getMonth());
console.log(d.getDate());
```
输出 `9` 和 `27`。`new Date` 的第二个参数是月份，从 0 开始，所以 `9` 表示 10 月；`getMonth` 也返回 0 到 11，显示时要加 1。
:::

:::quiz 下面这段代码输出什么？
```js
console.log(Math.round(-1.5));
console.log((-1.5).toFixed(0));
```
第一行输出 `-1`，`Math.round` 向正无穷方向舍入；第二行输出字符串 `'-2'`。两个方法对负数的处理不一致，格式化时要注意。
:::

:::quiz `'😀'.length` 是多少？怎么得到 1？
`length` 是 `2`，因为 emoji 在 UTF-16 里占两个编码单元。用 `[...'😀'].length` 或 `Array.from('😀').length` 按码点计数，得到 `1`。
:::

:::quiz `/\d{3}/` 和 `/^\d{3}$/` 校验 `'abc123def'` 有什么区别？
前者返回 `true`，因为字符串里包含连续三位数字；后者返回 `false`，因为要求整串恰好三位数字。表单校验要加 `^` 和 `$`。
:::

:::quiz 在东八区，`new Date('2026-10-27').getDate()` 是几号？
`27`。纯日期字符串按 UTC 零点解析，东八区是当天早上 8 点，日期没有跨天。但如果用 `toISOString()` 看，它仍然是 `2026-10-27T00:00:00.000Z`。真正容易跨天的是带时间的本地字符串转 UTC。
:::

:::quiz 为什么同一个 `/a/g` 连续三次 `test('a')` 会得到 `true`、`false`、`true`？
带 `g` 的正则会记录 `lastIndex`。第一次匹配后 `lastIndex` 变成 1，第二次从 1 开始找不到，返回 `false` 并把 `lastIndex` 归零，第三次又能从头匹配。校验格式时不要给正则加 `g`。
:::

:::quiz 生成 1 到 6 的随机整数，为什么公式里要写 `max - min + 1`？
`Math.random()` 的范围是 `[0, 1)`，乘以 `max - min + 1` 得到 `[0, 6)`，取整后是 `0` 到 `5`，加 `min` 得到 `1` 到 `6`。如果写成 `max - min`，取整后最大只有 `5`，`6` 永远抽不到。
:::

## 动手练习（到电脑上做）

**必做**

1. 写 `maskPhone(phone)`：11 位手机号保留前 3 位和后 4 位，中间替换成四个星号，例如 `13812345678` 变成 `138****5678`。长度不是 11 位时原样返回。
   验收：正常号码输出 `138****5678`；`'138'` 原样返回；函数不修改入参（字符串本来也不可变，但不要在里面写 `phone[0] = ...`）。

2. 写 `formatDate(date)`，输出 `YYYY-MM-DD`，月和日不足两位时补零；再写 `daysBetween(a, b)`，返回两个日期相差的天数。
   验收：`formatDate(new Date(2026, 0, 5))` 返回 `'2026-01-05'`；`daysBetween(new Date(2026, 9, 27), new Date(2026, 9, 30))` 返回 `3`；无效日期返回 `'Invalid Date'` 或抛出一个明确的错误。

3. 写 `isValidPhone(input)` 和 `isValidEmail(input)`，先 `trim`，再校验格式，返回布尔值。邮箱校验前把字母统一转小写。
   验收：`' 13812345678 '` 返回 `true`；`'12812345678'` 返回 `false`；`'A@B.COM'` 返回 `true`；空字符串返回 `false`。

**进阶**

4. 写 `timeAgo(date)`，根据当前时间返回「刚刚」「N 分钟前」「N 小时前」「N 天前」，超过 30 天返回 `YYYY-MM-DD`。
   验收：传入当前时间返回「刚刚」；传入 5 分钟前返回「5 分钟前」；传入 3 天前返回「3 天前」；未来时间单独处理，不要出现负数。

5. 写 `extractDates(text)`，从一段中英文混排的文字里提取所有 `YYYY-MM-DD` 格式的日期，返回数组并去重；没有日期时返回空数组。
   验收：`extractDates('会议 2026-10-27，截止 2026-11-01，重复 2026-10-27')` 返回 `['2026-10-27', '2026-11-01']`；普通文字返回 `[]`；函数不修改原字符串。

:::tip
这一章的工具会在后面反复出现：第 13 章用毫秒时间戳和定时器安排异步任务，第 15 章把格式化后的字符串渲染到页面，第 16 章解析 JSON 里的时间字段和查询参数，第 17 章做表单校验时会大量使用正则。

正则不必一次学完。先把 `^`、`$`、`\d`、`+`、`*`、`?`、`{n,m}` 和分组用熟，能读懂手机号、邮箱、日期这三个模式，就够应付大部分入门项目了。遇到更复杂的规则，再查文档也不迟。
:::
