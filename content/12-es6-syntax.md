---
id: 12
title: ES6+ 必会语法
summary: 解构、展开、模板字符串、默认参数、可选链、Set 与 Map、for...of，把现代 JS 里每天都会遇到的写法一次讲透。
minutes: 36
keywords: 解构 展开 剩余参数 模板字符串 默认参数 可选链 空值合并 Set Map 可迭代
---

> 前面十一章讲的是语言本身：变量、函数、对象、数组、作用域、原型。这一章换个角度，讲**写法**。
>
> 现代项目里，`const { name, age } = user` 这种代码比 `user.name` 还常见。这些语法不学，你读别人的代码会卡住，自己写也会又长又啰嗦。
>
> 这一章不引入太多新概念，主要是把第 6 章的数组、第 7 章的对象换一种更短的写法，再补上 `Set`、`Map` 和 `for...of`。学完你能把一段二十行的老代码压到五行，并且看懂主流项目里的绝大部分语法。

## 为什么需要它

先看一段真实项目里天天出现的代码。假设接口返回了这样一个对象：

```js
const response = {
  code: 0,
  data: {
    user: {
      id: 1024,
      name: '小明',
      profile: { city: '上海', tags: ['新用户'] },
    },
  },
};

// 老写法：一层层往下取
const user = response.data.user;
const id = user.id;
const name = user.name;
const city = user.profile.city;

console.log(id, name, city);   // 输出: 1024 小明 上海
```

四行代码只为了拿三个值。如果之后还要拿 `tags`，就得再加一行；如果产品经理说「再加个手机号」，你又得往上补。更麻烦的是，只要中间任何一层是 `undefined`，比如接口出错时 `data` 不存在，这四行里就有一行直接抛错，整个页面白屏。

用解构（destructuring）写，同样的事情只要一段：

```js
const {
  data: {
    user: { id, name, profile: { city } },
  },
} = response;

console.log(id, name, city);   // 输出: 1024 小明 上海
```

结果完全一样，但意图清楚得多：**我要从右边这个结构里，按形状掏出这几个值**。

这一章讲的就是这类语法。它们不会让程序跑得更快，但会让代码更短、更少出错，也让你能读懂别人写的代码。需要提醒一句：短不等于好。解构写到四五层深，读的人要在脑子里画一棵树，反而更难懂。后面每一节都会告诉你「什么时候该停」。

## 对象解构：按名字取值

最基本的用法，变量名和对象的键名一致：

```js
const user = { name: '小明', age: 18, city: '上海' };

const { name, age } = user;
console.log(name, age);      // 输出: 小明 18

const { email } = user;
console.log(email);          // 输出: undefined

const { name: userName, age: userAge } = user;
console.log(userName, userAge);   // 输出: 小明 18

const { city = '未知', email: mail = '未填写' } = user;
console.log(city, mail);     // 输出: 上海 未填写

const { nickname = '匿名' } = { nickname: null };
console.log(nickname);       // 输出: null
```

这一段里其实塞了四个知识点，逐个拆开看：

- **位置无所谓**。解构看的是键名，不是顺序，写 `const { age, name } = user` 结果一样。它也不会修改 `user`，只是把值复制到新变量里。
- **键不存在得到 `undefined`**，不会报错。这比 `user.email` 稍微安全一点，但也只保护了「这一层少个键」，没保护「上一层不存在」。
- **冒号是改名**。`{ name: userName }` 读作「把 `name` 这个键的值，装进 `userName` 这个变量」。注意它和对象字面量的方向正好相反：`{ name: userName }` 在字面量里是「键叫 `name`，值是 `userName` 变量」，在解构里是「从 `name` 取值，存进 `userName`」。
- **默认值只在 `undefined` 时生效**。`city` 有值，默认值不参与；`email` 不存在，触发默认值；`nickname` 是 `null`，不触发。

最后一条必须记死：**`null`、`0`、`''`、`false` 都不会触发默认值**。第 13 章讲可选链时还会再遇到同一个规则，因为它们是同一套设计。

如果你的接口会用 `null` 表示「用户明确清空了昵称」，这个行为正是你要的；如果它用 `null` 表示「没填」，你就得自己再兜一层，写成 `nickname ?? '匿名'`。

为什么要改名？最常见的原因是避免冲突：

```js
const { name } = user;
const { name: productName } = product;   // 两个 name 不能同时存在
```

### 嵌套解构：注意中间层

```js
const order = {
  id: 'A001',
  buyer: { name: '小红', address: { city: '杭州' } },
};

const { buyer: { address: { city } } } = order;
console.log(city);   // 输出: 杭州

const user2 = { name: '小明' };

// const { address: { city } } = user2;
// TypeError: Cannot destructure property 'city' of 'user2.address' as it is undefined.

const { address: { city: city2 } = {} } = user2;
console.log(city2);   // 输出: undefined
```

这样写能一层层钻进去，代价是脆弱。`= {}` 的作用是：`address` 是 `undefined` 时，用空对象顶上，于是 `city` 解构的是 `{}`，得到 `undefined`。注意默认值挂在 `address` 这一层的**大括号后面**，不是挂在 `city` 后面。

:::warn
嵌套解构超过两层，基本就该换成可选链了：

`const city = order.buyer?.address?.city ?? '未知';`

它更短，也不会因为中间层缺失而抛错。解构适合「结构稳定、我确定它有」的场景；可选链适合「数据可能残缺」的场景。这两种场景在真实项目里都有，别只背一种。
:::

### 函数参数解构：最实用的场景

这是解构出现频率最高的地方。当函数要接收一个配置对象时：

```js
function createButton({ text, type = 'primary', disabled = false }) {
  const attr = disabled ? ' disabled' : '';
  return `<button class="${type}"${attr}>${text}</button>`;
}

console.log(createButton({ text: '提交' }));
// 输出: <button class="primary">提交</button>

// 老写法：函数体里全是 options.xxx
function createButtonOld(options) {
  const text = options.text;
  const type = options.type || 'primary';
  const disabled = options.disabled || false;
  return { text, type, disabled };
}

// createButton();  // TypeError: Cannot destructure property 'text' of 'undefined'

function createButtonSafe({ text = '按钮' } = {}) {
  return text;
}
console.log(createButtonSafe());   // 输出: 按钮
```

新写法把「我需要哪些字段、默认值是什么」全部写在参数列表里，读函数签名就知道怎么调用，不用再翻函数体。

但有一个坑：不传参数时会报错。`= {}` 是给「整个参数」兜底，`text = '按钮'` 是给「text 这个字段」兜底，两层都要有，少一层就会在某种调用方式下崩。

## 数组解构：按位置取值

数组没有键名，所以解构按**位置**对应：

```js
const rgb = [255, 128, 0];
const [red, green, blue] = rgb;
console.log(green);   // 输出: 128

const [first, , third] = ['a', 'b', 'c'];
console.log(first, third);   // 输出: a c

let a = 1;
let b = 2;
[a, b] = [b, a];
console.log(a, b);   // 输出: 2 1

const [best, ...others] = [88, 92, 76, 95];
console.log(best, others);   // 输出: 88 [92, 76, 95]
```

四个用法：

- 按位置取名，和变量名无关。
- 中间那个空位就是一个逗号，表示「这个位置的元素我不要」。处理「函数返回多个值」时很好用，比如正则匹配结果、坐标对。
- 交换变量不用临时变量：右边先造出一个新数组 `[2, 1]`，左边再按位置拆开赋值。
- `...others` 把「剩下的所有元素」收进一个**新数组**。它必须放在最后，写 `const [a, ...rest, b]` 是语法错误——因为「剩下」没法定义到哪结束。

:::warn
交换变量的那一行如果出现在上一行没有分号的语句后面，会出问题：

```js
let x = 1
let y = 2
[x, y] = [y, x]   // 报错：被解析成 let y = 2[x, y] = [y, x]
```

JS 的自动分号插入（ASI）会把 `[` 当成上一行的延续——「对 `2` 取下标」。这类错误很难一眼看出来。习惯上，**以 `[` 或 `(` 开头的行，前面那一行必须写分号**。这也是很多团队强制写分号的原因之一。
:::

## 展开运算符：把一个拆成多个

还是这三个点 `...`，换一个位置，含义就变了。先看数组：

```js
const a = [1, 2];
const b = [3, 4];

const copy = [...a];
const merged = [...a, ...b, 5];
console.log(copy, merged);     // 输出: [1, 2] [1, 2, 3, 4, 5]

const nums = [3, 9, 4, 7];
console.log(Math.max(...nums));   // 输出: 9
console.log(Math.max(nums));      // 输出: NaN

console.log([...'abc']);          // 输出: ['a', 'b', 'c']
```

`copy` 那一步很重要。第 2 章讲过，`const c = a` 只是多了一个名字指向同一个数组，改 `c` 会影响 `a`；`[...a]` 才是真的造了一个新数组。

`Math.max` 的签名是 `Math.max(a, b, c, ...)`，它只接收多个参数，不认数组。`...nums` 等于把数组拆成 `3, 9, 4, 7` 四个独立参数。这是初学者非常容易踩的一个坑，报错还不明显——不报错，只是返回 `NaN`。

字符串也能展开，因为字符串是可迭代的。对象也能用，规则是**后面的覆盖前面的**：

```js
const defaults = { theme: 'light', fontSize: 14, lang: 'zh' };
const options = { theme: 'dark' };

const config = { ...defaults, ...options };
console.log(config);
// 输出: { theme: 'dark', fontSize: 14, lang: 'zh' }

const original = { name: '小明', tags: ['a'] };
const copied = { ...original };
copied.tags.push('b');
console.log(original.tags);   // 输出: ['a', 'b']，浅拷贝
```

把顺序反过来，`{ ...options, ...defaults }`，`theme` 就会变回 `'light'`。所以「默认值 + 用户配置」的标准写法永远是**默认值在前，用户配置在后**。

同时注意最后两行：展开是浅拷贝。第 2 章讲过这一点，但对象展开太常用，值得再提醒一次。嵌套的数组或对象还是共享的，要真正独立用 `structuredClone`。

## 同一个 `...`，两种身份

初学者最容易糊涂的地方：`...` 有时叫展开（spread），有时叫剩余（rest），长得一模一样。判断方法只有一个——**看它出现在「接收」的位置还是「提供」的位置**。

```js
// 函数参数里：接收 → 剩余参数，收集成一个数组
function sum(...nums) {
  return nums.reduce((total, n) => total + n, 0);
}
console.log(sum(1, 2, 3));   // 输出: 6

// 函数调用里：提供 → 展开，把数组拆成多个参数
const nums2 = [1, 2, 3];
console.log(sum(...nums2));  // 输出: 6
```

整理成表：

| 出现位置 | 名字 | 作用 | 结果 |
| --- | --- | --- | --- |
| `function f(...args)` | 剩余参数 | 把多余实参收集起来 | 数组 |
| `f(...arr)` | 展开 | 把数组拆成一个个实参 | 多个参数 |
| `[...arr, 9]` | 展开 | 拆开后放进新数组 | 新数组 |
| `const [a, ...rest]` | 剩余 | 收集剩下的元素 | 数组 |
| `{ ...obj }` | 展开 | 复制自有可枚举属性 | 新对象 |

记法：**左边接收就是收集，右边提供就是拆开**。函数参数、解构的左边都是接收；调用、字面量的右边都是提供。

## 模板字符串

第 2 章提过一句，这里正式讲。模板字符串用反引号，最大的作用是插值和多行。

```js
const name = '小明';
const score = 92;

const msg = `${name} 这次考了 ${score} 分，${score >= 90 ? '优秀' : '继续加油'}`;
console.log(msg);   // 输出: 小明 这次考了 92 分，优秀

const html = `
  <div class="card">
    <h3>${name}</h3>
  </div>
`;

const fruits = ['苹果', '香蕉'];
const list = `<ul>${fruits.map(item => `<li>${item}</li>`).join('')}</ul>`;
console.log(list);   // 输出: <ul><li>苹果</li><li>香蕉</li></ul>
```

`${}` 里面可以放任何表达式：变量、运算、三元、函数调用。这让拼字符串从「加号拼接」变成「往句子里填空」。表达式里还能再套模板字符串，做列表拼接时很常见。

:::warn
模板字符串会**原样保留换行和缩进**。上面那段 `html` 的开头有一个换行，每行前面有两个空格，它们都是字符串的一部分。拼 HTML 时通常无所谓，但如果你拿它和另一个字符串做相等比较，就会因为多一个空格而不相等。需要去掉首尾空白，用 `.trim()`。
:::

还有一种「标签模板（tagged template）」，就是函数名后面直接跟模板字符串，写成 `` tag`你好，${name}` ``。函数收到的是「固定文字数组 + 插值数组」，React 的 `styled-components`、GraphQL 的 `gql` 都靠它实现。日常业务几乎用不到，看到时知道是怎么回事就行。

## 属性简写、方法简写与计算属性名

当变量名和键名相同时，可以只写一个：

```js
const name = '小明';
const age = 18;

const user = { name, age };
console.log(user);   // 输出: { name: '小明', age: 18 }

const counter = {
  count: 0,
  increment() {          // 等价于 increment: function () {}
    this.count += 1;
    return this.count;
  },
};
console.log(counter.increment());   // 输出: 1

const field = 'email';
const form = {
  [field]: 'a@b.com',
  [`${field}Verified`]: false,
};
console.log(form);
// 输出: { email: 'a@b.com', emailVerified: false }
```

属性简写不是什么魔法，就是 `{ name: name, age: age }` 的缩写。

方法简写和箭头函数**不等价**：方法简写里的 `this` 指向调用它的对象，箭头函数的 `this` 来自外层。第 10 章讲过 `this`，忘了的话回去看一眼，这里不重复。

计算属性名（computed property）让你用变量的值当键。方括号里可以放任何表达式，做表单、做「根据用户角色生成不同字段」时很有用。不写方括号的话，`field: ...` 会得到一个真的叫 `field` 的键，这是常见笔误。

## 默认参数：`undefined` 才触发

函数的默认参数（default parameter）和解构默认值是同一套规则：

```js
function greet(name = '陌生人') {
  return `你好，${name}`;
}

console.log(greet());            // 输出: 你好，陌生人
console.log(greet(undefined));   // 输出: 你好，陌生人
console.log(greet(null));        // 输出: 你好，null
console.log(greet(''));          // 输出: 你好，

function greetOld(name) {
  name = name || '陌生人';
  return `你好，${name}`;
}
console.log(greetOld(''));       // 输出: 你好，陌生人
```

四个调用的结果值得逐个看：

- 不传参，`name` 是 `undefined`，触发默认值。
- 显式传 `undefined`，**同样触发**默认值。
- 传 `null`，不触发，`null` 被原样使用。
- 传空字符串，不触发，只是拼出来后面什么都没有。

对比老写法 `name = name || '陌生人'`，差别就出来了：`''` 被吃掉了，换成了默认值。如果业务上「空字符串」是合法输入（比如用户清空了昵称），老写法会悄悄换成默认值，新写法不会。这就是为什么现代代码更愿意用默认参数而不是 `||`。

`let` 和 `const` 第 2 章讲得很细了，这里只留一句：**默认 `const`，需要重新赋值才用 `let`，不要用 `var`**。这一章后面的例子会一直遵守这个习惯。

## 可选链 `?.` 与空值合并 `??`

这两个运算符是处理「数据可能不存在」的标配，几乎每个项目都有。

### 可选链：遇到 null 就停下

```js
const user = {
  name: '小明',
  profile: { city: '上海' },
};

console.log(user.profile?.city);   // 输出: 上海
console.log(user.address?.city);   // 输出: undefined

const list = null;
console.log(list?.[0]);            // 输出: undefined

const obj = { save() { return '已保存'; } };
console.log(obj.save?.());         // 输出: 已保存
console.log(obj.remove?.());       // 输出: undefined

// console.log(user.address.city);
// TypeError: Cannot read properties of undefined (reading 'city')
```

三种写法对应三种访问：`?.` 取属性、`?.[]` 取下标、`?.()` 调函数。共同点是：**左边是 `null` 或 `undefined` 时，整个表达式直接返回 `undefined`，后面的访问不再执行**。不加问号的那一行，就是线上最常见的报错之一：数据少一层，页面就白。

:::warn
可选链只对 `null` 和 `undefined` 短路。`0`、`''`、`false` 都会继续往下走，这是对的，因为它们本身是合法值。

但它**不会吞掉别的错误**：`user.profile?.city.toUpperCase()` 里如果 `city` 不存在，访问 `.toUpperCase` 时照样报错。可选链要写在真正可能为空的那一层。
:::

### 空值合并：只认 null 和 undefined

```js
const count = 0;
const text = '';

console.log(count || 10);     // 输出: 10
console.log(count ?? 10);     // 输出: 0
console.log(text || '默认');   // 输出: 默认
console.log(text ?? '默认');   // 输出: ''（空字符串）

const config = { page: 0 };
console.log(config.page || 1);   // 输出: 1
console.log(config.page ?? 1);   // 输出: 0
```

`||` 判断的是「真假值」，`0`、`''`、`false`、`NaN` 全算假，都会被替换掉。`??` 判断的是「是不是空」，只有 `null` 和 `undefined` 会被替换。

| 值 | 用逻辑或取默认 | 用空值合并取默认 |
| --- | --- | --- |
| `0` | 被替换成默认值 | 保留 `0` |
| 空字符串 | 被替换 | 保留空字符串 |
| `false` | 被替换 | 保留 `false` |
| `NaN` | 被替换 | 保留 `NaN` |
| `null` | 被替换 | 被替换 |
| `undefined` | 被替换 | 被替换 |

真实场景：配置里的 `page` 默认是 1，但用户可以传 0 表示「从第 0 条开始」。用 `||` 会把合法的 0 换成 1，分页就错了；用 `??` 才保留 0。

:::warn
`??` 不能和 `||`、`&&` 直接混用，`a ?? b || c` 是语法错误。要么加括号 `(a ?? b) || c`，要么分成两步。这条规则存在的意义就是逼你想清楚优先级，别嫌麻烦。
:::

## Set 与 Map

数组和对象用得最多，但有两种需求它们做起来别扭：**去重**和**用对象当键**。

### Set：不重复的集合

```js
const tags = ['js', 'node', 'js', 'ts', 'node'];
const unique = [...new Set(tags)];
console.log(unique);              // 输出: ['js', 'node', 'ts']

const set = new Set(['a', 'b']);
set.add('c');
console.log(set.has('b'));        // 输出: true
set.delete('a');
console.log(set.size, [...set]);  // 输出: 2 ['b', 'c']

console.log(new Set([NaN, NaN]).size);            // 输出: 1
console.log(new Set([{ a: 1 }, { a: 1 }]).size);  // 输出: 2
```

`new Set(数组)` 会自动丢掉重复项，再展开回数组，这是最短的去重写法。`Set` 没有下标，不能用 `set[0]`，要取值就展开成数组，或者用 `for...of` 遍历。判断「存在吗」用它比数组快得多：`Set.has` 是常数时间，数组的 `includes` 要一个个比。

最后两行是两个容易误解的细节。`Set` 判断重复用的是「同值零」比较，`NaN` 等于自己，所以只剩一个；但对象比的是**引用**，内容一样也没用，所以是两个。这和 `===` 的行为一致（第 2 章讲过）。

### Map：键可以是任何东西

普通对象的键会被强制转成字符串：

```js
const o = {};
o[1] = 'a';
o[true] = 'b';
console.log(Object.keys(o));   // 输出: ['1', 'true']

const map = new Map();
const key = { id: 1 };

map.set(key, '对象作键的值');
map.set('name', '小明');

console.log(map.get(key));         // 输出: 对象作键的值
console.log(map.get({ id: 1 }));   // 输出: undefined，不是同一个对象
console.log(map.size);             // 输出: 2

for (const [k, v] of map) {
  console.log(k, v);
}
// 输出:
// { id: 1 } 对象作键的值
// name 小明
```

数字 `1` 变成了字符串 `'1'`。如果你要用对象、函数、数字当键，并且不想被转换，就用 `Map`。

`map.get({ id: 1 })` 拿不到值，因为那是新建的另一个对象。这一点和 `Set` 一样：**对象按引用比较**。所以用对象当键时，一定要把那个对象存好，不能每次现造一个。

`Map` 会保留插入顺序，`size` 直接拿数量，这两点普通对象都给不了（对象取数量要 `Object.keys(obj).length`，顺序在数字键上还会被重排）。

### 怎么选

| 需求 | 用什么 | 原因 |
| --- | --- | --- |
| 数组去重 | `Set` | 自动保证唯一 |
| 频繁判断「存在吗」 | `Set` | `has` 比数组 `includes` 快 |
| 键是对象或数字 | `Map` | 普通对象会把键转成字符串 |
| 频繁增删、要顺序、要数量 | `Map` | 保留插入顺序，`size` 直接读 |
| 按下标访问、要 `map` / `filter` | 数组 | `Set` / `Map` 没有这些方法 |
| 存一条结构化数据、要转 JSON | 普通对象 | 字面量方便，`JSON.stringify` 友好 |

一句话：`Set` 管「有没有」，`Map` 管「谁对应谁」，数组管「一串有序的东西」，对象管「一条有字段的记录」。别为了显得高级，把所有东西都塞进 `Map`。

## `for...of` 与「可迭代」

`for...of` 用来遍历「可迭代对象（iterable）」的值：

```js
const fruits = ['apple', 'banana'];
for (const fruit of fruits) {
  console.log(fruit);
}
// 输出:
// apple
// banana

const user = { name: '小明', age: 18 };
// for (const v of user) {}   // TypeError: user is not iterable

for (const key of Object.keys(user)) {
  console.log(key, user[key]);
}
// 输出:
// name 小明
// age 18

for (const key in user) {
  console.log(key);   // 输出: name、age
}
```

它和 `for` 循环的区别是：不用管下标，不会越界，也不会因为 `length` 写错而多跑一次。

另外，`for...of` 支持 `break` 和 `continue`，而数组的 `forEach` 不支持——想中途跳出循环时，只能用它或普通 `for`。这个差别在「找到第一个符合条件的就停下」这类需求里很实际。

但普通对象不能用。原因在于「可迭代」是一个约定：对象上要有一个叫 `Symbol.iterator` 的方法，`for...of` 靠调用它来一个个取值。数组、字符串、`Set`、`Map`、`NodeList` 都实现了这个约定，普通对象没有。

第 15 章会用到这一点：`document.querySelectorAll` 返回的 `NodeList` 是可迭代的，所以能直接 `for...of`，也能用 `[...]` 转成数组。

那 `for...in` 呢？它遍历的是**键名**，而且会顺着原型链把继承来的可枚举属性也带上，所以业务代码里基本不用。看到别人用 `for...in` 遍历对象，先怀疑一下是不是想要 `Object.keys`。

## `Array.from` 与 `Object.entries` 配合解构

`Array.from` 把「类数组或可迭代的东西」转成真正的数组：

```js
console.log(Array.from('abc'));   // 输出: ['a', 'b', 'c']
console.log(Array.from({ length: 3 }, (_, i) => i));   // 输出: [0, 1, 2]

const prices = { apple: 5, banana: 3 };

for (const [name, price] of Object.entries(prices)) {
  console.log(`${name}: ${price} 元`);
}
// 输出:
// apple: 5 元
// banana: 3 元

const doubled = Object.fromEntries(
  Object.entries(prices).map(([key, value]) => [key, value * 2])
);
console.log(doubled);   // 输出: { apple: 10, banana: 6 }
```

`Array.from` 的第二个参数是映射函数，`_` 表示「第一个参数（当前值）我不用」，`i` 是下标，这个写法常用来快速造一个 `[0, 1, 2, ...]` 的序列。

`Object.entries` 把对象变成 `[键, 值]` 的数组，再配合解构，遍历对象就非常顺。它还能和 `Object.fromEntries` 配对，做「对每个值加工后再变回对象」。

这一组操作在真实项目里出现频率很高：统计、过滤配置、批量改价格，都是这个套路。第 17 章做项目时会再见到。

## 常见误区清单

这张表建议先扫一遍，遇到对应写法再回来查。真正要记的是「为什么」那一列——知道原因，下次遇到变形也能自己推出来。

| 写法 | 结果 | 为什么 |
| --- | --- | --- |
| `const { a = 1 } = { a: null }` | `a` 是 `null` | 默认值只认 `undefined` |
| `const { a: { b } } = {}` | 抛 `TypeError` | 中间层不存在，要在 `a` 这层写 `= {}` |
| 上一行不写分号就写 `[a, b] = [b, a]` | 报错或结果异常 | 被解析成对上一行结果取下标 |
| `const [a, ...rest, b] = arr` | `SyntaxError` | 剩余元素必须放最后 |
| `Math.max([1, 5, 3])` | `NaN` | 它要多个参数，不接收数组 |
| `{ ...a, ...b }` 有同名键 | 后者覆盖前者 | 按书写顺序合并 |
| 展开对象后修改嵌套属性 | 原对象也变 | 展开是浅拷贝 |
| `0` 用逻辑或取默认值 | 得到默认值 | `0` 是假值，要保留它得用 `??` |
| `for (const v of { a: 1 })` | `TypeError` | 普通对象没有迭代器 |
| `new Set([{ a: 1 }, { a: 1 }])` 的 `size` | `2` | 对象按引用比较 |
| 解构参数不写 `= {}` 又不传参 | `TypeError` | 对 `undefined` 做了解构 |

## 通勤自测

:::quiz 下面这段输出什么？
```js
const { a = 1, b = 2 } = { a: null };
console.log(a, b);
```
输出 `null 2`。`a` 的值是 `null`，不触发默认值；`b` 的键不存在，值是 `undefined`，触发默认值。
:::

:::quiz 下面这段输出什么？
```js
const [x, , y, ...rest] = [1, 2, 3, 4, 5];
console.log(y, rest);
```
输出 `3 [4, 5]`。第二个位置用空逗号跳过，`y` 取到 3，`rest` 收走剩下的 4 和 5。
:::

:::quiz `Math.max(...[2, 8, 5])` 和 `Math.max([2, 8, 5])` 结果分别是什么？
分别是 `8` 和 `NaN`。前者把数组展开成三个参数；后者把整个数组当成一个参数，无法转成数字，得到 `NaN`。
:::

:::quiz 下面这段输出什么？
```js
const count = 0;
const a = count || 5;
const b = count ?? 5;
console.log(a, b);
```
输出 `5 0`。`||` 把 `0` 当假值替换掉了；`??` 只替换 `null` 和 `undefined`，`0` 被保留。
:::

:::quiz `[...new Set('banana')].join('')` 输出什么？
输出 `'ban'`。字符串被展开成单个字符，`Set` 去重后剩 `b`、`a`、`n`，再拼回字符串。
:::

:::quiz 下面这段输出什么？
```js
const obj = { a: 1 };
const copy = { ...obj, a: 2 };
console.log(obj.a, copy.a);
```
输出 `1 2`。展开创建了新对象，后面的 `a: 2` 覆盖了展开进来的 `a`，原对象不受影响。
:::

:::quiz 为什么 `for (const item of { name: 'x' })` 会报错？怎么改？
普通对象没有实现迭代器，`for...of` 只接受可迭代对象。改成 `for (const key of Object.keys(obj))`，或者用 `Object.entries` 拿键值对。
:::

:::quiz 默认参数能引用前面的参数吗？`function make({ a = 1, b = a + 1 } = {})` 调用 `make()` 返回什么？
能。默认参数的表达式在调用时按从左到右求值，`b` 可以使用已经初始化的 `a`，所以返回 `[1, 2]`。
:::

## 动手练习（到电脑上做）

**必做**

1. 写 `formatUser(response)`，从 `{ data: { user: { id, name, profile } } }` 里用解构取出 `id`、`name`、`profile.city`，`city` 缺失时返回 `'未知'`，最后返回一行字符串。
   验收：`formatUser({ data: { user: { id: 1, name: '小明' } } })` 返回 `1 小明 未知`；`data` 整个缺失时也不抛错，返回 `null`。

2. 用 `Set` 写三个函数：`unique(arr)` 去重、`intersect(a, b)` 求交集、`union(a, b)` 求并集。
   验收：`unique([1, 1, 2])` 返回 `[1, 2]`；`intersect([1, 2, 3], [2, 3, 4])` 返回 `[2, 3]`；三个函数都不修改传入的数组。

3. 写一个 `sumByCategory(orders)`，输入 `[{ category: 'food', price: 30 }, ...]`，用 `Object.entries`、解构和 `for...of` 输出每个分类的总额。
   验收：同类订单正确累加，输出顺序与首次出现顺序一致。

**进阶**

4. 写 `mergeConfig(defaults, userConfig)`，合并两份配置。要求用户传 `theme: null` 时表示「明确清空」，不能被默认值覆盖；用户传 `page: 0` 时保留 `0`。
   验收：`mergeConfig({ theme: 'light', page: 1 }, { theme: null })` 得到 `theme` 为 `null`；传入 `page: 0` 时结果里是 `0` 而不是 `1`。

5. 把一段老式代码改成现代写法：用 `for` 循环加下标拼一张 HTML 商品列表，改成 `Object.entries` + 数组解构 + 模板字符串，并且用 `Set` 对商品标签去重。
   验收：输出与原来完全一致；代码里不出现 `for (let i = 0; ...)`；标签重复时结果里只出现一次。

:::tip
这一章是「语法工具包」，真正用起来是在后面：第 13 章的 Promise 结果常用数组解构接，第 15 章会把 `querySelectorAll` 的结果展开成数组再 `map`，第 16 章处理接口返回的嵌套对象时，可选链和 `??` 几乎每行都有。

不用背表格。先做到两件事：看到 `{ a = 1 }` 能立刻想到「只认 undefined」，看到 `...` 能分清是收集还是展开。剩下的会在项目里自然熟练。
:::
