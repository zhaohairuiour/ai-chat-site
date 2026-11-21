# AI Chat Site

AI Chat for Android 的介绍站点，纯静态三件套（HTML / CSS / 原生 JS），部署在 GitHub Pages。

## 结构

| 路径 | 说明 |
|---|---|
| `index.html` | 单页入口，八个分区（能力 / 终端 / 架构 / 更新 / 源码 / 版本 / 问答 / 下载） |
| `assets/style.css` | 全部样式，深色单强调色，含响应式与 `prefers-reduced-motion` |
| `assets/main.js` | 全部交互：粒子背景、打字终端、架构联动、真实清单请求、代码高亮 |
| `404.html` | Pages 自定义错误页 |
| `robots.txt` / `sitemap.xml` | 抓取配置 |
| `manifest.webmanifest` / `assets/icon.svg` | PWA 基础声明 |

## 本地预览

```bash
python3 -m http.server 8123
# 打开 http://127.0.0.1:8123/
```

站点会真实请求仓库 `main` 分支的 `version.json`，依次尝试 `ghproxy.net`、`gh-proxy.com`、直连。离线时更新检查会退化为失败提示，其余功能不受影响。

## 部署

推送到 `main` 分支后，由 GitHub Pages 从仓库根目录发布。
