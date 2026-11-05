(function () {
  'use strict';
  var $ = App.$, $$ = App.$$, esc = App.escapeHtml;
  var home = $('#home'), view = $('#toolView');

  function renderHome() {
    var nav = $('#groupNav'), wrap = $('#groups');
    nav.innerHTML = '<a data-g="all" class="active">全部</a>' + App.groups.map(function (g) {
      return '<a data-g="' + g.id + '">' + esc(g.title) + '</a>';
    }).join('');
    wrap.innerHTML = App.groups.map(function (g) {
      var list = App.tools.filter(function (t) { return t.group === g.id; });
      return '<section class="group" data-group="' + g.id + '">' +
        '<div class="group-header"><span class="group-title">' + esc(g.title) + '</span>' +
        '<span class="group-count">' + list.length + ' 个工具</span></div>' +
        '<div class="tools-grid">' + list.map(card).join('') + '</div></section>';
    }).join('');
    $('#toolCount').textContent = '共收录 ' + App.tools.length + ' 个工具';

    nav.addEventListener('click', function (e) {
      var a = e.target.closest('a[data-g]');
      if (!a) return;
      $$('a', nav).forEach(function (x) { x.classList.toggle('active', x === a); });
      var g = a.getAttribute('data-g');
      $$('.group', wrap).forEach(function (s) {
        s.classList.toggle('hidden', g !== 'all' && s.getAttribute('data-group') !== g);
      });
    });

    var input = $('#search'), clear = $('#clearSearch');
    input.addEventListener('input', filter);
    clear.addEventListener('click', function () { input.value = ''; filter(); input.focus(); });
    function filter() {
      var q = input.value.trim().toLowerCase();
      clear.style.display = q ? 'block' : 'none';
      var any = false;
      $$('.group', wrap).forEach(function (s) {
        var visible = 0;
        $$('.tool-card', s).forEach(function (c) {
          var hit = !q || c.getAttribute('data-search').indexOf(q) !== -1;
          c.classList.toggle('hidden', !hit);
          if (hit) visible++;
        });
        s.classList.toggle('hidden', visible === 0);
        if (visible) any = true;
      });
      if (q) $$('a', nav).forEach(function (x) { x.classList.toggle('active', x.getAttribute('data-g') === 'all'); });
      $('#noResult').style.display = any ? 'none' : 'block';
    }
  }

  function card(t) {
    var search = (t.title + ' ' + t.desc + ' ' + (t.keywords || '')).toLowerCase();
    return '<a class="tool-card" href="#/' + t.id + '" data-search="' + esc(search) + '">' +
      (t.isNew ? '<span class="tool-new">NEW</span>' : '') +
      '<div class="tool-icon">' + esc(t.icon) + '</div>' +
      '<div class="tool-title">' + esc(t.title) + '</div>' +
      '<div class="tool-desc">' + esc(t.desc) + '</div></a>';
  }

  var routeToken = 0;
  function route() {
    App.runCleanups();
    var token = ++routeToken;
    var id = location.hash.replace(/^#\/?/, '').split('?')[0];
    var tool = App.tools.find(function (t) { return t.id === id; });
    if (!tool) {
      home.classList.remove('hidden');
      view.classList.add('hidden');
      document.title = '在线工具集 - 纯前端实用工具大全';
      return;
    }
    home.classList.add('hidden');
    view.classList.remove('hidden');
    $('#toolTitle').textContent = tool.title;
    $('#toolDesc').textContent = tool.desc;
    document.title = tool.title + ' - 在线工具集';
    var body = $('#toolBody');
    body.innerHTML = '<p class="muted">加载中…</p>';
    window.scrollTo(0, 0);
    Promise.all((tool.scripts || []).map(App.loadScript)).then(function () {
      if (token !== routeToken) return;
      body.innerHTML = '';
      // Fresh host per visit so listeners bound by a tool are dropped when leaving it.
      var host = document.createElement('div');
      body.appendChild(host);
      tool.render(host);
    }).catch(function (err) {
      body.innerHTML = '<p class="error">' + esc(err.message) + '</p>';
    });
  }

  $('#year').textContent = new Date().getFullYear();
  renderHome();
  window.addEventListener('hashchange', route);
  route();
})();
