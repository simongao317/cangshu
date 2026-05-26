# 藏书网页版 - 使用说明

## 项目概述
这是一个纯前端图书收藏管理网页应用，基于HTML/CSS/JavaScript实现，无需服务器即可运行。

## 功能特性
- ✅ **图书管理**：支持已购、想读、未购已读三大分类
- ✅ **扫码录入**：通过摄像头扫描ISBN条形码自动查询图书信息
- ✅ **手动录入**：支持手动输入图书详细信息
- ✅ **导入导出**：支持CSV和豆瓣XLSX格式导入，CSV格式导出
- ✅ **状态切换**：直接在卡片上切换已买/未买、已读/未读/想读/待定状态
- ✅ **自动删除**：待定图书30天后自动删除
- ✅ **离线使用**：PWA支持，可安装到桌面，离线可用
- ✅ **本地存储**：使用IndexedDB存储数据，安全可靠

## 快速开始
1. 双击打开 `index.html` 文件即可运行
2. 或使用本地服务器（如 `python -m http.server 8000`）访问

## 使用指南

### 1. 添加图书
- **扫码录入**：点击顶部"扫码录入"按钮，对准ISBN条形码
- **手动录入**：点击图书卡片进入编辑模式
- **批量导入**：点击"导入"按钮，选择CSV或XLSX文件

### 2. 分类管理
- **已购**：已购买的图书，分为"已读"和"未读"
- **想读**：想读的图书，分为"已购"和"未购买"
- **未购已读**：未购买但已读过的图书

### 3. 状态管理
- **已买/未买**：点击卡片上的状态标签切换
- **阅读状态**：点击阅读状态标签切换（已读/未读/想读/待定）
- **待定状态**：设置为待定的图书30天后自动删除

### 4. 数据管理
- **导出备份**：点击"导出"按钮生成CSV文件
- **导入恢复**：通过CSV文件恢复数据
- **自动备份**：数据自动保存在浏览器本地

## 技术架构

### 前端技术栈
- **核心**：原生JavaScript (ES6+)
- **存储**：IndexedDB + localStorage
- **UI**：纯CSS + Font Awesome图标
- **扫码**：ZXing.js
- **文件处理**：PapaParse (CSV) + SheetJS (Excel)
- **PWA**：Service Worker + Web App Manifest

### 数据模型
```javascript
Book {
  id,                    // 唯一ID
  identifierKind,        // 书号类型: ISBN/统一书号/自定义书号
  isbn, unifiedNumber, customNumber,  // 书号
  title, originalTitle, seriesTitle,  // 书名
  authors, authorNationality,         // 作者
  publicationDate, publisher,         // 出版信息
  ownershipStatus,       // 收藏状态: 已买/未买
  ownedReadingStatus,    // 已买阅读标签: 已读/未读
  wishlistReadingStatus, // 未买阅读标签: 已读/想读/待定
  entrySource,           // 录入方式: 扫码导入/CSV或Excel导入/手写导入
  coverUrl,              // 封面链接
  createdAt, categoryDate, pendingSince,  // 时间戳
  doubanSubjectID, doubanSubjectURL       // 豆瓣信息
}
```

## 部署说明

### 本地运行
```bash
# 1. 直接打开
双击 index.html

# 2. 使用Python简单服务器
python -m http.server 8000
# 访问 http://localhost:8000

# 3. 使用Node.js
npx serve .
```

### 在线部署
1. 上传到GitHub Pages
2. 部署到Vercel/Netlify
3. 任何静态文件托管服务

## API集成
- **ISBN查询**：集成Open Library和Google Books API
- **跨域处理**：通过CORS代理避免跨域限制
- **离线缓存**：Service Worker缓存核心资源

## 浏览器兼容性
- ✅ Chrome 60+ (推荐)
- ✅ Edge 79+
- ✅ Firefox 55+
- ✅ Safari 11.1+
- ⚠️ 扫码功能需要HTTPS或localhost环境

## 故障排除

### 扫码功能不可用
1. 确保在HTTPS或localhost环境下运行
2. 检查摄像头权限
3. 备用方案：使用"手动输入ISBN"

### 数据丢失
1. 定期使用"导出"功能备份
2. 数据存储在浏览器IndexedDB中，清理浏览器数据会丢失
3. 建议定期导出CSV备份

### 导入失败
1. 检查文件格式（CSV或XLSX）
2. 确保CSV文件使用UTF-8编码
3. 检查字段名称是否匹配

## 开发说明

### 项目结构
```
藏书网页版/
├── index.html          # 主页面
├── css/
│   └── styles.css     # 样式文件
├── js/
│   ├── db.js          # 数据库操作
│   ├── utils.js       # 工具函数
│   ├── isbn.js        # ISBN查询
│   ├── ui.js          # UI交互
│   └── app.js         # 主应用逻辑
├── manifest.webmanifest # PWA配置
└── sw.js              # Service Worker
```

### 扩展开发
1. 添加新的ISBN查询源：修改 `isbn.js` 中的 `ISBN_SOURCES` 数组
2. 自定义UI样式：修改 `styles.css`
3. 添加新功能：在相应模块中添加代码

## 许可证
MIT License - 可自由使用、修改和分发

## 支持
如有问题或建议，请提交Issue或联系开发者。