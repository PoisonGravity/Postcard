# 邮笺 Postcard Studio

React + TypeScript + Supabase 的真实功能首版。按 MVC 思路组织：View 只渲染界面，Controller 管理状态与操作，Service 访问云端，Model 定义数据契约。

## 目录

```text
src/
  models/       数据类型
  services/     Auth、好友、照片、明信片 API
  controllers/  状态与异步操作
  components/   注册登录、制作表单、明信片卡片
  views/        页面组合
  styles/       独立样式
supabase/migrations/ 数据库、RPC、RLS 与 Storage 策略
```

## 启动

1. `npm install`
2. 将 `.env.example` 复制为 `.env.local`，设置项目的 publishable key（禁止 service role key）。
3. 在空 Supabase 项目执行 `supabase/migrations/001_postcard_core.sql`。它是待部署 SQL 草案，尚未通过远端验证；仅适合首次执行，不要重复执行或覆盖已有数据库。
4. 配置 Auth 的 Site URL 和 Redirect URLs 为开发站点地址。
5. `npm run dev`，生产构建 `npm run build`。

## 验收

用两个测试账号分别注册并确认邮箱。A 复制好友码给 B，B 发申请，A 接受。A 上传照片并寄给 B，B 打开收件箱拆信。刷新两端验证记录和已打开状态；第三个账号不能查看照片或明信片。用数据库权限测试进一步验证申请人不能自行接受、收件人不能更改正文。

## 当前范围

已编写注册登录、真实上传、好友申请接受、发送与打开、收件箱与寄件箱、收藏统计代码。仅支持原图发送。AI 风格推理、Skill 导入、Apple 登录、APNs、SwiftUI 和 App Store 发布尚未接入。

GitHub 已有读写权限。当前会话没有 Supabase SQL 执行工具，因此迁移未应用，端到端流程未验证。依赖安装与构建结果见交付说明，不能将未验证代码视作生产版本。

