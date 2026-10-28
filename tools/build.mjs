import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeIcons } from './icons.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'content');
const OUT = path.join(ROOT, 'docs');
const ASSETS_SRC = path.join(ROOT, 'assets');

/* ============================ Markdown ============================ */

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const JS_KEYWORDS = [
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case',
  'break', 'continue', 'new', 'class', 'extends', 'super', 'this', 'try', 'catch', 'finally', 'throw',
  'typeof', 'instanceof', 'in', 'of', 'async', 'await', 'yield', 'delete', 'void', 'null', 'undefined',
  'true', 'false', 'import', 'export', 'from', 'default', 'static', 'get', 'set', 'with', 'debugger',
];

function highlight(code, lang) {
  const isJs = /^(js|javascript|ts|typescript|json)$/.test(lang || '');
  if (!isJs) return escapeHtml(code);

  const re = new RegExp(
    [
      '(\\/\\*[\\s\\S]*?\\*\\/|\\/\\/[^\\n]*)',                       // 1 comment
      '(`(?:\\\\[\\s\\S]|[^`\\\\])*`|"(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\')', // 2 string
      '\\b(' + JS_KEYWORDS.join('|') + ')\\b',                       // 3 keyword
      '(\\b\\d+(?:\\.\\d+)?\\b)',                                    // 4 number
      '([A-Za-z_$][\\w$]*)(?=\\s*\\()',                              // 5 call
    ].join('|'),
    'g'
  );

  let out = '';
  let last = 0;
  let m;
  while ((m = re.exec(code))) {
    out += escapeHtml(code.slice(last, m.index));
    const cls = m[1] ? 'tok-c' : m[2] ? 'tok-s' : m[3] ? 'tok-k' : m[4] ? 'tok-n' : 'tok-f';
    out += '<span class="' + cls + '">' + escapeHtml(m[0]) + '</span>';
    last = m.index + m[0].length;
  }
  out += escapeHtml(code.slice(last));
  return out;
}

function inline(text) {
  const parts = text.split(/(`[^`]+`)/g);
  return parts
    .map((part) => {
      if (/^`[^`]+`$/.test(part)) {
        return '<code>' + escapeHtml(part.slice(1, -1)) + '</code>';
      }
      let s = escapeHtml(part);
      s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, href) => {
        const external = /^https?:/.test(href);
        return '<a href="' + href + '"' + (external ? ' target="_blank" rel="noopener"' : '') + '>' + t + '</a>';
      });
      s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
      s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
      return s;
    })
    .join('');
}

function isCjk(ch) {
  return /[\u3000-\u9fff\uff00-\uffef]/.test(ch);
}

function joinParagraph(lines) {
  let out = '';
  lines.forEach((line, i) => {
    if (i === 0) { out = line; return; }
    const prev = out.slice(-1);
    const next = line.slice(0, 1);
    out += isCjk(prev) || isCjk(next) ? '' : ' ';
  });
  return out;
}

function parseListItems(lines) {
  const items = [];
  lines.forEach((raw) => {
    const m = raw.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (!m) {
      if (items.length) items[items.length - 1].text += ' ' + raw.trim();
      return;
    }
    items.push({ indent: m[1].replace(/\t/g, '  ').length, ordered: /\d/.test(m[2]), text: m[3] });
  });
  return items;
}

function renderList(items, start, indent) {
  const ordered = items[start].ordered;
  let html = ordered ? '<ol>' : '<ul>';
  let i = start;
  while (i < items.length && items[i].indent >= indent) {
    if (items[i].indent > indent) { i++; continue; }
    html += '<li>' + inline(items[i].text);
    i++;
    if (i < items.length && items[i].indent > indent) {
      const sub = renderList(items, i, items[i].indent);
      html += sub.html;
      i = sub.next;
    }
    html += '</li>';
  }
  html += ordered ? '</ol>' : '</ul>';
  return { html, next: i };
}

const BLOCK_START = [
  /^```/, /^#{2,6}\s/, /^>\s?/, /^:::/, /^\s*([-*+]|\d+\.)\s+/, /^---+$/, /^!\[/, /^\|/,
];

function startsBlock(line) {
  return BLOCK_START.some((re) => re.test(line));
}

function renderBlocks(lines) {
  let html = '';
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    // 代码块
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { codeLines.push(lines[i]); i++; }
      i++;
      html += '<pre><code class="lang-' + (lang || 'text') + '">' + highlight(codeLines.join('\n'), lang) + '</code></pre>';
      continue;
    }

    // 标题
    const h = line.match(/^(#{2,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      html += '<h' + level + '>' + inline(h[2]) + '</h' + level + '>';
      i++;
      continue;
    }

    // 分割线
    if (/^---+$/.test(line.trim())) { html += '<hr>'; i++; continue; }

    // 自定义块
    const custom = line.match(/^:::(tip|warn|quiz)\s*(.*)$/);
    if (custom) {
      const type = custom[1];
      const title = custom[2] || '';
      const inner = [];
      i++;
      while (i < lines.length && !/^:::\s*$/.test(lines[i])) { inner.push(lines[i]); i++; }
      i++;
      if (type === 'quiz') {
        html += '<details class="quiz"><summary>' + inline(title || '想一想') + '</summary><div class="quiz-body">' + renderBlocks(inner) + '</div></details>';
      } else {
        const label = type === 'tip' ? '提示' : '注意';
        html += '<div class="callout callout-' + type + '"><span class="callout-label">' + label + '</span>' + renderBlocks(inner) + '</div>';
      }
      continue;
    }

    // 引用
    if (/^>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      html += '<blockquote>' + renderBlocks(quote) + '</blockquote>';
      continue;
    }

    // 表格
    if (/^\|/.test(line)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) { rows.push(lines[i]); i++; }
      if (rows.length >= 2) {
        const cells = (r) => r.replace(/^\|/, '').replace(/\|$/, '').split('|').map((s) => s.trim());
        const head = cells(rows[0]);
        const bodyRows = rows.slice(2).filter((r) => !/^\|[\s:|-]+\|?$/.test(r)).map(cells);
        html += '<div class="table-wrap"><table><thead><tr>' +
          head.map((c) => '<th>' + inline(c) + '</th>').join('') +
          '</tr></thead><tbody>' +
          bodyRows.map((r) => '<tr>' + r.map((c) => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') +
          '</tbody></table></div>';
      }
      continue;
    }

    // 列表
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const listLines = [];
      while (i < lines.length && (/^\s*([-*+]|\d+\.)\s+/.test(lines[i]) || (listLines.length && /^\s{2,}\S/.test(lines[i])))) {
        listLines.push(lines[i]);
        i++;
      }
      const items = parseListItems(listLines);
      const res = renderList(items, 0, items[0].indent);
      html += res.html;
      continue;
    }

    // 段落
    const para = [];
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    if (!para.length) { i++; continue; }
    html += '<p>' + inline(joinParagraph(para)) + '</p>';
  }

  return html;
}

function renderMarkdown(md) {
  return renderBlocks(md.replace(/\r\n/g, '\n').split('\n'));
}

/* ============================ 内容装载 ============================ */

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  m[1].split('\n').forEach((line) => {
    const idx = line.indexOf(':');
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    value = value.replace(/^["']|["']$/g, '');
    meta[key] = value;
  });
  return { meta, body: raw.slice(m[0].length) };
}

function loadChapters() {
  const files = fs.readdirSync(CONTENT).filter((f) => f.endsWith('.md')).sort();
  return files.map((file, index) => {
    const raw = fs.readFileSync(path.join(CONTENT, file), 'utf8');
    const { meta, body } = parseFrontmatter(raw);
    const id = meta.id || String(index + 1).padStart(2, '0');
    return {
      id,
      slug: file.replace(/\.md$/, ''),
      title: meta.title || '未命名章节',
      summary: meta.summary || '',
      minutes: meta.minutes || '20',
      keywords: meta.keywords || '',
      body,
      href: 'ch/' + id + '.html',
      index,
    };
  });
}

/* ============================ 页面模板 ============================ */

const ICON = {
  back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  list: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  chevL: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  chevR: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
  home: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10l9-7 9 7v10a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1z"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
};

function chapterPage(ch, prev, next) {
  const navLink = (target, icon, label, cls) => {
    if (!target) {
      return `<a class="is-disabled" href="#" aria-disabled="true" tabindex="-1">${icon}<span>${label}</span></a>`;
    }
    return `<a href="${target.id}.html"${cls ? ' class="' + cls + '"' : ''}>${icon}<span>${label}</span></a>`;
  };
  const prevLink = navLink(prev, ICON.chevL, prev ? '上一章' : '已是第一章');
  const nextLink = navLink(next, ICON.chevR, next ? '下一章' : '已是最后一章');

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${escapeHtml(ch.title)} · JS 通勤课</title>
<meta name="description" content="${escapeHtml(ch.summary)}">
<meta name="theme-color" content="#fbfaf7">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="manifest" href="../manifest.webmanifest">
<link rel="icon" href="../assets/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="../assets/icon-192.png">
<link rel="stylesheet" href="../assets/base.css">
</head>
<body data-page="chapter">
<header class="topbar">
  <div class="topbar-inner">
    <a class="icon-btn" href="../index.html" aria-label="返回目录">${ICON.back}</a>
    <div class="topbar-title">${escapeHtml(ch.title)}</div>
    <button class="icon-btn" type="button" data-font-cycle aria-label="调整字号">Aa</button>
    <button class="icon-btn" type="button" data-top-done aria-pressed="false" aria-label="标记已读">标记已读</button>
  </div>
  <div class="read-progress"></div>
</header>

<main class="container">
  <div class="chapter-head">
    <div class="meta">第 ${ch.id} 章 · 约 ${ch.minutes} 分钟</div>
    <h1>${escapeHtml(ch.title)}</h1>
    ${ch.summary ? `<p class="lede">${escapeHtml(ch.summary)}</p>` : ''}
  </div>

  <nav id="toc" class="chapter-toc" hidden></nav>

  <article id="article">
${renderMarkdown(ch.body)}
  </article>

  <div class="chapter-end">
    <button class="done-btn" type="button" data-done-toggle>标记本章已读完</button>
    <p>读完这一章，就到电脑上把「动手练习」敲一遍。通勤路上看不牢的地方，很正常。</p>
  </div>
</main>

<nav class="bottom-nav">
  ${prevLink}
  <a href="../index.html">${ICON.list}<span>目录</span></a>
  ${nextLink}
</nav>

<script src="../assets/course-data.js"></script>
<script>window.__CHAPTER__ = ${JSON.stringify({ id: ch.id, title: ch.title })};</script>
<script src="../assets/app.js"></script>
</body>
</html>
`;
}

function indexPage(chapters) {
  const cards = chapters
    .map((ch) => `
      <a class="chapter-card" href="${ch.href}" data-id="${ch.id}" data-search="${escapeHtml(ch.title + ' ' + ch.summary + ' ' + ch.keywords)}">
        <span class="chapter-no">${ch.id}</span>
        <span class="chapter-main">
          <span class="chapter-name">${escapeHtml(ch.title)}</span>
          <span class="chapter-sum">${escapeHtml(ch.summary)}</span>
        </span>
        <span class="chapter-state">未开始</span>
      </a>`)
    .join('');

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>JS 通勤课 · 从基础到全栈</title>
<meta name="description" content="面向通勤阅读的 JavaScript 系统课程，每章记住阅读位置，可离线阅读。">
<meta name="theme-color" content="#fbfaf7">
<meta name="apple-mobile-web-app-capable" content="yes">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="assets/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="assets/icon-192.png">
<link rel="stylesheet" href="assets/base.css">
</head>
<body data-page="index">
<header class="topbar">
  <div class="topbar-inner">
    <div class="topbar-title" style="text-align:left;color:var(--ink);font-weight:600;font-size:15px">JS 通勤课</div>
    <a class="icon-btn" href="#settings">${ICON.list}设置</a>
  </div>
</header>

<main class="container">
  <section class="hero">
    <span class="hero-kicker">JAVASCRIPT · 通勤速读版</span>
    <h1>把每天的通勤，变成你的全栈起点</h1>
    <p>${chapters.length} 章系统课程，从语法到异步、DOM、工程化。每章自动记住读到哪儿，下次打开接着读。</p>
  </section>

  <section class="dash">
    <div class="ring" id="ring"><span id="ring-text">0%</span></div>
    <div class="dash-body">
      <div class="dash-label" id="dash-count">0 / ${chapters.length} 章已读完</div>
      <div class="dash-title" id="dash-title">第 ${chapters[0].id} 章 · ${escapeHtml(chapters[0].title)}</div>
      <div class="dash-sub" id="dash-sub">还没开始</div>
      <a class="btn-primary" id="continue-btn" href="${chapters[0].href}">开始学习</a>
    </div>
  </section>

  <div class="search">
    ${ICON.search}
    <input id="search-input" type="search" placeholder="搜索知识点，比如 闭包 / Promise / 事件委托" autocomplete="off">
  </div>
  <p class="dash-sub" id="search-empty" hidden style="margin:8px 0 0">没有匹配的章节，换个关键词试试。</p>

  <div class="section-head">
    <h2>课程目录</h2>
    <span>按顺序读，别跳</span>
  </div>
  <ul class="chapter-list" id="chapter-list">${cards}
  </ul>

  <section class="panel" id="settings">
    <h2>阅读设置</h2>
    <div class="setting-row">
      <span>主题</span>
      <div class="seg">
        <button type="button" data-theme-set="auto">跟随系统</button>
        <button type="button" data-theme-set="light">浅色</button>
        <button type="button" data-theme-set="dark">深色</button>
      </div>
    </div>
    <div class="setting-row">
      <span>正文字号</span>
      <div class="seg">
        <button type="button" data-font-set="16">小</button>
        <button type="button" data-font-set="17">标准</button>
        <button type="button" data-font-set="19">大</button>
      </div>
    </div>
    <div class="setting-row">
      <span>进度备份</span>
      <div class="btn-row" style="margin:0">
        <button class="btn-ghost" type="button" id="export-btn">导出</button>
        <label class="btn-ghost" style="cursor:pointer">导入
          <input id="import-input" type="file" accept="application/json,.json" style="display:none">
        </label>
      </div>
    </div>
    <div class="setting-row">
      <span>清空本机进度</span>
      <button class="btn-ghost" type="button" id="reset-btn">重置</button>
    </div>
  </section>

  <section class="panel" id="install-hint">
    <h2>把课程装到手机上</h2>
    <details>
      <summary><span>iPhone / iPad</span></summary>
      <div class="body">
        <p>用 Safari 打开本页，点底部「分享」按钮，选择「添加到主屏幕」。之后从桌面图标进入，全屏阅读、可离线。</p>
      </div>
    </details>
    <details>
      <summary><span>Android</span></summary>
      <div class="body">
        <p>用 Chrome 打开本页，右上角菜单里选择「添加到主屏幕 / 安装应用」。第一次打开后所有章节会缓存到本机，地铁里没信号也能读。</p>
      </div>
    </details>
    <details>
      <summary><span>进度是怎么记录的</span></summary>
      <div class="body">
        <p>进度保存在当前浏览器的本地存储里：每章的已读状态、上次滚动位置、最后打开的章节。换设备或清理浏览器数据会丢失，所以可以在上面「进度备份」里导出 JSON，换设备后导入。</p>
        <p>手机和平板各记各的进度，互不影响。</p>
      </div>
    </details>
  </section>

  <p class="footnote">
    建议节奏：通勤读 1 章，晚上在电脑上把练习敲一遍。<br>
    读不懂的地方先标记，继续往下读，第二遍再补。
  </p>
</main>

<script src="assets/course-data.js"></script>
<script src="assets/app.js"></script>
</body>
</html>
`;
}

/* ============================ 输出 ============================ */

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  fs.readdirSync(src, { withFileTypes: true }).forEach((entry) => {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  });
}

function build() {
  const chapters = loadChapters();
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, 'ch'), { recursive: true });

  fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
  ['base.css', 'app.js', 'icon.svg'].forEach((file) => {
    fs.copyFileSync(path.join(ASSETS_SRC, file), path.join(OUT, 'assets', file));
  });
  fs.copyFileSync(path.join(ASSETS_SRC, 'manifest.webmanifest'), path.join(OUT, 'manifest.webmanifest'));

  chapters.forEach((ch, idx) => {
    fs.writeFileSync(
      path.join(OUT, 'ch', ch.id + '.html'),
      chapterPage(ch, chapters[idx - 1], chapters[idx + 1])
    );
  });

  fs.writeFileSync(path.join(OUT, 'index.html'), indexPage(chapters));

  const courseData = chapters.map((c) => ({
    id: c.id,
    title: c.title,
    summary: c.summary,
    minutes: c.minutes,
    href: c.href,
  }));
  fs.writeFileSync(
    path.join(OUT, 'assets', 'course-data.js'),
    'window.__COURSE__ = ' + JSON.stringify(courseData, null, 2) + ';\n'
  );

  // Service Worker：预缓存所有页面
  const precache = [
    './',
    './index.html',
    './manifest.webmanifest',
    './assets/base.css',
    './assets/app.js',
    './assets/course-data.js',
    './assets/icon-192.png',
    './assets/icon-512.png',
    ...chapters.map((c) => './' + c.href),
  ];
  const swTemplate = fs.readFileSync(path.join(ASSETS_SRC, 'sw.template.js'), 'utf8');
  const sw = swTemplate
    .replace('__PRECACHE__', JSON.stringify(precache, null, 2))
    .replace('__VERSION__', 'v' + Date.now());
  fs.writeFileSync(path.join(OUT, 'sw.js'), sw);

  writeIcons(path.join(OUT, 'assets'));
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

  console.log('构建完成：' + chapters.length + ' 章 -> ' + OUT);
}

build();
