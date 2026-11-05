(function () {
  'use strict';
  var $ = App.$, esc = App.escapeHtml;

  /* ---------------- 人民币大写 ---------------- */
  function rmbUpper(input) {
    var s = String(input).replace(/[,，\s]/g, '');
    if (!/^-?\d+(\.\d+)?$/.test(s)) throw new Error('请输入合法的数字');
    var neg = s[0] === '-'; if (neg) s = s.slice(1);
    var parts = s.split('.');
    var intPart = parts[0].replace(/^0+(?=\d)/, '');
    var dec = ((parts[1] || '') + '00').slice(0, 2);
    if (intPart.length > 12) throw new Error('数值过大（最多支持千亿级，12 位整数）');
    var digits = '零壹贰叁肆伍陆柒捌玖', units = ['', '拾', '佰', '仟'], bigUnits = ['', '万', '亿'];
    var result = '';
    if (+intPart > 0) {
      var zero = 0;
      for (var i = 0; i < intPart.length; i++) {
        var p = intPart.length - i - 1, d = +intPart[i], q = Math.floor(p / 4), m = p % 4;
        if (d === 0) zero++;
        else { if (zero > 0) result += '零'; zero = 0; result += digits[d] + units[m]; }
        if (m === 0 && zero < 4) result += bigUnits[q];
      }
      result += '元';
    }
    var jiao = +dec[0], fen = +dec[1];
    if (!jiao && !fen) return (neg ? '负' : '') + (result || '零元') + '整';
    if (jiao) result += digits[jiao] + '角';
    else if (result) result += '零';
    result += fen ? digits[fen] + '分' : '整';
    return (neg ? '负' : '') + result;
  }

  App.register({
    id: 'rmb', group: 'text', icon: '¥', title: '人民币大写转换',
    desc: '将数字金额转换为人民币大写格式', keywords: 'rmb 金额 大写 财务',
    render: function (el) {
      el.innerHTML = '<label class="field-label">金额（支持千分位，最多两位小数）</label>' +
        '<input type="text" id="rmbIn" value="1234567.89" style="font-size:1.2rem">' +
        '<label class="field-label" style="margin-top:14px">大写结果</label><div class="output big-output" id="rmbOut"></div>' +
        '<div class="row" style="margin-top:12px"><button class="btn" id="rmbCopy">复制结果</button></div>';
      function run() {
        var v = $('#rmbIn').value.trim(), out = $('#rmbOut');
        if (!v) { out.textContent = ''; return; }
        try { out.textContent = rmbUpper(v); out.classList.remove('error'); } catch (e) { out.textContent = e.message; out.classList.add('error'); }
      }
      $('#rmbIn').addEventListener('input', run);
      $('#rmbCopy').onclick = function () { App.copy($('#rmbOut').textContent); };
      run();
    }
  });

  /* ---------------- Markdown 编辑器 ---------------- */
  var MD_SAMPLE = '# Markdown 编辑器\n\n左侧编辑，右侧**实时预览**。内容自动保存在浏览器本地。\n\n## 列表\n- 支持 GFM 语法\n- [x] 任务列表\n- `行内代码`\n\n## 代码\n```js\nconsole.log("Hello, World!");\n```\n\n> 引用文字\n\n| 表头 | 表头 |\n| --- | --- |\n| 单元格 | 单元格 |\n';
  App.register({
    id: 'markdown', group: 'text', icon: 'MD', title: 'Markdown编辑器',
    desc: '在线编辑 Markdown 文档，实时预览，支持导出', keywords: 'markdown md 编辑器 预览',
    scripts: ['vendor/marked.min.js', 'vendor/purify.min.js'],
    render: function (el) {
      el.innerHTML = '<div class="row"><button class="btn" id="mdCopyHtml">复制 HTML</button><button class="btn ghost" id="mdDlMd">下载 .md</button><button class="btn ghost" id="mdDlHtml">下载 .html</button><button class="btn ghost" id="mdClear">清空</button></div>' +
        '<div class="cols"><textarea id="mdIn" style="min-height:520px"></textarea><div class="preview-box md-preview" id="mdOut" style="height:520px"></div></div>';
      var ta = $('#mdIn');
      ta.value = localStorage.getItem('tool_md') || MD_SAMPLE;
      function html() { return DOMPurify.sanitize(marked.parse(ta.value, { gfm: true, breaks: true })); }
      function run() { $('#mdOut').innerHTML = html(); localStorage.setItem('tool_md', ta.value); }
      ta.addEventListener('input', run);
      $('#mdCopyHtml').onclick = function () { App.copy(html()); };
      $('#mdDlMd').onclick = function () { App.download('document.md', ta.value); };
      $('#mdDlHtml').onclick = function () {
        App.download('document.html', '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Document</title></head><body>' + html() + '</body></html>', 'text/html;charset=utf-8');
      };
      $('#mdClear').onclick = function () { ta.value = ''; run(); };
      run();
    }
  });

  /* ---------------- 特效文字 ---------------- */
  function mapRange(str, upperStart, lowerStart, digitStart, exceptions) {
    return Array.from(str).map(function (ch) {
      if (exceptions && exceptions[ch]) return exceptions[ch];
      var c = ch.charCodeAt(0);
      if (c >= 65 && c <= 90 && upperStart) return String.fromCodePoint(upperStart + c - 65);
      if (c >= 97 && c <= 122 && lowerStart) return String.fromCodePoint(lowerStart + c - 97);
      if (c >= 48 && c <= 57 && digitStart) return String.fromCodePoint(digitStart + c - 48);
      return ch;
    }).join('');
  }
  function combine(str, mark) { return Array.from(str).map(function (c) { return c === ' ' ? c : c + mark; }).join(''); }
  var FANCY = [
    ['粗体', function (s) { return mapRange(s, 0x1D400, 0x1D41A, 0x1D7CE); }],
    ['斜体', function (s) { return mapRange(s, 0x1D434, 0x1D44E, 0, { h: 'ℎ' }); }],
    ['粗斜体', function (s) { return mapRange(s, 0x1D468, 0x1D482); }],
    ['手写体', function (s) { return mapRange(s, 0x1D4D0, 0x1D4EA); }],
    ['哥特体', function (s) { return mapRange(s, 0x1D56C, 0x1D586); }],
    ['空心体', function (s) { return mapRange(s, 0x1D538, 0x1D552, 0x1D7D8, { C: 'ℂ', H: 'ℍ', N: 'ℕ', P: 'ℙ', Q: 'ℚ', R: 'ℝ', Z: 'ℤ' }); }],
    ['等宽体', function (s) { return mapRange(s, 0x1D670, 0x1D68A, 0x1D7F6); }],
    ['圆圈字', function (s) { return mapRange(s, 0x24B6, 0x24D0, 0, { '0': '⓪', '1': '①', '2': '②', '3': '③', '4': '④', '5': '⑤', '6': '⑥', '7': '⑦', '8': '⑧', '9': '⑨' }); }],
    ['全角', function (s) { return Array.from(s).map(function (c) { var n = c.charCodeAt(0); return n > 32 && n < 127 ? String.fromCharCode(n + 0xFEE0) : (c === ' ' ? '\u3000' : c); }).join(''); }],
    ['删除线', function (s) { return combine(s, '\u0336'); }],
    ['下划线', function (s) { return combine(s, '\u0332'); }],
    ['波浪线', function (s) { return combine(s, '\u0330'); }],
    ['倒序', function (s) { return Array.from(s).reverse().join(''); }]
  ];
  var GRADIENTS = [['#667eea', '#764ba2'], ['#f093fb', '#f5576c'], ['#4facfe', '#00f2fe'], ['#43e97b', '#38f9d7'], ['#fa709a', '#fee140'], ['#ff0844', '#ffb199'], ['#ff512f', '#dd2476']];
  App.register({
    id: 'fancytext', group: 'text', icon: 'Aa', title: '特效文字生成',
    desc: '生成花式 Unicode 字体与彩色渐变文字', keywords: '花式字体 特殊字体 渐变 文字',
    render: function (el) {
      el.innerHTML = '<label class="field-label">输入文字</label><input type="text" id="ftIn" value="Hello World 2026">' +
        '<h3 style="margin:18px 0 8px;font-size:1rem">渐变文字（CSS）</h3>' +
        '<div class="row"><label>起始色</label><input type="color" id="ftC1" value="#667eea"><label>结束色</label><input type="color" id="ftC2" value="#764ba2"><label>角度</label><input type="range" id="ftDeg" min="0" max="360" value="90"><span id="ftPresets" class="history"></span></div>' +
        '<div class="fancy-out" id="ftGrad"></div><div class="row"><button class="btn ghost sm" id="ftCss">复制 CSS</button></div>' +
        '<h3 style="margin:18px 0 8px;font-size:1rem">花式字体（可直接复制到社交平台）</h3><ul class="list" id="ftList"></ul>';
      $('#ftPresets').innerHTML = GRADIENTS.map(function (g, i) { return '<span data-i="' + i + '" style="background:linear-gradient(135deg,' + g[0] + ',' + g[1] + ')"></span>'; }).join('');
      function css() { return 'background: linear-gradient(' + $('#ftDeg').value + 'deg, ' + $('#ftC1').value + ', ' + $('#ftC2').value + ');\n-webkit-background-clip: text;\nbackground-clip: text;\ncolor: transparent;'; }
      function run() {
        var s = $('#ftIn').value;
        var g = $('#ftGrad'); g.textContent = s || ' '; g.setAttribute('style', css().replace(/\n/g, ''));
        $('#ftList').innerHTML = FANCY.map(function (f, i) {
          return '<li><span class="muted" style="width:60px;flex:none">' + f[0] + '</span><span style="flex:1;font-size:1.1rem" id="ft' + i + '">' + esc(f[1](s)) + '</span><button class="btn ghost sm" data-copy="' + i + '">复制</button></li>';
        }).join('');
      }
      el.addEventListener('input', run);
      el.addEventListener('click', function (e) {
        var c = e.target.getAttribute('data-copy');
        if (c !== null) App.copy($('#ft' + c).textContent);
        var p = e.target.getAttribute('data-i');
        if (p !== null) { $('#ftC1').value = GRADIENTS[p][0]; $('#ftC2').value = GRADIENTS[p][1]; run(); }
      });
      $('#ftCss').onclick = function () { App.copy(css()); };
      run();
    }
  });

  /* ---------------- 去除重复项 ---------------- */
  App.register({
    id: 'dedupe', group: 'text', icon: '≡', title: '去除重复项',
    desc: '按行去除文本中的重复内容，支持排序、去空行', keywords: '去重 重复 行 排序',
    render: function (el) {
      el.innerHTML = '<div class="row"><label><input type="checkbox" id="ddTrim" checked>忽略首尾空格</label><label><input type="checkbox" id="ddEmpty" checked>删除空行</label><label><input type="checkbox" id="ddCase">忽略大小写</label>' +
        '<select id="ddSort" class="w-s" style="flex:0 0 140px"><option value="">保持原顺序</option><option value="asc">升序排列</option><option value="desc">降序排列</option></select>' +
        '<button class="btn" id="ddRun">去重</button><button class="btn ghost" id="ddCopy">复制结果</button></div>' +
        '<div class="cols"><div><label class="field-label">原始文本（每行一项）</label><textarea id="ddIn" style="min-height:360px">apple\nbanana\napple\norange\nBanana\n\nbanana</textarea></div>' +
        '<div><label class="field-label">结果 <span id="ddInfo" class="muted"></span></label><textarea id="ddOut" style="min-height:360px" readonly></textarea></div></div>';
      function run() {
        var lines = $('#ddIn').value.split(/\r?\n/), seen = {}, out = [];
        var trim = $('#ddTrim').checked, empty = $('#ddEmpty').checked, ic = $('#ddCase').checked;
        lines.forEach(function (l) {
          var v = trim ? l.trim() : l;
          if (empty && !v.trim()) return;
          var key = ic ? v.toLowerCase() : v;
          if (Object.prototype.hasOwnProperty.call(seen, key)) return;
          seen[key] = 1; out.push(v);
        });
        var sort = $('#ddSort').value;
        if (sort) { out.sort(function (a, b) { return a.localeCompare(b, 'zh-CN'); }); if (sort === 'desc') out.reverse(); }
        $('#ddOut').value = out.join('\n');
        $('#ddInfo').textContent = '原 ' + lines.length + ' 行 → ' + out.length + ' 行，移除 ' + (lines.length - out.length) + ' 行';
      }
      $('#ddRun').onclick = run;
      $('#ddCopy').onclick = function () { App.copy($('#ddOut').value); };
      run();
    }
  });

  /* ---------------- 字数统计 ---------------- */
  App.register({
    id: 'wordcount', group: 'text', icon: '123', title: '字数统计',
    desc: '统计字符、汉字、单词、行数，实时计数', keywords: '字数 字符 统计 计数',
    render: function (el) {
      el.innerHTML = '<textarea id="wcIn" placeholder="在此输入或粘贴文本…" style="min-height:280px"></textarea><div class="stats" id="wcStats"></div>';
      function run() {
        var t = $('#wcIn').value;
        var chars = Array.from(t).length;
        var noSpace = Array.from(t.replace(/\s/g, '')).length;
        var cjk = (t.match(/[\u4e00-\u9fa5\u3400-\u4dbf\uf900-\ufaff]/g) || []).length;
        var words = (t.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) || []).length;
        var nums = (t.match(/\d+(\.\d+)?/g) || []).length;
        var punct = (t.match(/[\u3000-\u303f\uff00-\uffef!-/:-@[-`{-~]/g) || []).length;
        var lines = t ? t.split(/\r?\n/).length : 0;
        var paras = t.split(/\n\s*\n|\n/).filter(function (p) { return p.trim(); }).length;
        var bytes = new TextEncoder().encode(t).length;
        var data = [['总字符', chars], ['不含空白', noSpace], ['汉字', cjk], ['英文单词', words], ['数字', nums], ['标点符号', punct], ['行数', lines], ['段落', paras], ['UTF-8 字节', bytes], ['字数(汉字+单词)', cjk + words]];
        $('#wcStats').innerHTML = data.map(function (d) { return '<div class="stat"><b>' + d[1] + '</b><span>' + d[0] + '</span></div>'; }).join('');
      }
      $('#wcIn').addEventListener('input', run);
      run();
    }
  });

  /* ---------------- 在线记事本 ---------------- */
  App.register({
    id: 'notepad', group: 'text', icon: '✎', title: '在线记事本',
    desc: '浏览器本地保存，自动存储，支持下载', keywords: '记事本 笔记 note',
    render: function (el) {
      el.innerHTML = '<div class="row"><button class="btn" id="npDl">下载 .txt</button><button class="btn ghost" id="npCopy">复制全部</button><button class="btn danger" id="npClear">清空</button><span class="muted" id="npStatus"></span></div>' +
        '<textarea id="npIn" style="min-height:460px;font-family:inherit;font-size:1rem" placeholder="在这里记录点什么…内容会自动保存到浏览器本地"></textarea>';
      var ta = $('#npIn'), timer;
      ta.value = localStorage.getItem('tool_notepad') || '';
      function status() {
        var at = localStorage.getItem('tool_notepad_at');
        $('#npStatus').textContent = (at ? '已自动保存 ' + new Date(+at).toLocaleTimeString() : '尚未保存') + ' · ' + Array.from(ta.value).length + ' 字';
      }
      ta.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () { localStorage.setItem('tool_notepad', ta.value); localStorage.setItem('tool_notepad_at', Date.now()); status(); }, 300);
      });
      $('#npDl').onclick = function () { App.download('notepad-' + new Date().toISOString().slice(0, 10) + '.txt', ta.value); };
      $('#npCopy').onclick = function () { App.copy(ta.value); };
      $('#npClear').onclick = function () { if (confirm('确定清空记事本吗？')) { ta.value = ''; localStorage.removeItem('tool_notepad'); localStorage.removeItem('tool_notepad_at'); status(); } };
      status();
    }
  });
})();
