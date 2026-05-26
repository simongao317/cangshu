# 部署指南

## 部署到 GitHub + Vercel

### 步骤1：创建 GitHub 仓库
1. 访问 [GitHub](https://github.com) 并登录
2. 点击右上角 "+" → "New repository"
3. 填写仓库信息：
   - Repository name: `cangshu-web` (或其他名称)
   - 选择 Public (公开)
   - 不勾选 "Initialize this repository with a README"
4. 点击 "Create repository"

### 步骤2：上传代码到 GitHub
```bash
# 在项目目录中执行
cd 藏书网页版

# 初始化 Git
git init
git add .
git commit -m "Initial commit: 藏书网页版"

# 添加远程仓库 (替换 YOUR_USERNAME 和 REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/cangshu-web.git

# 推送代码
git branch -M main
git push -u origin main
```

### 步骤3：部署到 Vercel
1. 访问 [Vercel](https://vercel.com) 并登录（推荐使用 GitHub 账号）
2. 点击 "New Project"
3. 导入你的 GitHub 仓库
4. 配置项目：
   - **Project Name**: `cangshu` (或自定义)
   - **Framework Preset**: Other
   - **Build Command**: 留空
   - **Output Directory**: 留空
5. 点击 "Deploy"
6. 部署完成后会获得一个类似 `https://your-project.vercel.app` 的链接

## 部署到 GitHub Pages

### 方法1：使用 GitHub Actions (推荐)
1. 在仓库根目录创建 `.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: .
```

2. 提交并推送代码
3. 访问 `https://YOUR_USERNAME.github.io/cangshu-web/`

### 方法2：手动设置
1. 在 GitHub 仓库设置中：
   - Settings → Pages
   - Source: Deploy from a branch
   - Branch: main, folder: / (root)
2. 保存后访问 `https://YOUR_USERNAME.github.io/cangshu-web/`

## 部署到 Netlify

1. 访问 [Netlify](https://netlify.com) 并登录
2. 拖拽项目文件夹到上传区域
3. 或连接 GitHub 仓库
4. 部署设置：
   - Build command: 留空
   - Publish directory: . (当前目录)
5. 点击 "Deploy site"

## 自定义域名

### Vercel
1. 在 Vercel 项目设置 → Domains
2. 添加你的域名
3. 按照提示配置 DNS

### GitHub Pages
1. 在仓库根目录创建 `CNAME` 文件，内容为你的域名
2. 在域名服务商配置 DNS：
   ```
   A 记录 @ → 185.199.108.153
   A 记录 @ → 185.199.109.153
   A 记录 @ → 185.199.110.153
   A 记录 @ → 185.199.111.153
   ```

## HTTPS 配置

Vercel、GitHub Pages、Netlify 都自动提供 HTTPS 证书，无需额外配置。

## 环境要求

### 浏览器支持
- Chrome 60+ (推荐)
- Firefox 55+
- Safari 11.1+
- Edge 79+

### 扫码功能要求
- **必须 HTTPS 环境** (Vercel/Netlify/GitHub Pages 都支持)
- 摄像头权限
- 现代浏览器支持 WebRTC

## 故障排除

### 扫码功能不可用
1. 确保在 HTTPS 环境下运行
2. 检查浏览器是否支持 `getUserMedia` API
3. 确保已授予摄像头权限

### Service Worker 不工作
1. 检查 `sw.js` 文件路径是否正确
2. 确保在 HTTPS 或 localhost 环境下
3. 清除浏览器缓存后重试

### 导入导出问题
1. 确保文件格式正确 (CSV UTF-8 编码)
2. 检查浏览器是否支持 File API

## 更新部署

### Vercel
- 自动部署：每次推送到 GitHub 主分支会自动部署
- 手动部署：在 Vercel 控制台点击 "Redeploy"

### GitHub Pages
1. 更新代码并推送到 GitHub
2. 等待 GitHub Actions 自动部署 (约1-2分钟)

## 监控与统计

### Vercel Analytics
- 在 Vercel 项目设置中启用 Analytics
- 查看访问量、性能指标等

### Google Analytics
1. 在 `index.html` 的 `<head>` 中添加：
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

## 备份策略

1. **数据备份**：用户应定期使用"导出"功能备份数据
2. **代码备份**：GitHub 仓库自动备份代码
3. **部署备份**：Vercel 保留最近部署版本，可快速回滚

## 联系方式

如有部署问题，请：
1. 检查浏览器控制台错误信息
2. 查看 Vercel/GitHub 部署日志
3. 提交 GitHub Issue