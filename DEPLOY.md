# 零基础部署指南：把课程放到网上，手机随时读

这份文档假设你**从来没碰过 GitHub**。所以每一步都会说三件事：点哪里、看到什么算成功、为什么要这么做。

全程免费，不需要服务器，不需要买域名。慢一点做，大约 20 分钟。

---

## 开始之前：三个词先说明白

不懂这三个词，后面的步骤会像天书。

**仓库（repository）**
可以理解成「一个带历史记录的网盘文件夹」。你的代码放进去，GitHub 帮你保存每一次修改，将来想退回旧版本也可以。一个仓库对应一个项目。

**分支（branch）**
仓库里可以有多条并行的线，主线通常叫 `main`。你现在只需要用 `main` 这一条，不用管别的。

**GitHub Pages**
GitHub 免费提供的「静态网页托管」功能。它能把仓库里某个文件夹的文件，直接当成一个网站发布出去，给你一个网址。它只能发布**纯静态**内容（HTML/CSS/JS/图片），不能跑后端——你的课程正好是纯静态的。

---

## 你会得到什么

做完之后：

- 一个网址：`https://你的用户名.github.io/js-course/`
- 手机浏览器能打开，能「添加到主屏幕」当 App 用
- 首次打开后内容缓存到本地，地铁没信号也能读
- 读到哪、哪些读完，自动记在手机上
- 以后改了内容，推一次代码，线上自动更新

---

## 第 0 步：准备三样东西

### 1）GitHub 账号

1. 打开 https://github.com ，点 **Sign up**
2. 填邮箱、密码、用户名
3. 去邮箱点验证链接（**必须验证，否则后面开不了 Pages**）

用户名要记下来。比如你注册的用户名是 `zhangsan`，将来的网址就是 `https://zhangsan.github.io/js-course/`。

### 2）电脑上的 Git

Git 是「把文件传到 GitHub」的工具。先检查有没有：

打开 PowerShell（Windows 开始菜单搜「PowerShell」），输入：

```powershell
git --version
```

- 输出 `git version 2.xx.x` → 已安装，跳到下一步
- 提示「无法识别」→ 去 https://git-scm.com/download/win 下载，一路下一步安装，装完**关掉 PowerShell 重新打开**再检查

### 3）课程文件的位置

这份课程在：

```text
e:\STUDY\My Growth\js-course
```

里面有两个关键文件夹：

- `content/`：20 章的 Markdown 源文件（你以后改内容改这里）
- `docs/`：构建出来的网页（**GitHub Pages 只发布这个文件夹**）

---

## 第 1 步：告诉 Git 你是谁

Git 每次提交都要记录「是谁改的」，所以先配置一次。以后不用再配。

在 PowerShell 里逐条执行，把引号里的内容换成你自己的：

```powershell
git config --global user.name "你的GitHub用户名"
git config --global user.email "你的GitHub注册邮箱"
git config --global init.defaultBranch main
```

三条命令分别在做什么：

| 命令 | 作用 |
| --- | --- |
| `user.name` | 提交记录里显示的名字 |
| `user.email` | 提交记录里的邮箱，建议和 GitHub 一致 |
| `init.defaultBranch main` | 新建仓库时默认分支叫 `main`，和 GitHub 保持一致 |

检查是否生效：

```powershell
git config --global --list
```

能看到 `user.name=...` 和 `user.email=...` 两行，就成功了。

> `--global` 表示「对这台电脑上所有项目生效」，只需执行一次。

---

## 第 2 步：重新生成一次网页

进入课程目录，运行构建脚本：

```powershell
cd "e:\STUDY\My Growth\js-course"
node tools/build.mjs
```

预期输出：

```text
构建完成：20 章 -> E:\STUDY\My Growth\js-course\docs
```

然后确认三个关键文件都在（缺一个线上就会出问题）：

```powershell
Test-Path docs/.nojekyll
Test-Path docs/sw.js
Test-Path docs/manifest.webmanifest
```

三条都返回 `True` 才继续。如果有一条是 `False`，先重新运行一次 `node tools/build.mjs`。

这三个文件分别是：

| 文件 | 作用 |
| --- | --- |
| `.nojekyll` | 告诉 GitHub「不要用 Jekyll 处理我的文件」，否则某些文件会被忽略 |
| `sw.js` | Service Worker，负责把内容缓存到手机，实现离线阅读 |
| `manifest.webmanifest` | 让浏览器知道这个网站可以「安装」到桌面 |

---

## 第 3 步：在本地建立一个版本库

现在文件夹里只是普通文件，还不是「仓库」。执行：

```powershell
cd "e:\STUDY\My Growth\js-course"
git init
```

预期输出：

```text
Initialized empty Git repository in E:/STUDY/My Growth/js-course/.git/
```

这会在目录里生成一个隐藏的 `.git` 文件夹，所有历史记录都存在里面。**不要删除它**。

接着把文件「装进箱子」：

```powershell
git add .
```

这条命令没有输出，属于正常。

> `git add .` 的意思是「把当前目录下所有改动标记为：下次提交时包含它们」。`.` 代表当前目录。这一步叫「暂存」。

然后正式提交：

```powershell
git commit -m "feat: JS 通勤课 v1（20 章）"
```

预期输出类似：

```text
[main (root-commit) 3f2a1b9] feat: JS 通勤课 v1（20 章）
 45 files changed, 12000 insertions(+)
```

`-m` 后面是这次提交的说明，写清楚「做了什么」。以后每次提交都要写。

检查一下当前状态：

```powershell
git status
```

看到 `nothing to commit, working tree clean` 就说明都提交好了。

> **为什么整个目录都提交？**
> `content/` 是源文件，`tools/` 是构建脚本。一起传上去，将来你在另一台电脑 clone 下来就能继续改内容、重新构建。真正发布成网页的只有 `docs/`。

---

## 第 4 步：在 GitHub 上开一个空仓库

这一步在网页上做。

1. 登录 GitHub，点右上角的 **`+`**，选 **New repository**
2. **Repository name** 填：`js-course`
   - 这个名字会出现在网址里
   - 只能用英文、数字、`-`、`_`
3. **Description**（描述）随便写，例如 `JS 学习资料（通勤版）`
4. 下面三个选项：
   - **Public** ← 选这个
   - Private ← 不要选
5. **Initialize this repository with** 下面的三个勾选框（README / .gitignore / license）**全部不要勾**
6. 点绿色按钮 **Create repository**

### 为什么要选 Public

GitHub 免费账号的 Pages 功能只对**公开仓库**开放。私有仓库要用 Pages 得买 Pro。

你的内容是学习笔记，公开没有影响，而且别人也能看。

### 为什么不要勾 README

如果勾了，GitHub 会先在远程仓库里建一个提交。你本地也有一份提交，两边「历史不一致」，推送时会被拒绝，需要多做一步合并——新手最容易卡在这里。

### 成功后你会看到什么

页面跳转到一个空仓库，中间有一大段命令行提示，标题类似：

```text
Quick setup — if you've done this kind of thing before
```

不用照着它做，下一步我们用自己的命令。

---

## 第 5 步：把本地内容推上去

### 5.1 告诉 Git「远程仓库在哪」

把 `<你的用户名>` 换成你的真实用户名（**尖括号也要去掉**）：

```powershell
cd "e:\STUDY\My Growth\js-course"
git remote add origin https://github.com/<你的用户名>/js-course.git
```

`origin` 是给这个远程地址起的外号，以后 `git push` 就知道往哪推。这条命令成功时没有输出。

### 5.2 推送

```powershell
git push -u origin main
```

`-u` 的意思是「记住这个对应关系」，以后只需要敲 `git push` 就行。

### 5.3 登录：这里会卡住很多人

推送时会弹出一个窗口要求登录。**GitHub 已经不支持用账号密码推送**，如果输密码会报：

```text
remote: Support for password authentication was removed on August 13, 2021.
fatal: Authentication failed
```

正确做法是用 **Personal Access Token（PAT）**，把它当成「专用密码」。

**生成步骤：**

1. 登录 GitHub，点右上角头像 → **Settings**
2. 左侧菜单拉到最下面 → **Developer settings**
3. 展开 **Personal access tokens** → 点 **Tokens (classic)**
4. 右上角 **Generate new token** → **Generate new token (classic)**
5. 可能会要求输入密码确认，照做
6. **Note** 填：`push-js-course`
7. **Expiration** 选 `90 days`（90 天后过期，到时重新生成一个）
8. **Select scopes** 勾选 **`repo`**（勾这一整项，它下面的子项会自动勾上）
9. 拉到最底部，点 **Generate token**
10. 页面会显示一串 `ghp_` 开头的字符，**点复制**，先粘到记事本里

> 这串 token 只显示一次，关掉页面就再也看不到。丢了只能重新生成。

**回到 PowerShell 的弹窗：**

- 用户名：填 GitHub 用户名
- 密码：**粘贴那串 token**（不是你的登录密码）

Windows 会把它记到「凭据管理器」，以后同一台电脑不用再输。

### 5.4 怎么算成功

终端显示类似：

```text
Enumerating objects: 45, done.
...
To https://github.com/你的用户名/js-course.git
 * [new branch]      main -> main
branch 'main' set up to track 'origin/main'.
```

然后刷新 GitHub 仓库页面，能看到 `content`、`docs`、`tools`、`assets` 等文件夹。

如果看到的是空仓库页面，说明推送没成功，看文末「常见问题」第 3 条。

---

## 第 6 步：打开 Pages 开关

文件已经在 GitHub 上了，但还没「变成网站」。这一步就是开开关。

1. 打开你的仓库页面
2. 点顶部菜单的 **Settings**（齿轮图标）
3. 左侧栏找到 **Pages**（在 Code and automation 那一组里）
4. **Build and deployment** 区域：
   - **Source** 下拉选 **Deploy from a branch**
   - **Branch** 下拉选 **`main`**
   - 右边的文件夹下拉选 **`/docs`**
     - 注意：**不是 `/root`**。选错会发布仓库根目录，首页打不开
5. 点 **Save**
6. 等 30 秒 ~ 2 分钟，刷新这个页面

### 成功的标志

页面顶部会出现一条绿色提示，类似：

```text
Your site is live at https://你的用户名.github.io/js-course/
```

旁边有 **Visit site** 按钮。

### 如果一直显示 404

先等 2 分钟再刷新，首次部署偶尔要 3~5 分钟。仍然不行，按顺序检查：

- 仓库是不是 Public
- Pages 的 Branch 是不是 `main`、文件夹是不是 `/docs`
- 仓库名和网址里的名字是否完全一致（大小写敏感）

---

## 第 7 步：在电脑上验收

打开 `https://你的用户名.github.io/js-course/`，按这张表逐项过一遍。全部通过再去弄手机。

| 检查项 | 预期结果 | 不通过说明什么 |
| --- | --- | --- |
| 首页能打开 | 标题「JS 通勤课」，20 张章节卡 | Pages 没配好或还没部署完 |
| 页面有样式 | 米色背景、卡片圆角、进度环 | Pages 目录选成了 `/root` |
| 点第 1 章 | 能进正文，顶栏显示章节标题 | 链接或部署不完整 |
| 底部导航 | 第 1 章「上一章」灰色，「下一章」可点 | 正常 |
| 滚到中间刷新 | 回到原位置并弹出「已回到上次位置」 | 浏览器禁用了 localStorage |
| 点「标记本章已读完」 | 按钮变成「已读完 · 点击取消」 | 同上 |
| 回首页 | 进度环数字增加，对应卡片变样式 | 同上 |
| 搜索框输入「闭包」 | 列表只剩相关章节 | 正常 |
| 按 F12 看 Console | 没有红色报错 | 有报错把内容发我 |
| 直接访问 `.../sw.js` | 显示一段 JS 代码 | 404 说明 docs 不完整 |
| 直接访问 `.../manifest.webmanifest` | 显示 JSON | 同上 |

---

## 第 8 步：装到手机主屏幕

### 先说什么浏览器能装

「添加到主屏幕」有两种，效果完全不同：

| 方式 | 效果 |
| --- | --- |
| 真正的 PWA 安装 | 独立图标、全屏无地址栏、**能离线**、进度独立保存 |
| 普通快捷方式 | 只是一个书签，打开后还在浏览器里，**不一定能离线** |

### 你的夸克浏览器

夸克（Quark）是阿里系的 Chromium 浏览器。它的「添加到主屏幕」**是把网页做成快捷方式**，不是真正的 PWA 安装：

- 图标能加到桌面，但点开还在夸克里，可能带夸克自己的工具栏
- Service Worker 的离线缓存不保证生效
- 也可能不显示「安装应用」入口

所以：**想获得完整的离线阅读体验，建议换浏览器**。

推荐：

- **Android**：Chrome 或 Edge（都在应用商店能搜到）
- **iPhone / iPad**：只能用 **Safari**（iOS 上别的浏览器都不能安装 PWA）

如果不想装新浏览器，夸克也能正常读——只是每次打开要联网，且没有全屏体验。

### Android：Chrome 安装步骤

1. 打开 Chrome，地址栏输入 `https://你的用户名.github.io/js-course/`
2. 等页面完全加载（首次会下载全部 20 章到本地）
3. 点右上角 **⋮**
4. 选 **安装应用**（有的版本写「添加到主屏幕」）
5. 弹窗点 **安装**
6. 回到桌面，会多一个图标

### iPhone / iPad：Safari 安装步骤

1. 用 Safari 打开网址
2. 点底部中间的 **分享** 按钮（方框 + 向上箭头）
3. 往下滑，找到 **添加到主屏幕**
4. 名称可以改成「JS 课」
5. 点右上角 **添加**

### 如果链接是在微信里打开的

微信内置浏览器不能安装。点右上角 **···** → **在浏览器中打开**，再用 Chrome / Safari 打开一次。

---

## 第 9 步：验证离线能用

这一步很重要，它决定了你通勤时能不能读。

1. 用桌面图标打开课程
2. 随便进两三章，翻一翻，返回首页
3. 打开手机的**飞行模式**（或关掉 Wi-Fi 和流量）
4. 从桌面图标重新打开

预期：首页和刚才访问过的章节仍能打开，进度还在。

如果打不开，说明浏览器不支持 Service Worker，或者首次加载没完成。换成 Chrome / Safari 再试。

> 没访问过的章节离线时可能打不开，这是正常的：缓存是按需补齐的，多读几章就全了。

---

## 第 10 步：以后怎么改内容

改 `content/*.md` 之后，固定三步：

```powershell
cd "e:\STUDY\My Growth\js-course"

# 1. 重新构建
node tools/build.mjs

# 2. 提交（把改动记进历史）
git add .
git commit -m "docs: 更新第 06 章数组方法"

# 3. 推送（传到 GitHub）
git push
```

推送后：

- GitHub 需要 1~2 分钟重新发布
- 手机上因为有离线缓存，通常要**彻底关闭页面再重开两次**才会看到新版本（第一次下载新缓存，第二次生效）
- `sw.js` 在 GitHub 的 CDN 上最长缓存 10 分钟，所以最慢要等 10 分钟
- 想立刻确认新版：用浏览器**无痕窗口**打开网址，无痕模式不带旧缓存

---

## 名词小词典

| 词 | 一句话解释 |
| --- | --- |
| 仓库 repository | 带版本历史的项目文件夹 |
| 分支 branch | 仓库里的一条线，主线叫 `main` |
| 暂存区 | `git add` 之后、`commit` 之前的「待提交清单」 |
| 提交 commit | 给当前文件状态拍一张快照，存进历史 |
| 远程 remote | GitHub 上的那个仓库，本地给它起外号 `origin` |
| 推送 push | 把本地提交传到远程 |
| 拉取 pull | 把远程的改动取回本地 |
| Pages | GitHub 的免费静态网站托管 |
| 部署 deploy | 把文件发布成可访问的网站 |
| HTTPS | 加密的网页协议，PWA 必须有它 |
| PWA | 可以「安装」到桌面的网页应用 |
| Service Worker | 在后台运行、负责缓存文件的脚本，离线靠它 |
| localStorage | 浏览器里的本地小仓库，你的阅读进度存在这里 |
| PAT | Personal Access Token，推送时当密码用的令牌 |

---

## 常见问题

**1）`git` 不是内部或外部命令**

Git 没装或没进 PATH。重新安装 Git for Windows，装完**关掉 PowerShell 再打开**。

**2）`fatal: not a git repository`**

没在课程目录里执行。先 `cd "e:\STUDY\My Growth\js-course"`，再执行命令。

**3）`git push` 报 `remote: Support for password authentication was removed`**

用了登录密码。按第 5.3 节生成 PAT，密码处粘贴 token。

**4）`git push` 报 `rejected` / `failed to push some refs`**

远程仓库建的时候勾了 README，已有初始提交。执行：

```powershell
git pull origin main --allow-unrelated-histories
```

如果弹出编辑器要你写合并信息，直接保存关闭（VS Code 里按 `Ctrl+S` 再关标签页）。然后：

```powershell
git push -u origin main
```

**5）`remote origin already exists`**

之前加过远程地址。改成：

```powershell
git remote set-url origin https://github.com/<你的用户名>/js-course.git
git push -u origin main
```

**6）Pages 页面一直 404**

按顺序查：仓库是否 Public；Pages 的 Branch 是否 `main`、目录是否 `/docs`；是否刚 Save 不到 2 分钟；仓库名与网址是否完全一致。

**7）页面能打开，但完全没有样式**

Pages 的目录选成了 `/root`。改成 `/docs`，Save，等 1 分钟。

**8）首页能开，点章节 404**

`docs/ch/` 没传上去，或构建不完整。在本地执行 `node tools/build.mjs`，确认 `docs/ch/01.html` 到 `20.html` 都在，再 `git add .` 提交推送。

**9）手机上打开是旧内容**

离线缓存。彻底关闭标签页再打开两次；仍不行用无痕窗口确认线上是否已更新。

**10）夸克加不到桌面，或者加完还是浏览器界面**

夸克的「添加到主屏幕」只是快捷方式。换 Chrome / Edge（Android）或 Safari（iOS）才能得到真正的安装效果。

**11）手机上进度没了**

进度存在浏览器本地，按「域名 + 浏览器」隔离。换浏览器、清除浏览器数据、换域名，都会读不到旧进度。补救：在旧环境首页「导出进度」得到 JSON，在新环境「导入进度」。

**12）想改仓库名或用户名**

仓库名可以在 Settings 顶部 Rename 改，但网址会变，手机上要删掉旧图标重新添加。用户名改动影响更大，不建议。

---

## 附录：完全不想用命令行

用 GitHub Desktop 也能完成，步骤等价：

1. 下载安装 https://desktop.github.com ，用 GitHub 账号登录
2. **File → Add local repository**，选择 `e:\STUDY\My Growth\js-course`
3. 如果提示 not a Git repository，点 **create a repository** 就地创建
4. 左下角 Summary 填 `feat: JS 通勤课 v1`，点 **Commit to main**
5. 顶部 **Publish repository**
   - Name 填 `js-course`
   - **取消勾选 Keep this code private**
6. 点 **Publish repository**
7. 之后仍按第 6 步开 Pages

以后更新：改完 md → 运行 `node tools/build.mjs` → Desktop 里写 Summary → **Commit to main** → **Push origin**。

---

## 检查清单

做完一项打个勾：

```text
[ ] GitHub 账号注册完成，邮箱已验证
[ ] git --version 能输出版本号
[ ] git config user.name / user.email 已设置
[ ] node tools/build.mjs 执行成功
[ ] docs/.nojekyll、docs/sw.js、docs/manifest.webmanifest 都存在
[ ] git init / add / commit 完成，git status 是 clean
[ ] GitHub 上创建了 Public 仓库 js-course（没勾 README）
[ ] git remote add origin 完成
[ ] git push -u origin main 成功，仓库里能看到文件
[ ] Pages 设置为 main + /docs，看到 "Your site is live at..."
[ ] 电脑上首页、章节、刷新续读、标记已读全部正常
[ ] 手机 Chrome 或 Safari 安装到主屏幕成功
[ ] 飞行模式下仍能打开读过的章节
[ ] 知道以后改内容的三步命令
```

---

## 附：网址规律

| 仓库名 | 访问地址 |
| --- | --- |
| `js-course` | `https://你的用户名.github.io/js-course/` |
| `你的用户名.github.io` | `https://你的用户名.github.io/` |

当前方案是第一种：仓库名 `js-course`，发布目录 `/docs`。
