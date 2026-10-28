---
id: 02
title: 变量与数据类型
summary: 从「给数据起名字」讲起，把 let/const、七种原始类型、null 与 undefined、typeof 的坑、类型转换和 0.1 + 0.2 一次讲透。
minutes: 40
keywords: 变量 let const 数据类型 typeof 类型转换 NaN 精度 null undefined
---

> 上一章说了这条路怎么走，从这一章开始真正写代码。
>
> 变量是「给数据起名字」，类型决定了「这个数据能做什么」。你后面写的每一行 JS，都建立在这两件事上。这章学完，你应该能看懂一段普通代码里每个值是什么类型、为什么这里必须用 `const`、以及 `undefined` 和 `null` 到底该用哪个。

## 为什么需要它

假设你要写一个记账小工具，需要记住三样东西：这笔钱是多少、花在什么上、什么时候花的。

最直接的想法是每次用到就重新写一遍：

```js
console.log(35.5);
console.log('午饭');
console.log('2026-10-27');
```

问题很快出现：如果这笔钱算错了，你要把每一个 `35.5` 都改一遍；如果想让用户自己输入金额，你根本不知道该改哪里。

变量就是解决这个问题的：**给一个值起个名字，之后都通过名字使用它**。

```js
const amount = 35.5;
const category = '午饭';
const date = '2026-10-27';

console.log(amount);    // 输出: 35.5
console.log(category);  // 输出: 午饭
```

现在金额要改，只改变量定义那一行就够了。这是一切编程的第一层抽象。

但「起名字」只是表面。真正关键的是第二件事：**这个值是什么类型**。因为类型决定了它能做什么操作：

```js
const a = 35.5;
const b = '35.5';

a + 1;   // 36.5，数字相加
b + 1;   // '35.51'，字符串拼接
```

同样的 `+`，结果完全不同。不搞清楚类型，你会写出「明明是两个数，加起来却变成了字符串」这种 bug，而且很难查。

## 声明变量：let、const 与 var

JS 里声明变量有三种关键字。先看它们的行为差异：

```js
let count = 1;        // 可以重新赋值
count = 2;            // 合法
count = count + 1;    // 合法，现在是 3

const price = 9.9;    // 声明后不能重新赋值
// price = 10;        // 报错: Assignment to constant variable.

var old = 'old';      // 老写法，能跑，但不要用
```

`const` 报的错长这样，你在控制台会看到：

```text
Uncaught TypeError: Assignment to constant variable.
```

意思是「试图给一个常量重新赋值」。注意它报的是 `TypeError`，不是语法错误——代码能跑，只是运行到这一行被拦住了。

### var 为什么被淘汰

`var` 是 2015 年之前唯一的写法，它有三个今天看来很危险的行为：

```js
// 1. var 没有块级作用域，会"泄漏"到外面
if (true) {
  var leaked = '我出来了';
}
console.log(leaked);   // 输出: 我出来了

// 2. var 会变量提升，声明前使用不报错，但值是 undefined
console.log(hoisted);  // 输出: undefined
var hoisted = 1;

// 3. var 允许重复声明，悄悄覆盖掉前面的值
var x = 1;
var x = 2;             // 不报错，x 变成 2
```

第 1 条最容易造成 bug：你在 `if` 或 `for` 里定义的变量，跑到外面还能用，名字还可能和别人撞车。`let` 和 `const` 都修掉了这个问题。

新代码里**不要用 `var`**。看到别人的老代码里有 `var`，知道它是什么就行，第 9 章会把这些行为讲透。

### 怎么选：默认 const

选择规则只有一句话：

- **默认用 `const`**
- 确实需要「换一个值」时才用 `let`
- 永远不用 `var`

为什么默认 `const`？因为大部分变量声明后就不该再变。用 `const` 相当于给自己上了一道保险：以后某天你不小心写了 `price = 100`，程序立刻报错，而不是悄悄算出错误的结果。

一个真实场景：

```js
const taxRate = 0.06;
// ... 一百行之后
// taxRate = 0.13;   // 手滑了？const 会立刻拦住你
```

如果是 `let`，这行会静默生效，你的所有金额都错了，而且不会报错。

:::warn
`const` 限制的是「不能让这个名字指向别的值」，不是「值本身不能改」。对象和数组的内容依然可以修改：

```js
const user = { name: '小明' };
user.name = '小红';     // 合法，对象内容变了
console.log(user);      // 输出: { name: '小红' }

// user = {};           // 报错，不能整个换掉
```

想真正冻结对象，用 `Object.freeze(user)`。这一点第 7 章会详细讲。
:::

### 一条语句一个声明

别写这种「一行声明三个变量」的代码：

```js
let a = 1, b = 2, c = 3;   // 能跑，但难读
```

更推荐：

```js
let a = 1;
let b = 2;
let c = 3;
```

理由很实际：以后要删掉 `b`，用 `let` 分开写不会牵连其他行；合并写时容易漏掉逗号或分号，报的错还很难看懂。

## 变量命名：合法与好习惯

命名有硬规则（不遵守直接报错）和软规则（不遵守能跑，但会被同事骂）。

### 硬规则

| 规则 | 合法 | 非法 |
| --- | --- | --- |
| 只能用字母、数字、`_`、`$` | `userName`、`_temp`、`$btn` | `user-name`（`-` 被当减号） |
| 不能以数字开头 | `a1` | `1a` |
| 不能用保留字 | `value`、`data` | `const`、`let`、`class`、`return` |
| 区分大小写 | `name` 和 `Name` 是两个变量 | — |

中文变量名其实合法（`const 价格 = 1`），但不要用：切换输入法麻烦，别人看不懂，搜索也不好搜。

### 软规则（实际项目里的惯例）

```js
const userName = '小明';        // 变量、函数：小驼峰 camelCase
const MAX_RETRY = 3;            // 真正的常量：全大写下划线
const isLoggedIn = true;        // 布尔值：is / has / can 开头
const userList = [];            // 数组：复数或 List 结尾
const getUserById = () => {};   // 函数：动词开头，说清做什么
```

两个最常见的坏名字：

```js
const data = [...];    // 什么数据？看不出
const temp = 1;        // 临时什么？三天后你自己也不知道

// 改好
const todoList = [...];
const retryCount = 1;
```

命名的标准是：**别人只看名字就知道里面装的是什么**。这比省几个字符重要得多。

## 数据类型总览：原始类型与对象

JS 的值分成两大类：**原始类型（primitive）** 和 **对象（object/reference）**。

原始类型一共 7 种，它们的特点是「不可变、按值传递」：

```js
'文本'              // string   字符串
42                  // number   数字（整数和小数都是它）
true                // boolean  布尔值
undefined           // undefined 未定义
null                // null     空值
123n                // bigint   超大整数（日常很少用）
Symbol('id')        // symbol   唯一标识符（日常很少用）
```

除这 7 种以外的**一切都是对象**：数组、函数、日期、正则、`Map`、`Set`……包括 `document`、`window` 这些浏览器对象。

用一张表记住它们：

| 类型 | 典型值 | 什么时候用 |
| --- | --- | --- |
| string | `'hello'`、`''` | 文本、名称、输入框内容 |
| number | `0`、`3.14`、`-1` | 金额、数量、坐标、时间戳 |
| boolean | `true`、`false` | 开关、是否登录、是否完成 |
| undefined | `undefined` | 系统表示「还没有值」 |
| null | `null` | 你主动表示「这里就是空的」 |
| bigint | `9007199254740993n` | 超过安全整数范围（极少） |
| symbol | `Symbol('id')` | 对象唯一键（极少，看源码才遇到） |
| object | `{}`、`[]`、函数 | 装一组数据、一组元素、一段逻辑 |

前 5 种占你日常代码的 99%。`bigint` 和 `symbol` 知道有这回事就行。

## 数字：整数、小数与 0.1 + 0.2

JS 只有一种数字类型 `number`，整数和小数不区分：

```js
const a = 42;
const b = 3.14;
const c = -0.5;
const d = 1e6;      // 科学计数法，等于 1000000
const e = 0x1f;     // 十六进制，等于 31
```

内部它们都是 64 位浮点数（IEEE 754 双精度）。这个设计带来一个必须知道的问题。

### 0.1 + 0.2 为什么不等于 0.3

```js
0.1 + 0.2;              // 输出: 0.30000000000000004
0.1 + 0.2 === 0.3;      // 输出: false
```

原因不是 JS 算错了，而是**二进制无法精确表示 0.1 和 0.2**。就像十进制写不出 1/3 的精确值（0.3333…），二进制也写不出 0.1 的精确值，只能存一个非常接近的数。两个近似值相加，误差就露出来了。

这不是 JS 独有的问题，Python、Java 里同样存在，只是它们默认打印时会隐藏尾部误差。

实际影响最大的是**金额计算**：

```js
// 错误做法：直接比较
if (0.1 + 0.2 === 0.3) { /* 永远不会执行 */ }

// 做法一：转成整数「分」来算
const totalCents = 1999 + 2999;      // 4998 分
console.log((totalCents / 100).toFixed(2));   // 输出: '49.98'

// 做法二：比较时允许极小误差
Math.abs(0.1 + 0.2 - 0.3) < 1e-10;   // 输出: true
```

`toFixed(2)` 返回的是**字符串**，因为它是用来展示的，不是用来继续计算的。想变回数字要 `Number((0.1 + 0.2).toFixed(2))`。

### NaN、Infinity 与 -0

三个特殊的数字值：

```js
Number('abc');       // 输出: NaN
0 / 0;               // 输出: NaN
1 / 0;               // 输出: Infinity
-1 / 0;              // 输出: -Infinity
```

`NaN` 全称 Not a Number，但它自己的类型是 `number`：

```js
typeof NaN;          // 输出: 'number'
NaN === NaN;         // 输出: false  ← 它不等于自己
```

因为 `NaN === NaN` 是 false，判断它必须用专门的函数：

```js
Number.isNaN(NaN);         // 输出: true
Number.isNaN('abc');       // 输出: false  ← 它只认真正的 NaN

// 老写法 isNaN('abc') 会先转数字，返回 true，容易误判
isNaN('abc');              // 输出: true
```

### 判断数字的几个实用函数

```js
Number.isInteger(42);        // 输出: true
Number.isInteger(42.5);      // 输出: false
Number.isFinite(42);         // 输出: true
Number.isFinite(Infinity);   // 输出: false
Number.isFinite(NaN);        // 输出: false
Number.MAX_SAFE_INTEGER;     // 输出: 9007199254740991
```

最后一行值得记一下：超过这个范围的整数，精度会丢失。

```js
9007199254740991 + 1 === 9007199254740991;   // 输出: true，加 1 没变化
```

日常业务基本碰不到，但如果处理订单号、雪花 ID 这类大整数，就会踩坑——这也是后面讲接口时常见 bug 的来源。

## 字符串：不可变的值

三种写法：

```js
const s1 = '单引号';
const s2 = "双引号";
const s3 = `反引号，可以插值：${s1}`;   // 输出: 反引号，可以插值：单引号
```

前两种几乎没有区别，团队里统一一种即可。第三种叫**模板字符串（template literal）**，第 12 章细讲，现在知道它能塞变量就行。

### 字符串不可变

这句话很重要，但初学者经常理解错。它不是说「字符串变量不能改」，而是**字符串的方法永远返回新字符串，不会改动原来的值**：

```js
const s = 'hello';

s.toUpperCase();    // 返回 'HELLO'
console.log(s);     // 输出: hello，原值没变

s.slice(0, 2);      // 返回 'he'
console.log(s);     // 输出: hello

// 想保留结果必须接住
const upper = s.toUpperCase();
```

对比数组：数组的 `push` 会改动原数组。字符串不会。所以写 `s.toUpperCase()` 而不赋值，等于什么也没做——这是初学者最常犯的错误之一。

```js
// 错误：以为改掉了
let name = ' 小明 ';
name.trim();
console.log(name);    // 输出: ' 小明 '，空格还在

// 正确
name = name.trim();
console.log(name);    // 输出: '小明'
```

### 常用属性

```js
const str = 'JavaScript';
str.length;          // 输出: 10
str[0];              // 输出: 'J'
str[str.length - 1]; // 输出: 't'
str.at(-1);          // 输出: 't'，负数从末尾数
```

`length` 是属性，不加括号；方法是函数，要加括号。搞混了会报 `str.length is not a function`。

## null 与 undefined：一对容易混的双胞胎

这两个值都表示「没有」，但语义完全不同：

| 值 | 谁给的 | 含义 | 典型场景 |
| --- | --- | --- | --- |
| `undefined` | 系统 | 还没有值 | 声明未赋值、函数无返回、属性不存在 |
| `null` | 你 | 故意设成空 | 清空选择、接口返回空、主动重置 |

```js
let a;                  // undefined，系统自动给的
console.log(a);         // 输出: undefined

function noReturn() {}
console.log(noReturn()); // 输出: undefined

const user = { name: '小明' };
console.log(user.age);   // 输出: undefined，属性不存在
```

而 `null` 是你主动写的：

```js
let selectedId = null;   // 表示"当前没有选中任何一项"
let currentUser = null;  // 表示"还没登录"

// 用户取消选择后
selectedId = null;
```

### 该用哪个

一条实用规则：**不要主动写 `undefined`，需要表示空就用 `null`**。

```js
// 不推荐
let result = undefined;

// 推荐
let result = null;
```

因为 `undefined` 还承担着「系统层面的缺失」含义，混着用会让代码难以判断「是没赋值，还是故意清空」。

### 判断时要小心

```js
const v = null;

v === null;          // 输出: true
v === undefined;     // 输出: false
v == null;           // 输出: true  ← 同时匹配 null 和 undefined
v == undefined;      // 输出: true
```

`== null` 是 `==` 唯一推荐使用的场景：一行同时判断「是 null 或者 undefined」。

```js
function greet(name) {
  if (name == null) {          // null 和 undefined 都会被拦住
    return '你好，陌生人';
  }
  return '你好，' + name;
}

greet();            // 输出: 你好，陌生人
greet(null);        // 输出: 你好，陌生人
greet('小明');      // 输出: 你好，小明
```

## 布尔值与「真假值」

`boolean` 只有两个值：`true` 和 `false`。但 JS 里**任何值都能当条件用**，这时会发生隐式转换。

被判定为 `false` 的只有 8 个值，背下来：

```js
false
0
-0
0n              // 0n 是 bigint 的 0
''              // 空字符串
null
undefined
NaN
```

**除此之外全部是 `true`**，包括这些反直觉的：

```js
Boolean('0');     // 输出: true  非空字符串
Boolean(' ');     // 输出: true  一个空格也算非空
Boolean([]);      // 输出: true  空数组也是对象
Boolean({});      // 输出: true  空对象也是对象
Boolean(-1);      // 输出: true  负数也是真
```

这是真实 bug 的高发区：

```js
const input = '0';       // 用户输入了数字 0

if (input) {
  console.log('有输入');  // 会执行，因为 '0' 是真值
}

// 想判断"有没有填写"，应该先转数字再判断
const num = Number(input);
if (num) {
  console.log('是有效数字');
}
```

:::warn
不要用「真假值」判断数组或对象是否为空。`[]` 和 `{}` 都是 `true`。

判断空数组用 `arr.length === 0`，判断空对象用 `Object.keys(obj).length === 0`。
:::

## typeof：能做什么，不能做什么

`typeof` 返回一个字符串，表示值的类型：

```js
typeof 'abc';         // 输出: 'string'
typeof 42;            // 输出: 'number'
typeof true;          // 输出: 'boolean'
typeof undefined;     // 输出: 'undefined'
typeof 123n;          // 输出: 'bigint'
typeof Symbol();      // 输出: 'symbol'
typeof {};            // 输出: 'object'
typeof function () {};// 输出: 'function'
```

它有两个必须记住的坑：

```js
typeof null;          // 输出: 'object'   ← 坑 1
typeof [];            // 输出: 'object'   ← 坑 2
```

第一个是 JS 诞生时的历史 bug（早期用低位标记类型，`null` 的标记和对象撞了），因为太多老代码依赖这个行为，永远改不了。

第二个是因为数组本质上就是对象，`typeof` 分不出来。

### 正确的类型判断方式

| 想判断 | 正确写法 | 错误写法 |
| --- | --- | --- |
| 是不是 null | `value === null` | `typeof value === 'null'` |
| 是不是数组 | `Array.isArray(value)` | `typeof value === 'array'` |
| 是不是 NaN | `Number.isNaN(value)` | `value === NaN` |
| 是不是普通对象 | `typeof v === 'object' && v !== null && !Array.isArray(v)` | `typeof v === 'object'` |
| 是不是函数 | `typeof fn === 'function'` | — |
| 是不是数字 | `typeof v === 'number' && !Number.isNaN(v)` | `typeof v === 'number'` |

`typeof` 还有一个特殊行为：对一个**没有声明过**的变量使用它不会报错：

```js
typeof notDefined;    // 输出: 'undefined'，不报错

// 但直接使用会报错
console.log(notDefined);   // ReferenceError: notDefined is not defined
```

所以它常被用来做「这个变量存在吗」的安全检测。

## 类型转换

类型转换分两种：**显式**（你自己写的）和**隐式**（JS 自动做的）。原则是：**多用显式，少依赖隐式**。

### 显式转换

```js
Number('42');        // 输出: 42
Number('');          // 输出: 0      ← 空字符串是 0，注意
Number('  42  ');    // 输出: 42     前后空格会被忽略
Number('42px');      // 输出: NaN   整个字符串必须都能转
Number(true);        // 输出: 1
Number(false);       // 输出: 0
Number(null);        // 输出: 0
Number(undefined);   // 输出: NaN
```

`Number()` 要求「整个字符串都是合法数字」，所以带单位的字符串会失败。这时用 `parseInt` / `parseFloat`：

```js
parseInt('42px');          // 输出: 42     从左往右解析，遇到非数字就停
parseInt('3.9');           // 输出: 3      只取整数部分，不四舍五入
parseFloat('3.14元');      // 输出: 3.14
parseInt('abc');           // 输出: NaN    第一个字符就不合法

// 第二个参数是进制，处理其他进制时要写
parseInt('ff', 16);        // 输出: 255
```

字符串和布尔同理：

```js
String(42);           // 输出: '42'
String(null);         // 输出: 'null'
String(undefined);    // 输出: 'undefined'
(42).toString();      // 输出: '42'

Boolean(0);           // 输出: false
Boolean('0');         // 输出: true
```

### 隐式转换：`+` 是唯一的例外

所有算术运算符（`-` `*` `/` `%`）都会把两边转成数字，只有 `+` 特殊——**只要有一边是字符串，就变成拼接**：

```js
'2' + 1;          // 输出: '21'
1 + '2';          // 输出: '12'
'2' - 1;          // 输出: 1
'2' * '3';        // 输出: 6
'6' / '2';        // 输出: 3
1 + true;         // 输出: 2       true → 1
1 + null;         // 输出: 1       null → 0
1 + undefined;    // 输出: NaN     undefined → NaN
```

这就是为什么表单取到的值必须先转数字：

```js
// 用户在输入框里输入 10 和 20
const a = '10';
const b = '20';

console.log(a + b);        // 输出: '1020'   ← 拼起来了
console.log(Number(a) + Number(b));   // 输出: 30
```

### `==` 与 `===`

```js
1 == '1';            // 输出: true    宽松相等，先转类型再比
1 === '1';           // 输出: false   严格相等，类型不同直接 false

0 == false;          // 输出: true
0 === false;         // 输出: false

null == undefined;   // 输出: true
null === undefined;  // 输出: false

NaN === NaN;         // 输出: false
```

`==` 的规则复杂到反直觉：

```js
[] == false;        // 输出: true
'' == 0;            // 输出: true
'0' == false;       // 输出: true
```

所以规则很明确：**一律用 `===`**，唯一例外是 `value == null`（同时判断 null 和 undefined）。

:::tip
`===` 不比较对象内容。两个内容相同的对象用 `===` 比较永远是 `false`，因为它们不是同一块内存。对象比较留到第 7 章讲。
:::

## 值传递与引用传递

这是理解 JS 后面所有「诡异现象」的关键，值得慢一点看。

赋值时，原始类型复制的是**值本身**，对象复制的是**地址**。

```js
let a = 10;
let b = a;      // 把 10 这个值复制一份给 b
b = 20;
console.log(a); // 输出: 10，a 不受影响
```

```js
const obj1 = { count: 1 };
const obj2 = obj1;        // 把"地址"复制给 obj2，两个名字指向同一个对象

obj2.count = 99;
console.log(obj1.count);  // 输出: 99，因为根本就是同一个对象
```

可以把它想成两个钥匙牌写着同一个房间号：你在房间里搬走一把椅子，用另一把钥匙开门看到的也是空的。

函数传参同理：

```js
function change(num) {
  num = 100;
}
let x = 1;
change(x);
console.log(x);      // 输出: 1，原始类型不受影响

function changeObj(o) {
  o.count = 100;
}
const y = { count: 1 };
changeObj(y);
console.log(y.count); // 输出: 100，对象被改了
```

但重新赋值参数不会影响外面：

```js
function replace(o) {
  o = { count: 999 };   // 换了一个新对象，原来的没变
}
const z = { count: 1 };
replace(z);
console.log(z.count);   // 输出: 1
```

想真正复制一份对象：

```js
const original = { name: '小明', tags: ['a'] };

const shallow = { ...original };              // 浅拷贝：第一层独立，嵌套的还是共享
const deep = structuredClone(original);       // 深拷贝：完全独立

shallow.tags.push('b');
console.log(original.tags);   // 输出: ['a', 'b']  ← 浅拷贝没保护嵌套

deep.tags.push('c');
console.log(original.tags);   // 输出: ['a', 'b']  ← 深拷贝真正独立
```

`structuredClone` 是现代浏览器和 Node 17+ 自带的，不用装库。第 7 章会展开。

## 常见误区清单

| 写法 | 结果 | 为什么 |
| --- | --- | --- |
| `typeof null` | `'object'` | 历史 bug，判断 null 用 `=== null` |
| `typeof []` | `'object'` | 数组是对象，判断用 `Array.isArray` |
| `const arr = [1]; arr.push(2)` | 合法 | `const` 只禁止重新赋值，不禁止改内容 |
| `NaN === NaN` | `false` | NaN 不等于自身，用 `Number.isNaN` |
| `0.1 + 0.2 === 0.3` | `false` | 二进制精度误差，金额用整数分计算 |
| `'5' + 2` | `'52'` | `+` 遇字符串就拼接 |
| `Boolean('0')` | `true` | 非空字符串都是真值 |
| `if ([])` | 执行 | 空数组也是真值，用 `length === 0` 判断 |
| `Number('')` | `0` | 空字符串转数字是 0，不是 NaN |
| `let a = {}; let b = a; b.x = 1` | `a.x === 1` | 两个变量指向同一对象 |
| `const s = 'a'; s.toUpperCase()` | `s` 仍是 `'a'` | 字符串方法返回新值，不会修改原值 |
| 声明后不赋值就 `console.log` | `undefined` | 系统给的默认值 |

## 通勤自测

:::quiz 下面这段代码输出什么？
```js
const a = '3';
const b = 2;
console.log(a + b);
console.log(a - b);
```
第一条输出 `'32'`（字符串拼接），第二条输出 `1`（减法强制转数字）。同一个变量，运算符不同，结果类型完全不同。
:::

:::quiz `typeof null` 和 `typeof undefined` 分别是什么？
分别返回 `'object'` 和 `'undefined'`。前者是历史 bug；判断 null 要用 `value === null`，不能靠 typeof。
:::

:::quiz `const list = [1, 2]; list.push(3);` 会报错吗？如果会，为什么？如果不会，什么情况下才报错？
不会报错。`const` 限制的是「不能重新赋值」，即 `list = []` 才会报 `TypeError`。修改数组内容（`push`、`splice`、改下标）都是允许的。
:::

:::quiz 这段代码输出什么？
```js
let x = { n: 1 };
let y = x;
y.n = 2;
console.log(x.n);
```
输出 `2`。`y = x` 复制的是地址，两个变量指向同一个对象，改 `y` 就是改 `x`。
:::

:::quiz 为什么表单里 `'10' + '20'` 得到 `'1020'` 而不是 `30`？怎么改？
因为 `+` 遇到字符串会拼接。改法是先转数字：`Number(a) + Number(b)`，或 `parseFloat(a) + parseFloat(b)`。
:::

:::quiz 下面哪些值是 falsy？
`0`、`'0'`、`''`、`[]`、`null`、`undefined`、`NaN`、`{}`
falsy 的是 `0`、`''`、`null`、`undefined`、`NaN`。`'0'`（非空字符串）、`[]`（对象）、`{}`（对象）都是 truthy。
:::

:::quiz `0.1 + 0.2 === 0.3` 为什么是 false？金额计算该怎么写？
浮点数在二进制中无法精确表示 0.1 和 0.2，相加后有微小误差。金额建议以「分」为单位用整数运算，展示时再除以 100 并 `toFixed(2)`。
:::

:::quiz 下面这段代码，`user.name` 会变成什么？
```js
function reset(u) {
  u = { name: '新用户' };
}
const user = { name: '小明' };
reset(user);
console.log(user.name);
```
仍然是 `'小明'`。函数内部把参数 `u` 指向了一个新对象，并没有修改原来那个对象。这与 `u.name = '新用户'` 是两回事。
:::

## 动手练习（到电脑上做）

**必做**

1. 在浏览器控制台依次执行，把结果和你的预测对比：`typeof null`、`typeof []`、`typeof NaN`、`Number('42px')`、`parseInt('42px')`、`Number('')`。
   验收：能说出每一个结果的原因，特别是 `Number('')` 为什么是 `0`。

2. 写一个 `describe(value)` 函数，接收任意值，返回字符串说明它是 null、数组、普通对象、数字还是其他类型。要求 `describe(null)` 返回 `'null'`，`describe([])` 返回 `'array'`。
   验收：六个测试值（`null`、`[]`、`{}`、`1`、`'a'`、`undefined`）全部判断正确。

3. 模拟一个购物车金额计算：三件商品价格分别是 `19.9`、`29.9`、`0.1`，用「分」为单位求总和，再格式化输出 `¥79.90`。
   验收：输出精确等于 `¥79.90`，不出现 `79.90000000000001` 这类结果。

**进阶**

4. 写 `safeAdd(a, b)`：只要有一个参数不是有效数字（含 `'abc'`、`NaN`、`undefined`），就返回 `null`，否则返回两数之和。
   验收：`safeAdd('1', 2)` 返回 `3`；`safeAdd('abc', 1)` 返回 `null`；`safeAdd(undefined, 1)` 返回 `null`。

5. 用代码证明「浅拷贝不保护嵌套对象」：建一个带数组属性的对象，浅拷贝后修改数组，打印原对象，再用 `structuredClone` 做一次对比。
   验收：能解释两次输出为什么不同，并在注释里写清原因。

:::tip
这一章的每个坑，后面都会以新的形式再出现：`typeof` 的坑会在第 7 章判断对象时复现，引用传递会在第 6 章数组方法、第 15 章 DOM 操作里反复出现，「字符串方法不改原值」则是第 8 章的核心。

如果现在觉得 `null`、`undefined`、`NaN` 有点乱，不用硬背。先把「默认 `const`」「一律 `===`」「字符串方法要接住返回值」这三条变成肌肉记忆，其余的在后续章节里自然会熟悉。
:::
