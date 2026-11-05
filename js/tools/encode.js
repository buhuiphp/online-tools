(function () {
  'use strict';
  var $ = App.$, esc = App.escapeHtml;

  function utf8ToB64(s) { var b = ''; new TextEncoder().encode(s).forEach(function (x) { b += String.fromCharCode(x); }); return btoa(b); }
  function b64ToUtf8(s) {
    s = s.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s), arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(arr);
  }
  function hash(name, s) { return CryptoJS[name](s).toString(); }

  var OPS = [
    ['Unicode 编码', function (s) { return Array.from(s).map(function (c) { var n = c.codePointAt(0); if (n < 128) return c; if (n > 0xffff) { var h = c.charCodeAt(0), l = c.charCodeAt(1); return '\\u' + h.toString(16) + '\\u' + l.toString(16); } return '\\u' + ('0000' + n.toString(16)).slice(-4); }).join(''); }],
    ['Unicode 解码', function (s) { return s.replace(/\\u\{([0-9a-fA-F]+)\}/g, function (_, h) { return String.fromCodePoint(parseInt(h, 16)); }).replace(/\\u([0-9a-fA-F]{4})/g, function (_, h) { return String.fromCharCode(parseInt(h, 16)); }).replace(/&#x([0-9a-fA-F]+);/g, function (_, h) { return String.fromCodePoint(parseInt(h, 16)); }); }],
    ['URL 编码', function (s) { return encodeURIComponent(s); }],
    ['URL 解码', function (s) { return decodeURIComponent(s.replace(/\+/g, ' ')); }],
    ['Base64 编码', utf8ToB64],
    ['Base64 解码', b64ToUtf8],
    ['HTML 实体编码', function (s) { return esc(s); }],
    ['HTML 实体解码', function (s) { var t = document.createElement('textarea'); t.innerHTML = s; return t.value; }],
    ['UTF-8 → Hex', function (s) { return Array.from(new TextEncoder().encode(s)).map(function (b) { return ('0' + b.toString(16)).slice(-2); }).join(' '); }],
    ['Hex → UTF-8', function (s) { var h = s.replace(/0x|\\x|[\s,%]/gi, ''); if (h.length % 2 || /[^0-9a-f]/i.test(h)) throw new Error('不是合法的十六进制'); var a = new Uint8Array(h.length / 2); for (var i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16); return new TextDecoder().decode(a); }],
    ['MD5', function (s) { return hash('MD5', s); }],
    ['MD5 (大写)', function (s) { return hash('MD5', s).toUpperCase(); }],
    ['SHA1', function (s) { return hash('SHA1', s); }],
    ['SHA256', function (s) { return hash('SHA256', s); }],
    ['SHA512', function (s) { return hash('SHA512', s); }],
    ['大写', function (s) { return s.toUpperCase(); }],
    ['小写', function (s) { return s.toLowerCase(); }]
  ];

  App.register({
    id: 'encode', group: 'encode', icon: '%', title: '编码转换工具',
    desc: 'Unicode / URL / Base64 / HTML 编解码，MD5 / SHA 摘要', keywords: 'unicode url base64 html md5 sha1 sha256 hex 编码 解码 加密',
    scripts: ['vendor/crypto-js.min.js'],
    render: function (el) {
      el.innerHTML = '<label class="field-label">输入</label><textarea id="ecIn" style="min-height:160px">你好，World! https://example.com/?q=测试</textarea>' +
        '<div class="row" style="margin:12px 0" id="ecOps">' + OPS.map(function (o, i) { return '<button class="btn ' + (i % 2 && i < 10 ? 'ghost' : '') + ' sm" data-i="' + i + '">' + o[0] + '</button>'; }).join('') + '</div>' +
        '<label class="field-label">输出</label><textarea id="ecOut" style="min-height:160px" readonly></textarea>' +
        '<div class="row" style="margin-top:10px"><button class="btn" id="ecCopy">复制结果</button><button class="btn ghost" id="ecSwap">结果作为输入 ↑</button></div>';
      $('#ecOps').addEventListener('click', function (e) {
        var i = e.target.getAttribute('data-i'); if (i === null) return;
        try { $('#ecOut').value = OPS[i][1]($('#ecIn').value); $('#ecOut').classList.remove('error'); }
        catch (err) { $('#ecOut').value = '转换失败：' + err.message; $('#ecOut').classList.add('error'); }
      });
      $('#ecCopy').onclick = function () { App.copy($('#ecOut').value); };
      $('#ecSwap').onclick = function () { $('#ecIn').value = $('#ecOut').value; };
    }
  });

  /* ---------------- JSON 格式化 ---------------- */
  function locate(text, msg) {
    var m = msg.match(/position (\d+)/i), pos = m ? +m[1] : -1;
    var lc = msg.match(/line (\d+) column (\d+)/i);
    if (lc) return '第 ' + lc[1] + ' 行，第 ' + lc[2] + ' 列';
    if (pos < 0) return '';
    var before = text.slice(0, pos), line = before.split('\n').length, col = pos - before.lastIndexOf('\n');
    return '第 ' + line + ' 行，第 ' + col + ' 列，附近：' + text.slice(Math.max(0, pos - 15), pos + 15).replace(/\n/g, ' ');
  }
  function sortKeys(v) {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === 'object') { var o = {}; Object.keys(v).sort().forEach(function (k) { o[k] = sortKeys(v[k]); }); return o; }
    return v;
  }
  App.register({
    id: 'json', group: 'encode', icon: '{ }', title: 'JSON 格式化',
    desc: 'JSON 校验、格式化、压缩、转义，错误定位提示', keywords: 'json 格式化 校验 压缩 美化',
    render: function (el) {
      el.innerHTML = '<div class="row"><button class="btn" data-a="fmt">格式化</button><button class="btn ghost" data-a="min">压缩</button><button class="btn ghost" data-a="sort">按键排序</button>' +
        '<button class="btn ghost" data-a="esc">转义</button><button class="btn ghost" data-a="unesc">去转义</button>' +
        '<select id="jsIndent" class="w-s" style="flex:0 0 110px"><option value="2">缩进 2</option><option value="4">缩进 4</option><option value="tab">Tab</option></select>' +
        '<button class="btn ghost" id="jsCopy">复制结果</button></div>' +
        '<div id="jsMsg" class="muted" style="margin-bottom:8px"></div>' +
        '<div class="cols"><textarea id="jsIn" style="min-height:460px" placeholder="粘贴 JSON">{"name":"在线工具集","tools":["二维码生成","二维码解码","JSON"],"free":true,"version":1.0}</textarea>' +
        '<textarea id="jsOut" style="min-height:460px" readonly></textarea></div>';
      function indent() { var v = $('#jsIndent').value; return v === 'tab' ? '\t' : +v; }
      el.addEventListener('click', function (e) {
        var a = e.target.getAttribute('data-a'); if (!a) return;
        var src = $('#jsIn').value, msg = $('#jsMsg');
        try {
          var out;
          if (a === 'esc') out = JSON.stringify(src).slice(1, -1);
          else if (a === 'unesc') out = JSON.parse('"' + src.replace(/^"|"$/g, '') + '"');
          else {
            var data = JSON.parse(src);
            if (a === 'sort') data = sortKeys(data);
            out = JSON.stringify(data, null, a === 'min' ? 0 : indent());
          }
          $('#jsOut').value = out;
          msg.innerHTML = '<span class="ok">✓ 操作成功</span>' + (a === 'fmt' || a === 'min' || a === 'sort' ? '，JSON 格式正确' : '');
        } catch (err) {
          msg.innerHTML = '<span class="error">✗ 解析错误：' + esc(err.message) + (locate(src, err.message) ? '（' + esc(locate(src, err.message)) + '）' : '') + '</span>';
        }
      });
      $('#jsCopy').onclick = function () { App.copy($('#jsOut').value); };
    }
  });

  /* ---------------- Excel 转 JSON ---------------- */
  App.register({
    id: 'excel2json', group: 'encode', icon: 'XLS', title: 'Excel转JSON',
    desc: '将 Excel / CSV 文件快速转换为 JSON 数据', keywords: 'excel xlsx csv json 转换 表格',
    scripts: ['vendor/xlsx.full.min.js'],
    render: function (el) {
      el.innerHTML = '<div class="dropzone" id="xlDrop"><p><b>点击选择</b> 或拖拽 .xlsx / .xls / .csv 文件到这里</p><p class="muted">文件仅在本地解析</p></div><input type="file" id="xlInput" accept=".xlsx,.xls,.csv,.ods" hidden>' +
        '<div class="row" style="margin-top:12px"><label>工作表</label><select id="xlSheet" class="w-s" style="flex:0 0 180px"></select>' +
        '<label><input type="checkbox" id="xlHeader" checked>首行作为键名</label><label><input type="checkbox" id="xlPretty" checked>格式化</label>' +
        '<button class="btn" id="xlCopy">复制</button><button class="btn ghost" id="xlDl">下载 JSON</button></div>' +
        '<textarea id="xlOut" style="min-height:380px" readonly placeholder="转换结果"></textarea>';
      var wb = null, name = 'data';
      function run() {
        if (!wb) return;
        var ws = wb.Sheets[$('#xlSheet').value];
        var data = XLSX.utils.sheet_to_json(ws, $('#xlHeader').checked ? { defval: '' } : { header: 1, defval: '' });
        $('#xlOut').value = JSON.stringify(data, null, $('#xlPretty').checked ? 2 : 0);
      }
      App.bindDropzone($('#xlDrop'), $('#xlInput'), function (f) {
        name = f.name.replace(/\.[^.]+$/, '');
        App.readFile(f, 'arraybuffer').then(function (buf) {
          try {
            wb = XLSX.read(buf, { type: 'array' });
            $('#xlSheet').innerHTML = wb.SheetNames.map(function (n) { return '<option>' + esc(n) + '</option>'; }).join('');
            $('#xlDrop').querySelector('p').innerHTML = '已加载：<b>' + esc(f.name) + '</b>（点击更换）';
            run();
          } catch (e) { App.toast('解析失败：' + e.message); }
        });
      });
      ['xlSheet', 'xlHeader', 'xlPretty'].forEach(function (id) { $('#' + id).addEventListener('change', run); });
      $('#xlCopy').onclick = function () { App.copy($('#xlOut').value); };
      $('#xlDl').onclick = function () { if ($('#xlOut').value) App.download(name + '.json', $('#xlOut').value, 'application/json'); };
    }
  });

  /* ---------------- PHP 反序列化 ---------------- */
  function phpUnserialize(str) {
    var bytes = new TextEncoder().encode(str), pos = 0, dec = new TextDecoder();
    function readUntil(ch) {
      var start = pos, code = ch.charCodeAt(0);
      while (pos < bytes.length && bytes[pos] !== code) pos++;
      if (pos >= bytes.length) throw new Error('意外结束，期望 "' + ch + '"');
      var s = dec.decode(bytes.slice(start, pos)); pos++; return s;
    }
    function expect(ch) { if (String.fromCharCode(bytes[pos]) !== ch) throw new Error('位置 ' + pos + ' 期望 "' + ch + '"'); pos++; }
    function readStr(len) { var s = dec.decode(bytes.slice(pos, pos + len)); pos += len; return s; }
    function parse() {
      var type = String.fromCharCode(bytes[pos]); pos++;
      switch (type) {
        case 'N': expect(';'); return null;
        case 'b': expect(':'); return readUntil(';') === '1';
        case 'i': expect(':'); return parseInt(readUntil(';'), 10);
        case 'd': expect(':'); return parseFloat(readUntil(';'));
        case 's': case 'S': {
          expect(':'); var len = +readUntil(':'); expect('"');
          var s = readStr(len); expect('"'); expect(';'); return s;
        }
        case 'a': {
          expect(':'); var n = +readUntil(':'); expect('{');
          var obj = {}, isList = true;
          for (var i = 0; i < n; i++) { var k = parse(), v = parse(); if (k !== i) isList = false; obj[k] = v; }
          expect('}');
          return isList ? Object.keys(obj).map(function (k) { return obj[k]; }) : obj;
        }
        case 'O': {
          expect(':'); readUntil(':'); expect('"'); var cls = readUntil('"'); expect(':');
          var cnt = +readUntil(':'); expect('{');
          var o = { __class: cls };
          for (var j = 0; j < cnt; j++) {
            var key = String(parse()).replace(/^\0\*\0/, '').replace(/^\0[^\0]+\0/, '');
            o[key] = parse();
          }
          expect('}'); return o;
        }
        case 'C': {
          expect(':'); readUntil(':'); expect('"'); var c = readUntil('"'); expect(':');
          var l = +readUntil(':'); expect('{'); var d = readStr(l); expect('}');
          return { __class: c, __serialized: d };
        }
        case 'r': case 'R': expect(':'); return '*REF#' + readUntil(';');
        default: throw new Error('未知类型 "' + type + '"（位置 ' + (pos - 1) + '）');
      }
    }
    var result = parse();
    return result;
  }
  function phpSerialize(v) {
    var len = function (s) { return new TextEncoder().encode(s).length; };
    if (v === null || v === undefined) return 'N;';
    if (typeof v === 'boolean') return 'b:' + (v ? 1 : 0) + ';';
    if (typeof v === 'number') return Number.isInteger(v) ? 'i:' + v + ';' : 'd:' + v + ';';
    if (typeof v === 'string') return 's:' + len(v) + ':"' + v + '";';
    var keys = Object.keys(v);
    return 'a:' + keys.length + ':{' + keys.map(function (k, i) {
      var key = Array.isArray(v) ? i : (/^-?\d+$/.test(k) ? +k : k);
      return phpSerialize(key) + phpSerialize(v[k]);
    }).join('') + '}';
  }
  App.register({
    id: 'unserialize', group: 'encode', icon: 'a:{}', title: '在线反序列化',
    desc: 'PHP serialize 数据解析为 JSON，也支持 JSON 转 serialize', keywords: 'php serialize unserialize 序列化 反序列化',
    render: function (el) {
      el.innerHTML = '<div class="row"><button class="btn" id="usRun">反序列化 → JSON</button><button class="btn ghost" id="usRev">JSON → serialize</button><button class="btn ghost" id="usCopy">复制结果</button><span id="usMsg"></span></div>' +
        '<div class="cols"><textarea id="usIn" style="min-height:420px">a:3:{s:4:"name";s:12:"在线工具";s:4:"tags";a:2:{i:0;s:3:"php";i:1;s:4:"json";}s:6:"active";b:1;}</textarea>' +
        '<textarea id="usOut" style="min-height:420px" readonly></textarea></div>';
      function wrap(fn) {
        return function () {
          try { $('#usOut').value = fn($('#usIn').value.trim()); $('#usMsg').innerHTML = '<span class="ok">✓ 成功</span>'; }
          catch (e) { $('#usMsg').innerHTML = '<span class="error">✗ ' + esc(e.message) + '</span>'; }
        };
      }
      $('#usRun').onclick = wrap(function (s) { return JSON.stringify(phpUnserialize(s), null, 2); });
      $('#usRev').onclick = wrap(function (s) { return phpSerialize(JSON.parse(s)); });
      $('#usCopy').onclick = function () { App.copy($('#usOut').value); };
    }
  });

  /* ---------------- 进制转换 ---------------- */
  App.register({
    id: 'radix', group: 'encode', icon: '0x', title: '进制转换器',
    desc: '二进制 / 八进制 / 十进制 / 十六进制及任意进制互转', keywords: '进制 二进制 十六进制 binary hex',
    render: function (el) {
      var bases = [[2, '二进制'], [8, '八进制'], [10, '十进制'], [16, '十六进制'], [32, '三十二进制'], [36, '三十六进制']];
      el.innerHTML = '<p class="muted" style="margin-bottom:12px">在任意输入框中输入，其余进制自动换算（支持大整数）。</p>' +
        bases.map(function (b) { return '<label class="field-label">' + b[1] + '（' + b[0] + '）</label><div class="row"><input type="text" data-b="' + b[0] + '"><button class="btn ghost sm" data-c="' + b[0] + '">复制</button></div>'; }).join('') +
        '<div class="row"><label>自定义进制</label><input type="number" id="rxBase" class="w-s" min="2" max="36" value="5"><input type="text" id="rxCustom" data-b="custom"></div><p id="rxErr" class="error"></p>';
      var DIG = '0123456789abcdefghijklmnopqrstuvwxyz';
      function toBig(str, base) {
        str = str.trim().toLowerCase().replace(/^0[xbo]/, '').replace(/[_\s]/g, '');
        var neg = str[0] === '-'; if (neg) str = str.slice(1);
        if (!str) throw new Error('');
        var r = 0n, B = BigInt(base);
        for (var i = 0; i < str.length; i++) {
          var d = DIG.indexOf(str[i]);
          if (d < 0 || d >= base) throw new Error('"' + str[i] + '" 不是合法的 ' + base + ' 进制数字');
          r = r * B + BigInt(d);
        }
        return neg ? -r : r;
      }
      function update(src) {
        var base = src.getAttribute('data-b') === 'custom' ? +$('#rxBase').value : +src.getAttribute('data-b');
        $('#rxErr').textContent = '';
        try {
          if (!src.value.trim()) { App.$$('input[data-b]', el).forEach(function (i) { if (i !== src) i.value = ''; }); return; }
          var n = toBig(src.value, base);
          App.$$('input[data-b]', el).forEach(function (i) {
            if (i === src) return;
            var b = i.getAttribute('data-b') === 'custom' ? +$('#rxBase').value : +i.getAttribute('data-b');
            i.value = n.toString(b).toUpperCase();
          });
        } catch (e) { $('#rxErr').textContent = e.message; }
      }
      el.addEventListener('input', function (e) {
        if (e.target.id === 'rxBase') return update($('input[data-b="10"]', el));
        if (e.target.hasAttribute('data-b')) update(e.target);
      });
      el.addEventListener('click', function (e) { var c = e.target.getAttribute('data-c'); if (c) App.copy($('input[data-b="' + c + '"]', el).value); });
      var dec = $('input[data-b="10"]', el); dec.value = '255'; update(dec);
    }
  });
})();
