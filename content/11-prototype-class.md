---
id: 11
title: 原型链与 class
summary: 从「方法为什么要共享」讲起，拆开 prototype、constructor、__proto__ 的关系，再把 class、继承、私有字段和 new 的过程讲透。
minutes: 36
keywords: 原型 prototype __proto__ constructor class 继承 new instanceof
---

> 第 10 章讲过 `this` 由调用方式决定。这一章回答另一个问题：对象上的方法，到底是从哪里来的？
>
> JS 的继承不靠 `class` 实现，`class` 只是原型链的一层语法糖。看懂 `prototype`、`__proto__`、`constructor` 三者的关系，你就能解释「为什么 `p.say` 自己没定义却能调用」，也能自己手写一个 `new`。
>
> 学完你能用构造函数和 class 两种方式写同一个功能，理解 `extends` 和 `super` 的执行顺序，并且知道为什么不能往 `Array.prototype` 上随便加方法。第 7 章的对象、第 10 章的 `this` 是这一章的前置知识。

## 为什么需要它

先看不使用原型的写法。你要创建很多个用户对象，每个都有名字和自我介绍：

```js
function createUser(name) {
  return {
    name,
    say() {
      console.log(this.name);
    },
  };
}

const u1 = createUser('小明');
const u2 = createUser('小红');

console.log(u1.say === u2.say);   // 输出: false
```

`u1` 和 `u2` 的 `say` 是两个完全不同的函数。每创建一个用户，就重新造一份一模一样的函数代码。一百个用户就有一百份 `say`，一千个就有一千份。

在 JS 里，函数也是对象，每创建一个对象字面量里的方法，就真的分配了一块新的函数内存。数据量小时感觉不到，但如果一个页面要渲染几千条列表项，每条都带三四个方法，内存和初始化时间都会明显上升。原型把「一份代码」和「多份数据」分开，是这个语言能撑起大型应用的基础设计之一。

生活类比：一栋楼里每户都买了一台完全相同的打印机，只用它打印同一种表格。打印机本身不贵，但一百台就是一百份成本，还要各自维护。更合理的做法是物业在一楼放一台公共打印机，所有人共用。

原型（prototype）就是这台公共打印机。把方法放在构造函数的 `prototype` 上，所有实例共享同一份：

```js
function Person(name) {
  this.name = name;
}

Person.prototype.say = function () {
  console.log(this.name);
};

const p1 = new Person('小明');
const p2 = new Person('小红');

console.log(p1.say === p2.say);   // 输出: true
p1.say();                         // 输出: 小明
```

现在 `say` 只有一份，`p1` 和 `p2` 都通过原型链找到它。`name` 仍然是每个实例自己的，因为它在构造函数里用 `this.name` 写入。

所以原型解决的是「共享」问题：**实例独有的数据放在实例上，实例共用的方法放在原型上**。

## prototype、constructor、__proto__ 三者的关系

这三个名字长得像，初次接触几乎必然混淆。先看一段代码，把关系全部打印出来：

```js
function Person(name) {
  this.name = name;
}

const p = new Person('小明');

console.log(p.__proto__ === Person.prototype);                    // 输出: true
console.log(Object.getPrototypeOf(p) === Person.prototype);       // 输出: true
console.log(Person.prototype.constructor === Person);             // 输出: true
console.log(Person.prototype.constructor.name);                   // 输出: 'Person'
console.log(p.constructor === Person);                            // 输出: true
console.log(Person.prototype.__proto__ === Object.prototype);     // 输出: true
console.log(Object.prototype.__proto__);                          // 输出: null
```

逐条解释：

- `Person.prototype` 是**构造函数身上的一个属性**，它是一个普通对象，专门用来存放实例共享的东西。
- `p.__proto__` 是**实例身上的一个指针**，指向 `Person.prototype`。`Object.getPrototypeOf(p)` 是读取它的标准写法。
- `Person.prototype.constructor` 指回 `Person`，相当于原型对象上的一张名片，写着「我是被谁造出来的」。
- `p.constructor` 自己身上没有，是沿着原型链找到 `Person.prototype.constructor`，所以也等于 `Person`。
- `Person.prototype` 本身也是个对象，它的原型是 `Object.prototype`，所以还能继续往上找。
- `Object.prototype` 的原型是 `null`，这是整条链的终点。

用一张表记住：

| 名字 | 挂在哪 | 指向什么 | 用途 |
| --- | --- | --- | --- |
| `prototype` | 构造函数 | 一个对象 | 存放实例共享的方法 |
| `__proto__` | 每个实例对象 | 它的原型 | 访问原型，实际是继承来的访问器 |
| `constructor` | 原型对象 | 构造函数 | 回指构造函数，但可以被改写，不可全信 |

`__proto__` 要特别说明：它不是对象自己的属性，而是 `Object.prototype` 上的一个访问器（getter/setter）。所以 `Object.create(null)` 创建的对象没有 `__proto__`。日常读取原型，优先用 `Object.getPrototypeOf(obj)`，不要直接写 `obj.__proto__`。

还有一个容易忽略的点：`Person.__proto__` 和 `Person.prototype` 完全不是一回事。`Person` 是函数，函数本身也是对象，它的原型是 `Function.prototype`；而 `Person.prototype` 是给实例用的那个对象。名字只差一个 `__`，含义差很远。

生活类比：`prototype` 是楼房的图纸，`__proto__` 是每户门牌上写的「我属于哪栋楼」，`constructor` 是图纸角落的设计院签名。图纸只有一份，门牌每户都有。

## 原型链的查找过程

访问一个属性时，JS 按固定顺序找：

1. 先看对象自己有没有这个属性；
2. 没有就去它的原型上找；
3. 还没有，就去原型的原型上找；
4. 一直到 `null`，都没有就返回 `undefined`。

```js
const grand = { a: 1 };
const parent = Object.create(grand);
parent.b = 2;
const child = Object.create(parent);
child.c = 3;

console.log(child.a);   // 输出: 1
console.log(child.b);   // 输出: 2
console.log(child.c);   // 输出: 3
console.log(child.d);   // 输出: undefined
console.log(child.hasOwnProperty('a'));   // 输出: false
console.log(child.hasOwnProperty('c'));   // 输出: true
```

`child` 自己没有 `a`，但原型链是 `child → parent → grand → Object.prototype → null`，在 `grand` 上找到了 `a`。

`hasOwnProperty` 用来区分「自己的」和「继承来的」：`a` 是继承的，返回 `false`；`c` 是自己写的，返回 `true`。

查找是逐层进行的，但不会把整条链复制到对象上。`child` 始终只有 `c` 这一个自有属性，`a`、`b` 仍然留在各自的原型上。这也是原型比「把方法复制进每个实例」更省内存的原因：共享的是引用，不是副本。

如果给 `parent` 也加一个 `a`，查找会在更近的 `parent` 停下：

```js
parent.a = 10;
console.log(child.a);   // 输出: 10
```

内层同名属性会遮蔽外层，这和 CSS 的优先级是同一个思路：**就近生效**。

生活类比：你在自己抽屉找一份文件，没有就去部门柜子找，再去总档案室找。找到就停，不会继续翻更远的地方。三层都没有，才告诉你「没有这份文件」。

方法查找也是同一条链。`p1.say()` 时，`p1` 自己没有 `say`，去 `Person.prototype` 找到并调用，调用时 `this` 仍然是 `p1`（第 10 章的规则）。

## new 到底做了什么

`new Person('小明')` 看起来是一个操作，实际包含四步：

1. 创建一个空对象 `{}`；
2. 把这个空对象的原型指向 `Person.prototype`；
3. 把这个空对象作为 `this`，执行 `Person` 函数；
4. 如果构造函数没有返回对象，就返回这个新对象；如果返回了对象，就返回那个对象。

手写一个 `myNew` 可以验证：

```js
function myNew(Fn, ...args) {
  const obj = Object.create(Fn.prototype);
  const result = Fn.apply(obj, args);
  const isObject = result !== null && (typeof result === 'object' || typeof result === 'function');
  return isObject ? result : obj;
}

function Person(name) {
  this.name = name;
}

const p = myNew(Person, '小明');
console.log(p.name);                  // 输出: 小明
console.log(p instanceof Person);     // 输出: true
```

`Object.create(Fn.prototype)` 一次完成了第 1、2 步；`Fn.apply(obj, args)` 完成第 3 步；最后判断返回值，完成第 4 步。

第 4 步容易被忽略：如果构造函数显式返回了一个对象，`new` 会把这个对象交出去，而不是新建的那个。日常构造函数不写 `return`，所以这条规则很少碰到，但面试和读源码时会遇到。

`new` 的第 2 步决定了实例能继承哪些方法，第 3 步决定了构造函数里的 `this` 是谁，第 4 步决定了最终拿到什么。把这三件事分开记，比死记「`new` 创建对象」有用得多。

:::warn
`new` 只对「可构造」的函数有效。箭头函数没有 `prototype`，也没有自己的 `this`，所以不能被 `new`。class 可以，但必须用 `new` 调用。
:::

## instanceof 的判断依据

`instanceof` 常被误解成「判断是谁创建了它」。它实际做的事是：**看右边的 `prototype` 是否出现在左边对象的原型链上**。

```js
function Person() {}
const p = new Person();

console.log(p instanceof Person);                          // 输出: true
console.log(p instanceof Object);                          // 输出: true
console.log([] instanceof Array);                          // 输出: true
console.log([] instanceof Object);                         // 输出: true
console.log(null instanceof Object);                       // 输出: false
console.log(Object.create(null) instanceof Object);        // 输出: false
```

`p instanceof Person` 为 `true`，因为 `p` 的原型链上有 `Person.prototype`。`p instanceof Object` 也为 `true`，因为这条链继续往上还有 `Object.prototype`。

`[] instanceof Array` 和 `[] instanceof Object` 同时为 `true`，因为数组的原型链是 `Array.prototype → Object.prototype → null`。

`Object.create(null)` 创建的对象没有原型链，所以对 `Object` 也返回 `false`。

它也有覆盖不到的地方：原始类型不是对象，`'abc' instanceof String` 是 `false`，判断字符串还是得用 `typeof`（第 2 章）。

`instanceof` 只适合判断自定义对象和内置对象，不适合判断「这个对象长什么样」。如果两个库各自有一份自己的 `Array` 实现（比如 iframe 之间），跨窗口的数组可能 `instanceof Array` 为 `false`，因为它们的 `Array.prototype` 不是同一个对象。这种场景要用 `Array.isArray()`。

## Object.create 与 Object.getPrototypeOf

`Object.create(proto)` 创建一个新对象，并直接把它的原型设为 `proto`，不执行任何构造函数：

```js
const base = {
  greet() {
    console.log('你好，' + this.name);
  },
};

const user = Object.create(base);
user.name = '小明';

user.greet();   // 输出: 你好，小明
console.log(Object.getPrototypeOf(user) === base);   // 输出: true
```

`user` 自己没有 `greet`，通过原型找到 `base.greet`，调用时 `this` 是 `user`，所以读到 `user.name`。

`Object.create(null)` 可以创建一个「没有原型」的纯净对象，适合当字典用，避免和 `Object.prototype` 上的属性撞名：

```js
const dict = Object.create(null);
dict.key = 'value';

console.log(dict.key);   // 输出: value
// dict.hasOwnProperty('key');   // TypeError: dict.hasOwnProperty is not a function
```

代价是它连 `hasOwnProperty`、`toString` 都没有。要用这些方法，得写 `Object.prototype.hasOwnProperty.call(dict, 'key')`。

这也是为什么很多库用 `Object.create(null)` 存缓存或字典：不用担心 `toString`、`constructor` 这些继承来的名字和业务键撞车。

`Object.getPrototypeOf(obj)` 用来读取原型，比 `obj.__proto__` 更标准，也不会被对象自己的 `__proto__` 属性干扰。想修改原型用 `Object.setPrototypeOf`，但性能不好，日常更推荐在创建时用 `Object.create` 指定。

## class 语法

`class` 是 ES6 引入的写法，把「构造函数 + 原型方法」包装成更接近其他语言的形式：

```js
class Person {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }

  say() {
    console.log(this.name + '，' + this.age + ' 岁');
  }

  static create(name, age) {
    return new Person(name, age);
  }

  get info() {
    return this.name + '（' + this.age + '）';
  }

  set info(value) {
    const parts = value.split(',');
    this.name = parts[0];
    this.age = Number(parts[1]);
  }
}

const p = Person.create('小明', 18);
p.say();                 // 输出: 小明，18 岁
console.log(p.info);     // 输出: 小明（18）
p.info = '小红,20';
console.log(p.name);     // 输出: 小红
console.log(p.age);      // 输出: 20
console.log(p.create);   // 输出: undefined
```

逐个部分看：

- `constructor` 是构造函数，`new` 时执行。实例独有的属性写在这里，比如 `name`、`age`。它默认返回新实例；如果显式 `return` 一个对象，这个对象会替换掉新实例，规则和第 10 章讲 `new` 时一致。
- `say()` 是实例方法，自动放到 `Person.prototype` 上，所有实例共享。
- `static create()` 是静态方法，挂在 `Person` 这个类本身，不在原型上。所以 `Person.create()` 能调用，`p.create` 是 `undefined`。
- `get info()` 和 `set info()` 是访问器。读 `p.info` 时执行 getter，写 `p.info = ...` 时执行 setter。访问器也定义在原型上。
- `p.info = '小红,20'` 触发了 setter，把字符串拆开，分别写回 `name` 和 `age`。

静态方法适合放「和类相关、但不需要实例」的工具，比如 `Person.create` 这种工厂方法、`Array.from` 这种转换方法。它不依赖实例，调用时不用先创建对象；静态方法里的 `this` 指向类本身，继承时会指向子类，后面 `Student.create()` 的例子就利用了这一点。

实例属性也可以写成 class field，直接放在类体里：

```js
class Counter {
  #count = 0;

  add() {
    this.#count += 1;
    return this.#count;
  }

  get value() {
    return this.#count;
  }
}

const c = new Counter();
console.log(c.add());     // 输出: 1
console.log(c.add());     // 输出: 2
console.log(c.value);     // 输出: 2
// console.log(c.#count); // SyntaxError: Private field '#count' must be declared in an enclosing class
```

`#count` 是**私有字段**，以 `#` 开头，只能在 class 内部访问。外部直接写 `c.#count` 在语法解析阶段就会报错，不是运行时返回 `undefined`。这比闭包实现私有变量更彻底，也比约定「下划线开头表示私有」可靠。

class field 和构造函数里写 `this.count = 0` 的效果类似，区别是 field 会在构造函数体执行前初始化；如果是派生类，则在 `super()` 返回之后、构造函数剩余代码执行之前初始化。私有字段必须先在类体里声明，不能直接 `this.#x = 1` 就用。

要注意，class field 是在每个实例上各初始化一份，不是在原型上共享。所以 `count = 0` 写在类体里，等价于在构造函数里写 `this.count = 0`；真正共享的方法仍然只有 `say()` 这种原型方法。把「数据放实例、方法放原型」这句话套进去，就不会混。

## 继承：extends 与 super

`extends` 让子类继承父类的原型，`super` 用来调用父类的构造函数或方法：

```js
class Person {
  constructor(name) {
    this.name = name;
  }

  say() {
    console.log('我是' + this.name);
  }
}

class Student extends Person {
  constructor(name, grade) {
    super(name);
    this.grade = grade;
  }

  say() {
    super.say();
    console.log('我在读' + this.grade + '年级');
  }
}

const s = new Student('小明', 3);
s.say();
// 输出: 我是小明
// 输出: 我在读3年级

console.log(Object.getPrototypeOf(Student.prototype) === Person.prototype);   // 输出: true
```

`Student.prototype` 的原型被设为 `Person.prototype`，所以 `Student` 的实例既能用自己原型上的方法，也能用 `Person.prototype` 上的方法。这条链可以继续往上到 `Object.prototype`，再到 `null`。

`say()` 是方法重写（override）：子类定义了同名方法，会遮蔽父类的。想保留父类行为，就在子类方法里先调 `super.say()`，再追加自己的逻辑。

方法重写体现的是「多态」：同一个 `say()` 调用，`Person` 实例执行父类版本，`Student` 实例执行子类版本。调用方不需要判断对象到底是哪个类，只要它会 `say()` 就行。这种「按对象实际类型找方法」的行为，前端组件、错误类型、插件系统里到处都是。

### 为什么 super 必须在 this 之前

子类构造函数里，`this` 不是自己创建的，而是由父类构造函数创建并传回来的。`super()` 之前，`this` 还没有初始化，访问它会直接报错：

```js
class Person {
  constructor(name) {
    this.name = name;
  }
}

class Student extends Person {
  constructor(name) {
    this.name = name;   // ReferenceError: Must call super constructor in derived class before accessing 'this' or returning from derived constructor
    super(name);
  }
}

new Student('小明');
```

报错文案很长，但意思清楚：**派生类的构造函数里，访问 `this` 或返回之前，必须先调用 super**。

可以这样理解：父类负责「造房子」，子类负责「装修」。`super()` 是把房子造好并交给你，拿到房子（`this`）之后，你才能往里搬家具（`this.grade = grade`）。

如果子类没有写 `constructor`，JS 会自动补一个，等价于 `constructor(...args) { super(...args); }`。所以简单的继承可以完全省略构造函数。

### 静态方法也会继承

`extends` 不只连接实例的原型，也连接两个构造函数本身：

```js
class Person {
  static create() {
    return new this();
  }
}

class Student extends Person {}

const s = Student.create();
console.log(s instanceof Student);   // 输出: true
```

`Student.create()` 能找到 `Person.create`，因为 `Object.getPrototypeOf(Student) === Person`。调用时 `this` 是 `Student`，所以 `new this()` 创建的是 `Student` 实例，不是 `Person`。这是静态方法里用 `this` 的一个实用场景。

## class 只是原型的语法糖

同一个功能，用构造函数和 class 各写一遍：

```js
function PersonOld(name) {
  this.name = name;
}

PersonOld.prototype.say = function () {
  console.log(this.name);
};

class PersonNew {
  constructor(name) {
    this.name = name;
  }

  say() {
    console.log(this.name);
  }
}

const a = new PersonOld('小明');
const b = new PersonNew('小红');

a.say();   // 输出: 小明
b.say();   // 输出: 小红

console.log(typeof PersonOld);                                   // 输出: function
console.log(typeof PersonNew);                                   // 输出: function
console.log(Object.getOwnPropertyNames(PersonNew.prototype));   // 输出: [ 'constructor', 'say' ]
console.log(b.say === PersonNew.prototype.say);                  // 输出: true
```

`typeof PersonNew` 是 `'function'`，`b.say` 就挂在 `PersonNew.prototype` 上。class 并没有发明新的继承机制，它只是让「构造函数 + 原型方法」写起来更整齐。

两者也有实际差异，不能完全画等号：

- class 声明有 TDZ，必须先定义后使用；函数声明会整体提升。
- class 必须用 `new` 调用，直接写 `PersonNew()` 会报 `TypeError: Class constructor PersonNew cannot be invoked without 'new'`；普通构造函数不带 `new` 也能执行，只是 `this` 会不对。
- class 内部默认严格模式；普通构造函数所在的脚本不一定是严格模式。
- class 的方法默认不可枚举；用 `PersonOld.prototype.say = ...` 赋值的方法是可枚举的。这会影响 `for...in` 和 `Object.keys`。

方法不可枚举这点很实用：用 `for...in` 遍历实例时，不会突然冒出 `say` 这些方法名。构造函数写法如果直接赋值到 `prototype`，就需要额外用 `Object.defineProperty` 把它们设成不可枚举，class 帮你省了这一步。

验证 TDZ 和「必须 new」：

```js
// console.log(PersonNew);   // ReferenceError: Cannot access 'PersonNew' before initialization

class PersonNew {}

// PersonNew();   // TypeError: Class constructor PersonNew cannot be invoked without 'new'
```

:::warn
class 声明会被提升，但提升后处于暂时性死区，声明前访问报 `ReferenceError`。不要把「提升」理解成「可以在定义前使用」，第 9 章的 TDZ 在这里同样适用。
:::

## 为什么箭头函数不能当构造函数

```js
const Person = (name) => {
  this.name = name;
};

// new Person('小明');   // TypeError: Person is not a constructor
```

`new` 需要两样东西：一个可以当 `this` 的新对象，以及一个用来挂共享方法的 `prototype`。箭头函数两样都没有：

- 它没有自己的 `this`，第 10 章讲过，它的 `this` 来自外层，`new` 无法把它换成新对象；
- 它没有 `prototype` 属性，`new` 无法建立原型链。

所以箭头函数只能当普通函数或回调，不能当构造函数。想用函数式写法创建对象，直接用对象字面量或工厂函数就够了，不需要 `new`。

## 不要修改内置原型

给 `Array.prototype` 加方法看起来很方便：

```js
Array.prototype.first = function () {
  return this[0];
};

const arr = [1, 2, 3];
console.log(arr.first());   // 输出: 1

for (const key in arr) {
  console.log(key);
}
// 输出: 0
// 输出: 1
// 输出: 2
// 输出: first
```

`for...in` 本来只该遍历数组的下标，现在多出了一个 `first`。因为用 `=` 赋值到原型上的属性是可枚举的，`for...in` 会把继承来的可枚举属性也列出来。项目里只要有人用 `for...in` 遍历数组，就会莫名其妙多处理一个方法名。

危害不止这一条：

- **命名冲突**：另一个库也定义了 `Array.prototype.first`，后加载的会覆盖前面的，行为突然改变。
- **未来标准冲突**：如果 JS 标准以后给数组加了同名方法，你的自定义版本会挡住它，或者行为不一致。
- **影响所有对象**：改 `Object.prototype` 更严重，所有对象都会继承这个属性，`for...in`、某些库的遍历逻辑全被污染。
- **难以排查**：报错现场在你的业务代码里，根源却在几百行外的原型扩展。

正确做法是写普通工具函数：

```js
function first(arr) {
  return arr[0];
}
```

需要复用的方法就放到自己的类或对象上，不要动内置原型。老项目里看到 `Array.prototype.xxx = ...`，知道它在干什么，但新代码不要模仿。

如果确实需要给某个对象加能力，优先用组合：把工具函数放在一个普通对象上，通过参数传入目标对象，而不是修改它的原型。这样依赖关系是显式的，测试和替换都更容易。

## 常见误区清单

| 写法 | 结果 | 为什么 |
| --- | --- | --- |
| `p.say()` 但 `p` 没定义 `say` | 正常执行 | 方法在 `Person.prototype` 上，沿原型链找到 |
| 把方法写在构造函数里 | 每个实例一份 | 没有共享，浪费内存 |
| `p.__proto__` 与 `Person.prototype` | 相等 | 实例的原型就是构造函数的 `prototype` |
| `Person.prototype` 与 `Person.__proto__` | 不是一回事 | 前者给实例用，后者是函数自身的原型 |
| 整体替换 `Person.prototype` | `constructor` 丢失 | 新对象字面量的 `constructor` 指向 `Object` |
| `instanceof` 判断「谁创建的」 | 不准确 | 它只检查原型链上有没有右边的 `prototype` |
| 声明前使用 class | `ReferenceError` | class 有 TDZ，不会像函数声明那样整体提升 |
| 子类构造函数里先写 `this` | `ReferenceError` | 必须先 `super()` 初始化 `this` |
| `new` 一个箭头函数 | `TypeError` | 箭头函数没有 `prototype`，也没有自己的 `this` |
| 通过实例访问静态方法 | `undefined` | 静态方法挂在类本身，不在原型上 |
| `Array.prototype.foo = ...` | `for...in` 多出 `foo` | 赋值到原型上的属性可枚举 |
| `Object.create(null)` 调用 `hasOwnProperty` | `TypeError` | 它没有原型，继承不到任何方法 |

## 通勤自测

:::quiz 下面这段代码输出什么？
```js
function Person(name) {
  this.name = name;
}
Person.prototype.say = function () {
  console.log(this.name);
};

const p = new Person('小明');
p.say();
console.log(p.hasOwnProperty('say'));
```
输出 `小明` 和 `false`。`say` 不在 `p` 自己身上，而在 `Person.prototype` 上，通过原型链找到；`hasOwnProperty('say')` 检查的是自有属性，所以是 `false`。
:::

:::quiz `p.__proto__`、`Person.prototype`、`Person.prototype.constructor` 分别是什么关系？
`p.__proto__ === Person.prototype`，实例的原型就是构造函数的 `prototype`；`Person.prototype.constructor === Person`，原型对象回指构造函数。`p.constructor` 也是通过原型链拿到这个 `constructor`。
:::

:::quiz 下面这段代码输出什么？
```js
class Person {
  constructor(name) {
    this.name = name;
  }
  say() {
    console.log('我是' + this.name);
  }
}

class Student extends Person {
  constructor(name, grade) {
    super(name);
    this.grade = grade;
  }
  say() {
    super.say();
    console.log('年级：' + this.grade);
  }
}

const s = new Student('小明', 3);
s.say();
```
先输出 `我是小明`，再输出 `年级：3`。`super.say()` 调用父类方法，然后执行子类追加的逻辑。`s` 同时是 `Student` 和 `Person` 的实例。
:::

:::quiz `new` 操作符做了哪四件事？
创建空对象；把空对象的原型指向构造函数的 `prototype`；以这个对象为 `this` 执行构造函数；如果构造函数返回对象或函数就返回它，否则返回新对象。
:::

:::quiz 为什么子类构造函数里必须先调用 `super()` 才能使用 `this`？
子类的 `this` 由父类构造函数创建并初始化，`super()` 之前它还不存在。提前访问会报 `ReferenceError: Must call super constructor in derived class before accessing 'this'`。
:::

:::quiz 下面这段代码输出什么？
```js
class Person {
  static create() {
    return new this();
  }
}
class Student extends Person {}

const s = Student.create();
console.log(s instanceof Student);
console.log(s instanceof Person);
```
输出两个 `true`。静态方法会被继承，`Student.create()` 调用时 `this` 是 `Student`，`new this()` 创建 `Student` 实例；`Student` 又继承自 `Person`，所以两个判断都为真。
:::

:::quiz 为什么不应该给 `Array.prototype` 添加方法？
用 `=` 添加到原型上的属性是可枚举的，会出现在 `for...in` 里；还可能与第三方库或未来标准重名，互相覆盖。需要工具函数就单独写函数，不要扩展内置原型。
:::

## 动手练习（到电脑上做）

**必做**

1. 用构造函数 + `prototype` 写一个 `Animal`，有 `name` 和 `eat()`；再写 `Dog` 继承 `Animal`，添加 `speak()` 并重写 `eat()`。
   验收：`const d = new Dog('旺财'); d.eat(); d.speak();` 输出正确；`d instanceof Dog` 和 `d instanceof Animal` 都是 `true`。

2. 手写 `myNew(Fn, ...args)`，分别用它和 `new` 创建同一个构造函数的实例，对比 `name`、`instanceof` 和原型关系。
   验收：两种方式得到的对象结构一致，`Object.getPrototypeOf(p) === Person.prototype` 为 `true`。

3. 用 class 重写第 1 题，加上 `static create(name)`、`get info()` 和一个 `#energy` 私有字段，外部不能直接改 `#energy`。
   验收：`Dog.create('旺财')` 能用；`d.info` 返回预期字符串；`d.#energy` 在语法上就报错。

**进阶**

4. 写一个 `describeChain(obj)`，用 `Object.getPrototypeOf` 循环向上打印每一层原型，直到 `null`。用它分别检查一个普通对象、一个数组和一个 class 实例。
   验收：三层输出完整，数组能打印出 `Array.prototype` 和 `Object.prototype`，class 实例能打印出类原型。

5. 不用 `Array.prototype`，写一个工具模块 `arrayUtils`，提供 `first(arr)`、`last(arr)`、`unique(arr)`。再用 `for...in` 遍历一个普通数组，证明没有多出任何方法名。
   验收：三个函数结果正确；`for...in` 只输出 `0`、`1`、`2` 这样的下标。

:::tip
原型链是 JS 对象系统的底层规则。第 12 章的展开运算符、第 15 章的 DOM 元素、第 17 章的错误对象，身上都跑着这条链。`class` 只是让它写起来更顺手，理解原型之后，`class` 就不再是黑盒。

如果你只记三件事：实例自己放数据、共享方法放 `prototype`、`new` 负责把两者连起来。其余的细节，等写代码遇到时再回来查这张关系表。
:::
