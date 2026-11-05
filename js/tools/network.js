(function () {
  'use strict';
  var $ = App.$, esc = App.escapeHtml;

  /* ---------------- WebSocket ---------------- */
  App.register({
    id: 'websocket', group: 'network', icon: 'WS', title: 'WebSocket工具',
    desc: '连接 WebSocket 服务器，实时发送与接收消息', keywords: 'websocket ws wss 调试',
    render: function (el) {
      el.innerHTML = '<div class="row"><input type="text" id="wsUrl" value="wss://echo.websocket.org"><button class="btn" id="wsConn">连接</button><button class="btn danger" id="wsClose">断开</button><span id="wsState" class="muted">未连接</span></div>' +
        '<div class="cols"><div><label class="field-label">发送消息</label><textarea id="wsMsg" style="min-height:160px">{"type":"ping"}</textarea><div class="row" style="margin-top:10px"><button class="btn" id="wsSend">发送</button><label><input type="checkbox" id="wsAuto">每</label><input type="number" id="wsInt" class="w-s" value="5" min="1"><label>秒自动发送</label></div></div>' +
        '<div><label class="field-label">消息日志 <button class="btn ghost sm" id="wsClear">清空</button></label><div class="output ws-log" id="wsLog"></div></div></div>';
      var ws = null, timer = null;
      function log(type, msg) {
        var color = { send: '#409eff', recv: '#67c23a', sys: '#999', err: '#f56c6c' }[type];
        var tag = { send: '↑ 发送', recv: '↓ 接收', sys: '● 系统', err: '✗ 错误' }[type];
        var d = document.createElement('div');
        d.innerHTML = '<span style="color:' + color + '">[' + new Date().toLocaleTimeString() + '] ' + tag + '</span> ' + esc(msg);
        $('#wsLog').appendChild(d); $('#wsLog').scrollTop = 1e9;
      }
      function state(s) { $('#wsState').textContent = s; }
      function close() { clearInterval(timer); if (ws) { ws.close(); ws = null; } }
      App.onLeave(close);
      $('#wsConn').onclick = function () {
        close();
        try { ws = new WebSocket($('#wsUrl').value.trim()); } catch (e) { return log('err', e.message); }
        state('连接中…');
        ws.onopen = function () { state('已连接'); log('sys', '连接成功 ' + ws.url); };
        ws.onmessage = function (e) { log('recv', typeof e.data === 'string' ? e.data : '[二进制数据 ' + (e.data.size || e.data.byteLength) + ' 字节]'); };
        ws.onerror = function () { log('err', '连接出错'); };
        ws.onclose = function (e) { state('已断开'); log('sys', '连接关闭 code=' + e.code); clearInterval(timer); };
      };
      $('#wsClose').onclick = close;
      function send() {
        if (!ws || ws.readyState !== 1) { log('err', '尚未连接'); return; }
        ws.send($('#wsMsg').value); log('send', $('#wsMsg').value);
      }
      $('#wsSend').onclick = send;
      $('#wsAuto').onchange = function () { clearInterval(timer); if (this.checked) timer = setInterval(send, Math.max(1, +$('#wsInt').value) * 1000); };
      $('#wsClear').onclick = function () { $('#wsLog').innerHTML = ''; };
    }
  });

  /* ---------------- Meta 标签生成 ---------------- */
  App.register({
    id: 'meta', group: 'network', icon: '<m>', title: 'Meta标签生成',
    desc: '快速生成网页 SEO Meta、Open Graph、Twitter 标签', keywords: 'meta seo og open graph twitter 标签',
    render: function (el) {
      var fields = [['title', '网页标题', '我的网站'], ['description', '网页描述', '这是一个很棒的网站'], ['keywords', '关键词（逗号分隔）', '工具,在线'], ['author', '作者', ''], ['url', '网页地址', 'https://example.com'], ['image', '分享图片 URL', ''], ['site', '网站名称', '']];
      el.innerHTML = '<div class="cols"><div>' + fields.map(function (f) { return '<label class="field-label">' + f[1] + '</label><input type="text" id="mt_' + f[0] + '" value="' + esc(f[2]) + '">'; }).join('') +
        '<div class="row" style="margin-top:12px"><label>robots</label><select id="mt_robots" class="w-s" style="flex:1"><option>index, follow</option><option>noindex, follow</option><option>index, nofollow</option><option>noindex, nofollow</option></select></div>' +
        '<div class="row"><label><input type="checkbox" id="mt_og" checked>Open Graph</label><label><input type="checkbox" id="mt_tw" checked>Twitter Card</label><label><input type="checkbox" id="mt_vp" checked>viewport</label></div>' +
        '</div><div><label class="field-label">生成结果</label><textarea id="mtOut" style="min-height:440px" readonly></textarea><div class="row" style="margin-top:10px"><button class="btn" id="mtCopy">复制代码</button></div></div></div>';
      function v(k) { return esc($('#mt_' + k).value.trim()); }
      function run() {
        var o = ['<meta charset="UTF-8">'];
        if ($('#mt_vp').checked) o.push('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
        if (v('title')) o.push('<title>' + v('title') + '</title>');
        if (v('description')) o.push('<meta name="description" content="' + v('description') + '">');
        if (v('keywords')) o.push('<meta name="keywords" content="' + v('keywords') + '">');
        if (v('author')) o.push('<meta name="author" content="' + v('author') + '">');
        o.push('<meta name="robots" content="' + v('robots') + '">');
        if (v('url')) o.push('<link rel="canonical" href="' + v('url') + '">');
        if ($('#mt_og').checked) {
          o.push('', '<!-- Open Graph -->', '<meta property="og:type" content="website">');
          ['title', 'description', 'url', 'image'].forEach(function (k) { if (v(k)) o.push('<meta property="og:' + k + '" content="' + v(k) + '">'); });
          if (v('site')) o.push('<meta property="og:site_name" content="' + v('site') + '">');
        }
        if ($('#mt_tw').checked) {
          o.push('', '<!-- Twitter -->', '<meta name="twitter:card" content="' + (v('image') ? 'summary_large_image' : 'summary') + '">');
          ['title', 'description', 'image'].forEach(function (k) { if (v(k)) o.push('<meta name="twitter:' + k + '" content="' + v(k) + '">'); });
        }
        $('#mtOut').value = o.join('\n');
      }
      el.addEventListener('input', run); el.addEventListener('change', run);
      $('#mtCopy').onclick = function () { App.copy($('#mtOut').value); };
      run();
    }
  });

  /* ---------------- IP 归属地 ---------------- */
  App.register({
    id: 'ip', group: 'network', icon: 'IP', title: 'IP 归属地查询',
    desc: '查询 IP 地址的地理位置、运营商等信息', keywords: 'ip 归属地 地理位置 查询',
    render: function (el) {
      el.innerHTML = '<div class="row"><input type="text" id="ipIn" placeholder="输入 IPv4 / IPv6 地址，留空查询本机公网 IP"><button class="btn" id="ipGo">查询</button></div>' +
        '<div id="ipOut"></div><p class="muted" style="margin-top:10px">数据来源：ipwho.is / ipapi.co 公共接口（由浏览器直接请求）。</p>';
      function render(d) {
        var rows = [['IP 地址', d.ip], ['国家/地区', d.country], ['省份', d.region], ['城市', d.city], ['运营商', d.isp], ['ASN', d.asn], ['经纬度', d.lat != null ? d.lat + ', ' + d.lon : ''], ['时区', d.tz]];
        $('#ipOut').innerHTML = '<table class="kv">' + rows.map(function (r) { return '<tr><th>' + r[0] + '</th><td>' + esc(r[1] == null || r[1] === '' ? '-' : r[1]) + '</td></tr>'; }).join('') + '</table>';
      }
      function viaIpwho(ip) {
        return fetch('https://ipwho.is/' + encodeURIComponent(ip) + '?lang=zh-CN').then(function (r) { return r.json(); }).then(function (j) {
          if (!j.success) throw new Error(j.message || '查询失败');
          return { ip: j.ip, country: j.country, region: j.region, city: j.city, isp: j.connection && (j.connection.isp || j.connection.org), asn: j.connection && j.connection.asn && 'AS' + j.connection.asn, lat: j.latitude, lon: j.longitude, tz: j.timezone && j.timezone.id };
        });
      }
      function viaIpapi(ip) {
        return fetch('https://ipapi.co/' + (ip ? encodeURIComponent(ip) + '/' : '') + 'json/').then(function (r) { return r.json(); }).then(function (j) {
          if (j.error) throw new Error(j.reason || '查询失败');
          return { ip: j.ip, country: j.country_name, region: j.region, city: j.city, isp: j.org, asn: j.asn, lat: j.latitude, lon: j.longitude, tz: j.timezone };
        });
      }
      $('#ipGo').onclick = function () {
        var ip = $('#ipIn').value.trim();
        if (ip && !/^[\d.]+$|^[0-9a-f:]+$/i.test(ip)) { $('#ipOut').innerHTML = '<p class="error">IP 地址格式不正确</p>'; return; }
        $('#ipOut').innerHTML = '<p class="muted">查询中…</p>';
        viaIpwho(ip).catch(function () { return viaIpapi(ip); }).then(render).catch(function (e) {
          $('#ipOut').innerHTML = '<p class="error">查询失败：' + esc(e.message) + '</p>';
        });
      };
      $('#ipGo').click();
    }
  });
})();
