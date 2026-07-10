# CHILALA Personal Website

这是 CHILALA 的个人静态网站，可部署到 Vercel。

## 本地入口

直接打开 `index.html` 即可预览首页。

主要页面：

- `index.html` 首页
- `about.html` 关于我
- `projects.html` 项目经验
- `toolbox.html` 测试工具箱
- `custom-page.html` 后台通用页面模板
- `articles.html` 文章
- `articles-all.html` 全部文章
- `article-detail.html` 文章详情
- `admin/index.html` 后台管理入口

## Vercel 部署

1. 把整个文件夹上传到 GitHub 仓库。
2. 打开 Vercel，选择 `Add New Project`。
3. 导入这个 GitHub 仓库。
4. Framework Preset 选择 `Other`。
5. Build Command 留空。
6. Output Directory 留空。
7. 点击 Deploy。

## 内容维护

- 导航 Tab：修改 `data/navigation.json`
- 通用页面：修改 `data/custom-pages.json`
- 文章内容：修改 `data/articles.json`
- 首页与关于我：修改 `data/site.json`
- 项目经验：修改 `data/projects.json`
- 测试工具箱：修改 `data/toolbox.json`
- 工作经历：修改 `data/experience.json`
- 后台管理：部署后访问 `/admin/`
- 视觉样式：修改 `styles.css`

## 后台管理

当前已接入免费的 Decap CMS 后台。

上线前需要把 `admin/config.yml` 里的 `repo: YOUR_GITHUB_USERNAME/YOUR_REPO_NAME` 改成你的 GitHub 仓库，例如 `repo: chilala/chilala-site`。

后台可管理：

- 新增文章
- 修改文章
- 删除文章
- 编辑标题、摘要、作者、更新时间和正文段落
- 编辑首页标题、简介和核心能力
- 新增/隐藏/调整导航 Tab
- 新增“证书、资源库”等通用模板页面
- 编辑关于我 ID Card、简介、亮点和宣言
- 编辑项目经验卡片
- 编辑测试工具箱卡片
- 编辑工作经历卡片
- 修改项目经验访问密码和联系邮箱
