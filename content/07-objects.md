---
id: 07
title: 对象与 JSON
summary: 把一组相关数据装进对象，讲清属性访问、遍历、解构、浅拷贝与深拷贝，以及 JSON 转换时悄悄消失的字段。
minutes: 36
keywords: 对象 属性 JSON stringify parse 浅拷贝 深拷贝 展开 可选链 引用
---

> 第 6 章用数组装「一列数据」，这一章用对象（object）装「一个东西的多个字段」。
>
> 接口返回的是对象，配置项是对象，页面上的一个用户、一件商品、一条订单，也全都是对象。不会对象，就没法处理真实数据。
>
> 学完这一章，你应该能安全地读取嵌套数据、遍历对象的键值、复制一份不被别人改坏的数据，并且知道 JSON 转换时哪些东西会消失。

## 为什么需要它

假设你要描述一个用户，最直接的做法是每个字段起一个变量：

```js
const userName = '小明';
const userAge = 18;
const userCity = '上海';

function greet(name, age, city) {
  return `${name} 今年 ${age} 岁，住在 ${city}`;
}

console.log(greet(userName, userAge, userCity));
// 输出: 小明 今年 18 岁，住在上海
```

字段少的时候还行，字段一多就开始失控。函数参数会变成 `greet(name, age, city, phone, email, isVip)`，调用时只要顺序错一位，数据就全串了。更麻烦的是，这五个变量之间没有任何「它们属于同一个人」的联系，删除或传递时很容易漏掉一个。

对象（object）解决的就是这件事：**把描述同一个东西的多个字段，收进一个带名字的容器**。

```js
const user = { name: '小明', age: 18, city: '上海' };

function greet(user) {
  return `${user.name} 今年 ${user.age} 岁，住在 ${user.city}`;
}

console.log(greet(user));   // 输出: 小明 今年 18 岁，住在上海
```

现在函数只接收一个参数，字段按名字取，不靠位置。以后要加一个 `phone` 字段，调用方式完全不用改，只要在函数里按需读取 `user.phone` 就行。

对象还让数据的边界变清楚。一个 `user` 对象就是一份完整的用户快照，存进数组、传给函数、写进缓存，都是一个整体，不会出现只传了名字、忘了年龄的情况。后面做表单、列表、详情页，本质上都是在搬运和修改这样的对象。

数组和对象的区别，可以这样理解：数组用**顺序**找东西，第 0 个、第 1 个；对象用**名字**找东西，`name`、`age`。一列同类数据用数组，一个东西的多个属性用对象。真实数据往往是两者套在一起：一个对象里有数组，数组里又是对象，第 6 章的订单例子就是这样。

接口返回的数据更能说明问题。典型结构是 `{ code: 0, message: 'ok', data: { list: [ ... ], total: 20 } }`：最外层是一个对象，`data` 又是一个对象，`list` 是数组，数组里每一项还是对象。读这种数据要先看层级，再决定用点、方括号还是数组方法，不能一上来就乱取。

## 创建对象：字面量与属性名

最常用的是对象字面量（object literal），用一对大括号包住键值对：

```js
const user = {
  name: '小明',
  age: 18,
  isVip: false,
  tags: ['前端', '在读'],
  address: { city: '上海', district: '浦东' },
  'favorite-color': 'blue',
  '喜欢的食物': '饺子',
};
```

键（key）和值（value）之间用冒号，多个属性之间用逗号。值的类型不限：字符串、数字、布尔、数组、另一个对象都可以。`address` 又是一个对象，这叫嵌套对象（nested object），接口数据几乎都长这样。

属性名一般是合法的标识符，可以直接写。带空格、连字符，或者以数字开头时，**必须加引号**，否则语法直接报错。中文键在多数引擎里不加引号也能跑，但建议统一加引号，既避免和变量名混淆，也让风格一致。

访问这类带特殊字符的键，不能用点，只能用方括号：

```js
console.log(user['favorite-color']);   // 输出: blue
console.log(user['喜欢的食物']);        // 输出: 饺子
```

如果写 `user.favorite-color`，JS 会把它理解成 `user.favorite` 减去 `color`，得到一个 `NaN` 或者直接报错。

### 属性简写与计算属性

当变量名和属性名相同时，可以只写一个名字：

```js
const name = '小明';
const age = 18;

const user = { name, age };
console.log(user);   // 输出: { name: '小明', age: 18 }

const field = 'level';
const data = { [field]: 3 };
console.log(data);   // 输出: { level: 3 }
```

`{ name, age }` 是 `{ name: name, age: age }` 的简写。这种写法在函数返回对象时特别常见。

方括号包住变量名，叫计算属性名（computed property）。`[field]` 会先求出 `field` 的值 `'level'`，再把它当作属性名。动态生成键时只能这样写，不能写成 `{ field: 3 }`，那会得到一个名字就叫 `field` 的属性。

## 点访问与方括号访问

读取属性有两种写法，大部分时候可以互换：

```js
const user = { name: '小明', age: 18, 'favorite-color': 'blue' };

console.log(user.name);                // 输出: 小明
console.log(user['age']);              // 输出: 18
console.log(user['favorite-color']);   // 输出: blue

const key = 'age';
console.log(user[key]);                // 输出: 18
console.log(user.key);                 // 输出: undefined
```

最后两行是关键区别。`user.key` 永远去找一个名字叫 `"key"` 的属性，和变量 `key` 没有关系；`user[key]` 会先取出变量 `key` 的值 `"age"`，再去找 `age` 属性。

选择规则只有一条：**键名是写死的，用点；键名存在变量里，用方括号**。

```js
const user = { name: '小明' };
const field = 'email';

user[field] = 'a@b.com';   // 动态键，必须方括号
console.log(user.email);   // 输出: a@b.com
console.log(user.name);    // 输出: 小明
```

读配置时这个区别尤其明显。配置项的键通常写死，用 `config.theme` 一眼就知道在读什么；而表单字段、表格列、接口返回的动态字段，键往往来自变量，只能用 `config[key]`。如果这里写成 `config.key`，读到的永远是名为 `key` 的那个属性，不是变量里的字段名。

| 场景 | 写法 | 例子 |
| --- | --- | --- |
| 固定属性名 | 点访问 | `user.name` |
| 键名在变量里 | 方括号 | `user[key]` |
| 键名含空格或连字符 | 方括号 | `user['favorite-color']` |
| 键名是数字 | 方括号 | `list[0]` |

## 增、改、删与读取不存在的属性

对象的属性可以随时增加、修改、删除：

```js
const user = { name: '小明', age: 18 };

user.city = '上海';         // 新增
user.age = 19;              // 修改
delete user.city;           // 删除

console.log(user);          // 输出: { name: '小明', age: 19 }
console.log(user.city);     // 输出: undefined
```

读取不存在的属性不会报错，返回 `undefined`。但如果你在 `undefined` 上继续读下一层，就会炸：

```js
const user = { name: '小明' };
console.log(user.address.city);
// TypeError: Cannot read properties of undefined (reading 'city')
```

原因是 `user.address` 先得到 `undefined`，再对 `undefined` 取 `.city`，相当于让一个不存在的对象交出属性。嵌套数据必须逐层确认，或者用后面讲的可选链。

`delete` 会删除整个键值对，成功时返回 `true`。日常业务里很少真的删字段，更常见的做法是把值设成 `null`，保留字段结构，让下游知道「这个字段存在，但暂时没有值」。

:::warn
`const` 声明的对象依然可以增删改属性。`const` 锁的是「这个名字不能指向别的对象」，不是「对象内容不能变」。`user = {}` 会报错，`user.name = '小红'` 不会。第 2 章讲过这一点，处理接口数据时每天都会遇到。
:::

## in 与 hasOwnProperty：判断属性是否存在

想知道某个键在不在对象里，有两个常用写法，但它们的范围不同：

```js
const user = { name: '小明' };

console.log('name' in user);                   // 输出: true
console.log('toString' in user);               // 输出: true
console.log(user.hasOwnProperty('name'));      // 输出: true
console.log(user.hasOwnProperty('toString'));  // 输出: false
console.log(Object.hasOwn(user, 'toString'));  // 输出: false
```

`in` 会沿着原型链（prototype chain）往上找，所以 `toString` 这种从 `Object.prototype` 继承来的方法也会被算作「存在」。`hasOwnProperty` 和 `Object.hasOwn` 只看对象自己身上的属性，不查原型。

大部分业务判断想问的是「这个对象自己有没有这个字段」，所以应该用 `Object.hasOwn`。它是较新的写法，比 `user.hasOwnProperty(...)` 更安全，因为对象自己也可能有一个叫 `hasOwnProperty` 的字段，把方法覆盖掉。

原型链是什么，第 11 章会展开。现在记住结论：**判断自有字段用 `Object.hasOwn`，`in` 会把继承来的也算进去**。这个差别不只影响 `toString`，数组的 `push`、`map` 也并不在数组自己身上，`'push' in []` 同样是 `true`。用 `in` 判断「这个对象有没有某个业务字段」时，很容易被这些内置方法误导。

## 遍历对象：keys、values、entries

数组用下标遍历（iteration），对象没有下标，要先拿到键、值或者键值对。三个方法分别给你这三种东西：

```js
const user = { name: '小明', age: 18, city: '上海' };

console.log(Object.keys(user));     // 输出: ['name', 'age', 'city']
console.log(Object.values(user));   // 输出: ['小明', 18, '上海']
console.log(Object.entries(user));  // 输出: [['name', '小明'], ['age', 18], ['city', '上海']]
```

拿到数组之后，第 6 章的方法就都能用了。比如 `const scores = { 语文: 90, 数学: 95, 英语: 88 };`，`Object.values(scores).reduce((sum, n) => sum + n, 0)` 得到总分 `273`；`Object.keys(scores).filter(key => scores[key] >= 90)` 得到 `['语文', '数学']`。对象负责按名字存，数组方法负责算，这是两者最常见的配合方式。

这三个方法都只返回对象自己的可枚举（enumerable）属性，不会把原型上的东西算进来。可枚举大致可以理解为「用普通赋值加上去的属性」，内置方法大多不可枚举。这也是它们比 `for...in` 更适合日常遍历的原因。

键的顺序也值得留意：整数形式的键会先按数值升序排，其他键按插入顺序排。这个规则和 `for...in` 类似，但业务代码最好不要依赖它。确实需要稳定顺序时，拿到 `Object.keys` 的结果后自己 `sort` 一次，比假设对象一定按写法排列可靠。

`Object.entries` 配合解构可以同时拿到键和值，这段写法在第 12 章会正式讲，现在先照抄：

```js
const user = { name: '小明', age: 18, city: '上海' };

Object.entries(user).forEach(([key, value]) => {
  console.log(`${key}: ${value}`);
});
// 输出:
// name: 小明
// age: 18
// city: 上海
```

### for...in 与它的原型坑

`for...in` 也能遍历对象，但它会连原型链上的可枚举属性一起遍历：

```js
function Person() {}
Person.prototype.kind = 'human';

const p = new Person();
p.name = '小明';

for (const key in p) {
  console.log(key);
}
// 输出:
// name
// kind

for (const key in p) {
  if (Object.hasOwn(p, key)) {
    console.log(key, p[key]);
  }
}
// 输出: name 小明
```

第一个循环把原型上的 `kind` 也打印出来了。第二个循环加了 `Object.hasOwn` 过滤，只处理对象自己的字段。

除了原型问题，`for...in` 的顺序也不完全可靠。整数形式的键会先按数值升序排，其他键按插入顺序，但规范并不保证所有情况。需要稳定顺序时，用 `Object.keys` 拿到数组再自己排。

日常遍历对象，优先用 `Object.entries` 或 `Object.keys`，`for...in` 只在很老的代码里见得到。

## 解构：把字段一次取出来

当你要从对象里取好几个字段时，一行解构比写三行赋值清楚：

```js
const user = { name: '小明', age: 18, city: '上海' };

const { name, age } = user;
console.log(name);          // 输出: 小明
console.log(age);           // 输出: 18

const { name: userName } = user;
console.log(userName);      // 输出: 小明

const { phone = '未填写' } = user;
console.log(phone);         // 输出: 未填写
```

`{ name, age }` 表示「从右边对象里取同名属性，赋给同名变量」。`{ name: userName }` 是重命名，把 `name` 的值赋给 `userName`。`{ phone = '未填写' }` 是默认值，只有当 `phone` 是 `undefined` 时才生效；如果值是 `null`，默认值不会触发。

这一章只需要会取第一层字段。解构最常见的场景其实是函数参数：`function greet({ name, age })` 可以直接在参数位置拆开对象，调用时仍然传整个对象。这样函数只声明自己用到的字段，读到函数签名就知道它依赖什么。嵌套解构、函数参数解构、剩余属性这些用法，第 12 章会系统展开。

## 展开运算符合并对象

两个对象合并，最常用的写法是展开（spread）：

```js
const base = { theme: 'light', lang: 'zh', fontSize: 14 };
const custom = { theme: 'dark', fontSize: 16 };

const config = { ...base, ...custom };
console.log(config);
// 输出: { theme: 'dark', lang: 'zh', fontSize: 16 }
```

规则是：**同名属性，后面的覆盖前面的**。`custom` 在 `base` 后面，所以 `theme` 和 `fontSize` 用了 `custom` 的值，`lang` 只有 `base` 有，保留下来。

顺序反过来，结果就完全不同：`{ ...custom, ...base }.theme` 会得到 `'light'`，因为这次 `base` 在后面。做「默认配置 + 用户配置」时，一定要把默认值放前面，用户配置放后面，否则用户的选择会被默认值盖掉。`Object.assign({}, base, custom)` 是等价的老写法，新代码用展开更直观。

## 引用、浅拷贝与深拷贝

第 2 章讲过，对象变量存的不是对象本身，而是引用（reference），也就是对象在内存里的地址。两个变量指向同一个对象时，改一个，另一个也会变：

```js
const original = { name: '小明', tags: ['a'] };

const same = original;
same.name = '小红';
console.log(original.name);   // 输出: 小红

const shallow = { ...original };
shallow.tags.push('b');
console.log(original.tags);   // 输出: ['a', 'b']
```

`same = original` 只是复制了地址，两个名字指向同一个对象。`{ ...original }` 稍微好一点，它创建了一个新对象，但只复制第一层：`name` 是原始类型，复制后互不影响；`tags` 是数组，复制的是地址，所以 `shallow.tags` 和 `original.tags` 还是同一个数组。

这叫浅拷贝（shallow copy）。`{ ...obj }`、`Object.assign({}, obj)`、数组的 `slice()`、`[...arr]` 全是浅拷贝。函数传参也一样：把对象传进函数，函数里改属性，外面的原对象会变，因为传进去的是地址。想在函数里安全修改，先在函数开头复制一份，或者只返回新对象、不碰入参。

要真正断开所有层级，叫深拷贝（deep copy），用 `structuredClone`：

```js
const original = { name: '小明', tags: ['a'], address: { city: '上海' } };
const deep = structuredClone(original);

deep.tags.push('b');
deep.address.city = '北京';

console.log(original.tags);          // 输出: ['a']
console.log(original.address.city);  // 输出: 上海
```

`structuredClone` 是现代浏览器和 Node 17+ 自带的方法，不用装库。它能处理对象、数组、日期、Map、Set 等常见结构，但**不能复制函数和 DOM 节点**，遇到会抛 `DataCloneError`。

:::warn
判断要不要深拷贝，看数据里有没有嵌套的对象或数组。只有第一层原始类型时，浅拷贝就够了。很多「我明明只改了一个地方，另一个页面也跟着变」的 bug，根源都是该深拷贝时用了 `{ ...obj }`。
:::

## 可选链与空值合并：安全读取嵌套数据

接口数据经常缺字段。直接读 `order.customer.address.city`，只要中间任何一层是 `null` 或 `undefined`，整个程序就抛错。

可选链（optional chaining）`?.` 的作用是：左边是 `null` 或 `undefined` 时，不再继续往下读，直接返回 `undefined`：

```js
const order = {
  id: 1,
  customer: { name: '小明', address: { city: '上海' } },
};

console.log(order.customer?.address?.city);      // 输出: 上海
console.log(order.payment?.method);              // 输出: undefined
console.log(order.payment?.method ?? '未支付');  // 输出: 未支付

const count = 0;
console.log(count ?? 10);   // 输出: 0
console.log(count || 10);   // 输出: 10
```

空值合并（nullish coalescing）`??` 只在左边是 `null` 或 `undefined` 时取右边。`||` 会把 `0`、`''`、`false` 也当成「没有值」，所以数量是 `0` 时会被错误地替换成默认值。第 3 章讲过这个区别，处理价格、数量、开关时优先用 `??`。

`?.` 还可以用在方法调用上：`obj.getName?.()` 表示「方法存在就调用，不存在就返回 `undefined`」。读取数组元素也可以 `list?.[0]`，注意方括号前要有一个点。

## JSON：字符串与对象互转

程序之间传数据，不能直接传对象，要转成文本。JSON（JavaScript Object Notation）就是这种文本格式，长得几乎和对象字面量一样，但更严格：键必须用双引号，字符串也只能用双引号；最后一个属性后面不能有逗号；不能写注释；不能出现 `undefined`、函数和 `NaN`。手写 JSON 时按对象的习惯写，很容易因为单引号或尾逗号解析失败。

浏览器和 Node 都自带 `JSON` 对象，不用安装任何东西。它不是 JS 语言的一部分语法，而是一套独立的文本格式，只是恰好能被 JS 直接解析。

两个方法负责互转：

```js
const user = { name: '小明', age: 18, tags: ['a', 'b'] };

const json = JSON.stringify(user);
console.log(json);
// 输出: {"name":"小明","age":18,"tags":["a","b"]}

const back = JSON.parse(json);
console.log(back.name);    // 输出: 小明
console.log(typeof back);  // 输出: object
```

`JSON.stringify` 把对象变成字符串，`JSON.parse` 把字符串变回对象。接口请求时把参数 `stringify` 后发出去，收到响应再用 `parse` 解析，这是前后端通信的标准动作，第 16 章会实际用到。

调试时想看格式化的 JSON，给 `stringify` 传第三个参数：`JSON.stringify(user, null, 2)`。第二个参数传 `null` 表示不过滤字段，第三个参数 `2` 表示缩进两个空格，输出会变成带换行和缩进的多行文本，字段一多就很好读。不传缩进时得到的是一整行，适合放进请求体，不适合人眼检查。

### JSON 转换的四个坑

JSON 只支持六种值：字符串、数字、布尔、`null`、数组、对象。其他东西在转换时会被处理掉：

```js
console.log(JSON.stringify({ a: undefined, b: function () {}, c: Symbol('id') }));
// 输出: {}

console.log(JSON.stringify([undefined, function () {}]));
// 输出: [null,null]

console.log(JSON.stringify({ createdAt: new Date('2024-01-01T00:00:00Z') }));
// 输出: {"createdAt":"2024-01-01T00:00:00.000Z"}
```

四个必须记住的点：

1. 对象里的 `undefined`、函数、Symbol 会被**直接丢掉**，所以 `{}`。
2. 数组里的 `undefined` 和函数不能丢位置，会被转成 `null`。
3. `Date` 会变成 ISO 格式的字符串。`JSON.parse` 回来之后它还是字符串，不会自动变回 `Date`，需要手动 `new Date(str)`。
4. 对象里有循环引用时 `stringify` 会直接抛错。循环引用就是「对象的属性又指回对象自己」，比如 `const node = { name: 'a' }; node.self = node;` 之后再序列化，会得到 `TypeError: Converting circular structure to JSON`。接口数据一般不会有，但自己组装缓存、树形菜单或父子关系时可能遇到，构造时要避免把父对象塞进子对象。

`JSON.parse` 遇到不合法的文本会抛 `SyntaxError`，所以解析外部数据要包 `try/catch`：

```js
function safeParse(text, fallback = null) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

console.log(safeParse('{"a":1}'));   // 输出: { a: 1 }
console.log(safeParse('坏数据'));     // 输出: null
```

不要直接 `JSON.parse(localStorage.getItem('data'))`，因为用户第一次打开页面时 `getItem` 返回 `null`，`JSON.parse(null)` 虽然返回 `null` 不报错，但存了坏数据时就会炸。统一走一个 `safeParse` 更稳。

:::warn
`JSON.parse(JSON.stringify(obj))` 常被当成「一行深拷贝」，但它会丢 `undefined`、函数、Symbol，把 `Date` 变成字符串，还不能处理循环引用。只有数据是纯 JSON 结构时才能这么用。真正的深拷贝用 `structuredClone`。
:::

## Object.freeze：冻结对象

如果某个配置对象声明后就不该再改，可以用 `Object.freeze` 冻结：

```js
const config = Object.freeze({ api: 'https://example.com', retry: 3 });

config.retry = 5;
console.log(config.retry);              // 输出: 3
console.log(Object.isFrozen(config));   // 输出: true

const state = Object.freeze({ user: { name: '小明' } });
state.user.name = '小红';
console.log(state.user.name);           // 输出: 小红
```

冻结后给属性赋值不会生效：在浏览器的普通脚本里是静默失败，在严格模式（模块、`class` 内部）会抛 `TypeError`。所以不能指望它「报错提醒你」，它只是让值保持不变。

`Object.freeze` 是**浅冻结**，只锁第一层。`state.user` 这个嵌套对象仍然可以改。要真正冻结整棵树，得递归调用 `Object.freeze`，或者接受这个限制，只冻结确实需要保护的顶层配置。

它适合用在两种地方：一种是常量表，比如状态码到文案的映射；另一种是初始化后就不该变的配置。对于会被用户操作的数据，不要冻结，否则后面的更新逻辑会静默失效，排查起来很费劲。

## 常见误区清单

| 写法 | 结果 | 为什么 |
| --- | --- | --- |
| `const key = 'age'; user.key` | `undefined` | 点访问找的是字面量 `"key"`，动态键要用 `user[key]` |
| `'toString' in {}` | `true` | `in` 会查原型链，自有属性用 `Object.hasOwn` |
| `{ ...obj }` 当成深拷贝 | 嵌套对象仍共享 | 展开只复制第一层 |
| `JSON.stringify({ a: undefined })` | `'{}'` | 对象里的 `undefined` 被丢掉 |
| `JSON.parse` 后的日期字段 | 仍是字符串 | JSON 没有日期类型，要手动 `new Date` |
| 循环引用对象 `stringify` | 抛 `TypeError` | 无法表示环状结构 |
| `Object.freeze` 后改嵌套字段 | 仍然成功 | `freeze` 是浅冻结 |
| 读取 `user.address.city` | 抛 `TypeError` | `address` 是 `undefined`，用 `?.` 或先判断 |
| `{} === {}` | `false` | 两个不同的对象地址不同，比较内容要逐字段或转 JSON |
| `for...in` 遍历对象 | 可能多出原型属性 | 加 `Object.hasOwn` 过滤，或用 `Object.keys` |
| `user.hasOwnProperty` 被字段覆盖 | 调用报错 | 用 `Object.hasOwn(user, key)` |
| 合并配置时默认值放后面 | 用户配置被覆盖 | 后面的同名属性会覆盖前面的 |

## 通勤自测

:::quiz 下面这段代码输出什么？
```js
const user = { name: '小明', age: 18 };
const key = 'age';
console.log(user.key);
console.log(user[key]);
```
第一行输出 `undefined`，因为 `user.key` 找的是名为 `"key"` 的属性；第二行输出 `18`，方括号会先计算变量 `key` 的值。
:::

:::quiz 下面这段代码输出什么？
```js
const a = { x: 1, y: 2 };
const b = { y: 3, z: 4 };
console.log({ ...a, ...b });
```
输出 `{ x: 1, y: 3, z: 4 }`。同名属性 `y` 以后面的 `b` 为准，`a` 独有的 `x` 和 `b` 独有的 `z` 都保留。
:::

:::quiz 下面这段代码输出什么？
```js
console.log(JSON.stringify({ a: 1, b: undefined, c: () => {} }));
```
输出 `{"a":1}`。对象里的 `undefined` 和函数在序列化时会被直接丢掉，不会变成 `null`。
:::

:::quiz `in` 和 `Object.hasOwn` 有什么区别？
`in` 会沿着原型链查找，继承来的属性也算存在；`Object.hasOwn` 只检查对象自己的属性。判断业务字段用 `Object.hasOwn`，结果更符合直觉。
:::

:::quiz `{ ...obj }` 是深拷贝吗？什么情况下会出问题？
不是，是浅拷贝。第一层的原始类型互不影响，但嵌套的对象或数组仍然共享地址，改副本会改到原对象。需要彻底独立时用 `structuredClone`。
:::

:::quiz `Object.freeze(obj)` 之后，修改 `obj.nested.value` 会怎样？
仍然能改。`Object.freeze` 只冻结第一层，嵌套对象没有被冻结。要连嵌套一起锁住，需要递归冻结。
:::

:::quiz `count` 是 `0` 时，`count ?? 10` 和 `count || 10` 分别返回什么？
`??` 返回 `0`，因为它只在 `null` 和 `undefined` 时取默认值；`||` 返回 `10`，因为它把 `0` 当成假值。数量、价格这类可能为 `0` 的字段要用 `??`。
:::

:::quiz 为什么 `JSON.parse(JSON.stringify(obj))` 不能算可靠的深拷贝？
它会丢掉 `undefined`、函数和 Symbol，把 `Date` 变成字符串，遇到循环引用还会抛错。只有纯 JSON 数据才能这么转。可靠的深拷贝用 `structuredClone`。
:::

## 动手练习（到电脑上做）

**必做**

1. 写 `pick(obj, keys)` 和 `omit(obj, keys)`：前者只保留指定字段，后者排除指定字段，都返回新对象，不修改原对象。
   验收：`pick({ a: 1, b: 2, c: 3 }, ['a', 'c'])` 返回 `{ a: 1, c: 3 }`；`omit` 对同样的输入返回 `{ b: 2 }`；调用后原对象仍然是三个字段。

2. 给定一个用户数组，每个用户有 `name` 和 `city`，统计每个城市有多少人，输出类似 `{ 上海: 2, 北京: 1 }` 的对象。
   验收：结果对象的键是城市名，值是人数；空数组时返回 `{}`，不报错。

3. 写一个 `mergeConfig(defaults, userConfig)`，返回合并后的新对象，要求同名属性以 `userConfig` 为准，且不修改两个入参。
   验收：`mergeConfig({ theme: 'light', size: 14 }, { theme: 'dark' })` 返回 `{ theme: 'dark', size: 14 }`；两个入参在调用后都没有变化。

**进阶**

4. 写一个递归 `deepClone(value)`，支持普通对象、数组、`null` 和原始类型。用 `structuredClone` 的结果做对比，至少测试三层嵌套。
   验收：修改克隆结果里的任意一层，原对象都不受影响；`null`、数字、字符串能原样返回；数组不会被错当成普通对象处理。

5. 写 `safeGet(obj, path, fallback)`，`path` 是 `'customer.address.city'` 这样的字符串，任何一层缺失都返回 `fallback`。
   验收：`safeGet(order, 'customer.address.city', '未知')` 在完整数据上返回城市名，在缺少 `customer` 或 `address` 时返回 `'未知'`，不抛错。

:::tip
对象是后面所有章节的地基：第 9 章讲闭包时会用对象保存状态，第 12 章会把解构和展开讲得更深，第 16 章从接口拿到的 JSON 也要先 `parse` 成对象再处理。

现在最该练熟的是三件事：动态键用方括号、嵌套读取用 `?.` 加 `??`、复制数据前先想清楚是浅拷贝还是深拷贝。这三件事能挡掉后面大部分的「灵异 bug」。
:::
