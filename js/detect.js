(function () {
  'use strict';
  // Guess what a pasted value is and suggest tools: returns [{id, why}] best first.
  function detectText(raw) {
    var t = raw.trim(), out = [];
    if (!t) return out;
    function add(id, why) { if (!out.some(function (o) { return o.id === id; })) out.push({ id: id, why: why }); }
    var oneLine = t.indexOf('\n') < 0;

    if (/^eyJ[\w-]+\.eyJ[\w-]+\.[\w-]*$/.test(t)) add('jwt', 'JWT 令牌');
    if (/^[\[{]/.test(t)) { try { JSON.parse(t); add('json', 'JSON 数据'); } catch (e) { add('json', '疑似 JSON（有语法错误）'); } }
    if (/^(a:\d+:\{|O:\d+:"|s:\d+:"|i:-?\d+;|b:[01];)/.test(t)) add('unserialize', 'PHP 序列化数据');
    if (oneLine && /^\d{10}(\d{3})?$/.test(t)) add('timestamp', 'Unix 时间戳');
    if (oneLine && /^\d{4}[-/]\d{1,2}[-/]\d{1,2}([ T]\d{1,2}:\d{2}(:\d{2})?)?$/.test(t)) add('timestamp', '日期时间');
    if (oneLine && /^([\d*\/,\-?LW#]+|[A-Z]{3})(\s+([\d*\/,\-?LW#]+|[A-Z]{3}(-[A-Z]{3})?)){4,5}$/i.test(t) && /[*\/]/.test(t)) add('cron', 'Cron 表达式');
    if (oneLine && /^(#[0-9a-f]{3}|#[0-9a-f]{6}|#[0-9a-f]{8}|rgba?\(.+\)|hsla?\(.+\))$/i.test(t)) add('color', '颜色值');
    if (oneLine && /^https?:\/\/\S+$/i.test(t)) { add('urlparse', '网址，可解析参数'); add('qrgen', '网址，可生成二维码'); }
    if (/^data:image\/[\w+.-]+;base64,/.test(t)) add('img2b64', '图片 Base64');
    if (/%[0-9a-f]{2}/i.test(t)) add('textcodec', 'URL 编码文本');
    if (/\\u[0-9a-f]{4}|&#x?[0-9a-f]+;|&(amp|lt|gt|quot);/i.test(t)) add('textcodec', 'Unicode / HTML 转义');
    if (oneLine && t.length >= 8 && t.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(t) && /[a-z]/.test(t) && /[A-Z0-9+/]/.test(t)) {
      try {
        var bin = atob(t), buf = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        new TextDecoder('utf-8', { fatal: true }).decode(buf);
        add('base64', 'Base64 编码');
      } catch (e) { /* not text base64 */ }
    }
    if (oneLine && /^-?\d+(\.\d{1,2})?$/.test(t.replace(/,/g, '')) && t.length < 16) { add('rmb', '数字金额'); add('radix', '数字，可转换进制'); }
    if (oneLine && /^(0x[0-9a-f]+|0b[01]+)$/i.test(t)) add('radix', '进制数');
    if (oneLine && !/^eyJ/.test(t) && /^[A-Za-z][A-Za-z0-9]*([_\-.][A-Za-z0-9]+)+$|^[a-z]+([A-Z][a-z0-9]*)+$|^([A-Z][a-z0-9]+){2,}$/.test(t)) add('case', '标识符，可转换命名风格');
    if (/^#{1,6} |\n#{1,6} |\*\*.+\*\*|\n- |```/.test(t)) add('markdown', 'Markdown 文本');
    if (!oneLine && t.split('\n').length > 2) add('dedupe', '多行文本，可去重排序');
    add('textstat', '统计字数');
    add('hash', '计算哈希');
    if (t.length < 1200) add('qrgen', '生成二维码');
    return out;
  }

  function detectFile(file) {
    var out = [], name = file.name || '';
    if (/^image\//.test(file.type)) {
      out.push({ id: 'qrdecode', why: '识别图片中的二维码' });
      out.push({ id: 'imgcompress', why: '压缩 / 转换格式' });
      out.push({ id: 'img2b64', why: '转为 Base64' });
    }
    if (/\.(xlsx|xls|csv|ods)$/i.test(name)) out.push({ id: 'excel', why: '表格转 JSON' });
    out.push({ id: 'hash', why: '计算文件哈希' });
    out.push({ id: 'base64', why: '文件转 Base64' });
    return out;
  }

  App.detectText = detectText;
  App.detectFile = detectFile;
})();
