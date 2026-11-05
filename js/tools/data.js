(function () {
  'use strict';
  var $ = App.$, esc = App.esc;

  /* ===== JSON 工作台 ===== */
  function sortKeys(v) {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === 'object') { var o = {}; Object.keys(v).sort().forEach(function (k) { o[k] = sortKeys(v[k]); }); return o; }
    return v;
  }
  function where(text, msg) {
    var lc = msg.match(/line (\d+) column (\d+)/i); if (lc) return '第 ' + lc[1] + ' 行第 ' + lc[2] + ' 列';
    var m = msg.match(/position (\d+)/i); if (!m) return '';
    var pos = +m[1], before = text.slice(0, pos);
    return '第 ' + before.split('\n').length + ' 行第 ' + (pos - before.lastIndexOf('\n')) + ' 列';
  }
  function tree(v, key) {
    var k = key !== undefined ? '<span class="k">' + esc(JSON.stringify(key)) + '</span>: ' : '';
    if (v && typeof v === 'object') {
      var arr = Array.isArray(v), keys = Object.keys(v);
      if (!keys.length) return '<div class="leaf">' + k + (arr ? '[]' : '{}') + '</div>';
      return '<details open><summary>' + k + (arr ? '[' : '{') + ' <span class="z">' + keys.length + (arr ? ' 项' : ' 键') + '</span></summary>' +
        keys.map(function (kk) { return tree(v[kk], arr ? undefined : kk); }).join('') + '<div>' + (arr ? ']' : '}') + '</div></details>';
    }
    var cls = typeof v === 'string' ? 's' : typeof v === 'number' ? 'n' : typeof v === 'boolean' ? 'b' : 'z';
    return '<div class="leaf">' + k + '<span class="' + cls + '">' + esc(JSON.stringify(v)) + '</span></div>';
  }
  function pascal(s) { return s.replace(/(^|[^a-zA-Z0-9]+)([a-zA-Z0-9])/g, function (_, a, b) { return b.toUpperCase(); }).replace(/^\d/, '_$&') || 'Item'; }
  function toTs(data, root) {
    var defs = [], seen = {};
    function typeOf(v, name) {
      if (v === null) return 'null';
      if (Array.isArray(v)) {
        if (!v.length) return 'unknown[]';
        var types = []; v.forEach(function (x) { var t = typeOf(x, name); if (types.indexOf(t) < 0) types.push(t); });
        return types.length === 1 ? (/[|]/.test(types[0]) ? '(' + types[0] + ')' : types[0]) + '[]' : '(' + types.join(' | ') + ')[]';
      }
      if (typeof v === 'object') {
        var n = pascal(name), base = n, i = 2; while (seen[n]) n = base + i++; seen[n] = 1;
        var body = Object.keys(v).map(function (k) { return '  ' + (/^[a-zA-Z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)) + ': ' + typeOf(v[k], k.replace(/s$/, '')) + ';'; }).join('\n');
        defs.push('export interface ' + n + ' {\n' + body + '\n}');
        return n;
      }
      return typeof v;
    }
    var t = typeOf(data, root);
    if (!(data && typeof data === 'object' && !Array.isArray(data))) defs.push('export type ' + pascal(root) + ' = ' + t + ';');
    return defs.reverse().join('\n\n');
  }
  App.register({
    id: 'json', group: 'data', icon: '{ }', title: 'JSON 工作台', accepts: true,
    desc: '格式化、压缩、排序、转义，树形浏览，一键生成 TypeScript 类型', kw: 'json gs 格式化 校验 压缩 美化 typescript 树形',
    render: function (el, ctx) {
      el.innerHTML = '<div class="inline" style="margin-bottom:14px"><button class="btn primary" data-a="fmt">格式化</button><button class="btn" data-a="min">压缩</button><button class="btn" data-a="sort">键排序</button><button class="btn" data-a="esc">转义为字符串</button><button class="btn" data-a="unesc">去除转义</button>' +
        '<select id="indent" class="w120" data-persist><option value="2">缩进 2</option><option value="4">缩进 4</option><option value="t">Tab</option></select><span class="msg" id="msg"></span></div>' +
        '<div class="grid2"><div class="pane"><div class="pane-head"><h3>输入</h3><button class="btn sm" id="clear">清空</button></div><div class="pane-body flush"><textarea id="in" data-persist style="min-height:500px">{"name":"千机匣","version":2,"features":["智能识别","工具串联"],"author":{"github":"buhuiphp"},"free":true,"ads":null}</textarea></div></div>' +
        '<div class="pane"><div class="pane-head"><div class="seg" id="view"><button data-v="text" class="on">文本</button><button data-v="tree">树形</button><button data-v="ts">TypeScript</button></div><h3></h3><button class="btn sm" data-copy="#out">复制</button><button class="btn sm" data-send="#out">发送到 ▾</button></div>' +
        '<div class="pane-body flush"><textarea id="out" readonly style="min-height:500px"></textarea><div class="tree hidden" id="tree"></div></div></div></div>';
      var view = 'text', data;
      function indent() { var v = $('#indent', el).value; return v === 't' ? '\t' : +v; }
      function parse() {
        var src = $('#in', el).value;
        try { data = JSON.parse(src); return true; }
        catch (e) { data = undefined; $('#msg', el).innerHTML = '<span class="err">✗ ' + esc(e.message) + (where(src, e.message) ? '（' + where(src, e.message) + '）' : '') + '</span>'; return false; }
      }
      function showView() {
        var ta = $('#out', el), tr = $('#tree', el);
        ta.classList.toggle('hidden', view === 'tree'); tr.classList.toggle('hidden', view !== 'tree');
        if (view === 'tree') tr.innerHTML = data === undefined ? '<span class="muted">请先输入合法 JSON</span>' : tree(data);
        if (view === 'ts') ta.value = data === undefined ? '' : toTs(data, 'Root');
      }
      function act(a) {
        var src = $('#in', el).value, out = $('#out', el);
        if (a === 'esc') { out.value = JSON.stringify(src); $('#msg', el).innerHTML = '<span class="ok">✓ 已转义</span>'; return; }
        if (a === 'unesc') { try { var s = JSON.parse(/^".*"$/s.test(src.trim()) ? src.trim() : '"' + src + '"'); out.value = s; try { data = JSON.parse(s); } catch (e) { /* plain string */ } $('#msg', el).innerHTML = '<span class="ok">✓ 已去除转义</span>'; } catch (e) { $('#msg', el).innerHTML = '<span class="err">✗ 无法去除转义</span>'; } return; }
        if (!parse()) return;
        var d = a === 'sort' ? sortKeys(data) : data;
        out.value = JSON.stringify(d, null, a === 'min' ? 0 : indent());
        var size = new Blob([out.value]).size;
        $('#msg', el).innerHTML = '<span class="ok">✓ JSON 合法</span> · ' + App.bytes(size);
        if (view !== 'text') { $('#view button[data-v=text]', el).click(); }
      }
      el.addEventListener('click', function (e) { var a = e.target.getAttribute('data-a'); if (a) act(a); });
      $('#clear', el).onclick = function () { $('#in', el).value = ''; $('#in', el).dispatchEvent(new Event('input')); };
      App.seg($('#view', el), function (v) { view = v; if (v !== 'text') parse(); showView(); });
      ctx.persist();
      if (ctx.input) $('#in', el).value = ctx.input;
      act('fmt');
    }
  });

  /* ===== Excel 转 JSON ===== */
  App.register({
    id: 'excel', group: 'data', icon: 'XLS', title: 'Excel / CSV 转 JSON',
    desc: '本地解析 xlsx / xls / csv，转换为 JSON 或 SQL INSERT', kw: 'excel xlsx csv json sql 表格 zh',
    scripts: ['vendor/xlsx.full.min.js'],
    render: function (el, ctx) {
      el.innerHTML = '<div class="drop" id="drop"><b>选择或拖入表格文件</b>（xlsx / xls / csv / ods）<br><span class="msg">文件仅在本地解析</span></div><input type="file" id="file" accept=".xlsx,.xls,.csv,.ods" hidden>' +
        '<div class="pane" style="margin-top:16px"><div class="pane-head"><select id="sheet" class="w160"></select><div class="seg" id="fmt"><button data-v="obj" class="on">对象数组</button><button data-v="arr">二维数组</button><button data-v="sql">SQL</button></div><h3></h3>' +
        '<button class="btn sm" data-copy="#out">复制</button><button class="btn sm" data-send="#out">发送到 ▾</button><button class="btn sm" id="dl">下载</button></div><div class="pane-body flush"><textarea id="out" readonly style="min-height:380px" placeholder="转换结果"></textarea></div></div>';
      var wb = null, name = 'data', fmt = 'obj';
      function sqlVal(v) { return typeof v === 'number' ? v : v === '' || v == null ? 'NULL' : "'" + String(v).replace(/'/g, "''") + "'"; }
      function run() {
        if (!wb) return;
        var ws = wb.Sheets[$('#sheet', el).value], out;
        if (fmt === 'arr') out = JSON.stringify(XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }), null, 2);
        else {
          var rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
          if (fmt === 'obj') out = JSON.stringify(rows, null, 2);
          else {
            var table = $('#sheet', el).value.replace(/\W+/g, '_') || 'table1', cols = rows.length ? Object.keys(rows[0]) : [];
            out = rows.map(function (r) { return 'INSERT INTO `' + table + '` (' + cols.map(function (c) { return '`' + c + '`'; }).join(', ') + ') VALUES (' + cols.map(function (c) { return sqlVal(r[c]); }).join(', ') + ');'; }).join('\n');
          }
        }
        $('#out', el).value = out;
      }
      function fromFile(f) {
        name = f.name.replace(/\.[^.]+$/, '');
        App.readFile(f, 'buffer').then(function (buf) {
          try {
            wb = XLSX.read(buf, { type: 'array' });
            $('#sheet', el).innerHTML = wb.SheetNames.map(function (n) { return '<option>' + esc(n) + '</option>'; }).join('');
            $('#drop', el).innerHTML = '已加载 <b>' + esc(f.name) + '</b> · ' + wb.SheetNames.length + ' 个工作表（点击更换）';
            run();
          } catch (e) { App.toast('解析失败：' + e.message); }
        });
      }
      App.bindDrop($('#drop', el), $('#file', el), fromFile);
      App.seg($('#fmt', el), function (v) { fmt = v; run(); });
      $('#sheet', el).onchange = run;
      $('#dl', el).onclick = function () { var v = $('#out', el).value; if (v) App.download(name + (fmt === 'sql' ? '.sql' : '.json'), v); };
      if (ctx.file) fromFile(ctx.file);
    }
  });

  /* ===== PHP 反序列化 ===== */
  function unserialize(str) {
    var b = new TextEncoder().encode(str), p = 0, dec = new TextDecoder();
    function until(ch) { var s = p, c = ch.charCodeAt(0); while (p < b.length && b[p] !== c) p++; if (p >= b.length) throw new Error('意外结束，缺少 "' + ch + '"'); var r = dec.decode(b.slice(s, p)); p++; return r; }
    function exp(ch) { if (String.fromCharCode(b[p]) !== ch) throw new Error('第 ' + p + ' 字节处应为 "' + ch + '"'); p++; }
    function take(n) { var r = dec.decode(b.slice(p, p + n)); p += n; return r; }
    function val() {
      var t = String.fromCharCode(b[p++]);
      switch (t) {
        case 'N': exp(';'); return null;
        case 'b': exp(':'); return until(';') === '1';
        case 'i': exp(':'); return parseInt(until(';'), 10);
        case 'd': exp(':'); return parseFloat(until(';'));
        case 's': case 'S': { exp(':'); var n = +until(':'); exp('"'); var s = take(n); exp('"'); exp(';'); return s; }
        case 'a': { exp(':'); var c = +until(':'); exp('{'); var o = {}, list = true; for (var i = 0; i < c; i++) { var k = val(); if (k !== i) list = false; o[k] = val(); } exp('}'); return list ? Object.keys(o).map(function (k) { return o[k]; }) : o; }
        case 'O': { exp(':'); until(':'); exp('"'); var cls = until('"'); exp(':'); var m = +until(':'); exp('{'); var ob = { __class: cls }; for (var j = 0; j < m; j++) { var key = String(val()).replace(/^\0\*\0|^\0[^\0]+\0/, ''); ob[key] = val(); } exp('}'); return ob; }
        case 'C': { exp(':'); until(':'); exp('"'); var cn = until('"'); exp(':'); var l = +until(':'); exp('{'); var d = take(l); exp('}'); return { __class: cn, __data: d }; }
        case 'r': case 'R': exp(':'); return '*REF#' + until(';');
        default: throw new Error('未知类型 "' + t + '"（第 ' + (p - 1) + ' 字节）');
      }
    }
    return val();
  }
  function serialize(v) {
    var len = function (s) { return new TextEncoder().encode(s).length; };
    if (v == null) return 'N;';
    if (typeof v === 'boolean') return 'b:' + (v ? 1 : 0) + ';';
    if (typeof v === 'number') return Number.isInteger(v) ? 'i:' + v + ';' : 'd:' + v + ';';
    if (typeof v === 'string') return 's:' + len(v) + ':"' + v + '";';
    var keys = Object.keys(v);
    return 'a:' + keys.length + ':{' + keys.map(function (k, i) { return serialize(Array.isArray(v) ? i : /^-?\d+$/.test(k) ? +k : k) + serialize(v[k]); }).join('') + '}';
  }
  App.register({
    id: 'unserialize', group: 'data', icon: 'a:{}', title: 'PHP 序列化', accepts: true,
    desc: 'PHP serialize 数据与 JSON 双向转换，支持对象与中文', kw: 'php serialize unserialize xlh 序列化 反序列化',
    render: function (el, ctx) {
      el.innerHTML = '<div class="inline" style="margin-bottom:14px"><button class="btn primary" id="toJson">反序列化 → JSON</button><button class="btn" id="toPhp">JSON → serialize</button><span class="msg" id="msg"></span></div>' +
        '<div class="grid2"><div class="pane"><div class="pane-head"><h3>输入</h3></div><div class="pane-body flush"><textarea id="in" data-persist style="min-height:420px">a:3:{s:4:"name";s:9:"千机匣";s:4:"tags";a:2:{i:0;s:3:"php";i:1;s:4:"json";}s:6:"active";b:1;}</textarea></div></div>' +
        '<div class="pane"><div class="pane-head"><h3>输出</h3><button class="btn sm" data-copy="#out">复制</button><button class="btn sm" data-send="#out">发送到 ▾</button></div><div class="pane-body flush"><textarea id="out" readonly style="min-height:420px"></textarea></div></div></div>';
      function wrap(fn) { return function () { try { $('#out', el).value = fn($('#in', el).value.trim()); $('#msg', el).innerHTML = '<span class="ok">✓ 成功</span>'; } catch (e) { $('#msg', el).innerHTML = '<span class="err">✗ ' + esc(e.message) + '</span>'; } }; }
      $('#toJson', el).onclick = wrap(function (s) { return JSON.stringify(unserialize(s), null, 2); });
      $('#toPhp', el).onclick = wrap(function (s) { return serialize(JSON.parse(s)); });
      ctx.persist();
      if (ctx.input) $('#in', el).value = ctx.input;
      (/^\s*[\[{]/.test($('#in', el).value) ? $('#toPhp', el) : $('#toJson', el)).click();
    }
  });

  /* ===== 进制转换 ===== */
  App.register({
    id: 'radix', group: 'data', icon: '0x', title: '进制转换', accepts: true,
    desc: '2 / 8 / 10 / 16 / 32 / 36 及任意进制互转，支持超大整数', kw: 'jz 进制 二进制 十六进制 binary hex radix',
    render: function (el, ctx) {
      var bases = [[2, 'BIN 二进制'], [8, 'OCT 八进制'], [10, 'DEC 十进制'], [16, 'HEX 十六进制'], [32, '三十二进制'], [36, '三十六进制']];
      el.innerHTML = '<div class="pane"><div class="pane-body">' + bases.map(function (b) { return '<div class="field"><label>' + b[1] + '</label><div class="inline"><input type="text" data-b="' + b[0] + '" style="font-family:var(--mono)"><button class="btn sm" data-c="' + b[0] + '">复制</button></div></div>'; }).join('') +
        '<div class="field"><label>自定义进制</label><div class="inline"><input type="number" id="base" class="w80" min="2" max="36" value="7"><input type="text" data-b="x" style="font-family:var(--mono)"></div></div><p class="err" id="err"></p></div></div>';
      var D = '0123456789abcdefghijklmnopqrstuvwxyz';
      function baseOf(i) { var b = i.getAttribute('data-b'); return b === 'x' ? +$('#base', el).value : +b; }
      function parse(s, base) {
        s = s.trim().toLowerCase().replace(/[_\s]/g, ''); var neg = s[0] === '-'; if (neg) s = s.slice(1);
        if (base === 16) s = s.replace(/^0x/, ''); if (base === 2) s = s.replace(/^0b/, ''); if (base === 8) s = s.replace(/^0o/, '');
        if (!s) throw new Error('');
        var r = 0n, B = BigInt(base);
        for (var i = 0; i < s.length; i++) { var d = D.indexOf(s[i]); if (d < 0 || d >= base) throw new Error('"' + s[i] + '" 不是合法的 ' + base + ' 进制数字'); r = r * B + BigInt(d); }
        return neg ? -r : r;
      }
      function update(src) {
        $('#err', el).textContent = '';
        var all = App.$$('input[data-b]', el);
        if (!src.value.trim()) { all.forEach(function (i) { if (i !== src) i.value = ''; }); return; }
        try { var n = parse(src.value, baseOf(src)); all.forEach(function (i) { if (i !== src) i.value = n.toString(baseOf(i)).toUpperCase(); }); }
        catch (e) { $('#err', el).textContent = e.message; }
      }
      el.addEventListener('input', function (e) { if (e.target.id === 'base') update($('input[data-b="10"]', el)); else if (e.target.hasAttribute('data-b')) update(e.target); });
      el.addEventListener('click', function (e) { var c = e.target.getAttribute('data-c'); if (c) App.copy($('input[data-b="' + c + '"]', el).value); });
      var t = (ctx.input || '255').trim(), target = $('input[data-b="10"]', el);
      if (/^0x/i.test(t)) target = $('input[data-b="16"]', el); else if (/^0b/i.test(t)) target = $('input[data-b="2"]', el);
      target.value = t.replace(/,/g, ''); update(target);
    }
  });

  /* ===== URL 解析 ===== */
  App.register({
    id: 'urlparse', group: 'data', icon: 'URL', title: 'URL 解析', isNew: true, accepts: true,
    desc: '拆解网址的协议、域名、路径与查询参数，可编辑参数并重新生成', kw: 'url jx 网址 解析 参数 query',
    render: function (el, ctx) {
      el.innerHTML = '<div class="pane"><div class="pane-body"><input type="text" id="in" data-persist value="https://user@example.com:8080/path/to/page.html?id=42&name=%E5%8D%83%E6%9C%BA%E5%8C%A3&tags=a&tags=b#section" style="font-family:var(--mono)"></div></div>' +
        '<div class="grid2"><div class="pane"><div class="pane-head"><h3>结构</h3></div><div class="pane-body"><table class="kv" id="parts"></table></div></div>' +
        '<div class="pane"><div class="pane-head"><h3>查询参数</h3><button class="btn sm" id="add">＋ 添加</button></div><div class="pane-body"><table class="kv" id="params"></table></div></div></div>' +
        '<div class="pane"><div class="pane-head"><h3>重新生成的 URL</h3><button class="btn sm" data-copy="#out">复制</button><button class="btn sm" data-send="#out">发送到 ▾</button></div><div class="pane-body"><div class="out" id="out"></div></div></div>';
      var url = null;
      function parse() {
        try { url = new URL($('#in', el).value.trim()); } catch (e) { url = null; $('#parts', el).innerHTML = '<tr><td class="err">无法解析该网址（需包含协议，如 https://）</td></tr>'; $('#params', el).innerHTML = ''; $('#out', el).textContent = ''; return; }
        var rows = [['协议', url.protocol], ['用户名', url.username], ['主机', url.hostname], ['端口', url.port || '(默认)'], ['路径', decodeURIComponent(url.pathname)], ['查询串', url.search], ['锚点', url.hash], ['Origin', url.origin]];
        $('#parts', el).innerHTML = rows.filter(function (r) { return r[1]; }).map(function (r) { return '<tr><th>' + r[0] + '</th><td class="mono">' + esc(r[1]) + '</td></tr>'; }).join('');
        var ps = Array.from(url.searchParams.entries());
        $('#params', el).innerHTML = ps.map(function (p, i) { return '<tr><td style="width:36%"><input type="text" data-k="' + i + '" value="' + esc(p[0]) + '"></td><td><input type="text" data-v="' + i + '" value="' + esc(p[1]) + '"></td><td style="width:40px"><button class="btn sm danger" data-del="' + i + '">✕</button></td></tr>'; }).join('') || '<tr><td class="muted">无查询参数</td></tr>';
        $('#out', el).textContent = url.href;
      }
      function rebuild() {
        if (!url) return;
        var sp = new URLSearchParams();
        App.$$('[data-k]', el).forEach(function (k) { if (k.value) sp.append(k.value, $('[data-v="' + k.getAttribute('data-k') + '"]', el).value); });
        url.search = sp.toString(); $('#out', el).textContent = url.href;
      }
      $('#in', el).addEventListener('input', parse);
      $('#params', el).addEventListener('input', rebuild);
      $('#params', el).addEventListener('click', function (e) { var d = e.target.getAttribute('data-del'); if (d !== null) { e.target.closest('tr').remove(); rebuild(); } });
      $('#add', el).onclick = function () { if (!url) return; url.searchParams.append('key', 'value'); $('#in', el).value = url.href; parse(); };
      ctx.persist();
      if (ctx.input) $('#in', el).value = ctx.input.trim();
      parse();
    }
  });
})();
