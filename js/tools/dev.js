(function () {
  'use strict';
  var $ = App.$, esc = App.esc;
  function pad(n) { return String(n).padStart(2, '0'); }
  function fmt(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); }
  var WEEK = '日一二三四五六';

  /* ===== 时间戳 ===== */
  App.register({
    id: 'timestamp', group: 'dev', icon: 'TS', title: '时间戳转换', accepts: true,
    desc: 'Unix 时间戳与日期互转，自动识别秒 / 毫秒，显示相对时间', kw: 'sjc timestamp unix 时间戳 日期',
    render: function (el, ctx) {
      el.innerHTML = '<div class="stats" style="margin-bottom:16px"><div class="stat"><b id="ns"></b><span>当前秒级时间戳 <a href="javascript:" data-copy="#ns">复制</a></span></div><div class="stat"><b id="nms"></b><span>毫秒 <a href="javascript:" data-copy="#nms">复制</a></span></div><div class="stat"><b id="nd" style="font-size:17px"></b><span>本地时间</span></div></div>' +
        '<div class="grid2"><div class="pane"><div class="pane-head"><h3>时间戳 → 日期</h3></div><div class="pane-body"><input type="text" id="ts" style="font-family:var(--mono);font-size:16px"><table class="kv" id="o1" style="margin-top:10px"></table></div></div>' +
        '<div class="pane"><div class="pane-head"><h3>日期 → 时间戳</h3></div><div class="pane-body"><input type="text" id="dt" placeholder="2026-11-05 12:00:00" style="font-family:var(--mono);font-size:16px"><table class="kv" id="o2" style="margin-top:10px"></table></div></div></div>';
      function tick() { var n = Date.now(); $('#ns', el).textContent = Math.floor(n / 1000); $('#nms', el).textContent = n; $('#nd', el).textContent = fmt(new Date(n)); }
      tick(); var timer = setInterval(tick, 1000); App.onLeave(function () { clearInterval(timer); });
      function rel(ms) { var d = (ms - Date.now()) / 1000, a = Math.abs(d), s = a < 60 ? Math.round(a) + ' 秒' : a < 3600 ? Math.round(a / 60) + ' 分钟' : a < 86400 ? Math.round(a / 3600) + ' 小时' : Math.round(a / 86400) + ' 天'; return s + (d >= 0 ? '后' : '前'); }
      function row(k, v) { return '<tr><th>' + k + '</th><td class="mono">' + esc(v) + '</td></tr>'; }
      function t2d() {
        var v = $('#ts', el).value.trim(), o = $('#o1', el);
        if (!/^-?\d+$/.test(v)) { o.innerHTML = v ? row('错误', '请输入整数时间戳') : ''; return; }
        var ms = v.replace('-', '').length > 11 ? +v : +v * 1000, d = new Date(ms);
        o.innerHTML = row('单位', ms === +v ? '毫秒' : '秒') + row('本地时间', fmt(d) + ' 星期' + WEEK[d.getDay()]) + row('UTC', d.toISOString()) + row('相对', rel(ms));
      }
      function d2t() {
        var v = $('#dt', el).value.trim().replace(/\//g, '-'), o = $('#o2', el);
        if (!v) { o.innerHTML = ''; return; }
        var d = new Date(/^\d{4}-\d{1,2}-\d{1,2}$/.test(v) ? v + 'T00:00:00' : v.replace(' ', 'T'));
        if (isNaN(d)) { o.innerHTML = row('错误', '无法识别的日期'); return; }
        o.innerHTML = row('秒', Math.floor(d / 1000)) + row('毫秒', +d) + row('ISO', d.toISOString()) + row('相对', rel(+d));
      }
      $('#ts', el).addEventListener('input', t2d); $('#dt', el).addEventListener('input', d2t);
      $('#ts', el).value = Math.floor(Date.now() / 1000); $('#dt', el).value = fmt(new Date());
      if (ctx.input) { var t = ctx.input.trim(); if (/^\d+$/.test(t)) $('#ts', el).value = t; else $('#dt', el).value = t; }
      t2d(); d2t();
    }
  });

  /* ===== ID 生成 ===== */
  function rnd(n) { return crypto.getRandomValues(new Uint8Array(n)); }
  function hex(b) { return Array.from(b, function (x) { return x.toString(16).padStart(2, '0'); }).join(''); }
  function dash(h) { return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20); }
  var GEN = {
    v4: function () { var b = rnd(16); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128; return dash(hex(b)); },
    v7: function () { var b = rnd(16), t = Date.now(); for (var i = 5; i >= 0; i--) { b[i] = t % 256; t = Math.floor(t / 256); } b[6] = (b[6] & 15) | 112; b[8] = (b[8] & 63) | 128; return dash(hex(b)); },
    nanoid: function (len) { var a = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict', b = rnd(len), s = ''; for (var i = 0; i < len; i++) s += a[b[i] & 63]; return s; },
    ulid: function () { var E = '0123456789ABCDEFGHJKMNPQRSTVWXYZ', t = Date.now(), s = ''; for (var i = 0; i < 10; i++) { s = E[t % 32] + s; t = Math.floor(t / 32); } var b = rnd(16); for (i = 0; i < 16; i++) s += E[b[i] & 31]; return s; },
    objectid: function () { return Math.floor(Date.now() / 1000).toString(16).padStart(8, '0') + hex(rnd(8)); }
  };
  App.register({
    id: 'uuid', group: 'dev', icon: 'ID', title: 'ID 生成器',
    desc: 'UUID v4 / v7、NanoID、ULID、ObjectId 批量生成', kw: 'uuid guid nanoid ulid objectid sc 唯一 id 生成',
    render: function (el) {
      el.innerHTML = '<div class="pane"><div class="pane-body"><div class="inline"><div class="seg" id="kind"><button data-v="v4" class="on">UUID v4</button><button data-v="v7">UUID v7</button><button data-v="nanoid">NanoID</button><button data-v="ulid">ULID</button><button data-v="objectid">ObjectId</button></div></div>' +
        '<div class="inline"><span class="lbl" style="margin:0">数量</span><input type="number" id="n" class="w80" value="10" min="1" max="1000" data-persist><span class="lbl" style="margin:0" id="lenL">长度</span><input type="number" id="len" class="w80" value="21" min="4" max="64" data-persist>' +
        '<label class="check"><input type="checkbox" id="up" data-persist>大写</label><label class="check"><input type="checkbox" id="nodash" data-persist>去连字符</label><button class="btn primary" id="gen">生成</button><button class="btn" data-copy="#out">复制全部</button></div></div></div>' +
        '<div class="pane"><div class="pane-body flush"><textarea id="out" readonly style="min-height:360px"></textarea></div></div>';
      var kind = 'v4';
      function gen() {
        var n = Math.min(1000, Math.max(1, +$('#n', el).value || 1)), len = Math.min(64, Math.max(4, +$('#len', el).value || 21)), out = [];
        $('#len', el).classList.toggle('hidden', kind !== 'nanoid'); $('#lenL', el).classList.toggle('hidden', kind !== 'nanoid');
        for (var i = 0; i < n; i++) {
          var v = GEN[kind](len);
          if (kind.charAt(0) === 'v') { if ($('#nodash', el).checked) v = v.replace(/-/g, ''); if ($('#up', el).checked) v = v.toUpperCase(); }
          out.push(v);
        }
        $('#out', el).value = out.join('\n');
      }
      App.seg($('#kind', el), function (v) { kind = v; gen(); });
      $('#gen', el).onclick = gen; el.addEventListener('change', gen);
      App.persist(el, 'uuid'); gen();
    }
  });

  /* ===== 密码 ===== */
  App.register({
    id: 'password', group: 'dev', icon: '***', title: '密码生成器',
    desc: '加密安全的随机密码与易记口令，实时评估强度（熵值）', kw: 'mm password 密码 随机 强密码 口令',
    render: function (el) {
      el.innerHTML = '<div class="pane"><div class="pane-body"><div class="inline"><div class="seg" id="kind"><button data-v="random" class="on">随机密码</button><button data-v="phrase">易记口令</button><button data-v="pin">数字 PIN</button></div></div>' +
        '<div class="inline"><span class="lbl" style="margin:0">长度 <b id="lv"></b></span><input type="range" id="len" min="4" max="64" value="16" data-persist></div>' +
        '<div class="inline" id="sets"><label class="check"><input type="checkbox" id="U" checked data-persist>A-Z</label><label class="check"><input type="checkbox" id="L" checked data-persist>a-z</label><label class="check"><input type="checkbox" id="D" checked data-persist>0-9</label><label class="check"><input type="checkbox" id="S" checked data-persist>!@#$</label><label class="check"><input type="checkbox" id="X" data-persist>排除易混淆 0O1lI</label></div>' +
        '<div class="inline"><span class="lbl" style="margin:0">数量</span><input type="number" id="n" class="w80" value="6" min="1" max="50" data-persist><button class="btn primary" id="gen">重新生成</button><button class="btn" id="all">复制全部</button></div></div></div>' +
        '<div class="pane"><div class="pane-body"><ul class="list" id="out"></ul></div></div>';
      var kind = 'random', list = [];
      var WORDS = 'apple brave cloud delta eagle flame grape house ivory jolly karma lemon mango noble ocean piano quick river solar tiger ultra vivid whale xenon yacht zebra amber blaze coral dream ember frost glory haven input jewel koala lunar maple nova orbit pearl quest robin storm tulip unity vapor wind young zest'.split(' ');
      function r(max) { var a = new Uint32Array(1), lim = Math.floor(4294967296 / max) * max; do crypto.getRandomValues(a); while (a[0] >= lim); return a[0] % max; }
      function one(len) {
        if (kind === 'pin') { var p = ''; for (var i = 0; i < len; i++) p += r(10); return p; }
        if (kind === 'phrase') { var w = []; for (var k = 0; k < Math.max(3, Math.round(len / 4)); k++) w.push(WORDS[r(WORDS.length)]); return w.join('-') + '-' + r(100); }
        var sets = [];
        if ($('#U', el).checked) sets.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ'); if ($('#L', el).checked) sets.push('abcdefghijklmnopqrstuvwxyz');
        if ($('#D', el).checked) sets.push('0123456789'); if ($('#S', el).checked) sets.push('!@#$%^&*()-_=+[]{};:,.<>?');
        if ($('#X', el).checked) sets = sets.map(function (s) { return s.replace(/[0O1lI]/g, ''); });
        if (!sets.length) sets = ['abcdefghijklmnopqrstuvwxyz'];
        var all = sets.join(''), c = sets.map(function (s) { return s[r(s.length)]; });
        while (c.length < len) c.push(all[r(all.length)]);
        c = c.slice(0, len);
        for (var j = c.length - 1; j > 0; j--) { var x = r(j + 1), t = c[j]; c[j] = c[x]; c[x] = t; }
        return c.join('');
      }
      function entropy(p) {
        var pool = (/[a-z]/.test(p) ? 26 : 0) + (/[A-Z]/.test(p) ? 26 : 0) + (/\d/.test(p) ? 10 : 0) + (/[^\w]/.test(p) ? 28 : 0);
        return Math.round(p.length * Math.log2(pool || 1));
      }
      function gen() {
        var len = +$('#len', el).value, n = Math.min(50, Math.max(1, +$('#n', el).value || 1));
        $('#lv', el).textContent = len; $('#sets', el).classList.toggle('hidden', kind !== 'random');
        list = []; for (var i = 0; i < n; i++) list.push(one(len));
        $('#out', el).innerHTML = list.map(function (p, i) {
          var e = entropy(p), lvl = e < 40 ? ['弱', 'err'] : e < 64 ? ['中', 'warn'] : e < 100 ? ['强', 'ok'] : ['极强', 'ok'];
          return '<li><span style="flex:1;font-size:15px">' + esc(p) + '</span><span class="badge ' + lvl[1] + '">' + lvl[0] + ' · ' + e + ' bit</span><button class="btn sm" data-i="' + i + '">复制</button></li>';
        }).join('');
      }
      App.seg($('#kind', el), function (v) { kind = v; gen(); });
      el.addEventListener('input', function (e) { if (e.target.id === 'len') gen(); });
      el.addEventListener('change', function (e) { if (e.target.type === 'checkbox' || e.target.id === 'n') gen(); });
      $('#out', el).addEventListener('click', function (e) { var i = e.target.getAttribute('data-i'); if (i !== null) App.copy(list[i]); });
      $('#gen', el).onclick = gen; $('#all', el).onclick = function () { App.copy(list.join('\n')); };
      App.persist(el, 'password'); gen();
    }
  });

  /* ===== 正则测试 ===== */
  var PRESETS = [['手机号', '1[3-9]\\d{9}'], ['邮箱', '[\\w.+-]+@[\\w-]+(\\.[\\w-]+)+'], ['网址', 'https?:\\/\\/[^\\s"\'<>]+'], ['IPv4', '\\b(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\b'],
    ['身份证', '[1-9]\\d{5}(?:18|19|20)\\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]'], ['日期', '\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])'], ['汉字', '[\\u4e00-\\u9fa5]+'],
    ['十六进制颜色', '#(?:[0-9a-fA-F]{3}){1,2}\\b'], ['HTML 标签', '<([a-zA-Z][\\w-]*)[^>]*>'], ['邮编', '\\b[1-9]\\d{5}\\b'], ['车牌', '[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼][A-HJ-NP-Z][A-HJ-NP-Z0-9]{4,5}[A-HJ-NP-Z0-9挂学警港澳]'], ['金额', '\\d+(?:\\.\\d{1,2})?']];
  App.register({
    id: 'regex', group: 'dev', icon: '.*', title: '正则测试', accepts: true,
    desc: '实时高亮匹配、分组提取、替换预览，内置常用正则', kw: 'zz regex 正则 表达式 测试 匹配 替换',
    render: function (el, ctx) {
      el.innerHTML = '<div class="pane"><div class="pane-body"><div class="inline"><span class="muted" style="font-size:18px">/</span><input type="text" id="pat" data-persist value="(\\w+)@(\\w+)\\.com" style="font-family:var(--mono);font-size:15px"><span class="muted" style="font-size:18px">/</span><input type="text" id="flags" data-persist value="g" class="w80" style="font-family:var(--mono)">' +
        '<select id="preset" class="w160"><option value="">常用正则…</option>' + PRESETS.map(function (p, i) { return '<option value="' + i + '">' + p[0] + '</option>'; }).join('') + '</select></div>' +
        '<div class="inline">' + [['g', '全局'], ['i', '忽略大小写'], ['m', '多行'], ['s', '. 匹配换行'], ['u', 'Unicode']].map(function (f) { return '<label class="check"><input type="checkbox" data-f="' + f[0] + '">' + f[0] + ' ' + f[1] + '</label>'; }).join('') + '<span class="msg" id="cnt"></span></div></div></div>' +
        '<div class="grid2"><div><div class="pane"><div class="pane-head"><h3>测试文本</h3></div><div class="pane-body flush"><textarea id="text" data-persist style="min-height:200px">联系：admin@example.com, support@test.com\nfoo@bar.org 不会匹配</textarea></div></div>' +
        '<div class="pane"><div class="pane-head"><h3>替换</h3><input type="text" id="rep" data-persist value="[$1 at $2]" style="max-width:240px;font-family:var(--mono)"><button class="btn sm" data-copy="#repOut">复制</button></div><div class="pane-body"><div class="out" id="repOut"></div></div></div></div>' +
        '<div><div class="pane"><div class="pane-head"><h3>匹配高亮</h3></div><div class="pane-body"><div class="out" id="hl" style="min-height:120px"></div></div></div>' +
        '<div class="pane"><div class="pane-head"><h3>匹配详情</h3></div><div class="pane-body" style="max-height:300px;overflow:auto"><table class="kv" id="list"></table></div></div></div></div>';
      function flags() { return $('#flags', el).value.replace(/[^gimsuy]/g, ''); }
      function sync() { var f = flags(); App.$$('[data-f]', el).forEach(function (c) { c.checked = f.indexOf(c.getAttribute('data-f')) >= 0; }); }
      function run() {
        var text = $('#text', el).value, re;
        try { re = new RegExp($('#pat', el).value, flags()); }
        catch (e) { $('#hl', el).innerHTML = '<span class="err">' + esc(e.message) + '</span>'; $('#list', el).innerHTML = ''; $('#repOut', el).textContent = ''; $('#cnt', el).textContent = ''; return; }
        var ms = [];
        if (re.global) { var m, g = 0; while ((m = re.exec(text)) && g++ < 5000) { ms.push(m); if (!m[0]) re.lastIndex++; } } else { var o = re.exec(text); if (o) ms.push(o); }
        var h = '', last = 0;
        ms.forEach(function (m) { h += esc(text.slice(last, m.index)) + '<mark>' + esc(m[0]) + '</mark>'; last = m.index + m[0].length; });
        $('#hl', el).innerHTML = h + esc(text.slice(last));
        $('#cnt', el).innerHTML = '<span class="badge ' + (ms.length ? 'ok' : '') + '">' + ms.length + ' 处匹配</span>';
        $('#list', el).innerHTML = ms.map(function (m, i) { return '<tr><th>#' + (i + 1) + ' @' + m.index + '</th><td class="mono">' + esc(m[0]) + (m.length > 1 ? '<br>' + m.slice(1).map(function (x, j) { return '<span class="muted">$' + (j + 1) + '</span> ' + esc(x == null ? 'undefined' : x); }).join('<br>') : '') + '</td></tr>'; }).join('') || '<tr><td class="muted">无匹配</td></tr>';
        $('#repOut', el).textContent = text.replace(new RegExp($('#pat', el).value, flags()), $('#rep', el).value);
      }
      el.addEventListener('input', function (e) {
        if (e.target.hasAttribute('data-f')) $('#flags', el).value = App.$$('[data-f]', el).filter(function (c) { return c.checked; }).map(function (c) { return c.getAttribute('data-f'); }).join('');
        else if (e.target.id === 'flags') sync();
        run();
      });
      $('#preset', el).onchange = function () { if (this.value) { $('#pat', el).value = PRESETS[this.value][1]; this.value = ''; run(); } };
      ctx.persist(); if (ctx.input) $('#text', el).value = ctx.input; sync(); run();
    }
  });

  /* ===== Cron ===== */
  var NAMES = { mon: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'], dow: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] };
  function field(str, min, max, names) {
    var set = {};
    str.split(',').forEach(function (part) {
      var step = 1, m = part.match(/^(.*)\/(\d+)$/);
      if (m) { part = m[1]; step = +m[2]; if (!step) throw new Error('步长不能为 0'); }
      var lo, hi;
      if (part === '*' || part === '?') { lo = min; hi = max; }
      else {
        var nm = function (v) { if (names) { var i = names.indexOf(v.toUpperCase()); if (i >= 0) return i + (min === 1 ? 1 : 0); } if (!/^\d+$/.test(v)) throw new Error('无法识别 "' + v + '"'); return +v; };
        var r = part.split('-'); lo = nm(r[0]); hi = r.length > 1 ? nm(r[1]) : (m ? max : lo);
      }
      if (lo < min || hi > max + (names === NAMES.dow ? 1 : 0) || lo > hi) throw new Error('"' + part + '" 超出范围 ' + min + '-' + max);
      for (var v = lo; v <= hi; v += step) set[v === 7 && names === NAMES.dow ? 0 : v] = 1;
    });
    return set;
  }
  function parseCron(expr) {
    var p = expr.trim().split(/\s+/);
    if (p.length === 6) p.shift();
    if (p.length !== 5) throw new Error('需要 5 段（分 时 日 月 周），或 6 段（含秒）');
    return { min: field(p[0], 0, 59), hour: field(p[1], 0, 23), dom: field(p[2], 1, 31), mon: field(p[3], 1, 12, NAMES.mon), dow: field(p[4], 0, 6, NAMES.dow), domAny: p[2] === '*' || p[2] === '?', dowAny: p[4] === '*' || p[4] === '?', raw: p };
  }
  function nextRuns(c, n) {
    var d = new Date(); d.setSeconds(0, 0); d.setMinutes(d.getMinutes() + 1);
    var out = [], guard = 0;
    while (out.length < n && guard++ < 600000) {
      if (!c.mon[d.getMonth() + 1]) { d.setMonth(d.getMonth() + 1, 1); d.setHours(0, 0); continue; }
      var domOk = c.dom[d.getDate()], dowOk = c.dow[d.getDay()];
      var dayOk = c.domAny && c.dowAny ? true : c.domAny ? dowOk : c.dowAny ? domOk : (domOk || dowOk);
      if (!dayOk) { d.setDate(d.getDate() + 1); d.setHours(0, 0); continue; }
      if (!c.hour[d.getHours()]) { d.setHours(d.getHours() + 1, 0); continue; }
      if (!c.min[d.getMinutes()]) { d.setMinutes(d.getMinutes() + 1); continue; }
      out.push(new Date(d)); d.setMinutes(d.getMinutes() + 1);
    }
    return out;
  }
  function describe(p) {
    function part(v, unit, all) {
      if (v === '*' || v === '?') return all;
      var m = v.match(/^\*\/(\d+)$/); if (m) return '每 ' + m[1] + ' ' + unit;
      return unit === '周' ? '周' + v.replace(/\d/g, function (d) { return WEEK[d % 7]; }) : v + ' ' + unit;
    }
    return [part(p[3], '月', '每月'), part(p[2], '日', p[4] === '*' || p[4] === '?' ? '每天' : ''), part(p[4], '周', ''), part(p[1], '时', '每小时'), part(p[0], '分', '每分钟')].filter(Boolean).join('，');
  }
  App.register({
    id: 'cron', group: 'dev', icon: 'CRON', title: 'Cron 解析', isNew: true, accepts: true,
    desc: '解析 Cron 表达式含义，预测接下来的执行时间', kw: 'cron dsrw 定时任务 crontab 表达式',
    render: function (el, ctx) {
      var ex = [['*/5 * * * *', '每 5 分钟'], ['0 * * * *', '每小时整点'], ['0 9 * * 1-5', '工作日 9 点'], ['30 2 * * *', '每天 2:30'], ['0 0 1 * *', '每月 1 号'], ['0 0 * * 0', '每周日零点']];
      el.innerHTML = '<div class="pane"><div class="pane-body"><input type="text" id="in" data-persist value="0 9 * * 1-5" style="font-family:var(--mono);font-size:20px;text-align:center;letter-spacing:2px">' +
        '<div class="inline" style="margin-top:12px;justify-content:center">' + ex.map(function (e) { return '<button class="chip" data-ex="' + e[0] + '">' + e[1] + ' <em>' + e[0] + '</em></button>'; }).join('') + '</div></div></div>' +
        '<div class="grid2"><div class="pane"><div class="pane-head"><h3>含义</h3></div><div class="pane-body"><div class="out big" id="desc" style="font-size:16px"></div><table class="kv" id="fields" style="margin-top:12px"></table></div></div>' +
        '<div class="pane"><div class="pane-head"><h3>接下来 10 次执行</h3></div><div class="pane-body"><ul class="list" id="next"></ul></div></div></div>';
      function run() {
        var v = $('#in', el).value;
        try {
          var c = parseCron(v);
          $('#desc', el).textContent = describe(c.raw);
          $('#fields', el).innerHTML = ['分钟', '小时', '日', '月', '星期'].map(function (n, i) { return '<tr><th>' + n + '</th><td class="mono">' + esc(c.raw[i]) + '</td></tr>'; }).join('');
          var runs = nextRuns(c, 10);
          $('#next', el).innerHTML = runs.map(function (d, i) { return '<li><span class="muted">' + (i + 1) + '</span><span style="flex:1">' + fmt(d) + '</span><span class="muted">周' + WEEK[d.getDay()] + '</span></li>'; }).join('') || '<li class="muted">未来一年内不会执行</li>';
        } catch (e) { $('#desc', el).innerHTML = '<span class="err">' + esc(e.message) + '</span>'; $('#next', el).innerHTML = ''; $('#fields', el).innerHTML = ''; }
      }
      $('#in', el).addEventListener('input', run);
      el.addEventListener('click', function (e) { var b = e.target.closest('[data-ex]'); if (b) { $('#in', el).value = b.getAttribute('data-ex'); $('#in', el).dispatchEvent(new Event('input')); } });
      ctx.persist(); if (ctx.input) $('#in', el).value = ctx.input.trim(); run();
    }
  });

  /* ===== 颜色 ===== */
  function parseColor(s) {
    s = s.trim(); var m;
    if ((m = s.match(/^#?([0-9a-f]{3,8})$/i))) { var h = m[1]; if (h.length === 3 || h.length === 4) h = h.replace(/./g, '$&$&'); if (h.length !== 6 && h.length !== 8) return null; return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
    if ((m = s.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i))) return [+m[1], +m[2], +m[3]].map(function (x) { return Math.min(255, x); });
    if ((m = s.match(/^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%?[\s,]+([\d.]+)%?/i))) return hsl2rgb(+m[1], +m[2], +m[3]);
    return null;
  }
  function hsl2rgb(h, s, l) { s /= 100; l /= 100; var a = s * Math.min(l, 1 - l), f = function (n) { var k = (n + h / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return [f(0), f(8), f(4)]; }
  function rgb2hsl(r, g, b) { r /= 255; g /= 255; b /= 255; var mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s = 0, l = (mx + mn) / 2; if (mx !== mn) { var d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60; } return [Math.round(h), Math.round(s * 100), Math.round(l * 100)]; }
  function toHex(c) { return '#' + c.map(function (x) { return x.toString(16).padStart(2, '0'); }).join(''); }
  function lum(c) { var a = c.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; }
  App.register({
    id: 'color', group: 'dev', icon: '◐', title: '颜色与对比度', accepts: true,
    desc: 'HEX / RGB / HSL 互转，生成明暗色阶，检查 WCAG 对比度', kw: 'ys color 颜色 hex rgb hsl 对比度 wcag 取色',
    render: function (el, ctx) {
      el.innerHTML = '<div class="grid2"><div class="pane"><div class="pane-head"><h3>颜色转换</h3>' + (window.EyeDropper ? '<button class="btn sm" id="eye">屏幕取色</button>' : '') + '</div><div class="pane-body">' +
        '<div class="inline"><input type="color" id="pick"><input type="text" id="in" data-persist value="#7c5cff" style="font-family:var(--mono)"></div><table class="kv" id="fmts" style="margin-top:12px"></table>' +
        '<div class="lbl" style="margin-top:14px">明暗色阶（点击复制）</div><div class="dots" id="scale"></div></div></div>' +
        '<div class="pane"><div class="pane-head"><h3>对比度检查</h3></div><div class="pane-body"><div class="inline"><span class="lbl" style="margin:0">文字</span><input type="color" id="fg" value="#ffffff" data-persist><span class="lbl" style="margin:0">背景</span><input type="color" id="bg" value="#7c5cff" data-persist><button class="btn sm" id="swap">⇄ 交换</button></div>' +
        '<div class="swatch" id="sw" style="margin-top:12px">千机匣 Aa</div><table class="kv" id="wcag" style="margin-top:12px"></table></div></div></div>';
      function setColor(c, from) {
        var hex = toHex(c), hsl = rgb2hsl(c[0], c[1], c[2]);
        $('#pick', el).value = hex; if (from !== 'in') $('#in', el).value = hex;
        var rows = [['HEX', hex.toUpperCase()], ['RGB', 'rgb(' + c.join(', ') + ')'], ['HSL', 'hsl(' + hsl[0] + ', ' + hsl[1] + '%, ' + hsl[2] + '%)'], ['CSS 变量', '--color: ' + hex + ';']];
        $('#fmts', el).innerHTML = rows.map(function (r, i) { return '<tr><th>' + r[0] + '</th><td class="mono" id="cf' + i + '">' + r[1] + '</td><td style="width:60px"><button class="btn sm" data-copy="#cf' + i + '">复制</button></td></tr>'; }).join('');
        var steps = [95, 85, 75, 65, 55, 45, 35, 25, 15];
        $('#scale', el).innerHTML = steps.map(function (l) { var h = toHex(hsl2rgb(hsl[0], hsl[1], l)); return '<span title="' + h + '" data-hex="' + h + '" style="background:' + h + '"></span>'; }).join('');
      }
      function contrast() {
        var a = parseColor($('#fg', el).value), b = parseColor($('#bg', el).value), la = lum(a), lb = lum(b);
        var r = (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
        $('#sw', el).style.cssText = 'margin-top:12px;color:' + $('#fg', el).value + ';background:' + $('#bg', el).value;
        function b2(ok) { return ok ? '<span class="badge ok">通过</span>' : '<span class="badge err">不通过</span>'; }
        $('#wcag', el).innerHTML = '<tr><th>对比度</th><td class="mono big">' + r.toFixed(2) + ' : 1</td></tr><tr><th>AA 正文</th><td>' + b2(r >= 4.5) + ' ≥ 4.5</td></tr><tr><th>AA 大字</th><td>' + b2(r >= 3) + ' ≥ 3</td></tr><tr><th>AAA 正文</th><td>' + b2(r >= 7) + ' ≥ 7</td></tr>';
      }
      el.addEventListener('input', function (e) {
        if (e.target.id === 'in') { var c = parseColor(e.target.value); if (c) setColor(c, 'in'); }
        else if (e.target.id === 'pick') setColor(parseColor(e.target.value));
        else if (e.target.id === 'fg' || e.target.id === 'bg') contrast();
      });
      el.addEventListener('click', function (e) { var h = e.target.getAttribute('data-hex'); if (h) App.copy(h); });
      $('#swap', el).onclick = function () { var a = $('#fg', el).value; $('#fg', el).value = $('#bg', el).value; $('#bg', el).value = a; contrast(); };
      if ($('#eye', el)) $('#eye', el).onclick = function () { new EyeDropper().open().then(function (r) { setColor(parseColor(r.sRGBHex)); }).catch(function () {}); };
      ctx.persist(); if (ctx.input) $('#in', el).value = ctx.input.trim();
      setColor(parseColor($('#in', el).value) || [124, 92, 255]); contrast();
    }
  });
})();
