# Mufy Studio / Mufy 美化工坊

把参考截图转换为可编辑、可预览、可导出的 Mufy 小剧场与动态正则组件。

**在线体验：** [mufy-studio.yunqi001.chatgpt.site](https://mufy-studio.yunqi001.chatgpt.site)

## 功能

- 上传 PNG、JPEG 或 WebP，完成本地取色和视觉特征分析。
- 可选 MiniMax 深度识图，生成受限、可安全编译的布局蓝图。
- 在“固定小剧场”和“动态正则”两种交付方式之间切换。
- 逐页编辑文字、复制或删除页面，并预览真实 CSS 翻页交互。
- 导出 Mufy 所需的 XML、正则、变量映射、输出设定和完整 JSON。
- 通过 AI 对话提出修改，并在应用前校验、预览、放弃或撤销建议。
- 对边框、图标、字段绑定、区块数量和危险 HTML/CSS 做严格校验。

## 技术栈

- React 19
- Next.js 16
- [vinext](https://github.com/cloudflare/vinext)
- Vite 8
- Cloudflare Workers
- Node.js 内置测试运行器

## 本地运行

需要 Node.js `>=22.13.0` 和 npm。

```bash
git clone https://github.com/906908891-gif/mufy-studio.git
cd mufy-studio
cp .env.example .env.local
npm ci
npm run dev
```

浏览器打开终端显示的本地地址。没有配置 MiniMax 密钥时，除深度识图和 AI 修订外，其余编辑、预览与导出功能仍可使用。

## MiniMax 配置

密钥只能配置在服务端环境变量中，不能写进客户端代码或提交到 Git。

```dotenv
MINIMAX_API_KEY=your_token_plan_key
MINIMAX_API_HOST=https://api.minimax.io
```

- Global Token Plan 使用 `https://api.minimax.io`。
- Mainland Token Plan 使用 `https://api.minimaxi.com`。
- 图片只有在用户主动点击 MiniMax 深度识图或提交 AI 修订时才会发送给所配置的 MiniMax 服务。

生产版 API 当前信任 ChatGPT Sites 提供的 `oai-authenticated-user-email` 请求头；本地开发允许 `localhost`。部署到其他平台时，请在 `app/api/minimax-vision/route.ts` 中接入该平台自己的服务端身份验证，不要简单移除认证后公开共享密钥。

## 常用命令

```bash
npm run dev
npm run lint
npm run build
npm test
```

`npm test` 会先构建并校验 Cloudflare Worker 产物，再运行测试套件。

## 部署

仓库中的 `.openai/hosting.json` 是不含所有者项目 ID 的通用配置。使用 ChatGPT Sites 创建新站点时，应让 Sites 为你的副本写入自己的 `project_id`；不要复制原站点的 ID。部署到其他 Cloudflare/Vinext 环境时，请按照对应平台配置 Worker 环境变量与身份验证。

## 项目结构

```text
app/                         页面、编辑器、编译器与 MiniMax API
app/api/minimax-vision/      服务端 MiniMax 请求入口
tests/                       蓝图校验、正则、JSON 与渲染测试
worker/                      Cloudflare Worker 入口
scripts/                     安装、构建和产物校验脚本
public/                      静态资源
```

## 安全说明

- 仓库不包含 MiniMax Key、Sites Secret 或个人环境变量。
- `.env*`、私钥、构建产物和本地运行目录均被 Git 忽略。
- MiniMax 原始返回值不会直接进入 HTML；输出必须先通过受控枚举和结构校验。
- 内置限流是单实例内存限流。对外长期运营时，建议改用 Durable Object、KV、D1 或独立网关实现持久化限流。

## 授权

当前仓库尚未选择开源许可证。源码可以公开查看、测试和协作；如需复制、修改后再发布或用于商业项目，请先与仓库所有者确认授权范围。
