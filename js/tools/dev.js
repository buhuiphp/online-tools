(function () {
  'use strict';
  var $ = App.$, esc = App.escapeHtml;
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmtDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); }

  /* ---------------- 时间戳转换 ---------------- */
  App.register({
    id: 'timestamp', group: 'dev', icon: '⏱', title: '时间戳转换',
    desc: 'Unix 时间戳与日期时间相互转换，支持秒/毫秒', keywords: 'timestamp unix 时间戳 日期',
    render: function (el) {
      el.innerHTML = '<div class="stats" style="margin:0 0 18px"><div class="stat"><b id="tsNowS"></b><span>当前时间戳（秒）</span></div><div class="stat"><b id="tsNowMs" style="font-size:1.1rem"></b><span>毫秒</span></div><div class="stat"><b id="tsNowD" style="font-size:1.05rem"></b><span>当前时间</span></div></div>' +
        '<div class="row"><button class="btn ghost sm" id="tsPause">暂停</button><button class="btn ghost sm" id="tsCopyNow">复制秒级时间戳</button></div>' +
        '<h3 style="margin:16px 0 8px;font-size:1rem">时间戳 → 日期</h3>' +
        '<div class="row"><input type="text" id="tsIn"><select id="tsUnit" class="w-s"><option value="auto">自动识别</option><option value="s">秒</option><option value="ms">毫秒</option></select><button class="btn" id="tsToDate">转换</button></div>' +
        '<div class="output" id="tsOut1"></div>' +
        '<h3 style="margin:16px 0 8px;font-size:1rem">日期 → 时间戳</h3>' +
        '<div class="row"><input type="text" id="dIn" placeholder="如 2026-11-05 12:00:00"><button class="btn" id="dToTs">转换</button></div>' +
        '<div class="output" id="tsOut2"></div>';
      var paused = false, timer;
      function tick() {
        if (paused) return;
        var now = Date.now();
        $('#tsNowS').textContent = Math.floor(now / 1000); $('#tsNowMs').textContent = now; $('#tsNowD').textContent = fmtDate(new Date(now));
      }
      tick(); timer = setInterval(tick, 1000);
      App.onLeave(function () { clearInterval(timer); });
      $('#tsPause').onclick = function () { paused = !paused; this.textContent = paused ? '继续' : '暂停'; tick(); };
      $('#tsCopyNow').onclick = function () { App.copy($('#tsNowS').textContent); };
      $('#tsIn').value = Math.floor(Date.now() / 1000);
      $('#dIn').value = fmtDate(new Date());
      $('#tsToDate').onclick = function () {
        var v = $('#tsIn').value.trim();
        if (!/^-?\d+$/.test(v)) { $('#tsOut1').innerHTML = '<span class="error">请输入数字时间戳</span>'; return; }
        var unit = $('#tsUnit').value; if (unit === 'auto') unit = v.replace('-', '').length > 11 ? 'ms' : 's';
        var d = new Date(unit === 's' ? +v * 1000 : +v);
        $('#tsOut1').textContent = '本地时间：' + fmtDate(d) + '（按' + (unit === 's' ? '秒' : '毫秒') + '）\nUTC 时间：' + d.toISOString() + '\n星期：' + '日一二三四五六'[d.getDay()];
      };
      $('#dToTs').onclick = function () {
        var v = $('#dIn').value.trim().replace(/\//g, '-');
        var d = new Date(/^\d{4}-\d{1,2}-\d{1,2}$/.test(v) ? v + 'T00:00:00' : v.replace(' ', 'T'));
        if (isNaN(d)) { $('#tsOut2').innerHTML = '<span class="error">无法识别的日期格式</span>'; return; }
        $('#tsOut2').textContent = '秒：' + Math.floor(d.getTime() / 1000) + '\n毫秒：' + d.getTime();
      };
      $('#tsToDate').click(); $('#dToTs').click();
    }
  });

  /* ---------------- UUID ---------------- */
  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    var b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    var h = Array.from(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }
  App.register({
    id: 'uuid', group: 'dev', icon: 'ID', title: 'UUID 生成器',
    desc: '批量生成 UUID v4，支持大写 / 去连字符', keywords: 'uuid guid 唯一标识',
    render: function (el) {
      el.innerHTML = '<div class="row"><label>数量</label><input type="number" id="uuN" class="w-s" value="10" min="1" max="1000"><label><input type="checkbox" id="uuUp">大写</label><label><input type="checkbox" id="uuNoDash">去掉连字符</label><label><input type="checkbox" id="uuBrace">花括号</label>' +
        '<button class="btn" id="uuGen">生成</button><button class="btn ghost" id="uuCopy">复制全部</button></div><textarea id="uuOut" style="min-height:360px" readonly></textarea>';
      function gen() {
        var n = Math.min(1000, Math.max(1, +$('#uuN').value || 1)), out = [];
        for (var i = 0; i < n; i++) {
          var u = uuid();
          if ($('#uuNoDash').checked) u = u.replace(/-/g, '');
          if ($('#uuUp').checked) u = u.toUpperCase();
          if ($('#uuBrace').checked) u = '{' + u + '}';
          out.push(u);
        }
        $('#uuOut').value = out.join('\n');
      }
      $('#uuGen').onclick = gen;
      el.addEventListener('change', function (e) { if (e.target.type === 'checkbox') gen(); });
      $('#uuCopy').onclick = function () { App.copy($('#uuOut').value); };
      gen();
    }
  });

  /* ---------------- 密码生成器 ---------------- */
  App.register({
    id: 'password', group: 'dev', icon: '***', title: '密码生成器',
    desc: '生成高强度随机密码，自定义长度和字符类型', keywords: 'password 密码 随机 强密码',
    render: function (el) {
      el.innerHTML = '<div class="row"><label>长度 <b id="pwLenV">16</b></label><input type="range" id="pwLen" min="4" max="64" value="16" style="flex:1"></div>' +
        '<div class="row"><label><input type="checkbox" id="pwU" checked>大写 A-Z</label><label><input type="checkbox" id="pwL" checked>小写 a-z</label><label><input type="checkbox" id="pwD" checked>数字 0-9</label><label><input type="checkbox" id="pwS" checked>符号 !@#$</label><label><input type="checkbox" id="pwX">排除易混淆字符 (0O1lI)</label></div>' +
        '<div class="row"><label>数量</label><input type="number" id="pwN" class="w-s" value="5" min="1" max="100"><button class="btn" id="pwGen">生成</button><button class="btn ghost" id="pwCopy">复制全部</button></div>' +
        '<ul class="list" id="pwOut"></ul>';
      function rand(max) { var a = new Uint32Array(1), lim = Math.floor(0x100000000 / max) * max; do { crypto.getRandomValues(a); } while (a[0] >= lim); return a[0] % max; }
      function strength(p) {
        var pool = 0; if (/[a-z]/.test(p)) pool += 26; if (/[A-Z]/.test(p)) pool += 26; if (/\d/.test(p)) pool += 10; if (/[^\w]/.test(p)) pool += 30;
        var bits = p.length * Math.log2(pool || 1);
        return bits < 40 ? ['弱', '#f56c6c'] : bits < 70 ? ['中', '#e6a23c'] : bits < 100 ? ['强', '#67c23a'] : ['极强', '#409eff'];
      }
      var list = [];
      function gen() {
        var sets = [];
        if ($('#pwU').checked) sets.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
        if ($('#pwL').checked) sets.push('abcdefghijklmnopqrstuvwxyz');
        if ($('#pwD').checked) sets.push('0123456789');
        if ($('#pwS').checked) sets.push('!@#$%^&*()-_=+[]{};:,.<>?');
        if ($('#pwX').checked) sets = sets.map(function (s) { return s.replace(/[0O1lI]/g, ''); });
        if (!sets.length) return App.toast('请至少选择一种字符');
        var len = +$('#pwLen').value, all = sets.join(''), n = Math.min(100, Math.max(1, +$('#pwN').value || 1));
        list = [];
        for (var k = 0; k < n; k++) {
          var chars = sets.map(function (s) { return s[rand(s.length)]; });
          while (chars.length < len) chars.push(all[rand(all.length)]);
          chars = chars.slice(0, len);
          for (var i = chars.length - 1; i > 0; i--) { var j = rand(i + 1), t = chars[i]; chars[i] = chars[j]; chars[j] = t; }
          list.push(chars.join(''));
        }
        $('#pwOut').innerHTML = list.map(function (p, i) { var s = strength(p); return '<li><span style="flex:1;font-size:1.05rem">' + esc(p) + '</span><span style="color:' + s[1] + ';font-size:.8rem">' + s[0] + '</span><button class="btn ghost sm" data-i="' + i + '">复制</button></li>'; }).join('');
      }
      $('#pwLen').addEventListener('input', function () { $('#pwLenV').textContent = this.value; gen(); });
      el.addEventListener('change', function (e) { if (e.target.type === 'checkbox') gen(); });
      $('#pwOut').addEventListener('click', function (e) { var i = e.target.getAttribute('data-i'); if (i !== null) App.copy(list[i]); });
      $('#pwGen').onclick = gen;
      $('#pwCopy').onclick = function () { App.copy(list.join('\n')); };
      gen();
    }
  });

  /* ---------------- 颜色转换 ---------------- */
  function hexToRgb(h) {
    h = h.replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&');
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgbToHex(r, g, b) { return '#' + [r, g, b].map(function (x) { return ('0' + Math.round(x).toString(16)).slice(-2); }).join(''); }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      var d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60;
    }
    return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
  }
  function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    var k = function (n) { return (n + h / 30) % 12; }, a = s * Math.min(l, 1 - l);
    var f = function (n) { return 255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))); };
    return [Math.round(f(0)), Math.round(f(8)), Math.round(f(4))];
  }
  App.register({
    id: 'color', group: 'dev', icon: '◐', title: '颜色转换器',
    desc: 'HEX / RGB / HSL 互转，实时预览与取色历史', keywords: 'color 颜色 hex rgb hsl 取色',
    render: function (el) {
      el.innerHTML = '<div class="cols"><div><div class="swatch" id="clSw"></div><div class="row" style="margin-top:12px"><input type="color" id="clPick" value="#667eea"><span class="muted">点击选色</span>' +
        (window.EyeDropper ? '<button class="btn ghost sm" id="clEye">屏幕取色</button>' : '') + '</div>' +
        '<label class="field-label">取色历史</label><div class="history" id="clHist"></div></div><div>' +
        ['HEX', 'RGB', 'HSL'].map(function (k) { return '<label class="field-label">' + k + '</label><div class="row"><input type="text" id="cl' + k + '"><button class="btn ghost sm" data-c="cl' + k + '">复制</button></div>'; }).join('') +
        '<p id="clErr" class="error"></p></div></div>';
      var hist = JSON.parse(localStorage.getItem('tool_colors') || '[]');
      function renderHist() { $('#clHist').innerHTML = hist.map(function (c) { return '<span title="' + c + '" data-h="' + c + '" style="background:' + c + '"></span>'; }).join('') || '<span class="muted" style="border:0;width:auto">暂无</span>'; }
      function setRgb(rgb, from, save) {
        var hex = rgbToHex(rgb[0], rgb[1], rgb[2]), hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]);
        if (from !== 'HEX') $('#clHEX').value = hex;
        if (from !== 'RGB') $('#clRGB').value = 'rgb(' + rgb.join(', ') + ')';
        if (from !== 'HSL') $('#clHSL').value = 'hsl(' + hsl[0] + ', ' + hsl[1] + '%, ' + hsl[2] + '%)';
        $('#clPick').value = hex; $('#clSw').style.background = hex; $('#clErr').textContent = '';
        if (save) { hist = [hex].concat(hist.filter(function (c) { return c !== hex; })).slice(0, 20); localStorage.setItem('tool_colors', JSON.stringify(hist)); renderHist(); }
      }
      function nums(s) { return (s.match(/-?\d+(\.\d+)?/g) || []).map(Number); }
      el.addEventListener('input', function (e) {
        var id = e.target.id, v = e.target.value, rgb = null;
        if (id === 'clPick') rgb = hexToRgb(v);
        else if (id === 'clHEX') rgb = hexToRgb(v);
        else if (id === 'clRGB') { var n = nums(v); if (n.length >= 3 && n.slice(0, 3).every(function (x) { return x >= 0 && x <= 255; })) rgb = n.slice(0, 3); }
        else if (id === 'clHSL') { var h = nums(v); if (h.length >= 3) rgb = hslToRgb(h[0], h[1], h[2]); }
        else return;
        if (rgb) setRgb(rgb, id.slice(2)); else $('#clErr').textContent = '颜色格式不正确';
      });
      el.addEventListener('change', function (e) { if (e.target.id === 'clPick') setRgb(hexToRgb(e.target.value), null, true); else if (/^cl(HEX|RGB|HSL)$/.test(e.target.id) && !$('#clErr').textContent) setRgb(hexToRgb($('#clHEX').value), null, true); });
      el.addEventListener('click', function (e) {
        var c = e.target.getAttribute('data-c'); if (c) App.copy($('#' + c).value);
        var h = e.target.getAttribute('data-h'); if (h) setRgb(hexToRgb(h));
      });
      if ($('#clEye')) $('#clEye').onclick = function () { new EyeDropper().open().then(function (r) { setRgb(hexToRgb(r.sRGBHex), null, true); }).catch(function () {}); };
      renderHist(); setRgb(hexToRgb('#667eea'));
    }
  });

  /* ---------------- 图片压缩 ---------------- */
  App.register({
    id: 'imgcompress', group: 'dev', icon: 'IMG', title: '图片压缩',
    desc: '本地压缩 JPG / PNG / WebP 图片，调节质量与尺寸', keywords: '图片 压缩 jpg png webp image compress',
    render: function (el) {
      el.innerHTML = '<div class="dropzone" id="icDrop"><p><b>点击选择</b> 或拖拽图片到这里</p><p class="muted">图片仅在浏览器本地压缩，不会上传</p></div><input type="file" id="icInput" accept="image/*" hidden>' +
        '<div class="row" style="margin-top:12px"><label>质量 <b id="icQV">0.75</b></label><input type="range" id="icQ" min="0.1" max="1" step="0.05" value="0.75">' +
        '<label>最大宽度</label><input type="number" id="icW" class="w-s" placeholder="不限"><label>输出格式</label><select id="icFmt" class="w-s"><option value="image/jpeg">JPG</option><option value="image/webp">WebP</option><option value="image/png">PNG</option></select></div>' +
        '<div class="cols" style="margin-top:8px"><div><label class="field-label">原图 <span id="icA" class="muted"></span></label><div class="qr-out" id="icOrig"></div></div>' +
        '<div><label class="field-label">压缩后 <span id="icB" class="muted"></span></label><div class="qr-out" id="icRes"></div><div class="row" style="margin-top:10px"><button class="btn" id="icDl">下载压缩图片</button></div></div></div>';
      var img = null, file = null, blob = null, timer;
      function run() {
        if (!img || !el.isConnected) return;
        var w = img.naturalWidth, h = img.naturalHeight, max = +$('#icW').value;
        if (max && w > max) { h = Math.round(h * max / w); w = max; }
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        var ctx = c.getContext('2d'), fmt = $('#icFmt').value;
        if (fmt === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
        ctx.drawImage(img, 0, 0, w, h);
        c.toBlob(function (b) {
          blob = b;
          var url = URL.createObjectURL(b);
          $('#icRes').innerHTML = '<img src="' + url + '" style="max-height:320px">';
          var pct = ((1 - b.size / file.size) * 100).toFixed(1);
          $('#icB').innerHTML = App.formatBytes(b.size) + ' · ' + w + '×' + h + ' · ' + (pct >= 0 ? '<span class="ok">减少 ' + pct + '%</span>' : '<span class="error">增大 ' + (-pct) + '%</span>');
        }, fmt, +$('#icQ').value);
      }
      App.bindDropzone($('#icDrop'), $('#icInput'), function (f) {
        if (!/^image\//.test(f.type)) return App.toast('请选择图片文件');
        file = f;
        App.readFile(f, 'dataurl').then(function (url) {
          img = new Image();
          img.onload = function () {
            $('#icOrig').innerHTML = '<img src="' + url + '" style="max-height:320px">';
            $('#icA').textContent = App.formatBytes(f.size) + ' · ' + img.naturalWidth + '×' + img.naturalHeight;
            if (f.type === 'image/png' || f.type === 'image/webp') $('#icFmt').value = f.type === 'image/png' ? 'image/webp' : 'image/webp';
            run();
          };
          img.src = url;
        });
      });
      el.addEventListener('input', function (e) {
        if (e.target.id === 'icQ') $('#icQV').textContent = e.target.value;
        if (['icQ', 'icW', 'icFmt'].indexOf(e.target.id) >= 0) { clearTimeout(timer); timer = setTimeout(run, 150); }
      });
      $('#icDl').onclick = function () {
        if (!blob) return App.toast('请先选择图片');
        var ext = { 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/png': 'png' }[$('#icFmt').value];
        App.download(file.name.replace(/\.[^.]+$/, '') + '-compressed.' + ext, blob);
      };
    }
  });
})();
