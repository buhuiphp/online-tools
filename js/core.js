(function (global) {
  'use strict';
  var tools = [], groups = [], loaded = {}, pending = null, cleanups = [];

  var store = {
    get: function (k, d) {
      try { var v = localStorage.getItem('tb:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set: function (k, v) { try { localStorage.setItem('tb:' + k, JSON.stringify(v)); } catch (e) { /* quota */ } },
    del: function (k) { try { localStorage.removeItem('tb:' + k); } catch (e) { /* ignore */ } }
  };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  function loadScript(src) {
    if (!loaded[src]) {
      loaded[src] = new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = src; s.onload = resolve;
        s.onerror = function () { delete loaded[src]; reject(new Error('资源加载失败：' + src)); };
        document.head.appendChild(s);
      });
    }
    return loaded[src];
  }

  var toastTimer;
  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 1800);
  }

  function copy(text) {
    if (text == null || text === '') return toast('没有可复制的内容');
    var ok = function () { toast('已复制'); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, function () { legacyCopy(text); ok(); });
    else { legacyCopy(text); ok(); }
  }
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    ta.remove();
  }

  function downloadUrl(name, url) {
    var a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
  }
  function download(name, content, mime) {
    var blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    downloadUrl(name, url);
    setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
  }

  function readFile(file, as) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); }; r.onerror = reject;
      if (as === 'dataurl') r.readAsDataURL(file);
      else if (as === 'buffer') r.readAsArrayBuffer(file);
      else r.readAsText(file);
    });
  }
  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('图片加载失败')); };
      img.src = src;
    });
  }

  function bindDrop(zone, input, onFile) {
    zone.addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () { if (input.files[0]) onFile(input.files[0]); input.value = ''; });
    ['dragenter', 'dragover'].forEach(function (t) { zone.addEventListener(t, function (e) { e.preventDefault(); zone.classList.add('drag'); }); });
    ['dragleave', 'drop'].forEach(function (t) { zone.addEventListener(t, function (e) { e.preventDefault(); zone.classList.remove('drag'); }); });
    zone.addEventListener('drop', function (e) { var f = e.dataTransfer.files[0]; if (f) onFile(f); });
  }

  // Listen for pasted image files while the current tool is open.
  function onPasteImage(fn) {
    function handler(e) {
      var items = (e.clipboardData || {}).items || [];
      for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image/') === 0) { e.preventDefault(); fn(items[i].getAsFile()); return; }
      }
    }
    document.addEventListener('paste', handler);
    onLeave(function () { document.removeEventListener('paste', handler); });
  }

  function bytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(2) + ' MB';
  }

  function onLeave(fn) { cleanups.push(fn); }
  function runCleanups() { while (cleanups.length) { try { cleanups.pop()(); } catch (e) { /* ignore */ } } }

  /* favorites & recents */
  function favorites() { return store.get('favs', []); }
  function isFav(id) { return favorites().indexOf(id) >= 0; }
  function toggleFav(id) {
    var f = favorites(), i = f.indexOf(id);
    if (i >= 0) f.splice(i, 1); else f.unshift(id);
    store.set('favs', f);
    return i < 0;
  }
  function recents() { return store.get('recent', []); }
  function pushRecent(id) { store.set('recent', [id].concat(recents().filter(function (x) { return x !== id; })).slice(0, 8)); }

  /* cross-tool hand-off */
  function sendTo(id, payload) {
    pending = payload || null;
    if (location.hash === '#/' + id) global.dispatchEvent(new HashChangeEvent('hashchange'));
    else location.hash = '#/' + id;
  }
  function takePending() { var p = pending; pending = null; return p || {}; }

  // Restore/save values of [data-persist] controls so each tool remembers its last state.
  function persist(root, toolId) {
    $$('[data-persist]', root).forEach(function (el) {
      var key = 'state:' + toolId + ':' + el.id, v = store.get(key, null);
      var isCheck = el.type === 'checkbox';
      if (v !== null) { if (isCheck) el.checked = v; else el.value = v; }
      el.addEventListener(isCheck || el.tagName === 'SELECT' ? 'change' : 'input', function () {
        store.set(key, isCheck ? el.checked : el.value);
      });
    });
  }

  function seg(root, onChange) {
    root.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || !root.contains(b)) return;
      $$('button', root).forEach(function (x) { x.classList.toggle('on', x === b); });
      onChange(b.getAttribute('data-v'));
    });
  }

  global.App = {
    tools: tools, groups: groups, store: store,
    group: function (id, title) { groups.push({ id: id, title: title }); },
    register: function (t) { tools.push(t); },
    get: function (id) { return tools.find(function (t) { return t.id === id; }); },
    $: $, $$: $$, esc: esc, loadScript: loadScript, toast: toast, copy: copy, download: download, downloadUrl: downloadUrl,
    readFile: readFile, loadImage: loadImage, bindDrop: bindDrop, onPasteImage: onPasteImage, bytes: bytes,
    onLeave: onLeave, runCleanups: runCleanups, favorites: favorites, isFav: isFav, toggleFav: toggleFav,
    recents: recents, pushRecent: pushRecent, sendTo: sendTo, takePending: takePending, persist: persist, seg: seg
  };

  App.group('qr', '二维码工坊');
  App.group('codec', '编码解码');
  App.group('data', '数据处理');
  App.group('text', '文本工具');
  App.group('dev', '开发辅助');
  App.group('image', '图像处理');
})(window);
