# 千机匣 Toolbox

纯前端的开发者工作台：粘贴任意内容自动识别并推荐工具，工具之间可以串联，所有数据只在浏览器本地处理。

在线访问：https://buhuiphp.github.io/online-tools/

## 特色

- **智能识别**：首页粘贴 JSON、JWT、时间戳、网址、Base64、Cron、颜色值，或拖入/粘贴图片、Excel，自动推荐合适的工具
- **工具串联**：任意结果点「发送到 ▾」交给下一个工具继续处理（如 JSON → 二维码）
- **命令面板**：`Ctrl K` 或 `/` 快速搜索工具，支持拼音首字母（如 `ewm` → 二维码）
- **记住状态**：收藏、最近使用，工具输入自动保存到 localStorage
- **深色 / 浅色主题**，移动端自适应

## 工具（26 个）

| 分类 | 工具 |
| --- | --- |
| 二维码工坊 | 二维码生成（文本/WiFi/名片/邮件/短信/位置，渐变、圆角、圆点、Logo、PNG/SVG、本地校验）· 二维码解码（图片/拖拽/粘贴/摄像头，UTF-8 与 GBK）· 批量生成打包 ZIP |
| 编码解码 | Base64（文本/文件）· 文本编解码（URL/Unicode/HTML/Hex/二进制）· 哈希（MD5/SHA/SHA3/HMAC/文件）· JWT 解析与 HS256 校验 |
| 数据处理 | JSON 工作台（格式化/树形/TypeScript 类型）· Excel/CSV 转 JSON/SQL · PHP 序列化 · 进制转换 · URL 解析 |
| 文本工具 | 文本统计 · 行处理（去重/排序/打乱/前后缀）· 文本对比 · 命名风格转换 · 人民币大写 · Markdown 编辑器 |
| 开发辅助 | 时间戳 · ID 生成（UUID v4/v7、NanoID、ULID、ObjectId）· 密码生成器 · 正则测试 · Cron 解析 · 颜色与对比度 |
| 图像处理 | 图片压缩转换 · 图片 Base64 |

## 本地运行

无需构建：

```bash
python3 -m http.server 8080   # 打开 http://localhost:8080
```

## 结构

```
index.html        应用外壳（侧边栏 / 顶栏 / 命令面板）
css/style.css     设计系统（CSS 变量，深浅主题）
js/core.js        注册表、存储、按需加载、工具间传值
js/detect.js      粘贴内容 / 文件类型识别
js/app.js         路由、首页、命令面板、发送到菜单
js/tools/*.js     各分类工具
vendor/           第三方库（按需加载）
```

新增工具：

```js
App.register({
  id: 'demo', group: 'dev', icon: 'DM', title: '示例', desc: '说明', kw: '拼音首字母 关键词',
  accepts: true,               // 可接收其他工具「发送到」的文本
  scripts: ['vendor/x.js'],    // 可选，按需加载
  render: function (el, ctx) { /* ctx.input / ctx.file / ctx.persist() */ }
});
```

## 第三方库

[qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) · [jsQR](https://github.com/cozmo/jsQR) · [JSZip](https://github.com/Stuk/jszip) · [marked](https://github.com/markedjs/marked) · [DOMPurify](https://github.com/cure53/DOMPurify) · [crypto-js](https://github.com/brix/crypto-js) · [SheetJS](https://github.com/SheetJS/sheetjs)

## License

MIT
