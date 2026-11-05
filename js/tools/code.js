(function () {
  'use strict';
  var $ = App.$, esc = App.escapeHtml;

  /* ---------------- 代码压缩 ---------------- */
  function minifyCss(s) {
    return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{}:;,>~+])\s*/g, '$1').replace(/;}/g, '}').trim();
  }
  function minifyHtml(s) {
    return s.replace(/<!--(?!\[if)[\s\S]*?-->/g, '')
      .replace(/(<(script|style)[^>]*>)([\s\S]*?)(<\/\2>)/gi, function (m, open, tag, body, close) {
        return open + '\u0000' + encodeURIComponent(tag.toLowerCase() === 'style' ? minifyCss(body) : body.trim()) + '\u0000' + close;
      })
      .replace(/(<pre[\s\S]*?<\/pre>)|\s+/gi, function (m, pre) { return pre || ' '; })
      .replace(/>\s+</g, '><').replace(/\u0000([^\u0000]*)\u0000/g, function (m, b) { return decodeURIComponent(b); }).trim();
  }
  App.register({
    id: 'minify', group: 'code', icon: '</>', title: '代码压缩工具',
    desc: '压缩 JavaScript、CSS、HTML 代码，减小文件体积', keywords: 'minify 压缩 js css html uglify terser',
    render: function (el) {
      el.innerHTML = '<div class="tabs" id="mnTabs"><button data-t="js" class="active">JavaScript</button><button data-t="css">CSS</button><button data-t="html">HTML</button></div>' +
        '<div class="row"><button class="btn" id="mnRun">压缩</button><label id="mnMangleWrap"><input type="checkbox" id="mnMangle" checked>混淆变量名</label><button class="btn ghost" id="mnCopy">复制结果</button><span id="mnInfo" class="muted"></span></div>' +
        '<div class="cols"><textarea id="mnIn" style="min-height:420px" placeholder="粘贴代码">// 示例\nfunction greet(name) {\n  var message = "Hello, " + name + "!";\n  console.log(message);\n  return message;\n}\ngreet("World");</textarea><textarea id="mnOut" style="min-height:420px" readonly></textarea></div>';
      var type = 'js';
      $('#mnTabs').addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        App.$$('#mnTabs button').forEach(function (x) { x.classList.toggle('active', x === b); });
        type = b.getAttribute('data-t');
        $('#mnMangleWrap').classList.toggle('hidden', type !== 'js');
      });
      function done(out) {
        var a = new Blob([$('#mnIn').value]).size, b = new Blob([out]).size;
        $('#mnOut').value = out;
        $('#mnInfo').innerHTML = App.formatBytes(a) + ' → ' + App.formatBytes(b) + '，减少 <b class="ok">' + (a ? ((1 - b / a) * 100).toFixed(1) : 0) + '%</b>';
      }
      $('#mnRun').onclick = function () {
        var src = $('#mnIn').value;
        if (type === 'css') return done(minifyCss(src));
        if (type === 'html') return done(minifyHtml(src));
        $('#mnInfo').textContent = '压缩中…';
        App.loadScript('vendor/terser.bundle.min.js').then(function () {
          return Terser.minify(src, { mangle: $('#mnMangle').checked, compress: true });
        }).then(function (r) { done(r.code || ''); }).catch(function (e) {
          $('#mnInfo').innerHTML = '<span class="error">语法错误：' + esc(e.message) + (e.line ? '（第 ' + e.line + ' 行）' : '') + '</span>';
        });
      };
      $('#mnCopy').onclick = function () { App.copy($('#mnOut').value); };
    }
  });

  /* ---------------- 正则表达式生成 ---------------- */
  var PATTERNS = [
    ['手机号（中国大陆）', '^1[3-9]\\d{9}$', '13812345678'],
    ['固定电话', '^(0\\d{2,3}-?)?\\d{7,8}$', '010-12345678'],
    ['邮箱', '^[\\w.+-]+@[\\w-]+(\\.[\\w-]+)+$', 'name@example.com'],
    ['身份证号（18位）', '^[1-9]\\d{5}(18|19|20)\\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]$', '11010519491231002X'],
    ['网址 URL', '^https?:\\/\\/[\\w-]+(\\.[\\w-]+)+(:\\d+)?(\\/[^\\s]*)?$', 'https://example.com/path?q=1'],
    ['IPv4 地址', '^((25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)\\.){3}(25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)$', '192.168.1.1'],
    ['IPv6 地址', '^([\\da-fA-F]{1,4}:){7}[\\da-fA-F]{1,4}$', '2001:0db8:85a3:0000:0000:8a2e:0370:7334'],
    ['邮政编码', '^[1-9]\\d{5}$', '100080'],
    ['QQ 号', '^[1-9]\\d{4,10}$', '10001'],
    ['微信号', '^[a-zA-Z][-_a-zA-Z0-9]{5,19}$', 'wxid_abc123'],
    ['车牌号', '^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼][A-HJ-NP-Z][A-HJ-NP-Z0-9]{4,5}[A-HJ-NP-Z0-9挂学警港澳]$', '京A12345'],
    ['汉字', '^[\\u4e00-\\u9fa5]+$', '中文'],
    ['用户名（字母开头 4-16 位）', '^[a-zA-Z][a-zA-Z0-9_]{3,15}$', 'user_01'],
    ['强密码（大小写+数字+特殊字符 8 位以上）', '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^\\w\\s]).{8,}$', 'Abc@1234'],
    ['日期 YYYY-MM-DD', '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$', '2026-11-05'],
    ['时间 HH:mm:ss', '^([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d$', '23:59:59'],
    ['十六进制颜色', '^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$', '#667eea'],
    ['整数', '^-?\\d+$', '-123'],
    ['正整数', '^[1-9]\\d*$', '42'],
    ['浮点数', '^-?\\d+\\.\\d+$', '3.14'],
    ['金额（最多两位小数）', '^(0|[1-9]\\d*)(\\.\\d{1,2})?$', '99.90'],
    ['HTML 标签', '<([a-zA-Z][\\w-]*)[^>]*>([\\s\\S]*?)<\\/\\1>', '<div>hi</div>'],
    ['空白行', '^\\s*$', ''],
    ['首尾空白', '^\\s+|\\s+$', '  text  ']
  ];
  App.register({
    id: 'regexgen', group: 'code', icon: '.*', title: '正则表达式生成',
    desc: '常用正则一键生成，自定义规则组合，附多语言代码', keywords: 'regex 正则 生成 手机号 邮箱 身份证',
    render: function (el) {
      el.innerHTML = '<div class="cols"><div><label class="field-label">常用正则</label><select id="rgList" size="14" style="height:auto">' +
        PATTERNS.map(function (p, i) { return '<option value="' + i + '"' + (i === 0 ? ' selected' : '') + '>' + p[0] + '</option>'; }).join('') + '</select>' +
        '<h3 style="margin:16px 0 8px;font-size:1rem">自定义组合</h3>' +
        '<div class="row"><label><input type="checkbox" class="rgc" value="a-z" checked>小写字母</label><label><input type="checkbox" class="rgc" value="A-Z" checked>大写字母</label><label><input type="checkbox" class="rgc" value="0-9" checked>数字</label><label><input type="checkbox" class="rgc" value="_">下划线</label><label><input type="checkbox" class="rgc" value="\\u4e00-\\u9fa5">汉字</label></div>' +
        '<div class="row"><label>额外字符</label><input type="text" id="rgExtra" placeholder="如 .-@"><label>长度</label><input type="number" id="rgMin" class="w-s" value="6" min="0"><span>~</span><input type="number" id="rgMax" class="w-s" value="18" min="0"><button class="btn sm" id="rgBuild">生成</button></div>' +
        '</div><div><label class="field-label">正则表达式</label><div class="output" id="rgOut" style="font-size:1rem"></div>' +
        '<div class="row" style="margin-top:8px"><button class="btn sm" id="rgCopy">复制</button><a class="btn ghost sm" id="rgTest">去测试 →</a></div>' +
        '<label class="field-label">测试文本</label><input type="text" id="rgSample"><div id="rgResult" style="margin-top:6px"></div>' +
        '<label class="field-label" style="margin-top:12px">代码示例</label><div class="output" id="rgCode"></div></div></div>';
      var current = '';
      function set(re, sample) {
        current = re;
        $('#rgOut').textContent = '/' + re + '/';
        if (sample !== undefined) $('#rgSample').value = sample;
        $('#rgTest').href = '#/regex?p=' + encodeURIComponent(re);
        var jsRe = '/' + re.replace(/\//g, '\\/') + '/';
        $('#rgCode').textContent = 'JavaScript:  ' + jsRe + '.test(str)\nPHP:         preg_match(\'' + jsRe.replace(/'/g, "\\'") + 'u\', $str)\nPython:      re.match(r\'' + re + '\', s)\nJava:        Pattern.matches("' + re.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '", str)';
        test();
      }
      function test() {
        try {
          var ok = new RegExp(current, 'u').test($('#rgSample').value);
          $('#rgResult').innerHTML = ok ? '<span class="ok">✓ 匹配</span>' : '<span class="error">✗ 不匹配</span>';
        } catch (e) { $('#rgResult').innerHTML = '<span class="error">' + esc(e.message) + '</span>'; }
      }
      $('#rgList').addEventListener('change', function () { var p = PATTERNS[this.value]; set(p[1], p[2]); });
      $('#rgSample').addEventListener('input', test);
      $('#rgBuild').onclick = function () {
        var cls = App.$$('.rgc', el).filter(function (c) { return c.checked; }).map(function (c) { return c.value; }).join('');
        cls += $('#rgExtra').value.replace(/[\]\\^-]/g, '\\$&');
        if (!cls) return App.toast('请至少选择一种字符');
        var min = $('#rgMin').value, max = $('#rgMax').value;
        set('^[' + cls + ']{' + (min || 0) + ',' + (max || '') + '}$');
      };
      $('#rgCopy').onclick = function () { App.copy(current); };
      set(PATTERNS[0][1], PATTERNS[0][2]);
    }
  });

  /* ---------------- 正则表达式测试 ---------------- */
  App.register({
    id: 'regex', group: 'code', icon: '/re/', title: '正则表达式测试',
    desc: '在线测试正则匹配效果，高亮显示、分组提取与替换', keywords: 'regex 正则 测试 匹配 替换',
    render: function (el) {
      var preset = (location.hash.match(/[?&]p=([^&]*)/) || [])[1];
      el.innerHTML = '<div class="row"><span style="font-size:1.3rem;color:#999">/</span><input type="text" id="rxPat" value="' + esc(preset ? decodeURIComponent(preset) : '(\\w+)@(\\w+)\\.com') + '" style="font-family:Consolas,monospace"><span style="font-size:1.3rem;color:#999">/</span><input type="text" id="rxFlags" class="w-s" value="g" placeholder="flags" style="flex:0 0 80px"></div>' +
        '<div class="row"><label><input type="checkbox" data-f="g" checked>g 全局</label><label><input type="checkbox" data-f="i">i 忽略大小写</label><label><input type="checkbox" data-f="m">m 多行</label><label><input type="checkbox" data-f="s">s 点匹配换行</label><label><input type="checkbox" data-f="u">u Unicode</label></div>' +
        '<div class="cols"><div><label class="field-label">测试文本</label><textarea id="rxText" style="min-height:220px">联系我们：admin@example.com, support@test.com\nfoo@bar.org 不会匹配</textarea>' +
        '<label class="field-label">替换为（可用 $1、$2…）</label><input type="text" id="rxRep" value="[$1 at $2]"><label class="field-label">替换结果</label><div class="output" id="rxRepOut"></div></div>' +
        '<div><label class="field-label">匹配高亮 <span id="rxCount" class="muted"></span></label><div class="output" id="rxHl" style="min-height:120px"></div>' +
        '<label class="field-label">匹配详情</label><div id="rxList" class="output" style="max-height:300px;overflow:auto"></div></div></div>';
      function flags() { return $('#rxFlags').value.replace(/[^gimsuy]/g, ''); }
      function syncChecks() { var f = flags(); App.$$('[data-f]', el).forEach(function (c) { c.checked = f.indexOf(c.getAttribute('data-f')) >= 0; }); }
      function run() {
        var text = $('#rxText').value, re;
        try { re = new RegExp($('#rxPat').value, flags()); }
        catch (e) { $('#rxHl').innerHTML = '<span class="error">' + esc(e.message) + '</span>'; $('#rxList').textContent = ''; $('#rxCount').textContent = ''; $('#rxRepOut').textContent = ''; return; }
        var matches = [];
        if (re.global) {
          var m, guard = 0;
          while ((m = re.exec(text)) && guard++ < 10000) { matches.push(m); if (m[0] === '') re.lastIndex++; }
        } else { var one = re.exec(text); if (one) matches.push(one); }
        var html = '', last = 0;
        matches.forEach(function (m) { html += esc(text.slice(last, m.index)) + '<mark>' + esc(m[0]) + '</mark>'; last = m.index + m[0].length; });
        $('#rxHl').innerHTML = html + esc(text.slice(last));
        $('#rxCount').textContent = '共 ' + matches.length + ' 处';
        $('#rxList').innerHTML = matches.length ? matches.map(function (m, i) {
          return '<div><b>#' + (i + 1) + '</b> 位置 ' + m.index + '：' + esc(m[0]) + (m.length > 1 ? '<br>' + m.slice(1).map(function (g, gi) { return '&nbsp;&nbsp;$' + (gi + 1) + ' = ' + esc(g === undefined ? 'undefined' : g); }).join('<br>') : '') + '</div>';
        }).join('') : '<span class="muted">无匹配</span>';
        $('#rxRepOut').textContent = text.replace(new RegExp($('#rxPat').value, flags()), $('#rxRep').value);
      }
      el.addEventListener('input', function (e) {
        if (e.target.hasAttribute('data-f')) {
          var f = App.$$('[data-f]', el).filter(function (c) { return c.checked; }).map(function (c) { return c.getAttribute('data-f'); }).join('');
          $('#rxFlags').value = f;
        } else if (e.target.id === 'rxFlags') syncChecks();
        run();
      });
      syncChecks(); run();
    }
  });

  /* ---------------- 文本差异对比 ---------------- */
  function diffLines(a, b) {
    var n = a.length, m = b.length;
    if (n * m > 4e6) throw new Error('文本过大，请分段对比');
    var dp = [];
    for (var i = 0; i <= n; i++) { dp.push(new Uint32Array(m + 1)); }
    for (i = n - 1; i >= 0; i--) for (var j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
    var out = []; i = 0; j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) { out.push([' ', a[i], i + 1, j + 1]); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push(['-', a[i], i + 1, '']); i++; }
      else { out.push(['+', b[j], '', j + 1]); j++; }
    }
    while (i < n) { out.push(['-', a[i], i + 1, '']); i++; }
    while (j < m) { out.push(['+', b[j], '', j + 1]); j++; }
    return out;
  }
  App.register({
    id: 'diff', group: 'code', icon: '±', title: '文本差异对比',
    desc: '逐行对比两段文本差异，高亮增删内容', keywords: 'diff 对比 差异 比较',
    render: function (el) {
      el.innerHTML = '<div class="cols"><div><label class="field-label">原文本</label><textarea id="dfA">第一行\n第二行\n第三行\n第四行</textarea></div><div><label class="field-label">新文本</label><textarea id="dfB">第一行\n第二行（已修改）\n第三行\n第五行</textarea></div></div>' +
        '<div class="row" style="margin-top:12px"><button class="btn" id="dfRun">对比</button><label><input type="checkbox" id="dfTrim">忽略首尾空白</label><label><input type="checkbox" id="dfCase">忽略大小写</label><span id="dfInfo" class="muted"></span></div>' +
        '<div class="preview-box" id="dfOut" style="padding:8px 0"></div>';
      $('#dfRun').onclick = function () {
        var norm = function (s) { if ($('#dfTrim').checked) s = s.trim(); if ($('#dfCase').checked) s = s.toLowerCase(); return s; };
        var A = $('#dfA').value.split(/\r?\n/), B = $('#dfB').value.split(/\r?\n/);
        try {
          var res = diffLines(A.map(norm), B.map(norm)), add = 0, del = 0;
          $('#dfOut').innerHTML = res.map(function (r) {
            var text = r[0] === '+' ? B[r[3] - 1] : A[r[2] - 1];
            if (r[0] === '+') add++; if (r[0] === '-') del++;
            var cls = r[0] === '+' ? 'diff-add' : r[0] === '-' ? 'diff-del' : 'diff-ctx';
            return '<div class="diff-line ' + cls + '"><span class="muted" style="display:inline-block;width:80px">' + r[2] + ' ' + r[3] + '</span>' + r[0] + ' ' + esc(text) + '</div>';
          }).join('');
          $('#dfInfo').innerHTML = '<span class="ok">+' + add + ' 行</span> <span class="error">-' + del + ' 行</span>' + (add + del === 0 ? ' · 两段文本完全相同' : '');
        } catch (e) { $('#dfOut').innerHTML = '<p class="error" style="padding:8px">' + esc(e.message) + '</p>'; }
      };
      $('#dfRun').click();
    }
  });
})();
