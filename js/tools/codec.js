(function () {
  'use strict';
  var $ = App.$, esc = App.esc;

  function u8ToB64(u8) { var s = ''; for (var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
  function b64ToU8(s) {
    s = s.replace(/^data:[^,]*,/, '').replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s), a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return a;
  }
  App.b64 = { enc: function (s) { return u8ToB64(new TextEncoder().encode(s)); }, dec: function (s) { return new TextDecoder().decode(b64ToU8(s)); }, u8ToB64: u8ToB64, b64ToU8: b64ToU8 };

  /* ===== Base64 ===== */
  App.register({
    id: 'base64', group: 'codec', icon: 'B64', title: 'Base64 编解码', accepts: true,
    desc: '文本与 Base64 互转（支持 URL Safe），文件转 Base64 / Base64 还原文件', kw: 'base64 bm 编码 解码 文件',
    render: function (el, ctx) {
      el.innerHTML = '<div class="inline" style="margin-bottom:14px"><div class="seg" id="mode"><button data-v="text" class="on">文本</button><button data-v="file">文件</button></div></div>' +
        '<div id="textBox"><div class="grid2"><div class="pane"><div class="pane-head"><h3>输入</h3><label class="check"><input type="checkbox" id="urlsafe" data-persist>URL Safe</label></div><div class="pane-body flush"><textarea id="in" data-persist placeholder="输入文本或 Base64">Hello, 千机匣！</textarea></div></div>' +
        '<div class="pane"><div class="pane-head"><h3>输出</h3><button class="btn sm" data-copy="#out">复制</button><button class="btn sm" data-send="#out">发送到 ▾</button></div><div class="pane-body flush"><textarea id="out" readonly></textarea></div></div></div>' +
        '<div class="inline"><button class="btn primary" id="enc">编码 →</button><button class="btn" id="dec">← 解码</button><button class="btn" id="swap">⇅ 输出作为输入</button><span class="msg" id="msg"></span></div></div>' +
        '<div id="fileBox" class="hidden"><div class="grid2"><div class="pane"><div class="pane-head"><h3>文件 → Base64</h3></div><div class="pane-body"><div class="drop" id="drop"><b>选择或拖入任意文件</b><br><span class="msg">本地读取，不上传</span></div><input type="file" id="file" hidden>' +
        '<div class="inline" style="margin-top:12px"><label class="check"><input type="checkbox" id="dataurl" checked>包含 Data URL 前缀</label><button class="btn sm" data-copy="#fout">复制</button><span class="msg" id="finfo"></span></div><textarea id="fout" readonly style="margin-top:10px;min-height:160px"></textarea></div></div>' +
        '<div class="pane"><div class="pane-head"><h3>Base64 → 文件</h3></div><div class="pane-body"><textarea id="bin" placeholder="粘贴 Base64 或 data:...;base64,..." style="min-height:160px"></textarea><div class="inline" style="margin-top:10px"><input type="text" id="fname" value="file.bin" class="w160"><button class="btn primary" id="save">下载文件</button></div><div id="bprev" style="margin-top:10px"></div></div></div></div></div>';
      function run(fn) {
        try { $('#out', el).value = fn($('#in', el).value); $('#msg', el).innerHTML = '<span class="ok">✓ 完成</span>'; }
        catch (e) { $('#msg', el).innerHTML = '<span class="err">✗ 不是合法的 Base64</span>'; }
      }
      $('#enc', el).onclick = function () { run(function (s) { var r = App.b64.enc(s); return $('#urlsafe', el).checked ? r.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : r; }); };
      $('#dec', el).onclick = function () { run(App.b64.dec); };
      $('#swap', el).onclick = function () { $('#in', el).value = $('#out', el).value; };
      App.seg($('#mode', el), function (m) { $('#textBox', el).classList.toggle('hidden', m !== 'text'); $('#fileBox', el).classList.toggle('hidden', m === 'text'); });
      var lastFile = null;
      function fromFile(f) {
        lastFile = f;
        App.readFile(f, 'dataurl').then(function (url) {
          var v = $('#dataurl', el).checked ? url : url.split(',')[1];
          $('#fout', el).value = v; $('#finfo', el).textContent = f.name + ' · ' + App.bytes(f.size) + ' → ' + App.bytes(v.length);
        });
      }
      App.bindDrop($('#drop', el), $('#file', el), fromFile);
      $('#dataurl', el).onchange = function () { if (lastFile) fromFile(lastFile); };
      $('#bin', el).addEventListener('input', function () {
        var v = this.value.trim(), m = v.match(/^data:([^;,]+)/);
        $('#bprev', el).innerHTML = m && /^image\//.test(m[1]) ? '<img src="' + esc(v) + '" style="max-width:100%;max-height:200px;border-radius:8px">' : '';
        if (m) $('#fname', el).value = 'file.' + (m[1].split('/')[1] || 'bin').replace('+xml', '').replace('jpeg', 'jpg');
      });
      $('#save', el).onclick = function () {
        var v = $('#bin', el).value.trim(), m = v.match(/^data:([^;,]+)/);
        try { App.download($('#fname', el).value || 'file.bin', new Blob([b64ToU8(v)], { type: m ? m[1] : 'application/octet-stream' })); }
        catch (e) { App.toast('不是合法的 Base64'); }
      };
      ctx.persist();
      if (ctx.input) { $('#in', el).value = ctx.input; $('#dec', el).click(); if ($('#msg', el).textContent.indexOf('✗') >= 0) $('#enc', el).click(); }
      if (ctx.file) { $('#mode button[data-v=file]', el).click(); fromFile(ctx.file); }
    }
  });

  /* ===== 文本编解码 ===== */
  var CODECS = {
    url: ['URL (Component)', function (s) { return encodeURIComponent(s); }, function (s) { return decodeURIComponent(s.replace(/\+/g, ' ')); }],
    uri: ['URL (整条)', function (s) { return encodeURI(s); }, function (s) { return decodeURI(s); }],
    unicode: ['Unicode \\u', function (s) { return Array.from(s).map(function (c) { var n = c.codePointAt(0); return n < 128 ? c : n > 0xffff ? '\\u{' + n.toString(16) + '}' : '\\u' + n.toString(16).padStart(4, '0'); }).join(''); },
      function (s) { return s.replace(/\\u\{([0-9a-f]+)\}/gi, function (_, h) { return String.fromCodePoint(parseInt(h, 16)); }).replace(/\\u([0-9a-f]{4})/gi, function (_, h) { return String.fromCharCode(parseInt(h, 16)); }); }],
    html: ['HTML 实体', function (s) { return Array.from(s).map(function (c) { var n = c.codePointAt(0); return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || (n > 127 ? '&#' + n + ';' : c); }).join(''); },
      function (s) { var t = document.createElement('textarea'); t.innerHTML = s; return t.value; }],
    hex: ['UTF-8 Hex', function (s) { return Array.from(new TextEncoder().encode(s), function (b) { return b.toString(16).padStart(2, '0'); }).join(' '); },
      function (s) { var h = s.replace(/0x|\\x|[\s,%]/gi, ''); if (h.length % 2 || /[^0-9a-f]/i.test(h)) throw new Error('不是合法的十六进制'); var a = new Uint8Array(h.length / 2); for (var i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16); return new TextDecoder().decode(a); }],
    binary: ['二进制', function (s) { return Array.from(new TextEncoder().encode(s), function (b) { return b.toString(2).padStart(8, '0'); }).join(' '); },
      function (s) { var bits = s.replace(/[^01]/g, ''); if (bits.length % 8) throw new Error('位数不是 8 的倍数'); var a = new Uint8Array(bits.length / 8); for (var i = 0; i < a.length; i++) a[i] = parseInt(bits.substr(i * 8, 8), 2); return new TextDecoder().decode(a); }]
  };
  App.register({
    id: 'textcodec', group: 'codec', icon: '%u', title: '文本编解码', accepts: true,
    desc: 'URL / Unicode / HTML 实体 / Hex / 二进制 编码与解码，实时转换', kw: 'wbbjm url unicode html hex 转义 编码 解码',
    render: function (el, ctx) {
      el.innerHTML = '<div class="inline" style="margin-bottom:14px"><div class="seg" id="codec">' + Object.keys(CODECS).map(function (k, i) { return '<button data-v="' + k + '"' + (i ? '' : ' class="on"') + '>' + esc(CODECS[k][0]) + '</button>'; }).join('') + '</div>' +
        '<div class="seg" id="dir"><button data-v="enc" class="on">编码</button><button data-v="dec">解码</button></div></div>' +
        '<div class="grid2"><div class="pane"><div class="pane-head"><h3>输入</h3></div><div class="pane-body flush"><textarea id="in" data-persist>你好 World & <tag> https://a.com/?q=测试</textarea></div></div>' +
        '<div class="pane"><div class="pane-head"><h3>输出</h3><span class="msg" id="msg"></span><button class="btn sm" data-copy="#out">复制</button><button class="btn sm" data-send="#out">发送到 ▾</button></div><div class="pane-body flush"><textarea id="out" readonly></textarea></div></div></div>';
      var codec = 'url', dir = 'enc';
      function run() {
        try { $('#out', el).value = CODECS[codec][dir === 'enc' ? 1 : 2]($('#in', el).value); $('#msg', el).textContent = ''; }
        catch (e) { $('#msg', el).innerHTML = '<span class="err">' + esc(e.message || '转换失败') + '</span>'; }
      }
      App.seg($('#codec', el), function (v) { codec = v; run(); });
      App.seg($('#dir', el), function (v) { dir = v; run(); });
      $('#in', el).addEventListener('input', run);
      ctx.persist();
      if (ctx.input) {
        $('#in', el).value = ctx.input;
        var t = ctx.input;
        var guess = /\\u[0-9a-f]{4}/i.test(t) ? 'unicode' : /&#?\w+;/.test(t) ? 'html' : /%[0-9a-f]{2}/i.test(t) ? 'url' : null;
        if (guess) { $('#codec button[data-v=' + guess + ']', el).click(); $('#dir button[data-v=dec]', el).click(); }
      }
      run();
    }
  });

  /* ===== 哈希 ===== */
  var ALGOS = ['MD5', 'SHA1', 'SHA256', 'SHA512', 'SHA3', 'RIPEMD160'];
  App.register({
    id: 'hash', group: 'codec', icon: '#', title: '哈希计算', accepts: true,
    desc: 'MD5 / SHA1 / SHA256 / SHA512 / SHA3，支持 HMAC 与文件哈希', kw: 'hash hx md5 sha1 sha256 hmac 摘要 加密 校验',
    scripts: ['vendor/crypto-js.min.js'],
    render: function (el, ctx) {
      el.innerHTML = '<div class="inline" style="margin-bottom:14px"><div class="seg" id="mode"><button data-v="text" class="on">文本</button><button data-v="file">文件</button></div>' +
        '<label class="check"><input type="checkbox" id="upper" data-persist>大写</label><label class="check"><input type="checkbox" id="hmac" data-persist>HMAC</label><input type="text" id="key" placeholder="HMAC 密钥" class="w160 hidden" data-persist></div>' +
        '<div class="pane" id="textBox"><div class="pane-body flush"><textarea id="in" data-persist style="min-height:150px" placeholder="输入要计算哈希的文本">千机匣</textarea></div></div>' +
        '<div id="fileBox" class="hidden"><div class="drop" id="drop"><b>选择或拖入文件</b>，计算文件哈希（本地计算）</div><input type="file" id="file" hidden><p class="msg" id="finfo" style="margin:8px 0 16px"></p></div>' +
        '<div class="pane"><div class="pane-head"><h3>结果</h3><input type="text" id="cmp" placeholder="粘贴哈希值进行比对" style="max-width:320px"></div><div class="pane-body"><table class="kv" id="res"></table></div></div>';
      var mode = 'text', word = null;
      function calc() {
        if (!el.isConnected) return;
        var hm = $('#hmac', el).checked, key = $('#key', el).value, up = $('#upper', el).checked, cmp = $('#cmp', el).value.trim().toLowerCase();
        $('#key', el).classList.toggle('hidden', !hm);
        var data = mode === 'text' ? $('#in', el).value : word;
        if (data == null) { $('#res', el).innerHTML = '<tr><td class="muted">请选择文件</td></tr>'; return; }
        $('#res', el).innerHTML = ALGOS.map(function (a) {
          var fn = hm ? CryptoJS['Hmac' + a] : CryptoJS[a];
          if (!fn) return '';
          var h = (hm ? fn(data, key) : fn(data)).toString();
          var hit = cmp && h === cmp;
          return '<tr><th>' + (hm ? 'HMAC-' : '') + a + (hit ? ' <span class="badge ok">匹配</span>' : '') + '</th><td class="mono">' + (up ? h.toUpperCase() : h) + '</td><td style="width:60px"><button class="btn sm" data-h="' + h + '">复制</button></td></tr>';
        }).join('');
      }
      $('#res', el).addEventListener('click', function (e) { var h = e.target.getAttribute('data-h'); if (h) App.copy($('#upper', el).checked ? h.toUpperCase() : h); });
      function fromFile(f) {
        if (f.size > 300 * 1048576) return App.toast('文件过大（> 300MB）');
        $('#finfo', el).textContent = '读取中… ' + f.name;
        App.readFile(f, 'buffer').then(function (buf) {
          word = CryptoJS.lib.WordArray.create(new Uint8Array(buf));
          $('#finfo', el).textContent = f.name + ' · ' + App.bytes(f.size); calc();
        });
      }
      App.bindDrop($('#drop', el), $('#file', el), fromFile);
      App.seg($('#mode', el), function (m) { mode = m; $('#textBox', el).classList.toggle('hidden', m !== 'text'); $('#fileBox', el).classList.toggle('hidden', m === 'text'); calc(); });
      el.addEventListener('input', calc); el.addEventListener('change', calc);
      ctx.persist();
      if (ctx.input) $('#in', el).value = ctx.input;
      if (ctx.file) { $('#mode button[data-v=file]', el).click(); fromFile(ctx.file); }
      calc();
    }
  });

  /* ===== JWT ===== */
  function fmtTime(sec) { var d = new Date(sec * 1000); return isNaN(d) ? '' : d.toLocaleString('zh-CN', { hour12: false }); }
  App.register({
    id: 'jwt', group: 'codec', icon: 'JWT', title: 'JWT 解析', isNew: true, accepts: true,
    desc: '解析 JWT 的 Header / Payload，显示过期时间，支持 HS256 签名校验', kw: 'jwt jx token 令牌 解析 json web token',
    scripts: ['vendor/crypto-js.min.js'],
    render: function (el, ctx) {
      var sample = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IuWNg-acuuWMoyIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjo0MTAyNDQ0ODAwfQ.etTdkZd5zE336YBCIin61jAeI9-CfvtND-gOX111GeY';
      el.innerHTML = '<div class="pane"><div class="pane-head"><h3>JWT 令牌</h3><span id="state"></span></div><div class="pane-body flush"><textarea id="in" data-persist style="min-height:110px"></textarea></div></div>' +
        '<div class="grid2"><div class="pane"><div class="pane-head"><h3>Header</h3><button class="btn sm" data-copy="#hd">复制</button></div><div class="pane-body"><div class="out" id="hd"></div></div></div>' +
        '<div class="pane"><div class="pane-head"><h3>Payload</h3><button class="btn sm" data-copy="#pl">复制</button><button class="btn sm" data-send="#pl">发送到 ▾</button></div><div class="pane-body"><div class="out" id="pl"></div></div></div></div>' +
        '<div class="grid2"><div class="pane"><div class="pane-head"><h3>时间声明</h3></div><div class="pane-body"><table class="kv" id="times"></table></div></div>' +
        '<div class="pane"><div class="pane-head"><h3>签名校验（HS256 / HS384 / HS512）</h3></div><div class="pane-body"><div class="inline"><input type="text" id="secret" placeholder="输入密钥（示例令牌的密钥为 qianjixia）"><label class="check"><input type="checkbox" id="b64key">密钥为 Base64</label></div><p id="sig" class="msg" style="margin-top:10px">输入密钥后自动校验</p></div></div></div>';
      function part(s) { return JSON.parse(App.b64.dec(s)); }
      function run() {
        var t = $('#in', el).value.trim().replace(/^Bearer\s+/i, ''), seg = t.split('.');
        ['#hd', '#pl'].forEach(function (s) { $(s, el).textContent = ''; }); $('#times', el).innerHTML = '';
        if (!t) { $('#state', el).innerHTML = ''; return; }
        var h, p;
        try { h = part(seg[0]); p = part(seg[1]); } catch (e) { $('#state', el).innerHTML = '<span class="badge err">格式错误</span>'; return; }
        $('#hd', el).textContent = JSON.stringify(h, null, 2); $('#pl', el).textContent = JSON.stringify(p, null, 2);
        var now = Date.now() / 1000, st = '<span class="badge">' + esc(h.alg || '?') + '</span> ';
        if (p.exp) st += p.exp < now ? '<span class="badge err">已过期</span>' : '<span class="badge ok">有效期内</span>';
        $('#state', el).innerHTML = st;
        $('#times', el).innerHTML = [['iat', '签发时间'], ['nbf', '生效时间'], ['exp', '过期时间']].filter(function (k) { return p[k[0]]; }).map(function (k) {
          var d = p[k[0]] - now, rel = Math.abs(d) < 86400 * 2 ? Math.round(Math.abs(d) / 3600) + ' 小时' : Math.round(Math.abs(d) / 86400) + ' 天';
          return '<tr><th>' + k[1] + ' (' + k[0] + ')</th><td>' + fmtTime(p[k[0]]) + ' <span class="muted">· ' + rel + (d > 0 ? '后' : '前') + '</span></td></tr>';
        }).join('') || '<tr><td class="muted">无时间声明</td></tr>';
        var secret = $('#secret', el).value, sig = $('#sig', el);
        if (!secret) { sig.className = 'msg'; sig.textContent = '输入密钥后自动校验'; return; }
        var fn = { HS256: CryptoJS.HmacSHA256, HS384: CryptoJS.HmacSHA384, HS512: CryptoJS.HmacSHA512 }[h.alg];
        if (!fn) { sig.className = 'msg warn'; sig.textContent = '暂不支持校验 ' + h.alg + ' 算法'; return; }
        var key = $('#b64key', el).checked ? CryptoJS.enc.Base64.parse(secret) : secret;
        var calc = CryptoJS.enc.Base64.stringify(fn(seg[0] + '.' + seg[1], key)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        var ok = calc === seg[2];
        sig.className = 'msg ' + (ok ? 'ok' : 'err'); sig.textContent = ok ? '✓ 签名有效' : '✗ 签名无效';
      }
      el.addEventListener('input', run); el.addEventListener('change', run);
      ctx.persist();
      if (ctx.input) $('#in', el).value = ctx.input;
      if (!$('#in', el).value) $('#in', el).value = sample;
      run();
    }
  });
})();
