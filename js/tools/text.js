(function () {
  'use strict';
  var $ = App.$, esc = App.esc;

  /* ===== 文本统计 ===== */
  App.register({
    id: 'textstat', group: 'text', icon: 'Σ', title: '文本统计', accepts: true,
    desc: '字符、汉字、单词、行数、字节数实时统计，估算阅读时长', kw: 'zstj 字数 统计 字符 计数 word count',
    render: function (el, ctx) {
      el.innerHTML = '<div class="pane"><div class="pane-body flush"><textarea id="in" data-persist placeholder="输入或粘贴文本…" style="min-height:300px"></textarea></div></div><div class="stats" id="stats"></div>';
      function run() {
        var t = $('#in', el).value, cjk = (t.match(/[\u3400-\u9fff\uf900-\ufaff]/g) || []).length, words = (t.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) || []).length;
        var d = [['总字符', Array.from(t).length], ['不含空白', Array.from(t.replace(/\s/g, '')).length], ['汉字', cjk], ['英文单词', words],
          ['数字', (t.match(/\d+(\.\d+)?/g) || []).length], ['标点', (t.match(/[\u3000-\u303f\uff00-\uffef!-/:-@[-`{-~]/g) || []).length],
          ['行数', t ? t.split(/\r?\n/).length : 0], ['段落', t.split(/\n+/).filter(function (p) { return p.trim(); }).length],
          ['UTF-8 字节', new TextEncoder().encode(t).length], ['阅读时长', Math.max(0, Math.ceil((cjk / 400) + (words / 220))) + ' 分钟']];
        $('#stats', el).innerHTML = d.map(function (x) { return '<div class="stat"><b>' + x[1] + '</b><span>' + x[0] + '</span></div>'; }).join('');
      }
      $('#in', el).addEventListener('input', run);
      ctx.persist(); if (ctx.input) $('#in', el).value = ctx.input; run();
    }
  });

  /* ===== 去重排序 ===== */
  App.register({
    id: 'dedupe', group: 'text', icon: '≡', title: '行处理', accepts: true,
    desc: '按行去重、排序、打乱、去空行、加前后缀，统计重复次数', kw: 'qc 去重 排序 重复 行 sort uniq',
    render: function (el, ctx) {
      el.innerHTML = '<div class="pane"><div class="pane-body"><div class="inline"><label class="check"><input type="checkbox" id="uniq" data-persist checked>去重</label><label class="check"><input type="checkbox" id="trim" data-persist checked>去首尾空白</label><label class="check"><input type="checkbox" id="empty" data-persist checked>删除空行</label><label class="check"><input type="checkbox" id="icase" data-persist>忽略大小写</label><label class="check"><input type="checkbox" id="count" data-persist>显示重复次数</label>' +
        '<select id="sort" class="w160" data-persist><option value="">保持顺序</option><option value="asc">升序</option><option value="desc">降序</option><option value="len">按长度</option><option value="rev">倒序</option><option value="shuffle">随机打乱</option></select></div>' +
        '<div class="inline"><input type="text" id="pre" placeholder="每行前缀" data-persist><input type="text" id="suf" placeholder="每行后缀" data-persist><input type="text" id="join" placeholder="合并分隔符（留空则换行）" data-persist></div></div></div>' +
        '<div class="grid2"><div class="pane"><div class="pane-head"><h3>输入</h3></div><div class="pane-body flush"><textarea id="in" data-persist style="min-height:380px">apple\nbanana\napple\n\norange\nBanana\nbanana</textarea></div></div>' +
        '<div class="pane"><div class="pane-head"><h3>结果</h3><span class="msg" id="info"></span><button class="btn sm" data-copy="#out">复制</button><button class="btn sm" data-send="#out">发送到 ▾</button></div><div class="pane-body flush"><textarea id="out" readonly style="min-height:380px"></textarea></div></div></div>';
      function run() {
        var lines = $('#in', el).value.split(/\r?\n/), ic = $('#icase', el).checked, cnt = {}, order = [], out = [];
        lines.forEach(function (l) {
          var v = $('#trim', el).checked ? l.trim() : l;
          if ($('#empty', el).checked && !v.trim()) return;
          var k = ic ? v.toLowerCase() : v;
          if (!(k in cnt)) { cnt[k] = 0; order.push([k, v]); } else if (!$('#uniq', el).checked) order.push([k, v]);
          cnt[k]++;
        });
        out = order.map(function (x) { return x; });
        var s = $('#sort', el).value, cmp = function (a, b) { return a[1].localeCompare(b[1], 'zh-CN'); };
        if (s === 'asc') out.sort(cmp); else if (s === 'desc') out.sort(cmp).reverse(); else if (s === 'len') out.sort(function (a, b) { return a[1].length - b[1].length; });
        else if (s === 'rev') out.reverse(); else if (s === 'shuffle') for (var i = out.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = out[i]; out[i] = out[j]; out[j] = t; }
        var pre = $('#pre', el).value, suf = $('#suf', el).value, sep = $('#join', el).value;
        $('#out', el).value = out.map(function (x) { return pre + x[1] + suf + ($('#count', el).checked ? '\t(' + cnt[x[0]] + ')' : ''); }).join(sep ? sep.replace(/\\n/g, '\n').replace(/\\t/g, '\t') : '\n');
        $('#info', el).textContent = lines.length + ' 行 → ' + out.length + ' 行';
      }
      el.addEventListener('input', run); el.addEventListener('change', run);
      ctx.persist(); if (ctx.input) $('#in', el).value = ctx.input; run();
    }
  });

  /* ===== 文本对比 ===== */
  function lcsDiff(a, b) {
    var n = a.length, m = b.length;
    if (n * m > 9e6) throw new Error('文本过大，请分段对比');
    var dp = []; for (var i = 0; i <= n; i++) dp.push(new Uint32Array(m + 1));
    for (i = n - 1; i >= 0; i--) for (var j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    var out = []; i = 0; j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) { out.push([' ', i, j]); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) out.push(['-', i++, -1]);
      else out.push(['+', -1, j++]);
    }
    while (i < n) out.push(['-', i++, -1]);
    while (j < m) out.push(['+', -1, j++]);
    return out;
  }
  App.register({
    id: 'diff', group: 'text', icon: '±', title: '文本对比', accepts: true,
    desc: '逐行比较两段文本，高亮新增与删除，可只看差异', kw: 'diff db 对比 差异 比较',
    render: function (el, ctx) {
      el.innerHTML = '<div class="grid2"><div class="pane"><div class="pane-head"><h3>原文</h3></div><div class="pane-body flush"><textarea id="a" data-persist style="min-height:200px">第一行\n第二行\n第三行\n第四行</textarea></div></div>' +
        '<div class="pane"><div class="pane-head"><h3>新文本</h3></div><div class="pane-body flush"><textarea id="b" data-persist style="min-height:200px">第一行\n第二行（已修改）\n第三行\n第五行</textarea></div></div></div>' +
        '<div class="pane"><div class="pane-head"><h3>差异</h3><span id="info" class="msg"></span><label class="check"><input type="checkbox" id="trim" data-persist>忽略首尾空白</label><label class="check"><input type="checkbox" id="icase" data-persist>忽略大小写</label><label class="check"><input type="checkbox" id="only" data-persist>只看差异</label></div><div class="pane-body flush" id="out" style="padding:8px 0;max-height:520px;overflow:auto"></div></div>';
      function run() {
        if (!el.isConnected) return;
        var norm = function (s) { if ($('#trim', el).checked) s = s.trim(); if ($('#icase', el).checked) s = s.toLowerCase(); return s; };
        var A = $('#a', el).value.split(/\r?\n/), B = $('#b', el).value.split(/\r?\n/), only = $('#only', el).checked;
        try {
          var r = lcsDiff(A.map(norm), B.map(norm)), add = 0, del = 0;
          $('#out', el).innerHTML = r.map(function (x) {
            if (x[0] === '+') add++; if (x[0] === '-') del++;
            if (only && x[0] === ' ') return '';
            var text = x[0] === '+' ? B[x[2]] : A[x[1]];
            return '<div class="diff-line ' + (x[0] === '+' ? 'diff-add' : x[0] === '-' ? 'diff-del' : '') + '"><span class="n">' + (x[1] >= 0 ? x[1] + 1 : '') + ' · ' + (x[2] >= 0 ? x[2] + 1 : '') + '</span><span>' + x[0] + ' ' + esc(text) + '</span></div>';
          }).join('');
          $('#info', el).innerHTML = add + del ? '<span class="ok">+' + add + '</span> <span class="err">-' + del + '</span>' : '<span class="ok">完全相同</span>';
        } catch (e) { $('#out', el).innerHTML = '<p class="err" style="padding:12px">' + esc(e.message) + '</p>'; }
      }
      var timer; el.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 250); }); el.addEventListener('change', run);
      ctx.persist(); if (ctx.input) $('#b', el).value = ctx.input; run();
    }
  });

  /* ===== 命名风格转换 ===== */
  function words(s) {
    return s.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').split(/[^A-Za-z0-9\u4e00-\u9fa5]+/).filter(Boolean).map(function (w) { return w.toLowerCase(); });
  }
  var CASES = [
    ['camelCase', function (w) { return w.map(function (x, i) { return i ? x[0].toUpperCase() + x.slice(1) : x; }).join(''); }],
    ['PascalCase', function (w) { return w.map(function (x) { return x[0].toUpperCase() + x.slice(1); }).join(''); }],
    ['snake_case', function (w) { return w.join('_'); }],
    ['CONSTANT_CASE', function (w) { return w.join('_').toUpperCase(); }],
    ['kebab-case', function (w) { return w.join('-'); }],
    ['dot.case', function (w) { return w.join('.'); }],
    ['path/case', function (w) { return w.join('/'); }],
    ['Title Case', function (w) { return w.map(function (x) { return x[0].toUpperCase() + x.slice(1); }).join(' '); }],
    ['Sentence case', function (w) { var s = w.join(' '); return s.charAt(0).toUpperCase() + s.slice(1); }],
    ['lower case', function (w) { return w.join(' '); }],
    ['UPPER CASE', function (w) { return w.join(' ').toUpperCase(); }]
  ];
  App.register({
    id: 'case', group: 'text', icon: 'aA', title: '命名风格转换', isNew: true, accepts: true,
    desc: 'camelCase / snake_case / kebab-case 等变量命名互转，支持多行批量', kw: 'mmfg 驼峰 下划线 命名 camel snake kebab case',
    render: function (el, ctx) {
      el.innerHTML = '<div class="pane"><div class="pane-head"><h3>输入（每行一个）</h3></div><div class="pane-body flush"><textarea id="in" data-persist style="min-height:120px">getUserInfo\nuser_profile_id\nHTTPRequestHandler</textarea></div></div>' +
        '<div class="pane"><div class="pane-body"><table class="kv" id="out"></table></div></div>';
      function run() {
        var lines = $('#in', el).value.split(/\r?\n/).filter(function (l) { return l.trim(); });
        $('#out', el).innerHTML = CASES.map(function (c, i) {
          var v = lines.map(function (l) { var w = words(l); return w.length ? c[1](w) : ''; }).join('\n');
          return '<tr><th>' + c[0] + '</th><td class="mono" style="white-space:pre-wrap" id="c' + i + '">' + esc(v) + '</td><td style="width:60px"><button class="btn sm" data-copy="#c' + i + '">复制</button></td></tr>';
        }).join('');
      }
      $('#in', el).addEventListener('input', run);
      ctx.persist(); if (ctx.input) $('#in', el).value = ctx.input; run();
    }
  });

  /* ===== 人民币大写 ===== */
  function rmb(input) {
    var s = String(input).replace(/[,，\s¥￥]/g, '');
    if (!/^-?\d+(\.\d+)?$/.test(s)) throw new Error('请输入合法的金额');
    var neg = s[0] === '-'; if (neg) s = s.slice(1);
    var parts = s.split('.'), ip = parts[0].replace(/^0+(?=\d)/, ''), dp = ((parts[1] || '') + '00').slice(0, 2);
    if (ip.length > 12) throw new Error('最多支持千亿级（12 位整数）');
    var D = '零壹贰叁肆伍陆柒捌玖', U = ['', '拾', '佰', '仟'], BU = ['', '万', '亿'], r = '';
    if (+ip > 0) {
      var z = 0;
      for (var i = 0; i < ip.length; i++) {
        var p = ip.length - i - 1, d = +ip[i], q = Math.floor(p / 4), m = p % 4;
        if (d === 0) z++; else { if (z > 0) r += '零'; z = 0; r += D[d] + U[m]; }
        if (m === 0 && z < 4) r += BU[q];
      }
      r += '元';
    }
    var j = +dp[0], f = +dp[1];
    if (!j && !f) return (neg ? '负' : '') + (r || '零元') + '整';
    if (j) r += D[j] + '角'; else if (r) r += '零';
    r += f ? D[f] + '分' : '整';
    return (neg ? '负' : '') + r;
  }
  App.register({
    id: 'rmb', group: 'text', icon: '¥', title: '人民币大写', accepts: true,
    desc: '数字金额转换为中文大写，适用于票据、合同', kw: 'rmb dx 金额 大写 财务',
    render: function (el, ctx) {
      el.innerHTML = '<div class="pane"><div class="pane-body"><div class="field"><label>金额</label><input type="text" id="in" data-persist value="1234567.89" style="font-size:20px;font-family:var(--mono)"></div>' +
        '<div class="field"><label>大写</label><div class="out big" id="out"></div></div><div class="inline"><button class="btn primary" data-copy="#out">复制大写</button><span class="msg" id="sm"></span></div></div></div>';
      function run() {
        var v = $('#in', el).value.trim(), o = $('#out', el);
        if (!v) { o.textContent = ''; return; }
        try { o.textContent = rmb(v); o.classList.remove('err'); var n = +v.replace(/[,，\s¥￥]/g, ''); $('#sm', el).textContent = isNaN(n) ? '' : '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
        catch (e) { o.textContent = e.message; o.classList.add('err'); }
      }
      $('#in', el).addEventListener('input', run);
      ctx.persist(); if (ctx.input) $('#in', el).value = ctx.input.trim(); run();
    }
  });

  /* ===== Markdown ===== */
  var MD = '# Markdown 编辑器\n\n左侧编辑，右侧**实时预览**，内容自动保存。\n\n- 支持 GFM 表格、任务列表\n- [x] 代码高亮块\n- `行内代码`\n\n```js\nconsole.log("千机匣");\n```\n\n> 引用文字\n\n| 工具 | 分类 |\n| --- | --- |\n| 二维码生成 | 二维码工坊 |\n';
  App.register({
    id: 'markdown', group: 'text', icon: 'MD', title: 'Markdown 编辑器', accepts: true,
    desc: '实时预览，导出 HTML / Markdown 文件', kw: 'markdown md bjq 编辑器 预览',
    scripts: ['vendor/marked.min.js', 'vendor/purify.min.js'],
    render: function (el, ctx) {
      el.innerHTML = '<div class="grid2"><div class="pane"><div class="pane-head"><h3>编辑</h3><button class="btn sm" id="dlmd">.md</button><button class="btn sm" id="dlhtml">.html</button></div><div class="pane-body flush"><textarea id="in" data-persist style="min-height:600px"></textarea></div></div>' +
        '<div class="pane"><div class="pane-head"><h3>预览</h3><button class="btn sm" id="cphtml">复制 HTML</button></div><div class="pane-body flush"><div class="md" id="out" style="height:600px"></div></div></div></div>';
      function html() { return DOMPurify.sanitize(marked.parse($('#in', el).value, { gfm: true, breaks: true })); }
      function run() { $('#out', el).innerHTML = html(); }
      $('#in', el).addEventListener('input', run);
      $('#cphtml', el).onclick = function () { App.copy(html()); };
      $('#dlmd', el).onclick = function () { App.download('document.md', $('#in', el).value); };
      $('#dlhtml', el).onclick = function () { App.download('document.html', '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Document</title></head><body>' + html() + '</body></html>', 'text/html'); };
      $('#in', el).value = MD; ctx.persist(); if (ctx.input) $('#in', el).value = ctx.input; run();
    }
  });
})();
