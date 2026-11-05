(function () {
  'use strict';
  var $ = App.$, esc = App.esc;

  /* ===== shared QR helpers ===== */
  function makeQr(text, ecl) {
    qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
    var qr = qrcode(0, ecl); qr.addData(text, 'Byte'); qr.make(); return qr;
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  var ALIGN = ",6.18,6.22,6.26,6.30,6.34,6.22.38,6.24.42,6.26.46,6.28.50,6.30.54,6.32.58,6.34.62,6.26.46.66,6.26.48.70,6.26.50.74,6.30.54.78,6.30.56.82,6.30.58.86,6.34.62.90,6.28.50.72.94,6.26.50.74.98,6.30.54.78.102,6.28.54.80.106,6.32.58.84.110,6.30.58.86.114,6.34.62.90.118,6.26.50.74.98.122,6.30.54.78.102.126,6.26.52.78.104.130,6.30.56.82.108.134,6.34.60.86.112.138,6.30.58.86.114.142,6.34.62.90.118.146,6.30.54.78.102.126.150,6.24.50.76.102.128.154,6.28.54.80.106.132.158,6.32.58.84.110.136.162,6.26.54.82.110.138.166,6.30.58.86.114.142.170".split(',');
  function alignCenters(n) {
    var pos = (ALIGN[(n - 17) / 4 - 1] || '').split('.').filter(Boolean).map(Number), out = [];
    pos.forEach(function (r) { pos.forEach(function (c) { if (!((r < 9 && c < 9) || (r < 9 && c > n - 10) || (r > n - 10 && c < 9))) out.push([r, c]); }); });
    return out;
  }
  function isFinder(r, c, n) { return (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7); }
  function drawQr(canvas, qr, o) {
    var n = qr.getModuleCount(), cell = o.size / (n + o.margin * 2), ctx = canvas.getContext('2d');
    canvas.width = canvas.height = o.size;
    ctx.fillStyle = o.bg; ctx.fillRect(0, 0, o.size, o.size);
    var fill = o.fg;
    if (o.fg2 && o.fg2 !== o.fg) { fill = ctx.createLinearGradient(0, 0, o.size, o.size); fill.addColorStop(0, o.fg); fill.addColorStop(1, o.fg2); }
    ctx.fillStyle = fill;
    var aligns = o.style === 'square' ? [] : alignCenters(n);
    function inAlign(r, c) { return aligns.some(function (a) { return Math.abs(r - a[0]) <= 2 && Math.abs(c - a[1]) <= 2; }); }
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
      if (!qr.isDark(r, c) || (o.style !== 'square' && (isFinder(r, c, n) || inAlign(r, c)))) continue;
      var x = (c + o.margin) * cell, y = (r + o.margin) * cell;
      if (o.style === 'dot') { ctx.beginPath(); ctx.arc(x + cell / 2, y + cell / 2, cell * 0.5, 0, 7); ctx.fill(); }
      else if (o.style === 'round') { rr(ctx, x, y, cell + 0.5, cell + 0.5, cell * 0.3); ctx.fill(); }
      else ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(cell), Math.ceil(cell));
    }
    if (o.style !== 'square') {
      [[0, 0], [0, n - 7], [n - 7, 0]].forEach(function (p) {
        var x = (p[1] + o.margin) * cell, y = (p[0] + o.margin) * cell;
        ctx.fillStyle = fill; rr(ctx, x, y, 7 * cell, 7 * cell, cell * 1.2); ctx.fill();
        ctx.fillStyle = o.bg; rr(ctx, x + cell, y + cell, 5 * cell, 5 * cell, cell * 0.7); ctx.fill();
        ctx.fillStyle = fill; rr(ctx, x + 2 * cell, y + 2 * cell, 3 * cell, 3 * cell, cell * 0.5); ctx.fill();
      });
      aligns.forEach(function (a) {
        var x = (a[1] - 2 + o.margin) * cell, y = (a[0] - 2 + o.margin) * cell;
        ctx.fillStyle = fill; rr(ctx, x, y, 5 * cell, 5 * cell, cell * 1.1); ctx.fill();
        ctx.fillStyle = o.bg; rr(ctx, x + cell, y + cell, 3 * cell, 3 * cell, cell * 0.6); ctx.fill();
        ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x + 2.5 * cell, y + 2.5 * cell, cell * 0.55, 0, 7); ctx.fill();
      });
    }
    if (o.logo) {
      var ls = o.size * 0.22, lx = (o.size - ls) / 2, pad = ls * 0.1;
      ctx.fillStyle = '#fff'; rr(ctx, lx - pad, lx - pad, ls + pad * 2, ls + pad * 2, pad * 1.6); ctx.fill();
      ctx.drawImage(o.logo, lx, lx, ls, ls);
    }
  }
  function qrSvg(qr, o) {
    var n = qr.getModuleCount(), t = n + o.margin * 2, d = '';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (qr.isDark(r, c)) d += 'M' + (c + o.margin) + ' ' + (r + o.margin) + 'h1v1h-1z';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + t + ' ' + t + '" width="' + o.size + '" height="' + o.size + '" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="' + o.bg + '"/><path d="' + d + '" fill="' + o.fg + '"/></svg>';
  }

  /* ===== 二维码生成 ===== */
  var KINDS = {
    text: ['文本/网址', [['text', '内容', 'area', 'https://github.com/buhuiphp/online-tools']]],
    wifi: ['WiFi', [['ssid', '网络名称 SSID', 'text', ''], ['pwd', '密码', 'text', ''], ['enc', '加密方式', 'sel:WPA|WEP|nopass', 'WPA'], ['hidden', '隐藏网络', 'check', '']]],
    vcard: ['名片', [['name', '姓名', 'text', ''], ['tel', '手机', 'text', ''], ['email', '邮箱', 'text', ''], ['org', '公司', 'text', ''], ['title', '职位', 'text', ''], ['url', '网址', 'text', '']]],
    email: ['邮件', [['to', '收件人', 'text', ''], ['subject', '主题', 'text', ''], ['body', '正文', 'area', '']]],
    sms: ['短信', [['tel', '手机号', 'text', ''], ['body', '内容', 'area', '']]],
    geo: ['位置', [['lat', '纬度', 'text', '39.9087'], ['lng', '经度', 'text', '116.3975'], ['q', '名称（可选）', 'text', '天安门']]]
  };
  function wq(s) { return s.replace(/([\\;,:"])/g, '\\$1'); }
  function content(kind, v) {
    switch (kind) {
      case 'wifi': return 'WIFI:T:' + v.enc + ';S:' + wq(v.ssid) + ';' + (v.enc !== 'nopass' ? 'P:' + wq(v.pwd) + ';' : '') + (v.hidden ? 'H:true;' : '') + ';';
      case 'vcard': return ['BEGIN:VCARD', 'VERSION:3.0', 'FN:' + v.name, 'N:' + v.name + ';;;;', v.tel && 'TEL;TYPE=CELL:' + v.tel, v.email && 'EMAIL:' + v.email, v.org && 'ORG:' + v.org, v.title && 'TITLE:' + v.title, v.url && 'URL:' + v.url, 'END:VCARD'].filter(Boolean).join('\n');
      case 'email': var q = []; if (v.subject) q.push('subject=' + encodeURIComponent(v.subject)); if (v.body) q.push('body=' + encodeURIComponent(v.body)); return v.to || q.length ? 'mailto:' + v.to + (q.length ? '?' + q.join('&') : '') : '';
      case 'sms': return v.tel ? 'SMSTO:' + v.tel + ':' + v.body : '';
      case 'geo': return v.lat && v.lng ? 'geo:' + v.lat + ',' + v.lng + (v.q ? '?q=' + encodeURIComponent(v.q) : '') : '';
      default: return v.text;
    }
  }

  App.register({
    id: 'qrgen', group: 'qr', icon: 'QR', title: '二维码生成', isNew: true, accepts: true,
    desc: '网址、文本、WiFi、名片等生成二维码，支持渐变、圆点样式与 Logo', kw: 'ewmsc qrcode qr 二维码 生成 wifi 名片',
    scripts: ['vendor/qrcode.js'],
    render: function (el, ctx) {
      el.innerHTML = '<div class="grid-side"><div class="pane"><div class="pane-head"><h3>内容</h3><div class="seg" id="kind">' +
        Object.keys(KINDS).map(function (k, i) { return '<button data-v="' + k + '"' + (i ? '' : ' class="on"') + '>' + KINDS[k][0] + '</button>'; }).join('') + '</div></div>' +
        '<div class="pane-body"><div id="fields"></div></div>' +
        '<div class="pane-head" style="border-top:1px solid var(--border)"><h3>外观</h3></div><div class="pane-body">' +
        '<div class="inline"><span class="lbl" style="margin:0">样式</span><div class="seg" id="style"><button data-v="square" class="on">方块</button><button data-v="round">圆角</button><button data-v="dot">圆点</button></div>' +
        '<span class="lbl" style="margin:0">容错</span><select id="ecl" class="w120" data-persist><option value="L">L · 7%</option><option value="M" selected>M · 15%</option><option value="Q">Q · 25%</option><option value="H">H · 30%</option></select></div>' +
        '<div class="inline"><span class="lbl" style="margin:0">尺寸</span><select id="size" class="w120" data-persist><option>256</option><option selected>384</option><option>512</option><option>768</option><option>1024</option></select><span class="lbl" style="margin:0">边距</span><input type="range" id="margin" min="0" max="8" value="2" data-persist></div>' +
        '<div class="inline"><span class="lbl" style="margin:0">前景</span><input type="color" id="fg" value="#111827" data-persist><input type="color" id="fg2" value="#111827" data-persist title="渐变终点色"><span class="lbl" style="margin:0">背景</span><input type="color" id="bg" value="#ffffff" data-persist>' +
        '<button class="btn sm" id="logoBtn">＋ Logo</button><button class="btn sm hidden" id="logoDel">移除 Logo</button><input type="file" id="logo" accept="image/*" hidden></div>' +
        '<p class="msg" style="margin-top:10px">两个前景色不同即为渐变；添加 Logo 时自动使用 H 级容错。</p></div></div>' +
        '<div class="pane"><div class="pane-head"><h3>预览</h3><span class="msg" id="info"></span></div><div class="pane-body"><div class="stage"><canvas id="cv"></canvas><p class="err" id="qerr"></p></div>' +
        '<div class="inline" style="margin-top:14px;justify-content:center"><button class="btn primary" id="png">下载 PNG</button><button class="btn" id="svg">下载 SVG</button><button class="btn" id="cpimg">复制图片</button><button class="btn" id="verify">本地校验</button></div></div></div></div>';
      var kind = 'text', style = 'square', logo = null, cur = null, timer;
      function fields() {
        $('#fields', el).innerHTML = KINDS[kind][1].map(function (f) {
          var id = 'f_' + f[0];
          if (f[2] === 'check') return '<label class="check"><input type="checkbox" id="' + id + '">' + f[1] + '</label>';
          var ctl = f[2] === 'area' ? '<textarea id="' + id + '" style="min-height:130px">' + esc(f[3]) + '</textarea>'
            : f[2].indexOf('sel:') === 0 ? '<select id="' + id + '">' + f[2].slice(4).split('|').map(function (o) { return '<option' + (o === f[3] ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select>'
            : '<input type="text" id="' + id + '" value="' + esc(f[3]) + '">';
          return '<div class="field"><label>' + f[1] + '</label>' + ctl + '</div>';
        }).join('');
      }
      function vals() { var v = {}; KINDS[kind][1].forEach(function (f) { var n = $('#f_' + f[0], el); v[f[0]] = f[2] === 'check' ? n.checked : n.value; }); return v; }
      function opts() { return { size: +$('#size', el).value, margin: +$('#margin', el).value, fg: $('#fg', el).value, fg2: $('#fg2', el).value, bg: $('#bg', el).value, style: style, logo: logo }; }
      function gen() {
        if (!el.isConnected) return;
        var text = content(kind, vals()), cv = $('#cv', el);
        $('#qerr', el).textContent = '';
        if (!text) { cur = null; cv.width = cv.height = 0; $('#info', el).textContent = '请输入内容'; return; }
        try {
          cur = makeQr(text, logo ? 'H' : $('#ecl', el).value);
          drawQr(cv, cur, opts());
          var n = cur.getModuleCount();
          $('#info', el).textContent = 'v' + ((n - 17) / 4) + ' · ' + n + '×' + n + ' · ' + new TextEncoder().encode(text).length + ' 字节';
        } catch (e) { cur = null; $('#qerr', el).textContent = '内容过长，无法编码（可降低容错等级）'; }
      }
      function later() { clearTimeout(timer); timer = setTimeout(gen, 100); }
      App.seg($('#kind', el), function (v) { kind = v; fields(); gen(); });
      App.seg($('#style', el), function (v) { style = v; gen(); });
      el.addEventListener('input', function (e) { if (e.target.id !== 'logo') later(); });
      el.addEventListener('change', function (e) { if (e.target.id !== 'logo') later(); });
      $('#logoBtn', el).onclick = function () { $('#logo', el).click(); };
      $('#logo', el).onchange = function () {
        var f = this.files[0]; this.value = ''; if (!f) return;
        App.readFile(f, 'dataurl').then(App.loadImage).then(function (img) { logo = img; $('#logoDel', el).classList.remove('hidden'); gen(); });
      };
      $('#logoDel', el).onclick = function () { logo = null; this.classList.add('hidden'); gen(); };
      $('#png', el).onclick = function () { if (cur) App.downloadUrl('qrcode.png', $('#cv', el).toDataURL()); };
      $('#svg', el).onclick = function () {
        if (!cur) return;
        if (logo || style !== 'square' || $('#fg', el).value !== $('#fg2', el).value) App.toast('SVG 仅导出纯色方块样式');
        App.download('qrcode.svg', qrSvg(cur, opts()), 'image/svg+xml');
      };
      $('#cpimg', el).onclick = function () {
        if (!cur) return;
        if (!window.ClipboardItem || !navigator.clipboard) return App.toast('当前浏览器不支持复制图片');
        $('#cv', el).toBlob(function (b) { navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]).then(function () { App.toast('图片已复制'); }, function () { App.toast('复制失败'); }); });
      };
      $('#verify', el).onclick = function () {
        if (!cur) return;
        App.loadScript('vendor/jsQR.js').then(function () {
          var r = scanImage($('#cv', el));
          var ok = r && r.text === content(kind, vals());
          App.toast(ok ? '✓ 校验通过，可以正常识别' : '✗ 无法识别，请提高对比度或容错等级');
        });
      };
      fields();
      ctx.persist();
      if (ctx.input) $('#f_text', el).value = ctx.input;
      gen();
    }
  });

  /* ===== decode helpers ===== */
  function decodeBytes(bytes, fallback) {
    if (!bytes || !bytes.length) return fallback;
    var a = new Uint8Array(bytes);
    try { return new TextDecoder('utf-8', { fatal: true }).decode(a); } catch (e) { /* try gbk */ }
    try { return new TextDecoder('gbk').decode(a); } catch (e) { return fallback; }
  }
  function scanData(d) {
    var r = jsQR(d.data, d.width, d.height, { inversionAttempts: 'attemptBoth' });
    return r ? { text: decodeBytes(r.binaryData, r.data), version: r.version } : null;
  }
  function scanImage(img) {
    var w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height;
    var cv = document.createElement('canvas'), ctx = cv.getContext('2d', { willReadFrequently: true });
    var targets = [1000, 1600, 600, 400, 2400];
    for (var i = 0; i < targets.length; i++) {
      var s = Math.min(targets[i] / Math.max(w0, h0), 4), w = Math.round(w0 * s), h = Math.round(h0 * s);
      cv.width = w; cv.height = h; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
      var r = scanData(ctx.getImageData(0, 0, w, h));
      if (r) return r;
    }
    return null;
  }
  function kindOf(t) {
    if (/^WIFI:/i.test(t)) {
      var g = function (k) { var m = t.match(new RegExp('[:;]' + k + ':((?:\\\\.|[^;])*)')); return m ? m[1].replace(/\\(.)/g, '$1') : ''; };
      return { name: 'WiFi', rows: [['网络名称', g('S')], ['密码', g('P')], ['加密', g('T')]] };
    }
    if (/^BEGIN:VCARD/i.test(t)) {
      var rows = []; t.split(/\r?\n/).forEach(function (l) { var m = l.match(/^(FN|TEL[^:]*|EMAIL[^:]*|ORG|TITLE|URL|ADR[^:]*):(.*)$/i); if (m) rows.push([m[1].split(';')[0], m[2].replace(/;+/g, ' ').trim()]); });
      return { name: '名片', rows: rows };
    }
    if (/^https?:\/\//i.test(t)) return { name: '网址', url: t.trim() };
    if (/^mailto:/i.test(t)) return { name: '邮件', url: t.trim() };
    if (/^tel:/i.test(t)) return { name: '电话', url: t.trim() };
    if (/^SMSTO:/i.test(t)) return { name: '短信' };
    if (/^geo:/i.test(t)) return { name: '位置' };
    return { name: '文本' };
  }

  /* ===== 二维码解码 ===== */
  App.register({
    id: 'qrdecode', group: 'qr', icon: 'SCAN', title: '二维码解码', isNew: true,
    desc: '上传、拖拽、粘贴截图或摄像头扫码，解析二维码内容', kw: 'ewmjm qrcode 二维码 解码 识别 扫码 扫描 decode',
    scripts: ['vendor/jsQR.js'],
    render: function (el, ctx) {
      el.innerHTML = '<div class="grid2"><div class="pane"><div class="pane-head"><h3>来源</h3><div class="seg" id="mode"><button data-v="file" class="on">图片</button><button data-v="cam">摄像头</button></div></div><div class="pane-body">' +
        '<div id="fileBox"><div class="drop" id="drop"><b>点击选择图片</b>，或拖拽到此处<br><span class="msg">支持 Ctrl+V 直接粘贴截图 · 图片不会上传</span><div id="pv"></div></div><input type="file" id="file" accept="image/*" hidden></div>' +
        '<div id="camBox" class="hidden"><video class="scan" id="video" playsinline muted></video><div class="inline" style="margin-top:12px"><button class="btn primary" id="start">开启摄像头</button><button class="btn" id="stop">停止</button><select id="devs" class="hidden"></select></div><p class="msg" style="margin-top:8px">需授予摄像头权限，仅在 HTTPS 或 localhost 下可用。</p></div>' +
        '</div></div><div class="pane"><div class="pane-head"><h3>识别结果</h3><span id="status" class="msg"></span></div><div class="pane-body">' +
        '<textarea id="res" readonly placeholder="识别结果会显示在这里" style="min-height:150px"></textarea>' +
        '<div class="inline" style="margin-top:10px"><button class="btn primary" data-copy="#res">复制</button><button class="btn" data-send="#res">发送到 ▾</button><a class="btn hidden" id="open" target="_blank" rel="noopener noreferrer">打开链接 ↗</a></div>' +
        '<div id="meta" style="margin-top:14px"></div></div></div></div>';
      var stream = null, raf = 0;
      function status(h) { $('#status', el).innerHTML = h; }
      function show(r) {
        var open = $('#open', el);
        if (!r) { $('#res', el).value = ''; $('#meta', el).innerHTML = ''; open.classList.add('hidden'); status('<span class="err">未识别到二维码</span>'); return; }
        var k = kindOf(r.text);
        $('#res', el).value = r.text;
        status('<span class="badge ok">识别成功</span> <span class="badge">' + k.name + '</span>' + (r.version ? ' <span class="badge">v' + r.version + '</span>' : ''));
        $('#meta', el).innerHTML = k.rows && k.rows.length ? '<table class="kv">' + k.rows.map(function (x) { return '<tr><th>' + esc(x[0]) + '</th><td>' + esc(x[1]) + '</td></tr>'; }).join('') + '</table>' : '';
        if (k.url) { open.href = k.url; open.classList.remove('hidden'); } else open.classList.add('hidden');
      }
      function fromFile(f) {
        if (!/^image\//.test(f.type)) return App.toast('请选择图片文件');
        status('识别中…');
        App.readFile(f, 'dataurl').then(App.loadImage).then(function (img) {
          $('#pv', el).innerHTML = ''; $('#pv', el).appendChild(img); show(scanImage(img));
        }).catch(function (e) { status('<span class="err">' + esc(e.message) + '</span>'); });
      }
      App.bindDrop($('#drop', el), $('#file', el), fromFile);
      App.onPasteImage(fromFile);
      function stop() { cancelAnimationFrame(raf); if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; } }
      App.onLeave(stop);
      function start(dev) {
        stop();
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return status('<span class="err">当前环境不支持摄像头（需 HTTPS）</span>');
        navigator.mediaDevices.getUserMedia({ video: dev ? { deviceId: { exact: dev } } : { facingMode: 'environment' }, audio: false }).then(function (s) {
          stream = s; var v = $('#video', el); v.srcObject = s; v.play(); status('扫描中，请对准二维码…');
          navigator.mediaDevices.enumerateDevices().then(function (ds) {
            var cams = ds.filter(function (d) { return d.kind === 'videoinput'; }), sel = $('#devs', el);
            if (!sel || cams.length < 2) return;
            var curId = s.getVideoTracks()[0].getSettings().deviceId;
            sel.innerHTML = cams.map(function (c, i) { return '<option value="' + c.deviceId + '"' + (c.deviceId === curId ? ' selected' : '') + '>' + esc(c.label || '摄像头 ' + (i + 1)) + '</option>'; }).join('');
            sel.classList.remove('hidden');
          });
          var cv = document.createElement('canvas'), c2 = cv.getContext('2d', { willReadFrequently: true });
          (function tick() {
            if (!stream) return;
            if (v.readyState === v.HAVE_ENOUGH_DATA) {
              var sc = Math.min(1, 800 / Math.max(v.videoWidth, v.videoHeight));
              cv.width = v.videoWidth * sc; cv.height = v.videoHeight * sc; c2.drawImage(v, 0, 0, cv.width, cv.height);
              var r = scanData(c2.getImageData(0, 0, cv.width, cv.height));
              if (r) { show(r); stop(); if (navigator.vibrate) navigator.vibrate(80); App.toast('扫码成功'); return; }
            }
            raf = requestAnimationFrame(tick);
          })();
        }).catch(function (e) { status('<span class="err">无法打开摄像头：' + esc(e.message || e.name) + '</span>'); });
      }
      $('#start', el).onclick = function () { start(); };
      $('#stop', el).onclick = function () { stop(); status('已停止'); };
      $('#devs', el).onchange = function () { start(this.value); };
      App.seg($('#mode', el), function (m) { $('#fileBox', el).classList.toggle('hidden', m === 'cam'); $('#camBox', el).classList.toggle('hidden', m !== 'cam'); if (m !== 'cam') stop(); });
      if (ctx.file) fromFile(ctx.file);
    }
  });

  /* ===== 批量生成 ===== */
  App.register({
    id: 'qrbatch', group: 'qr', icon: 'ZIP', title: '二维码批量生成', isNew: true, accepts: true,
    desc: '每行一条内容，批量生成二维码并打包 ZIP 下载', kw: 'ewmplsc 批量 二维码 zip batch',
    scripts: ['vendor/qrcode.js', 'vendor/jszip.min.js'],
    render: function (el, ctx) {
      el.innerHTML = '<div class="grid-side"><div class="pane"><div class="pane-head"><h3>内容（每行一个）</h3><span class="msg" id="cnt"></span></div><div class="pane-body flush"><textarea id="lines" data-persist style="min-height:360px">https://example.com/item/1\nhttps://example.com/item/2\nhttps://example.com/item/3\n设备编号：A-0001</textarea></div></div>' +
        '<div class="pane"><div class="pane-head"><h3>设置</h3></div><div class="pane-body">' +
        '<div class="inline"><span class="lbl" style="margin:0">尺寸</span><select id="size" class="w120" data-persist><option>256</option><option selected>512</option><option>1024</option></select><span class="lbl" style="margin:0">容错</span><select id="ecl" class="w120" data-persist><option>L</option><option selected>M</option><option>Q</option><option>H</option></select></div>' +
        '<div class="inline"><span class="lbl" style="margin:0">文件名</span><select id="naming" data-persist><option value="index">序号 001.png</option><option value="content">按内容命名</option></select></div>' +
        '<div class="inline"><label class="check"><input type="checkbox" id="caption" data-persist checked>图片底部附带文字</label></div>' +
        '<div class="inline" style="margin-top:14px"><button class="btn primary" id="zip">打包下载 ZIP</button><span class="msg" id="zmsg"></span></div>' +
        '<div class="lbl" style="margin-top:16px">预览（前 12 个）</div><div class="thumbs" id="thumbs"></div></div></div></div>';
      function items() { return $('#lines', el).value.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean); }
      function render(text, size) {
        var cv = document.createElement('canvas'), qr = makeQr(text, $('#ecl', el).value);
        drawQr(cv, qr, { size: size, margin: 2, fg: '#000000', bg: '#ffffff', style: 'square' });
        if (!$('#caption', el).checked) return cv;
        var fs = Math.round(size / 18), out = document.createElement('canvas'), c = out.getContext('2d');
        out.width = size; out.height = size + fs * 2;
        c.fillStyle = '#fff'; c.fillRect(0, 0, out.width, out.height); c.drawImage(cv, 0, 0);
        c.fillStyle = '#111'; c.font = fs + 'px sans-serif'; c.textAlign = 'center';
        var label = text.length > 40 ? text.slice(0, 38) + '…' : text;
        c.fillText(label, size / 2, size + fs * 1.1, size - 20);
        return out;
      }
      function preview() {
        if (!el.isConnected) return;
        var list = items();
        $('#cnt', el).textContent = list.length + ' 条';
        $('#thumbs', el).innerHTML = list.slice(0, 12).map(function (t, i) {
          try { return '<figure><img src="' + render(t, 200).toDataURL() + '"><figcaption>' + esc(t) + '</figcaption></figure>'; }
          catch (e) { return '<figure><figcaption style="color:#c00">第 ' + (i + 1) + ' 条过长</figcaption></figure>'; }
        }).join('');
      }
      var timer; el.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(preview, 300); });
      el.addEventListener('change', preview);
      $('#zip', el).onclick = function () {
        var list = items(); if (!list.length) return App.toast('请输入内容');
        var zip = new JSZip(), size = +$('#size', el).value, used = {}, fails = 0, btn = this;
        btn.disabled = true; $('#zmsg', el).textContent = '生成中…';
        list.forEach(function (t, i) {
          var name = $('#naming', el).value === 'content' ? t.replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 60) : String(i + 1).padStart(3, '0');
          while (used[name]) name += '_'; used[name] = 1;
          try { zip.file(name + '.png', render(t, size).toDataURL().split(',')[1], { base64: true }); } catch (e) { fails++; }
        });
        zip.generateAsync({ type: 'blob' }).then(function (b) {
          App.download('qrcodes.zip', b); btn.disabled = false;
          $('#zmsg', el).innerHTML = '<span class="ok">完成 ' + (list.length - fails) + ' 个</span>' + (fails ? ' <span class="err">失败 ' + fails + ' 个</span>' : '');
        });
      };
      ctx.persist();
      if (ctx.input) $('#lines', el).value = ctx.input;
      preview();
    }
  });
})();
