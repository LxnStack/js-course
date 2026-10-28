---
id: 10
title: this 到底指向谁
summary: 用「看调用方式，不看定义位置」一句口诀，讲清五种调用场景、this 丢失的经典 bug，以及 call/apply/bind 的区别。
minutes: 34
keywords: this 箭头函数 bind call apply 回调 丢失 严格模式
---

> `this` 是 JS 里被误解最多的关键字。很多人背了一堆规则，一写代码还是错。
>
> 这一章只围绕一句口诀展开：**`this` 由调用方式决定，不由定义位置决定**。箭头函数是唯一的例外，它没有自己的 `this`。
>
> 学完你能判断五种调用场景下 `this` 是谁，能看懂并修复「方法赋给变量后 this 丢失」这类 bug，也能分清 `call`、`apply`、`bind`。第 9 章的作用域是理解箭头函数的前提，第 11 章的 class 会再次用到这里的结论。

## 为什么需要它

假设你要在页面上显示两个人的自我介绍。最直接的做法是写两个几乎一样的函数：

```js
function introduceTeacher() {
  console.log('我是王老师');
}

function introduceStudent() {
  console.log('我是小明');
}

introduceTeacher();   // 输出: 我是王老师
introduceStudent();   // 输出: 我是小明
```

只有名字不同，逻辑完全重复。人一多，函数就爆炸了。

更合理的做法是写一个函数，让它知道「现在轮到谁」。`this` 就是干这个的：

```js
function introduce() {
  console.log('我是' + this.name);
}

const teacher = { name: '王老师', introduce };
const student = { name: '小明', introduce };

teacher.introduce();   // 输出: 我是王老师
student.introduce();   // 输出: 我是小明
```

同一个 `introduce` 函数，挂到两个对象上，执行时自动知道该读谁的 `name`。这就是 `this` 存在的意义：**让函数在复用时，能拿到「当前是哪个对象在调用我」**。

如果没有 `this`，你就得把对象作为参数显式传进去：`introduce(teacher)`。`this` 只是把这件麻烦事变得隐形了，代价是它的规则需要你记清楚。

你可以把 `this` 理解成函数的一个隐式参数：调用者不用显式写出来，函数却能在执行时知道「现在是谁在调用我」。这个设计让方法可以复用，也带来一个副作用——同一个函数，换个调用方式，结果就可能完全不同。这一章剩下的内容，都是在处理这个副作用。

## 一句口诀：看调用方式，不看定义位置

判断 `this` 时，不要看函数写在哪里，要看**这一行代码是怎么调用它的**。

```js
const user = {
  name: '小明',
  say() {
    console.log(this.name);
  },
};

user.say();   // 输出: 小明
```

`say` 定义在 `user` 里面，调用时写的是 `user.say()`，点号左边是 `user`，所以 `this` 是 `user`。

但同样是这个函数，换一种调用方式，`this` 就变了：

```js
const fn = user.say;
fn();   // this 不再是 user，读不到「小明」
```

函数还是那个函数，定义位置没变，只是调用时前面没有 `user.` 了，`this` 就不再是 `user`。

生活类比：`this` 像一把钥匙，同一把钥匙插在哪扇门上，就开哪扇门。钥匙本身不记得自己属于谁，是「插在哪」决定了结果。

这里要分清两个容易混的概念：**定义位置决定作用域，调用方式决定 `this`**。第 9 章讲的作用域，是函数能看见哪些变量；`this` 则是函数执行时指向哪个对象。两者互不替代。一个函数可以定义在全局，却通过 `obj.method()` 让 `this` 指向 `obj`；也可以在对象里定义，被拆出来后 `this` 变成 `undefined`。

## 五种调用场景

日常代码里，函数被调用的方式只有五种。把每一种的 `this` 记住，大部分问题就解决了。

### 场景一：普通函数调用

直接写函数名加括号，前面没有任何对象：

```js
function showThis() {
  console.log(this === globalThis);
}

showThis();   // 输出: true
```

在**非严格模式**的脚本里，普通调用的 `this` 会被替换成全局对象。浏览器里是 `window`，Node 里是 `global`，现代 JS 统一用 `globalThis` 表示它们。

为什么非严格模式要兜底？这是 JS 早期为了让代码「不报错」留下的行为。代价是错误被藏起来：你明明丢了 `this`，程序却继续跑，只是结果不对。现代代码基本都在严格模式里，所以更常见的现象是直接抛错，而不是悄悄读到全局变量。

严格模式下结果不同：

```js
function strictShow() {
  'use strict';
  console.log(this);
}

strictShow();   // 输出: undefined
```

严格模式不再做「替换成全局对象」这个兜底，`this` 就是 `undefined`。这不是坏事，后面会看到，它能让 `this` 丢失的错误立刻暴露。

### 场景二：对象方法调用

函数作为对象的属性被调用，`this` 是**点号左边那个对象**：

```js
const user = {
  name: '小明',
  say() {
    console.log(this.name);
  },
};

user.say();   // 输出: 小明
```

嵌套对象也一样，只看**最后一个点号**左边是谁：

```js
const shop = {
  name: '商店',
  product: {
    name: '耳机',
    show() {
      console.log(this.name);
    },
  },
};

shop.product.show();   // 输出: 耳机
```

这里 `this` 是 `shop.product`，不是 `shop`。很多人会误以为「方法属于最外层对象」，其实只认直接调用它的那个对象。

判断时可以先把调用表达式拆开：`shop.product.show()` 中，真正被调用的函数是 `show`，它前面的表达式是 `shop.product`，所以 `this` 就是 `shop.product`。如果写成 `const show = shop.product.show; show()`，前面的表达式没了，`this` 也就丢了。

还有一个细节：`(user.say)()` 仍然算方法调用，`this` 还是 `user`，因为括号没有破坏「点号左边有对象」这个结构；但 `(0, user.say)()` 里的逗号表达式会先算出函数本身，`this` 就丢了。日常几乎不会这样写，读压缩后的代码时可能遇到。

### 场景三：call、apply、bind 显式绑定

这三个方法都能强行指定 `this`，区别在传参和是否立即执行：

```js
function greet(greeting) {
  console.log(greeting + '，' + this.name);
}

const user = { name: '小明' };

greet.call(user, '你好');          // 输出: 你好，小明
greet.apply(user, ['早上好']);     // 输出: 早上好，小明

const bound = greet.bind(user);
bound('晚上好');                   // 输出: 晚上好，小明
```

`greet` 自己身上没有 `name`，但 `call` / `apply` 把 `this` 换成了 `user`，于是读到了 `user.name`。

`call` 和 `apply` 的区别只在传参：参数少时用 `call` 更直观，参数已经在一个数组里时用 `apply` 更方便。`bind` 不执行函数，只负责返回一个「改装过」的新函数，适合提前准备好 `this`，等到事件触发或定时器到点时再调用。三者都不会改变原函数，只是这一次调用（或者这个新函数）的 `this` 不同。

`bind` 还可以预先固定一部分参数，这在事件回调和工具函数里很常见。比如 `add.bind(null, 10)` 会把第一个参数固定成 10，之后调用只需要传第二个参数，`addTen(5)` 就得到 15。第一个参数是 `this`，这里用不上，传 `null` 占位。

### 场景四：new 调用

用 `new` 调用构造函数时，`this` 是**新创建出来的那个对象**：

```js
function Person(name) {
  this.name = name;
}

const p = new Person('小明');
console.log(p.name);   // 输出: 小明
```

`new` 会在执行函数前先造一个空对象，把这个对象作为 `this`，再执行构造函数，最后返回它。所以 `this.name = name` 写在了新对象上，而不是全局对象上。这与普通调用最本质的区别是：`this` 不再靠调用方式猜，而是明确指向一个刚创建的对象。第 11 章会把 `new` 的四步拆开讲。

### 场景五：箭头函数

箭头函数没有自己的 `this`。它定义时外层作用域的 `this` 是什么，它就永远是什么：

```js
const obj = {
  name: '外层对象',
  regular() {
    return function () {
      return this;
    };
  },
  arrow() {
    return () => this;
  },
};

const r = obj.regular();
const a = obj.arrow();

console.log(r() === obj);   // 输出: false
console.log(a() === obj);   // 输出: true
```

`obj.arrow()` 执行时，方法里的 `this` 是 `obj`，箭头函数捕获了这个 `this`，所以 `a()` 返回 `obj`。`obj.regular()` 返回的是普通函数，调用 `r()` 时没有对象前缀，`this` 变成了全局对象或 `undefined`，所以不等于 `obj`。

这也意味着对象方法不要写成箭头函数：

```js
const bad = {
  name: '小明',
  say: () => this,
};

console.log(bad.say() === bad);   // 输出: false
```

箭头函数定义在对象字面量里时，外层是全局或模块作用域，不是这个对象。`bad.say()` 无论怎么调用，`this` 都不会变成 `bad`。

箭头函数没有自己的 `this`，也没有 `prototype`，所以它既不能当构造函数，也不能被 `call`、`apply`、`bind` 重新绑定。它适合写在回调里，专门用来「继承外层的 `this`」；不适合当对象方法，也不适合当构造函数。判断标准很简单：这个函数需不需要「自己所属的对象」？需要就用普通函数或 class 方法，不需要就用箭头函数。

实际写代码时，箭头函数最常见的用途就是回调：数组的 `map` 里做转换、`setTimeout` 里访问外层对象、事件监听里调用组件方法。这些场景都不需要函数拥有自己的对象，只需要它借用外层环境。反过来，只要这个函数要挂到某个对象上当方法，就应该用普通函数或 class 方法。

## 严格模式的影响

严格模式（strict mode）是一组更严格的语法和行为规则。它可以在脚本或函数开头写 `'use strict'` 开启，class 内部和 ES module 默认就是严格模式。

它对 `this` 的影响只有一个，但很关键：

```js
function loose() {
  console.log(this === globalThis);
}
loose();   // 输出: true

function strict() {
  'use strict';
  console.log(this);
}
strict();   // 输出: undefined
```

非严格模式把普通调用的 `this` 兜底成全局对象，等于把错误藏了起来；严格模式直接给 `undefined`，你访问 `this.name` 时立刻报错，问题当场暴露。

除了 `this`，严格模式还会禁止一些不安全的写法，比如给未声明的变量赋值、删除不可删除的属性、函数参数重名。这些规则合起来，让错误更早暴露。你在 class 里写的方法、用 ES module 拆出去的文件，都自动处于严格模式，不需要手写 `'use strict'`。

现代项目里，class 方法、ES module、TypeScript 编译后的代码基本都在严格模式下。所以你在实际项目里遇到的「`this` 丢失」，通常表现为 `Cannot read properties of undefined`，而不是悄悄读到全局变量。

判断当前代码是不是严格模式，有个简单办法：在函数里打印 `this`，直接调用得到 `undefined` 就是严格模式，得到全局对象就不是。这个技巧在接手老项目、排查 `this` 问题时很好用。

## 最常见的 bug：this 丢失

理解了这个 bug，`this` 就算学明白了。

它的本质只有一句话：**「方法」不是函数自带的属性，而是调用时临时给的**。函数本身不知道自己属于哪个对象，是 `obj.method()` 这种写法在调用瞬间把 `this` 给了它。一旦你把函数单独拿出来，这个「调用瞬间的关联」就断了。

真实项目里，这个 bug 最常出现在三类地方：把方法存进变量、把方法当回调传出去、从对象里解构方法。它们的共同点是「函数离开了原来的调用形式」。记住一个检查动作：看到 `this` 不对，先找这一行调用，问自己「点号左边是谁」，通常三秒内就能定位。

### 场景一：把方法赋值给变量

```js
'use strict';

const user = {
  name: '小明',
  say() {
    console.log(this.name);
  },
};

const fn = user.say;
fn();   // TypeError: Cannot read properties of undefined (reading 'name')
```

`const fn = user.say` 只是把函数本身取了出来，没有带走 `user`。调用 `fn()` 时前面没有对象，严格模式下 `this` 是 `undefined`，访问 `undefined.name` 就报错。

在非严格模式里不会报错，但 `this` 变成全局对象，`this.name` 通常是空字符串或 `undefined`，结果是错的，还更难查。

### 场景二：方法作为回调传出去

定时器、事件监听、数组方法都会接收回调。把方法直接传进去，同样会丢：

```js
'use strict';

const user = {
  name: '小明',
  say() {
    console.log(this.name);
  },
};

setTimeout(user.say, 0);   // TypeError: Cannot read properties of undefined
```

`setTimeout` 拿到函数后，是在未来的某个时刻「直接调用」它，前面没有 `user.`。调用方式变了，`this` 就没了。

为什么定时器不保留 `this`？因为 `setTimeout` 内部只是把回调存起来，到时间后直接执行 `callback()`，它并不知道这个函数原来挂在哪个对象上。事件监听、数组的 `map`、Promise 的 `then` 也是一样：它们只拿到函数，不拿到函数和原对象的关系。

三种修法：

```js
'use strict';

const user = {
  name: '小明',
  say() {
    console.log(this.name);
  },
};

setTimeout(user.say.bind(user), 0);        // 输出: 小明

setTimeout(() => user.say(), 0);           // 输出: 小明

setTimeout(function () {
  user.say();                              // 输出: 小明
}, 0);
```

第一种用 `bind` 把 `this` 永久固定成 `user`。第二种用箭头函数包一层，箭头函数自己不关心 `this`，真正的调用发生在 `user.say()` 这一行，点号还在。第三种用普通函数包一层，在函数体里手动写 `user.say()`，效果和第二种一样。

### 场景三：解构方法

解构也会把方法从对象上「摘」下来：

```js
'use strict';

const user = {
  name: '小明',
  say() {
    console.log(this.name);
  },
};

const { say } = user;
say();   // TypeError: Cannot read properties of undefined (reading 'name')
```

原因和赋值给变量完全一样。想保留 `this`，解构后要重新 `bind`，或者干脆不解构，继续写 `user.say()`。

## call、apply、bind 的区别

三个方法都用来指定 `this`，用一张表分清：

| 方法 | 传参形式 | 是否立即执行 | 返回值 |
| --- | --- | --- | --- |
| `call` | 从第二个参数开始逐个传 | 是 | 函数本身的返回值 |
| `apply` | 第二个参数传一个数组 | 是 | 函数本身的返回值 |
| `bind` | 从第二个参数开始逐个传，可只传一部分 | 否 | 一个 `this` 已固定的新函数 |

记忆方法：`call` 是「调用」，`apply` 是「用数组调用」，`bind` 是「绑定后留着以后调用」。

### 手写一个 myBind

`bind` 本身不难，手写一遍能彻底理解它做的事：

```js
function myBind(fn, context, ...boundArgs) {
  return function (...args) {
    return fn.apply(context, [...boundArgs, ...args]);
  };
}

function introduce(greeting, punctuation) {
  return greeting + '，' + this.name + punctuation;
}

const user = { name: '小明' };
const sayHello = myBind(introduce, user, '你好');

console.log(sayHello('！'));   // 输出: 你好，小明！
```

`myBind` 返回一个新函数，把 `context` 和预先传的参数都记在闭包里。真正调用时，用 `apply` 把 `this` 设成 `context`，再把「预先参数」和「调用时参数」拼起来。

`bind` 固定的 `this` 不会被后续的 `call` 改掉。比如把一个 `introduce` 函数 `bind(user)` 之后，再写 `bound.call({ name: '小红' }, '你好')`，返回的仍然是 `你好，小明`。一旦 `bind` 过，`this` 就锁死了。这一点在排查「为什么我 `call` 了还是不对」时很有用。

### 借用方法

`call` 还有一个常见用途：把别处的方法借来用。比如 `Array.prototype.join.call(arrayLike, '-')`，`arrayLike` 是一个 `{ 0: 'a', 1: 'b', length: 2 }` 这样的「长得像数组」的对象，本身没有 `join` 方法，但 `join` 只依赖 `length` 和数字下标，用 `call` 把 `this` 换成它就能跑，结果得到 `'a-b'`。老代码里常这样处理 `arguments`、NodeList 这类对象。

## class 方法里的 this

class 的方法默认是严格模式，所以「方法丢失」会直接报错：

```js
class Counter {
  constructor() {
    this.count = 0;
  }

  add() {
    this.count += 1;
    console.log(this.count);
  }
}

const c = new Counter();
c.add();   // 输出: 1

const add = c.add;
add();     // TypeError: Cannot read properties of undefined (reading 'count')
```

`c.add()` 正常，`add()` 报错，原因和前面的对象方法完全一样。class 只是把方法放到了原型上（第 11 章），调用规则没有变。

为什么 class 方法拆出来会直接报错，而不是像普通对象方法那样悄悄读到全局？因为 class 内部默认是严格模式。普通对象的方法如果在非严格脚本里定义，拆出来后 `this` 会变成全局对象，错误更隐蔽；class 帮你把这个问题提前暴露了。

修法之一是在构造函数里 `bind`，更现代的做法是用 class field 加箭头函数：

```js
class Counter {
  count = 0;
  add = () => {
    this.count += 1;
    console.log(this.count);
  };
}

const c = new Counter();
const add = c.add;
add();   // 输出: 1
add();   // 输出: 2
```

`add` 是实例字段，每个实例在创建时都会执行这个箭头函数，它捕获的 `this` 就是当前实例。之后无论怎么拆出来调用，`this` 都不会丢。代价是每个实例都有一份自己的 `add` 函数，不再共享原型上的那一份。实例少的时候无所谓，实例成千上万时要注意内存。

如果这个 class 会被频繁创建实例，另一个折中方案是在构造函数里 `this.add = this.add.bind(this)`，这样方法仍然在原型上共享，只是每个实例多了一个绑定后的引用。

## 事件回调中的 this

浏览器的 `addEventListener` 会给普通函数回调设置 `this`，指向触发事件的元素。写 `button.addEventListener('click', function () { console.log(this); })`，点的是 `button`，`this` 就是那个元素；换成箭头函数，`this` 就变回外层作用域的值，通常不是 `button`。

普通函数的 `this` 是 `currentTarget`，也就是绑定监听的那个元素。箭头函数没有自己的 `this`，拿到的是外层作用域的。

事件回调还有一个容易混的点：`this` 是绑定监听的元素，不是被点击的那个子元素。如果给父元素绑定监听，点击子元素时 `this` 仍然是父元素，但 `event.target` 是真正被点的子元素。两者的区别在第 15 章讲事件冒泡时会展开。

这个规则在第 15 章做页面交互时会反复用到。现在只要记住：**事件回调里想用 `this`，别用箭头函数；想用外层的 `this`，才用箭头函数**。

## 常见误区清单

最后再强调一次：不要背「`this` 指向定义它的对象」这种错误口诀。定义位置只决定作用域，真正决定 `this` 的永远是调用方式。把这句话记牢，比背十条规则都管用。

| 写法 | 结果 | 为什么 |
| --- | --- | --- |
| `user.say()` | `this` 是 `user` | 点号左边是谁就是谁 |
| `const fn = user.say; fn()` | `this` 丢失 | 调用时前面没有对象 |
| `setTimeout(user.say, 0)` | `this` 丢失 | 定时器直接调用回调 |
| 对象方法写成箭头函数 | `this` 不是该对象 | 箭头函数取外层 `this` |
| `new Person()` | `this` 是新对象 | `new` 创建对象并绑定 |
| `greet.call(obj)` | `this` 是 `obj` | 显式指定 |
| `bound.call(other)` | `this` 仍是原来那个 | `bind` 后无法再改 |
| `a.b.show()` | `this` 是 `b` | 只看最后一个点号 |
| 严格模式下 `fn()` | `this` 是 `undefined` | 不再兜底成全局对象 |
| class 方法被拆出来调用 | `TypeError` | class 内部默认严格模式 |
| 箭头函数用 `call` 改 `this` | 改不了 | 它没有自己的 `this` |

## 通勤自测

:::quiz 下面这段代码输出什么？
```js
'use strict';
const obj = {
  name: 'obj',
  say() {
    return this.name;
  },
};
const fn = obj.say;
console.log(fn());
```
不会输出 `'obj'`，而是抛 `TypeError: Cannot read properties of undefined (reading 'name')`。`fn()` 是普通调用，严格模式下 `this` 是 `undefined`。
:::

:::quiz 下面这段代码输出什么？
```js
const a = {
  name: 'a',
  b: {
    name: 'b',
    show() {
      return this.name;
    },
  },
};
console.log(a.b.show());
```
输出 `'b'`。`this` 只看最后一个点号左边是谁，这里是 `a.b`，不是 `a`。
:::

:::quiz 下面这段代码输出什么？
```js
const obj = {
  name: 'obj',
  say: () => this === obj,
};
console.log(obj.say());
```
输出 `false`。箭头函数的 `this` 来自外层作用域，不是 `obj`；`obj.say()` 怎么调用都改变不了这一点。
:::

:::quiz call、apply、bind 三者有什么区别？
`call` 立即调用，参数逐个传；`apply` 立即调用，参数放在数组里传；`bind` 不调用，返回一个 `this` 已固定、还可以预填部分参数的新函数。
:::

:::quiz 下面这段代码输出什么？
```js
function getName() {
  return this.name;
}
const a = { name: 'A' };
const b = { name: 'B' };
const bound = getName.bind(a);
console.log(bound.call(b));
```
输出 `'A'`。`bind` 之后 `this` 已经锁死为 `a`，后续用 `call(b)` 也改不掉。
:::

:::quiz 用 new 调用构造函数时，this 是什么？
是 `new` 刚刚创建出来的那个新对象。构造函数执行前，`new` 先创建空对象、把它的原型指向构造函数的 `prototype`，再把这个对象作为 `this` 执行构造函数。
:::

:::quiz 严格模式下直接调用普通函数，this 是什么？为什么这样设计？
是 `undefined`。非严格模式会把 `this` 兜底成全局对象，把「this 丢失」的错误藏起来；严格模式给 `undefined`，访问属性时立刻抛错，问题能当场暴露。
:::

## 动手练习（到电脑上做）

**必做**

1. 写一个 `user` 对象，有 `name` 和 `say()`，先用 `user.say()` 正常调用，再把方法赋给变量调用，观察两次结果。
   验收：能复现 `TypeError`（严格模式），并用自己的话解释为什么第二次 `this` 不是 `user`。

2. 复现「回调里 this 丢失」：把 `user.say` 直接传给 `setTimeout`，然后用 `bind`、箭头函数、普通函数包一层三种方式分别修好。
   验收：三种修法都输出 `小明`，能说出每种写法把 `this` 保住在哪一步。

3. 手写 `myBind(fn, context, ...args)`，并用它绑定一个带两个参数的函数，验证预填参数和后续参数能正确拼接。
   验收：`myBind(introduce, user, '你好')('！')` 返回 `你好，小明！`；不传预填参数时也能正常工作。

**进阶**

4. 写一个 `Counter` class，用 class field 箭头函数实现 `add`，把 `add` 拆出来单独调用，证明 `this` 不会丢；再写一个普通方法版本对比报错。
   验收：箭头版本连续调用输出 `1`、`2`；普通方法版本拆出来后抛 `TypeError`，并能解释差异。

5. 实现一个 `bindAll(obj, methodNames)`，把对象上指定的方法全部绑定到 `obj`，返回一个新对象。要求原对象不被修改。
   验收：解构或单独调用返回对象上的方法时，`this` 仍然指向原对象，输出正确。

:::tip
`this` 的规则只有一条主线：**调用方式决定 `this`**。遇到问题时，不要盯着函数定义看，先看调用那一行的点号左边是谁，或者它是不是被当成了回调。

第 11 章的 `class` 会把方法放到原型上，但调用规则和这里完全一致；第 15 章的事件委托、第 18 章的待办项目，都会出现「回调里的 this」。把这一章的三种修法练熟，后面能省很多调试时间。
:::
