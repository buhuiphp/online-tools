(function (global) {
  'use strict';
  var registry = [];
  var groups = [];
  var loaded = {};

  function defineGroup(id, title) { groups.push({ id: id, title: title }); }
  function register(tool) { registry.push(tool); }

  function loadScript(src) {
    if (!loaded[src]) {
      loaded[src] = new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = function () { delete loaded[src]; reject(new Error('加载失败: ' + src)); };
        document.head.appendChild(s);
      });
    }
    return loaded[src];
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var toastTimer;
  function toast(msg) {
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 1800);
  }

  function copy(text) {
    if (text === undefined || text === null || text === '') { toast('没有可复制的内容'); return; }
    var done = function () { toast('已复制到剪贴板'); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    } else { fallbackCopy(text); done(); }
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }

  function download(filename, content, mime) {
    var blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    downloadUrl(filename, url);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }
  function downloadUrl(filename, url) {
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  function readFile(file, as) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = reject;
      if (as === 'dataurl') r.readAsDataURL(file);
      else if (as === 'arraybuffer') r.readAsArrayBuffer(file);
      else r.readAsText(file);
    });
  }

  function bindDropzone(zone, input, onFile) {
    zone.addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () { if (input.files[0]) onFile(input.files[0]); input.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('drag'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('drag'); });
    });
    zone.addEventListener('drop', function (e) {
      var f = e.dataTransfer.files[0];
      if (f) onFile(f);
    });
  }

  function formatBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(2) + ' MB';
  }

  // Tools can register a cleanup (e.g. stop camera, close socket) for when the user leaves.
  var cleanups = [];
  function onLeave(fn) { cleanups.push(fn); }
  function runCleanups() {
    while (cleanups.length) { try { cleanups.pop()(); } catch (e) { /* ignore */ } }
  }

  global.App = {
    groups: groups, tools: registry, defineGroup: defineGroup, register: register,
    loadScript: loadScript, $: $, $$: $$, escapeHtml: escapeHtml, toast: toast, copy: copy,
    download: download, downloadUrl: downloadUrl, readFile: readFile, bindDropzone: bindDropzone,
    formatBytes: formatBytes, onLeave: onLeave, runCleanups: runCleanups
  };

  defineGroup('text', '文本处理');
  defineGroup('encode', '编码 / 数据转换');
  defineGroup('code', '代码 / 正则');
  defineGroup('barcode', '图形码');
  defineGroup('dev', '开发工具');
  defineGroup('network', '网络 / SEO');
})(window);
