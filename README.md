# 在线工具集

纯前端实现的在线工具集合，所有数据仅在浏览器本地处理，无需后端，可直接部署到 GitHub Pages 或任意静态服务器。

在线访问：https://buhuiphp.github.io/online-tools/

## 工具列表（26 个）

| 分类 | 工具 |
| --- | --- |
| 文本处理 | 人民币大写转换、Markdown 编辑器、特效文字生成、去除重复项、字数统计、在线记事本 |
| 编码 / 数据转换 | 编码转换（Unicode/URL/Base64/HTML/Hex/MD5/SHA）、JSON 格式化、Excel 转 JSON、PHP 反序列化、进制转换 |
| 代码 / 正则 | 代码压缩（JS/CSS/HTML）、正则表达式生成、正则表达式测试、文本差异对比 |
| 图形码 | 条形码生成、**二维码生成**、**二维码解码** |
| 开发工具 | 时间戳转换、UUID 生成器、密码生成器、颜色转换器、图片压缩 |
| 网络 / SEO | WebSocket 工具、Meta 标签生成、IP 归属地查询 |

### 二维码生成
- 模板：文本/链接、WiFi、名片 (vCard)、邮件、短信、电话
- 自定义尺寸、容错等级、边距、前景/背景色、方块/圆角/圆点样式
- 支持中心 Logo（自动切换 H 级容错）
- 导出 PNG / SVG，或直接复制图片

### 二维码解码
- 点击选择、拖拽或 Ctrl+V 粘贴图片识别
- 摄像头实时扫码（支持切换摄像头，需 HTTPS）
- 自动识别 UTF-8 / GBK 编码内容，解析 WiFi 等结构化信息，网址可一键打开

## 本地运行

无需构建，任意静态服务器即可：

```bash
python3 -m http.server 8080
# 打开 http://localhost:8080
```

## 目录结构

```
index.html          首页与工具容器（hash 路由：#/qrcode）
css/style.css       样式
js/core.js          工具注册、按需加载脚本、通用方法
js/app.js           首页渲染、搜索、路由
js/tools/*.js       各分类工具实现
vendor/             第三方库（按需加载）
```

新增工具：在 `js/tools/` 中调用 `App.register({ id, group, icon, title, desc, scripts, render(el) })` 即可。

## 第三方库

[qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator)、[jsQR](https://github.com/cozmo/jsQR)、[JsBarcode](https://github.com/lindell/JsBarcode)、[marked](https://github.com/markedjs/marked)、[DOMPurify](https://github.com/cure53/DOMPurify)、[crypto-js](https://github.com/brix/crypto-js)、[SheetJS](https://github.com/SheetJS/sheetjs)、[Terser](https://github.com/terser/terser)

## License

MIT
