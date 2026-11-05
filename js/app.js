(function () {
  'use strict';
  var $ = App.$, $$ = App.$$, esc = App.esc, view = $('#view');
  var groupTitle = {};
  App.groups.forEach(function (g) { groupTitle[g.id] = g.title; });

  /* ---------- sidebar ---------- */
  function renderNav() {
    $('#nav').innerHTML = App.groups.map(function (g) {
      return '<div class="nav-group"><div class="nav-title">' + esc(g.title) + '</div>' +
        App.tools.filter(function (t) { return t.group === g.id; }).map(function (t) {
          return '<a href="#/' + t.id + '" data-id="' + t.id + '"><span class="ico">' + esc(t.icon) + '</span>' + esc(t.title) +
            (App.isFav(t.id) ? '<span class="fav-dot">★</span>' : '') + '</a>';
        }).join('') + '</div>';
    }).join('');
    markActive();
  }
  function markActive() {
    var id = currentId();
    $$('#nav a').forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-id') === id); });
  }
  function closeDrawer() { $('#sidebar').classList.remove('open'); $('#scrim').classList.remove('show'); }
  $('#menuBtn').onclick = function () { $('#sidebar').classList.add('open'); $('#scrim').classList.add('show'); };
  $('#scrim').onclick = closeDrawer;
  $('#nav').addEventListener('click', closeDrawer);

  /* ---------- theme ---------- */
  $('#themeBtn').onclick = function () {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    App.store.set('theme', next);
  };

  /* ---------- routing ---------- */
  function currentId() { return location.hash.replace(/^#\/?/, '').split('?')[0]; }
  var token = 0;
  function route() {
    App.runCleanups();
    hideSend();
    var my = ++token, tool = App.get(currentId());
    markActive();
    window.scrollTo(0, 0);
    if (!tool) { renderHome(); return; }
    App.pushRecent(tool.id);
    document.title = tool.title + ' · 千机匣';
    $('#crumb').innerHTML = esc(groupTitle[tool.group]) + ' / <b>' + esc(tool.title) + '</b>';
    view.innerHTML = '<div class="tool-head"><span class="ico lg">' + esc(tool.icon) + '</span><div><h1>' + esc(tool.title) + '</h1><p>' + esc(tool.desc) + '</p></div>' +
      '<button class="icon-btn star' + (App.isFav(tool.id) ? ' on' : '') + '" id="favBtn" title="收藏">' + (App.isFav(tool.id) ? '★' : '☆') + '</button></div><div id="toolHost"><div class="loading">加载中…</div></div>';
    $('#favBtn').onclick = function () {
      var on = App.toggleFav(tool.id);
      this.classList.toggle('on', on); this.textContent = on ? '★' : '☆';
      App.toast(on ? '已加入收藏' : '已取消收藏'); renderNav();
    };
    var pend = App.takePending();
    Promise.all((tool.scripts || []).map(App.loadScript)).then(function () {
      if (my !== token) return;
      var host = $('#toolHost'), el = document.createElement('div');
      host.innerHTML = ''; host.appendChild(el);
      tool.render(el, { input: pend.text, file: pend.file, persist: function () { App.persist(el, tool.id); } });
    }).catch(function (e) { $('#toolHost').innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }

  /* ---------- home ---------- */
  function tile(t) {
    return '<a class="tile' + (t.isNew ? ' new' : '') + '" href="#/' + t.id + '"><span class="ico">' + esc(t.icon) + '</span><span><b>' + esc(t.title) + '</b><span class="d">' + esc(t.desc) + '</span></span></a>';
  }
  function renderHome() {
    document.title = '千机匣 · 纯前端开发者工作台';
    $('#crumb').innerHTML = '<b>工作台</b>';
    var favs = App.favorites().map(App.get).filter(Boolean), rec = App.recents().map(App.get).filter(Boolean);
    view.innerHTML =
      '<section class="hero"><h1>千机匣 <span>Toolbox</span></h1><p>粘贴任意内容、拖入文件或截图，自动识别类型并推荐合适的工具。全部在浏览器本地完成。</p>' +
      '<div class="smart" id="smart"><textarea id="smartIn" placeholder="试试粘贴：JSON、JWT、时间戳、网址、Base64、Cron 表达式、颜色值…&#10;或直接 Ctrl+V 粘贴截图 / 把图片、Excel 拖到这里"></textarea>' +
      '<div class="smart-bar" id="smartBar"><span class="label">按 Ctrl K 随时搜索工具</span></div></div>' +
      '<div class="feature-row"><div><b>智能识别</b>粘贴即推荐工具</div><div><b>工具串联</b>结果一键发送到下个工具</div><div><b>本地优先</b>数据从不上传</div><div><b>记住状态</b>收藏、最近使用、输入自动保存</div></div></section>' +
      (favs.length ? '<div class="section-title">★ 收藏</div><div class="tile-grid">' + favs.map(tile).join('') + '</div>' : '') +
      (rec.length ? '<div class="section-title">最近使用</div><div class="tile-grid">' + rec.slice(0, 4).map(tile).join('') + '</div>' : '') +
      App.groups.map(function (g) {
        return '<div class="section-title">' + esc(g.title) + '</div><div class="tile-grid">' + App.tools.filter(function (t) { return t.group === g.id; }).map(tile).join('') + '</div>';
      }).join('');

    var input = $('#smartIn'), bar = $('#smartBar'), smart = $('#smart'), file = null, timer;
    function chips(list, label) {
      bar.innerHTML = '<span class="label">' + label + '</span>' + list.slice(0, 7).map(function (s, i) {
        var t = App.get(s.id);
        return t ? '<button class="chip' + (i === 0 ? ' hot' : '') + '" data-go="' + t.id + '">' + esc(t.title) + ' <em>' + esc(s.why) + '</em></button>' : '';
      }).join('');
    }
    function onText() {
      file = null;
      var v = input.value;
      if (!v.trim()) { bar.innerHTML = '<span class="label">按 Ctrl K 随时搜索工具</span>'; return; }
      chips(App.detectText(v), '推荐：');
    }
    function onFile(f) {
      file = f; input.value = '';
      chips(App.detectFile(f), esc(f.name || '粘贴的图片') + ' · ' + App.bytes(f.size) + ' →');
      if (/^image\//.test(f.type)) {
        var img = document.createElement('img'); img.className = 'smart-thumb'; img.src = URL.createObjectURL(f);
        bar.insertBefore(img, bar.firstChild);
      }
    }
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(onText, 120); });
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-go]'); if (!b) return;
      App.sendTo(b.getAttribute('data-go'), file ? { file: file } : { text: input.value });
    });
    ['dragenter', 'dragover'].forEach(function (t) { smart.addEventListener(t, function (e) { e.preventDefault(); smart.classList.add('drag'); }); });
    ['dragleave', 'drop'].forEach(function (t) { smart.addEventListener(t, function (e) { e.preventDefault(); smart.classList.remove('drag'); }); });
    smart.addEventListener('drop', function (e) { if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]); });
    App.onPasteImage(onFile);
    if (window.innerWidth > 900) input.focus();
  }

  /* ---------- command palette ---------- */
  var pal = $('#palette'), pin = $('#paletteInput'), plist = $('#paletteList'), sel = 0, results = [];
  function score(t, q) {
    if (!q) return 1;
    var hay = [t.title, t.id, t.kw || '', t.desc].join(' ').toLowerCase();
    if (t.title.toLowerCase().indexOf(q) === 0 || (t.kw || '').split(' ').indexOf(q) >= 0) return 100;
    var i = hay.indexOf(q); if (i >= 0) return 60 - Math.min(i, 50);
    var p = 0; for (var c = 0; c < hay.length && p < q.length; c++) if (hay[c] === q[p]) p++;
    return p === q.length ? 5 : 0;
  }
  function renderPalette() {
    var q = pin.value.trim().toLowerCase();
    results = App.tools.map(function (t) { return { t: t, s: score(t, q) }; }).filter(function (x) { return x.s > 0; })
      .sort(function (a, b) { return b.s - a.s; }).map(function (x) { return x.t; });
    if (!q) { var r = App.recents(); results.sort(function (a, b) { var ia = r.indexOf(a.id), ib = r.indexOf(b.id); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); }); }
    sel = Math.min(sel, Math.max(0, results.length - 1));
    plist.innerHTML = results.length ? results.map(function (t, i) {
      return '<li data-i="' + i + '"' + (i === sel ? ' class="on"' : '') + '><span class="ico">' + esc(t.icon) + '</span><div><b>' + esc(t.title) + '</b><small>' + esc(t.desc) + '</small></div><span class="g">' + esc(groupTitle[t.group]) + '</span></li>';
    }).join('') : '<div class="palette-empty">没有匹配的工具</div>';
    var on = $('li.on', plist); if (on) on.scrollIntoView({ block: 'nearest' });
  }
  function openPalette() { pal.classList.remove('hidden'); pin.value = ''; sel = 0; renderPalette(); pin.focus(); }
  function closePalette() { pal.classList.add('hidden'); }
  function pick(i) { var t = results[i]; if (t) { closePalette(); closeDrawer(); location.hash = '#/' + t.id; } }
  $('#openPalette').onclick = openPalette; $('#paletteBtn').onclick = openPalette;
  pal.addEventListener('click', function (e) { if (e.target === pal) closePalette(); var li = e.target.closest('li[data-i]'); if (li) pick(+li.getAttribute('data-i')); });
  pin.addEventListener('input', function () { sel = 0; renderPalette(); });
  pin.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, results.length - 1); renderPalette(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); renderPalette(); e.preventDefault(); }
    else if (e.key === 'Enter') pick(sel);
  });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.classList.contains('hidden') ? openPalette() : closePalette(); }
    else if (e.key === 'Escape') { closePalette(); hideSend(); }
    else if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); openPalette(); }
  });

  /* ---------- shared [data-copy] / [data-send] buttons ---------- */
  var menu = $('#sendMenu'), sendText = '';
  function valueOf(sel) { var n = $(sel, view); return n ? ('value' in n && n.tagName !== 'DIV' ? n.value : n.textContent) : ''; }
  function hideSend() { menu.classList.add('hidden'); }
  view.addEventListener('click', function (e) {
    var c = e.target.closest('[data-copy]');
    if (c) { App.copy(valueOf(c.getAttribute('data-copy'))); return; }
    var s = e.target.closest('[data-send]');
    if (!s) return;
    e.stopPropagation();
    sendText = valueOf(s.getAttribute('data-send'));
    if (!sendText.trim()) return App.toast('没有可发送的内容');
    var cur = currentId(), suggested = App.detectText(sendText).map(function (d) { return d.id; });
    var list = App.tools.filter(function (t) { return t.accepts && t.id !== cur; })
      .sort(function (a, b) { var ia = suggested.indexOf(a.id), ib = suggested.indexOf(b.id); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
    menu.innerHTML = '<div class="ph">发送结果到…</div>' + list.map(function (t) { return '<a data-to="' + t.id + '"><span class="ico">' + esc(t.icon) + '</span>' + esc(t.title) + '</a>'; }).join('');
    var r = s.getBoundingClientRect();
    menu.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 240)) + 'px';
    menu.style.top = (r.bottom + 330 > window.innerHeight ? Math.max(8, r.top - 326) : r.bottom + 6) + 'px';
    menu.classList.remove('hidden');
  });
  menu.addEventListener('click', function (e) { var a = e.target.closest('[data-to]'); if (a) { hideSend(); App.sendTo(a.getAttribute('data-to'), { text: sendText }); } });
  document.addEventListener('click', function (e) { if (!menu.contains(e.target)) hideSend(); });
  window.addEventListener('scroll', hideSend, true);

  renderNav();
  window.addEventListener('hashchange', route);
  route();
})();
