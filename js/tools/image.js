(function () {
  'use strict';
  var $ = App.$, esc = App.esc;

  /* ===== 图片压缩 ===== */
  App.register({
    id: 'imgcompress', group: 'image', icon: 'IMG', title: '图片压缩转换',
    desc: '本地压缩 JPG / PNG / WebP，调整尺寸与质量，实时对比体积', kw: 'tpys 图片 压缩 转换 jpg png webp resize',
    render: function (el, ctx) {
      el.innerHTML = '<div class="drop" id="drop"><b>选择、拖入或 Ctrl+V 粘贴图片</b><br><span class="msg">在浏览器内压缩，不会上传</span></div><input type="file" id="file" accept="image/*" hidden>' +
        '<div class="pane" style="margin-top:16px"><div class="pane-body"><div class="inline"><span class="lbl" style="margin:0">质量 <b id="qv"></b></span><input type="range" id="q" min="0.1" max="1" step="0.05" value="0.8" data-persist>' +
        '<span class="lbl" style="margin:0">最大宽度</span><input type="number" id="w" class="w120" placeholder="不限" data-persist><span class="lbl" style="margin:0">格式</span><select id="fmt" class="w120" data-persist><option value="image/webp">WebP</option><option value="image/jpeg">JPG</option><option value="image/png">PNG</option></select></div></div></div>' +
        '<div class="grid2"><div class="pane"><div class="pane-head"><h3>原图</h3><span class="msg" id="a"></span></div><div class="pane-body"><div class="stage" id="orig"><span class="muted">暂无图片</span></div></div></div>' +
        '<div class="pane"><div class="pane-head"><h3>结果</h3><span class="msg" id="b"></span><button class="btn sm primary" id="dl">下载</button></div><div class="pane-body"><div class="stage" id="res"><span class="muted">暂无图片</span></div></div></div></div>';
      var img = null, file = null, blob = null, timer, lastUrl;
      function run() {
        if (!img || !el.isConnected) return;
        $('#qv', el).textContent = $('#q', el).value;
        var w = img.naturalWidth, h = img.naturalHeight, max = +$('#w', el).value, f = $('#fmt', el).value;
        if (max && w > max) { h = Math.round(h * max / w); w = max; }
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        var x = c.getContext('2d'); if (f === 'image/jpeg') { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); }
        x.drawImage(img, 0, 0, w, h);
        c.toBlob(function (b) {
          blob = b; if (lastUrl) URL.revokeObjectURL(lastUrl); lastUrl = URL.createObjectURL(b);
          $('#res', el).innerHTML = '<img src="' + lastUrl + '" style="max-height:340px">';
          var pct = (1 - b.size / file.size) * 100;
          $('#b', el).innerHTML = App.bytes(b.size) + ' · ' + w + '×' + h + ' · ' + (pct >= 0 ? '<span class="ok">-' + pct.toFixed(1) + '%</span>' : '<span class="err">+' + (-pct).toFixed(1) + '%</span>');
        }, f, +$('#q', el).value);
      }
      function fromFile(f) {
        if (!/^image\//.test(f.type)) return App.toast('请选择图片文件');
        file = f;
        App.readFile(f, 'dataurl').then(App.loadImage).then(function (i) {
          img = i; $('#orig', el).innerHTML = ''; i.style.maxHeight = '340px'; $('#orig', el).appendChild(i);
          $('#a', el).textContent = (f.name || '粘贴图片') + ' · ' + App.bytes(f.size) + ' · ' + i.naturalWidth + '×' + i.naturalHeight;
          run();
        });
      }
      App.bindDrop($('#drop', el), $('#file', el), fromFile);
      App.onPasteImage(fromFile);
      el.addEventListener('input', function () { $('#qv', el).textContent = $('#q', el).value; clearTimeout(timer); timer = setTimeout(run, 150); });
      el.addEventListener('change', run);
      $('#dl', el).onclick = function () {
        if (!blob) return App.toast('请先选择图片');
        var ext = { 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/png': 'png' }[$('#fmt', el).value];
        App.download((file.name || 'image').replace(/\.[^.]+$/, '') + '-min.' + ext, blob);
      };
      App.onLeave(function () { if (lastUrl) URL.revokeObjectURL(lastUrl); });
      ctx.persist(); $('#qv', el).textContent = $('#q', el).value;
      if (ctx.file) fromFile(ctx.file);
    }
  });

  /* ===== 图片 Base64 ===== */
  App.register({
    id: 'img2b64', group: 'image', icon: 'B64', title: '图片 Base64', accepts: true,
    desc: '图片转 Data URL（附 CSS / HTML 片段），Base64 还原为图片', kw: 'tp base64 图片 data url 转换',
    render: function (el, ctx) {
      el.innerHTML = '<div class="grid2"><div class="pane"><div class="pane-head"><h3>图片 → Base64</h3><span class="msg" id="info"></span></div><div class="pane-body"><div class="drop" id="drop"><b>选择、拖入或粘贴图片</b><div id="pv"></div></div><input type="file" id="file" accept="image/*" hidden>' +
        '<div class="inline" style="margin-top:12px"><div class="seg" id="fmt"><button data-v="raw" class="on">Data URL</button><button data-v="css">CSS</button><button data-v="html">HTML</button><button data-v="md">Markdown</button></div><button class="btn sm" data-copy="#out">复制</button></div>' +
        '<textarea id="out" readonly style="margin-top:10px;min-height:150px"></textarea></div></div>' +
        '<div class="pane"><div class="pane-head"><h3>Base64 → 图片</h3><button class="btn sm" id="save">下载图片</button></div><div class="pane-body"><textarea id="in" placeholder="粘贴 data:image/...;base64,... 或纯 Base64" style="min-height:150px"></textarea><div class="stage" id="back" style="margin-top:12px;min-height:200px"><span class="muted">预览</span></div></div></div></div>';
      var url = '', fmt = 'raw';
      function render() {
        if (!url) return;
        $('#out', el).value = fmt === 'css' ? 'background-image: url("' + url + '");' : fmt === 'html' ? '<img src="' + url + '" alt="">' : fmt === 'md' ? '![image](' + url + ')' : url;
      }
      function fromFile(f) {
        if (!/^image\//.test(f.type)) return App.toast('请选择图片文件');
        App.readFile(f, 'dataurl').then(function (u) {
          url = u; $('#pv', el).innerHTML = '<img src="' + u + '">';
          $('#info', el).textContent = App.bytes(f.size) + ' → ' + App.bytes(u.length); render();
        });
      }
      function normalized() {
        var v = $('#in', el).value.trim().replace(/\s/g, '');
        if (!v) return '';
        if (/^data:image\//.test(v)) return v;
        var head = v.slice(0, 8), mime = head.indexOf('iVBOR') === 0 ? 'png' : head.indexOf('/9j/') === 0 ? 'jpeg' : head.indexOf('R0lGOD') === 0 ? 'gif' : head.indexOf('UklGR') === 0 ? 'webp' : head.indexOf('PHN2Zy') === 0 ? 'svg+xml' : 'png';
        return 'data:image/' + mime + ';base64,' + v;
      }
      function back() {
        var u = normalized();
        if (!u) { $('#back', el).innerHTML = '<span class="muted">预览</span>'; return; }
        App.loadImage(u).then(function (img) { $('#back', el).innerHTML = ''; img.style.maxHeight = '300px'; $('#back', el).appendChild(img); })
          .catch(function () { $('#back', el).innerHTML = '<span class="err">无法解析为图片</span>'; });
      }
      App.bindDrop($('#drop', el), $('#file', el), fromFile);
      App.onPasteImage(fromFile);
      App.seg($('#fmt', el), function (v) { fmt = v; render(); });
      $('#in', el).addEventListener('input', back);
      $('#save', el).onclick = function () { var u = normalized(); if (!u) return; var ext = (u.match(/^data:image\/([\w+]+)/) || [, 'png'])[1].replace('+xml', '').replace('jpeg', 'jpg'); App.downloadUrl('image.' + ext, u); };
      if (ctx.file) fromFile(ctx.file);
      if (ctx.input) { $('#in', el).value = ctx.input.trim(); back(); }
    }
  });
})();
