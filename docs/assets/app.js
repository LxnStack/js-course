/* JS 通勤课 · 阅读器逻辑（无依赖，离线可用） */
(function () {
  'use strict';

  var STORE_KEY = 'js-course-progress-v1';
  var FONT_STEPS = [15, 16, 17, 18, 19, 20, 22];
  var body = document.body;
  var page = body.getAttribute('data-page');

  /* ---------- 存储 ---------- */
  function loadState() {
    var empty = { chapters: {}, last: null, prefs: { theme: 'auto', font: 17 }, version: 1 };
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return empty;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return empty;
      parsed.chapters = parsed.chapters || {};
      parsed.prefs = parsed.prefs || empty.prefs;
      return parsed;
    } catch (e) {
      return empty;
    }
  }

  var state = loadState();

  function saveState() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) {
      /* 隐私模式下写入失败，不影响阅读 */
    }
  }

  function chapterState(id) {
    if (!state.chapters[id]) {
      state.chapters[id] = { done: false, ratio: 0, updatedAt: 0 };
    }
    return state.chapters[id];
  }

  /* ---------- 偏好 ---------- */
  function resolveTheme() {
    var t = state.prefs.theme || 'auto';
    if (t === 'auto') {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return t;
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', resolveTheme());
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', resolveTheme() === 'dark' ? '#14161a' : '#fbfaf7');
  }

  function applyFont() {
    var size = Number(state.prefs.font) || 17;
    document.documentElement.style.setProperty('--read-size', size + 'px');
    saveState();
  }

  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onScheme = function () { if ((state.prefs.theme || 'auto') === 'auto') applyTheme(); };
    if (mq.addEventListener) mq.addEventListener('change', onScheme);
    else if (mq.addListener) mq.addListener(onScheme);
  }
  applyTheme();
  applyFont();

  /* ---------- 小工具 ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function toast(text, actionText, onAction) {
    var el = document.createElement('div');
    el.className = 'toast';
    var span = document.createElement('span');
    span.textContent = text;
    el.appendChild(span);
    if (actionText) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = actionText;
      btn.addEventListener('click', function () {
        el.classList.remove('show');
        onAction && onAction();
      });
      el.appendChild(btn);
    }
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });
    setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { el.remove(); }, 300);
    }, 5200);
  }

  /* ---------- 章节页 ---------- */
  function initChapter(chapter) {
    var bar = $('.read-progress');
    var article = $('#article');
    var st = chapterState(chapter.id);
    var startRatio = st.ratio || 0;

    // 本章目录
    var tocBox = $('#toc');
    if (tocBox && article) {
      var heads = $all('h2', article);
      if (heads.length >= 3) {
        var ol = document.createElement('ol');
        heads.forEach(function (h, i) {
          if (!h.id) h.id = 'sec-' + (i + 1);
          var li = document.createElement('li');
          var a = document.createElement('a');
          a.href = '#' + h.id;
          a.textContent = h.textContent;
          li.appendChild(a);
          ol.appendChild(li);
        });
        var summary = document.createElement('summary');
        summary.innerHTML = '<span>本章目录</span><span>' + heads.length + ' 节</span>';
        tocBox.appendChild(summary);
        tocBox.appendChild(ol);
        tocBox.hidden = false;
      }
    }

    // 顶部标题
    var titleEl = $('.topbar-title');
    if (titleEl) titleEl.textContent = chapter.title;

    // 已读按钮
    var doneBtns = $all('[data-done-toggle]');
    function syncDone() {
      doneBtns.forEach(function (b) {
        b.classList.toggle('is-done', !!st.done);
        b.textContent = st.done ? '已读完 · 点击取消' : '标记本章已读完';
        if (b.tagName === 'A' || b.tagName === 'BUTTON') b.setAttribute('aria-pressed', st.done ? 'true' : 'false');
      });
      var topDone = $('[data-top-done]');
      if (topDone) topDone.textContent = st.done ? '已读完' : '标记已读';
    }
    doneBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        st.done = !st.done;
        st.updatedAt = Date.now();
        if (st.done) st.ratio = 1;
        saveState();
        syncDone();
        if (st.done) toast('已记录：第 ' + chapter.id + ' 章读完');
      });
    });
    var topDone = $('[data-top-done]');
    if (topDone) {
      topDone.addEventListener('click', function () {
        st.done = !st.done;
        st.updatedAt = Date.now();
        if (st.done) st.ratio = 1;
        saveState();
        syncDone();
      });
    }
    syncDone();

    // 字号切换
    var fontBtn = $('[data-font-cycle]');
    if (fontBtn) {
      fontBtn.addEventListener('click', function () {
        var cur = Number(state.prefs.font) || 17;
        var idx = FONT_STEPS.indexOf(cur);
        var next = FONT_STEPS[(idx + 1) % FONT_STEPS.length];
        state.prefs.font = next;
        applyFont();
        fontBtn.textContent = 'Aa ' + next;
      });
      fontBtn.textContent = 'Aa ' + (Number(state.prefs.font) || 17);
    }

    // 阅读进度 + 位置保存
    var ticking = false;
    var restored = false;

    function maxScroll() {
      return Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    }
    function currentRatio() {
      return clamp(window.scrollY / maxScroll(), 0, 1);
    }
    function updateBar() {
      if (bar) bar.style.width = (currentRatio() * 100).toFixed(1) + '%';
      ticking = false;
    }
    function persist() {
      st.ratio = currentRatio();
      st.updatedAt = Date.now();
      state.last = { id: chapter.id, ratio: st.ratio, at: st.updatedAt };
      saveState();
    }
    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateBar);
      }
      clearTimeout(persist._t);
      persist._t = setTimeout(persist, 500);
    }, { passive: true });
    window.addEventListener('pagehide', persist);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') persist();
    });

    // 恢复上次位置
    if (startRatio > 0.02 && startRatio < 0.995) {
      var target = Math.round(startRatio * maxScroll());
      requestAnimationFrame(function () {
        window.scrollTo(0, target);
        restored = true;
        updateBar();
        toast('已回到上次位置（' + Math.round(startRatio * 100) + '%）', '从头读', function () {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      });
    }
    updateBar();

    // 记住最后打开的章节
    if (!state.last || state.last.id !== chapter.id) {
      state.last = { id: chapter.id, ratio: startRatio, at: Date.now() };
      saveState();
    }

    // 到底部自动提示？
    // 键盘：左右切章（桌面端顺手）
    document.addEventListener('keydown', function (e) {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.key === 'ArrowLeft' && chapter.prev) location.href = chapter.prev;
      if (e.key === 'ArrowRight' && chapter.next) location.href = chapter.next;
    });
  }

  /* ---------- 目录页 ---------- */
  function initIndex(course) {
    var total = course.length;
    var doneCount = 0;
    var startedCount = 0;
    var readRatioSum = 0;

    course.forEach(function (c) {
      var st = state.chapters[c.id];
      if (st && st.done) doneCount++;
      if (st && (st.done || st.ratio > 0.01)) {
        startedCount++;
        readRatioSum += st.done ? 1 : (st.ratio || 0);
      }
    });

    var pct = Math.round((readRatioSum / total) * 100);
    var ring = $('#ring');
    var ringText = $('#ring-text');
    if (ring) ring.style.setProperty('--p', pct);
    if (ringText) ringText.textContent = pct + '%';

    var cnt = $('#dash-count');
    if (cnt) cnt.textContent = doneCount + ' / ' + total + ' 章已读完';

    // 继续阅读：优先"最近打开且没读完"，其次第一个未读
    var last = state.last;
    var target = null;
    if (last) {
      var lastChapter = course.filter(function (c) { return c.id === last.id; })[0];
      var lastState = state.chapters[last.id];
      if (lastChapter && !(lastState && lastState.done)) target = lastChapter;
    }
    if (!target) {
      target = course.filter(function (c) {
        var st = state.chapters[c.id];
        return !(st && st.done);
      })[0] || course[0];
    }

    var continueBtn = $('#continue-btn');
    var dashTitle = $('#dash-title');
    var dashSub = $('#dash-sub');
    if (target) {
      if (dashTitle) dashTitle.textContent = '第 ' + target.id + ' 章 · ' + target.title;
      if (dashSub) {
        var tst = state.chapters[target.id];
        var r = tst ? Math.round((tst.done ? 1 : (tst.ratio || 0)) * 100) : 0;
        dashSub.textContent = r > 1 && !(tst && tst.done) ? '上次读到 ' + r + '%' : (tst && tst.done ? '已读完，可以复习' : '还没开始');
      }
      if (continueBtn) {
        continueBtn.href = target.href;
        continueBtn.textContent = (state.last && state.last.id === target.id) ? '继续阅读' : '开始学习';
      }
    }

    // 搜索
    var input = $('#search-input');
    var list = $('#chapter-list');
    var emptyHint = $('#search-empty');
    if (input && list && course) {
      input.addEventListener('input', function () {
        var q = input.value.trim().toLowerCase();
        var shown = 0;
        $all('.chapter-card', list).forEach(function (card) {
          var hay = (card.getAttribute('data-search') || '').toLowerCase();
          var hit = !q || hay.indexOf(q) !== -1;
          card.style.display = hit ? '' : 'none';
          if (hit) shown++;
        });
        if (emptyHint) emptyHint.hidden = shown !== 0;
      });
    }

    // 设置面板：主题
    $all('[data-theme-set]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.prefs.theme = btn.getAttribute('data-theme-set');
        applyTheme();
        $all('[data-theme-set]').forEach(function (b) {
          b.classList.toggle('on', b === btn);
        });
      });
    });
    $all('[data-theme-set]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-theme-set') === (state.prefs.theme || 'auto'));
    });

    // 设置面板：字号
    $all('[data-font-set]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.prefs.font = Number(btn.getAttribute('data-font-set'));
        applyFont();
        $all('[data-font-set]').forEach(function (b) { b.classList.toggle('on', b === btn); });
      });
    });
    $all('[data-font-set]').forEach(function (b) {
      b.classList.toggle('on', Number(b.getAttribute('data-font-set')) === (Number(state.prefs.font) || 17));
    });

    // 导出 / 导入进步
    var exportBtn = $('#export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'js-course-progress-' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      });
    }

    var importInput = $('#import-input');
    if (importInput) {
      importInput.addEventListener('change', function () {
        var file = importInput.files && importInput.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var data = JSON.parse(String(reader.result));
            if (!data || typeof data !== 'object' || !data.chapters) throw new Error('格式不对');
            data.prefs = data.prefs || state.prefs;
            state = data;
            saveState();
            toast('进度已导入，正在刷新');
            setTimeout(function () { location.reload(); }, 700);
          } catch (e) {
            toast('导入失败：文件不是有效的进度备份');
          }
        };
        reader.readAsText(file);
      });
    }

    var resetBtn = $('#reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (!confirm('确定清空本机所有阅读进度？此操作无法撤销。')) return;
        state = { chapters: {}, last: null, prefs: state.prefs, version: 1 };
        saveState();
        location.reload();
      });
    }

    // 状态文案
    $all('.chapter-card', list).forEach(function (card) {
      var id = card.getAttribute('data-id');
      var st = state.chapters[id];
      var stateEl = $('.chapter-state', card);
      if (st && st.done) {
        card.classList.add('is-done');
        if (stateEl) stateEl.innerHTML = '<b>已读完</b>';
      } else if (st && st.ratio > 0.01) {
        if (stateEl) stateEl.innerHTML = '读到 <b>' + Math.round(st.ratio * 100) + '%</b>';
      } else if (stateEl) {
        stateEl.textContent = '未开始';
      }
      if (target && id === target.id) card.classList.add('is-current');
    });

    // 安装在桌面提示（未安装且是移动端）
    var installHint = $('#install-hint');
    if (installHint && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      installHint.hidden = true;
    }
  }

  /* ---------- 启动 ---------- */
  function boot() {
    var course = window.__COURSE__ || [];
    if (page === 'chapter' && window.__CHAPTER__) {
      if (course.length) {
        var idx = -1;
        for (var i = 0; i < course.length; i++) {
          if (course[i].id === window.__CHAPTER__.id) { idx = i; break; }
        }
        if (idx !== -1) {
          window.__CHAPTER__.prev = idx > 0 ? course[idx - 1].id + '.html' : '';
          window.__CHAPTER__.next = idx < course.length - 1 ? course[idx + 1].id + '.html' : '';
        }
      }
      initChapter(window.__CHAPTER__);
    }
    if (page === 'index') initIndex(course);

    // 离线缓存
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      var swUrl = page === 'chapter' ? '../sw.js' : './sw.js';
      window.addEventListener('load', function () {
        navigator.serviceWorker.register(swUrl).catch(function () {});
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
