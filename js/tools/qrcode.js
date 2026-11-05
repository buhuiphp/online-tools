(function () {
  'use strict';
  var $ = App.$, esc = App.escapeHtml;

  /* ---------------- 条形码生成 ---------------- */
  App.register({
    id: 'barcode', group: 'barcode', icon: '|||', title: '条形码生成',
    desc: '生成 CODE128 / EAN13 / UPC 等多种格式条形码', keywords: 'barcode ean code128 upc',
    scripts: ['vendor/JsBarcode.all.min.js'],
    render: function (el) {
      el.innerHTML =
        '<div class="cols"><div>' +
        '<label class="field-label">条码内容</label><input type="text" id="bcText" value="123456789012">' +
        '<div class="row" style="margin-top:12px"><label>格式</label><select id="bcFmt" class="w-s" style="flex:1">' +
        ['CODE128', 'CODE39', 'EAN13', 'EAN8', 'UPC', 'ITF14', 'ITF', 'MSI', 'pharmacode', 'codabar'].map(function (f) { return '<option>' + f + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="row"><label>条宽</label><input type="range" id="bcW" min="1" max="4" value="2"><label>高度</label><input type="range" id="bcH" min="30" max="200" value="100"></div>' +
        '<div class="row"><label>线条色</label><input type="color" id="bcFg" value="#000000"><label>背景色</label><input type="color" id="bcBg" value="#ffffff">' +
        '<label><input type="checkbox" id="bcShow" checked>显示文字</label></div>' +
        '<p class="muted">EAN13 需 12/13 位数字，EAN8 需 7/8 位，UPC 需 11/12 位，ITF14 需 13/14 位。</p>' +
        '</div><div><div class="qr-out"><svg id="bcSvg"></svg><p id="bcErr" class="error"></p>' +
        '<div class="row"><button class="btn" id="bcPng">下载 PNG</button><button class="btn ghost" id="bcSvgDl">下载 SVG</button></div></div></div></div>';
      var ids = ['bcText', 'bcFmt', 'bcW', 'bcH', 'bcFg', 'bcBg', 'bcShow'];
      function gen() {
        $('#bcErr').textContent = '';
        try {
          JsBarcode('#bcSvg', $('#bcText').value, {
            format: $('#bcFmt').value, width: +$('#bcW').value, height: +$('#bcH').value,
            lineColor: $('#bcFg').value, background: $('#bcBg').value, displayValue: $('#bcShow').checked
          });
        } catch (e) {
          $('#bcSvg').innerHTML = '';
          $('#bcErr').textContent = '内容与所选格式不匹配';
        }
      }
      ids.forEach(function (id) { $('#' + id).addEventListener('input', gen); });
      $('#bcSvgDl').onclick = function () {
        App.download('barcode.svg', new XMLSerializer().serializeToString($('#bcSvg')), 'image/svg+xml');
      };
      $('#bcPng').onclick = function () {
        var c = document.createElement('canvas');
        try {
          JsBarcode(c, $('#bcText').value, {
            format: $('#bcFmt').value, width: +$('#bcW').value * 2, height: +$('#bcH').value * 2, fontSize: 40,
            lineColor: $('#bcFg').value, background: $('#bcBg').value, displayValue: $('#bcShow').checked
          });
          App.downloadUrl('barcode.png', c.toDataURL('image/png'));
        } catch (e) { App.toast('内容与所选格式不匹配'); }
      };
      gen();
    }
  });

  /* ---------------- 二维码生成 ---------------- */
  var TEMPLATES = {
    text: { name: '文本/链接', fields: [['text', '内容', 'textarea', 'https://github.com/buhuiphp/online-tools']] },
    wifi: { name: 'WiFi', fields: [['ssid', '网络名称 (SSID)', 'text', ''], ['pwd', '密码', 'text', ''], ['enc', '加密方式', 'select:WPA|WEP|nopass', 'WPA'], ['hidden', '隐藏网络', 'checkbox', '']] },
    vcard: { name: '名片', fields: [['name', '姓名', 'text', ''], ['tel', '电话', 'text', ''], ['email', '邮箱', 'text', ''], ['org', '公司', 'text', ''], ['title', '职位', 'text', ''], ['url', '网址', 'text', ''], ['adr', '地址', 'text', '']] },
    email: { name: '邮件', fields: [['to', '收件人', 'text', ''], ['subject', '主题', 'text', ''], ['body', '正文', 'textarea', '']] },
    sms: { name: '短信', fields: [['tel', '手机号', 'text', ''], ['body', '短信内容', 'textarea', '']] },
    tel: { name: '电话', fields: [['tel', '电话号码', 'text', '']] }
  };

  function wifiEsc(s) { return s.replace(/([\\;,:"])/g, '\\$1'); }
  function buildContent(type, v) {
    switch (type) {
      case 'wifi':
        return 'WIFI:T:' + v.enc + ';S:' + wifiEsc(v.ssid) + ';' + (v.enc !== 'nopass' ? 'P:' + wifiEsc(v.pwd) + ';' : '') + (v.hidden ? 'H:true;' : '') + ';';
      case 'vcard':
        return ['BEGIN:VCARD', 'VERSION:3.0', 'FN:' + v.name, 'N:' + v.name + ';;;;',
          v.tel && 'TEL;TYPE=CELL:' + v.tel, v.email && 'EMAIL:' + v.email, v.org && 'ORG:' + v.org,
          v.title && 'TITLE:' + v.title, v.url && 'URL:' + v.url, v.adr && 'ADR:;;' + v.adr + ';;;;', 'END:VCARD'
        ].filter(Boolean).join('\n');
      case 'email':
        var q = [];
        if (v.subject) q.push('subject=' + encodeURIComponent(v.subject));
        if (v.body) q.push('body=' + encodeURIComponent(v.body));
        return 'mailto:' + v.to + (q.length ? '?' + q.join('&') : '');
      case 'sms': return 'SMSTO:' + v.tel + ':' + v.body;
      case 'tel': return 'tel:' + v.tel;
      default: return v.text;
    }
  }

  function makeQr(text, ecl) {
    qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
    var qr = qrcode(0, ecl);
    qr.addData(text, 'Byte');
    qr.make();
    return qr;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawQr(canvas, qr, o) {
    var n = qr.getModuleCount();
    var total = n + o.margin * 2;
    var cell = o.size / total;
    canvas.width = canvas.height = o.size;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = o.bg;
    ctx.fillRect(0, 0, o.size, o.size);
    ctx.fillStyle = o.fg;
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (!qr.isDark(r, c)) continue;
        var x = (c + o.margin) * cell, y = (r + o.margin) * cell;
        if (o.style === 'dot') {
          ctx.beginPath(); ctx.arc(x + cell / 2, y + cell / 2, cell * 0.45, 0, Math.PI * 2); ctx.fill();
        } else if (o.style === 'round') {
          roundRect(ctx, x, y, cell, cell, cell * 0.3); ctx.fill();
        } else {
          ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(cell), Math.ceil(cell));
        }
      }
    }
    if (o.logo) {
      var ls = o.size * 0.22, lx = (o.size - ls) / 2, pad = ls * 0.08;
      ctx.fillStyle = '#fff';
      roundRect(ctx, lx - pad, lx - pad, ls + pad * 2, ls + pad * 2, pad * 1.5); ctx.fill();
      ctx.drawImage(o.logo, lx, lx, ls, ls);
    }
  }

  function qrToSvg(qr, o) {
    var n = qr.getModuleCount(), total = n + o.margin * 2, path = '';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
      if (qr.isDark(r, c)) path += 'M' + (c + o.margin) + ' ' + (r + o.margin) + 'h1v1h-1z';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + total + ' ' + total + '" width="' + o.size + '" height="' + o.size + '" shape-rendering="crispEdges">' +
      '<rect width="100%" height="100%" fill="' + o.bg + '"/><path d="' + path + '" fill="' + o.fg + '"/></svg>';
  }

  App.register({
    id: 'qrcode', group: 'barcode', icon: 'QR', title: '二维码生成', isNew: true,
    desc: '文本、链接、WiFi、名片等内容生成二维码，支持 Logo、颜色、样式',
    keywords: 'qrcode qr 二维码 生成 wifi vcard 名片',
    scripts: ['vendor/qrcode.js'],
    render: function (el) {
      el.innerHTML =
        '<div class="tabs" id="qrTabs">' + Object.keys(TEMPLATES).map(function (k, i) {
          return '<button data-t="' + k + '"' + (i === 0 ? ' class="active"' : '') + '>' + TEMPLATES[k].name + '</button>';
        }).join('') + '</div>' +
        '<div class="cols"><div>' +
        '<div id="qrFields"></div>' +
        '<div class="row" style="margin-top:14px"><label>尺寸</label><select id="qrSize" class="w-s"><option>200</option><option selected>300</option><option>400</option><option>600</option><option>800</option><option>1000</option></select>' +
        '<label>容错</label><select id="qrEcl" class="w-s"><option value="L">L 7%</option><option value="M" selected>M 15%</option><option value="Q">Q 25%</option><option value="H">H 30%</option></select></div>' +
        '<div class="row"><label>边距</label><input type="range" id="qrMargin" min="0" max="8" value="2">' +
        '<label>样式</label><select id="qrStyle" class="w-s"><option value="square">方块</option><option value="round">圆角</option><option value="dot">圆点</option></select></div>' +
        '<div class="row"><label>前景色</label><input type="color" id="qrFg" value="#000000"><label>背景色</label><input type="color" id="qrBg" value="#ffffff">' +
        '<button class="btn ghost sm" id="qrLogoBtn">添加 Logo</button><button class="btn ghost sm hidden" id="qrLogoDel">移除 Logo</button><input type="file" id="qrLogo" accept="image/*" hidden></div>' +
        '<p class="muted">添加 Logo 时会自动使用 H 级容错；颜色对比度过低可能导致无法识别。</p>' +
        '</div><div><div class="qr-out"><canvas id="qrCanvas"></canvas><p id="qrErr" class="error"></p>' +
        '<div class="row" style="justify-content:center"><button class="btn" id="qrPng">下载 PNG</button><button class="btn ghost" id="qrSvg">下载 SVG</button><button class="btn ghost" id="qrCopyImg">复制图片</button></div>' +
        '<p class="muted" id="qrInfo"></p></div></div></div>';

      var type = 'text', logo = null, current = null, timer;

      function renderFields() {
        $('#qrFields').innerHTML = TEMPLATES[type].fields.map(function (f) {
          var id = 'qf_' + f[0], input;
          if (f[2] === 'textarea') input = '<textarea id="' + id + '" style="min-height:140px">' + esc(f[3]) + '</textarea>';
          else if (f[2] === 'checkbox') return '<label style="display:block;margin:8px 0"><input type="checkbox" id="' + id + '">' + f[1] + '</label>';
          else if (f[2].indexOf('select:') === 0) input = '<select id="' + id + '">' + f[2].slice(7).split('|').map(function (o) { return '<option' + (o === f[3] ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select>';
          else input = '<input type="text" id="' + id + '" value="' + esc(f[3]) + '">';
          return '<label class="field-label">' + f[1] + '</label>' + input;
        }).join('');
      }

      function values() {
        var v = {};
        TEMPLATES[type].fields.forEach(function (f) {
          var node = $('#qf_' + f[0]);
          v[f[0]] = f[2] === 'checkbox' ? node.checked : node.value;
        });
        return v;
      }

      function opts() {
        return { size: +$('#qrSize').value, margin: +$('#qrMargin').value, fg: $('#qrFg').value, bg: $('#qrBg').value, style: $('#qrStyle').value, logo: logo };
      }

      function gen() {
        if (!el.isConnected) return;
        var text = buildContent(type, values());
        var canvas = $('#qrCanvas');
        $('#qrErr').textContent = '';
        if (!text) { current = null; canvas.width = canvas.height = 0; $('#qrInfo').textContent = '请输入内容'; return; }
        try {
          var ecl = logo ? 'H' : $('#qrEcl').value;
          current = { qr: makeQr(text, ecl), text: text };
          drawQr(canvas, current.qr, opts());
          $('#qrInfo').textContent = '版本 ' + ((current.qr.getModuleCount() - 17) / 4) + ' · ' + current.qr.getModuleCount() + '×' + current.qr.getModuleCount() + ' 模块 · ' + new TextEncoder().encode(text).length + ' 字节';
        } catch (e) {
          current = null;
          $('#qrErr').textContent = '内容过长，无法生成二维码（可尝试降低容错等级）';
        }
      }
      function schedule() { clearTimeout(timer); timer = setTimeout(gen, 120); }

      $('#qrTabs').addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        App.$$('#qrTabs button').forEach(function (x) { x.classList.toggle('active', x === b); });
        type = b.getAttribute('data-t'); renderFields(); gen();
      });
      el.addEventListener('input', function (e) { if (e.target.id !== 'qrLogo') schedule(); });
      el.addEventListener('change', function (e) { if (e.target.id !== 'qrLogo') schedule(); });

      $('#qrLogoBtn').onclick = function () { $('#qrLogo').click(); };
      $('#qrLogo').onchange = function () {
        var f = this.files[0]; if (!f) return;
        App.readFile(f, 'dataurl').then(function (url) {
          var img = new Image();
          img.onload = function () { logo = img; $('#qrLogoDel').classList.remove('hidden'); gen(); };
          img.src = url;
        });
        this.value = '';
      };
      $('#qrLogoDel').onclick = function () { logo = null; this.classList.add('hidden'); gen(); };

      $('#qrPng').onclick = function () {
        if (!current) return App.toast('请先输入内容');
        App.downloadUrl('qrcode.png', $('#qrCanvas').toDataURL('image/png'));
      };
      $('#qrSvg').onclick = function () {
        if (!current) return App.toast('请先输入内容');
        if (logo || $('#qrStyle').value !== 'square') App.toast('SVG 仅导出方块样式，不含 Logo');
        App.download('qrcode.svg', qrToSvg(current.qr, opts()), 'image/svg+xml');
      };
      $('#qrCopyImg').onclick = function () {
        if (!current) return App.toast('请先输入内容');
        if (!navigator.clipboard || !window.ClipboardItem) return App.toast('当前浏览器不支持复制图片');
        $('#qrCanvas').toBlob(function (blob) {
          navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(function () { App.toast('图片已复制'); }, function () { App.toast('复制失败'); });
        });
      };

      renderFields();
      gen();
    }
  });

  /* ---------------- 二维码解码 ---------------- */
  function decodeBytes(bytes, fallback) {
    if (!bytes || !bytes.length) return fallback;
    var arr = new Uint8Array(bytes);
    try { return new TextDecoder('utf-8', { fatal: true }).decode(arr); } catch (e) { /* not utf-8 */ }
    try { return new TextDecoder('gbk').decode(arr); } catch (e) { return fallback; }
  }

  function scanImageData(imageData) {
    var r = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
    if (!r) return null;
    return { text: decodeBytes(r.binaryData, r.data), location: r.location };
  }

  function scanImage(img) {
    var w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height;
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    // Try several scales: big photos decode better downscaled, tiny images better upscaled.
    var targets = [1000, 1600, 600, 400, 2400];
    for (var i = 0; i < targets.length; i++) {
      var scale = Math.min(targets[i] / Math.max(w0, h0), 4);
      var w = Math.round(w0 * scale), h = Math.round(h0 * scale);
      canvas.width = w; canvas.height = h;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      var res = scanImageData(ctx.getImageData(0, 0, w, h));
      if (res) return res;
    }
    return null;
  }

  function isUrl(s) { return /^(https?:\/\/|www\.)\S+$/i.test(s.trim()); }

  function describe(text) {
    if (/^WIFI:/i.test(text)) {
      var get = function (k) { var m = text.match(new RegExp('[:;]' + k + ':((?:\\\\.|[^;])*)')); return m ? m[1].replace(/\\(.)/g, '$1') : ''; };
      return '<table class="kv"><tr><th>类型</th><td>WiFi</td></tr><tr><th>网络名称</th><td>' + esc(get('S')) + '</td></tr><tr><th>密码</th><td>' + esc(get('P')) + '</td></tr><tr><th>加密</th><td>' + esc(get('T')) + '</td></tr></table>';
    }
    if (/^BEGIN:VCARD/i.test(text)) return '<p class="muted">类型：vCard 名片</p>';
    if (/^mailto:/i.test(text)) return '<p class="muted">类型：邮件</p>';
    if (/^tel:/i.test(text)) return '<p class="muted">类型：电话</p>';
    if (/^SMSTO:/i.test(text)) return '<p class="muted">类型：短信</p>';
    if (isUrl(text)) return '<p class="muted">类型：网址</p>';
    return '';
  }

  App.register({
    id: 'qrdecode', group: 'barcode', icon: 'QR?', title: '二维码解码', isNew: true,
    desc: '上传、拖拽、粘贴图片或用摄像头扫描，解析二维码内容',
    keywords: 'qrcode qr 二维码 解码 识别 扫描 扫码 decode scan',
    scripts: ['vendor/jsQR.js'],
    render: function (el) {
      el.innerHTML =
        '<div class="tabs" id="qdTabs"><button data-m="file" class="active">图片识别</button><button data-m="camera">摄像头扫码</button></div>' +
        '<div class="cols"><div>' +
        '<div id="qdFile"><div class="dropzone" id="qdDrop"><p><b>点击选择图片</b>，或将图片拖拽到这里</p><p class="muted" style="margin-top:6px">也可以直接 Ctrl+V 粘贴截图 · 图片仅在本地识别，不会上传</p><div id="qdPreview"></div></div>' +
        '<input type="file" id="qdInput" accept="image/*" hidden>' +
        '<div class="row" style="margin-top:12px"><input type="text" id="qdUrl" placeholder="或输入图片地址（需目标站点允许跨域）"><button class="btn ghost" id="qdUrlBtn">识别</button></div></div>' +
        '<div id="qdCam" class="hidden"><video class="scan" id="qdVideo" playsinline muted></video>' +
        '<div class="row" style="margin-top:12px"><button class="btn" id="qdStart">开启摄像头</button><button class="btn ghost" id="qdStop">停止</button><select id="qdDevices" class="hidden"></select></div>' +
        '<p class="muted">需要浏览器授予摄像头权限（仅 HTTPS 或 localhost 可用）。</p></div>' +
        '</div><div>' +
        '<label class="field-label">识别结果</label><textarea id="qdResult" readonly placeholder="识别结果将显示在这里" style="min-height:160px"></textarea>' +
        '<div class="row" style="margin-top:10px"><button class="btn" id="qdCopy">复制结果</button><a class="btn ghost hidden" id="qdOpen" target="_blank" rel="noopener noreferrer">打开链接</a></div>' +
        '<div id="qdStatus" class="muted"></div><div id="qdMeta" style="margin-top:10px"></div>' +
        '</div></div>';

      var stream = null, raf = 0;

      function show(res) {
        if (!res) {
          $('#qdResult').value = '';
          $('#qdStatus').innerHTML = '<span class="error">未识别到二维码，请确保图片清晰、二维码完整。</span>';
          $('#qdMeta').innerHTML = ''; $('#qdOpen').classList.add('hidden');
          return;
        }
        $('#qdResult').value = res.text;
        $('#qdStatus').innerHTML = '<span class="ok">识别成功</span> · ' + res.text.length + ' 个字符';
        $('#qdMeta').innerHTML = describe(res.text);
        var open = $('#qdOpen');
        if (isUrl(res.text)) {
          open.href = /^www\./i.test(res.text) ? 'http://' + res.text.trim() : res.text.trim();
          open.classList.remove('hidden');
        } else open.classList.add('hidden');
      }

      function handleSrc(src) {
        var img = new Image();
        img.crossOrigin = 'anonymous';
        $('#qdStatus').textContent = '识别中…';
        img.onload = function () {
          $('#qdPreview').innerHTML = '';
          $('#qdPreview').appendChild(img);
          try { show(scanImage(img)); } catch (e) { $('#qdStatus').innerHTML = '<span class="error">无法读取该图片（可能是跨域限制）</span>'; }
        };
        img.onerror = function () { $('#qdStatus').innerHTML = '<span class="error">图片加载失败</span>'; };
        img.src = src;
      }
      function handleFile(f) {
        if (!/^image\//.test(f.type)) return App.toast('请选择图片文件');
        App.readFile(f, 'dataurl').then(handleSrc);
      }
      App.bindDropzone($('#qdDrop'), $('#qdInput'), handleFile);
      $('#qdUrlBtn').onclick = function () { var u = $('#qdUrl').value.trim(); if (u) handleSrc(u); };

      function onPaste(e) {
        var items = (e.clipboardData || {}).items || [];
        for (var i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') === 0) { handleFile(items[i].getAsFile()); e.preventDefault(); return; }
        }
      }
      document.addEventListener('paste', onPaste);

      function stopCam() {
        cancelAnimationFrame(raf);
        if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
      }
      App.onLeave(function () { stopCam(); document.removeEventListener('paste', onPaste); });

      function startCam(deviceId) {
        stopCam();
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          $('#qdStatus').innerHTML = '<span class="error">当前环境不支持摄像头（需 HTTPS）</span>'; return;
        }
        var constraints = { video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' }, audio: false };
        navigator.mediaDevices.getUserMedia(constraints).then(function (s) {
          stream = s;
          var video = $('#qdVideo');
          video.srcObject = s; video.play();
          $('#qdStatus').textContent = '正在扫描，请将二维码对准摄像头…';
          listDevices();
          var canvas = document.createElement('canvas'), ctx = canvas.getContext('2d', { willReadFrequently: true });
          (function tick() {
            if (!stream) return;
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
              var scale = Math.min(1, 800 / Math.max(video.videoWidth, video.videoHeight));
              canvas.width = video.videoWidth * scale; canvas.height = video.videoHeight * scale;
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              var res = scanImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));
              if (res) { show(res); stopCam(); App.toast('扫码成功'); return; }
            }
            raf = requestAnimationFrame(tick);
          })();
        }).catch(function (err) {
          $('#qdStatus').innerHTML = '<span class="error">无法打开摄像头：' + esc(err.message || err.name) + '</span>';
        });
      }
      function listDevices() {
        navigator.mediaDevices.enumerateDevices().then(function (ds) {
          var cams = ds.filter(function (d) { return d.kind === 'videoinput'; });
          var sel = $('#qdDevices');
          if (!sel || cams.length < 2) return;
          var cur = stream && stream.getVideoTracks()[0].getSettings().deviceId;
          sel.innerHTML = cams.map(function (c, i) { return '<option value="' + c.deviceId + '"' + (c.deviceId === cur ? ' selected' : '') + '>' + esc(c.label || ('摄像头 ' + (i + 1))) + '</option>'; }).join('');
          sel.classList.remove('hidden');
        });
      }
      $('#qdStart').onclick = function () { startCam(); };
      $('#qdStop').onclick = function () { stopCam(); $('#qdStatus').textContent = '已停止'; };
      $('#qdDevices').onchange = function () { startCam(this.value); };

      $('#qdTabs').addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        App.$$('#qdTabs button').forEach(function (x) { x.classList.toggle('active', x === b); });
        var cam = b.getAttribute('data-m') === 'camera';
        $('#qdFile').classList.toggle('hidden', cam);
        $('#qdCam').classList.toggle('hidden', !cam);
        if (!cam) stopCam();
      });
      $('#qdCopy').onclick = function () { App.copy($('#qdResult').value); };
    }
  });
})();
