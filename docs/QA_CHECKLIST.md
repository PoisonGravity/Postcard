# 邮笺闭环测试清单

## 环境准备

1. 在项目根目录复制 `.env.example` 为 `.env.local`。
2. 设置 `VITE_SUPABASE_PUBLISHABLE_KEY`，只使用 Supabase 的 publishable/anon key。
3. 执行 `npm install` 和 `npm run dev`。
4. 在 Supabase Auth 中确认 Email provider 已开启；如果开启了邮箱确认，使用真实可收信邮箱并完成确认。
5. 准备两个浏览器会话：普通窗口作为账号 A，无痕窗口或另一个浏览器作为账号 B。第三个会话作为权限测试账号 C。

## 主流程

### A 注册

- 使用邮箱 A 注册并登录。
- 预期：进入收件箱，能看到自己的好友码。
- 在 Supabase SQL Editor 检查 `profiles` 是否出现对应用户。

### B 注册并申请好友

- 使用邮箱 B 注册并登录。
- 将 B 的用户 ID 复制给 A，或让 A 输入 B 的用户 ID。
- 在好友页发送好友申请。
- 预期：A 或 B 的 `friendships` 记录为 `pending`，申请人是 B，接收人是 A。

### A 接受好友

- 切回 A，打开好友页并接受申请。
- 预期：关系变为 `accepted`，双方都能在好友选择器中看到对方。

### A 上传并发送

- A 打开“制作明信片”。
- 选择 JPG、PNG 或 WebP，建议先用小于 5MB 的图片。
- 选择 B、填写标题、正文和城市，点击寄出。
- 预期：图片上传到 `postcard-media/<A 用户 ID>/...`，明信片状态为 `sent`，B 的收件箱出现来信。

### B 打开

- 切回 B，刷新或等待 30 秒自动刷新。
- 点击未拆封信封。
- 预期：卡片变为 `opened`，出现 `opened_at`，A 仍能在已寄出中看到这张卡。

## 反向权限测试

- C 不能看到 A 与 B 的明信片列表。
- 未成为好友时，A 不能把明信片寄给 C。
- B 不能修改 A 的标题、正文、图片、寄件人或收件人。
- A 不能代替 B 把来信标记为已打开。
- 申请人不能直接把 `pending` 改成 `accepted`。
- 浏览器直接访问 Storage 的文件 URL 应失败；应用只能通过签名 URL 查看图片。
- 上传 GIF、SVG、超过 10MB 的图片应被前端和 Storage 策略拒绝。

## 数据核对 SQL

```sql
select id, display_name, created_at from public.profiles order by created_at desc;
select id, requester_id, addressee_id, status, created_at from public.friendships order by created_at desc;
select id, sender_id, recipient_id, title, status, source_path, sent_at, opened_at from public.postcards order by created_at desc;
select postcard_id, actor_id, type, created_at from public.postcard_events order by created_at desc;
select bucket_id, name, owner_id, metadata->>'mimetype' as mime_type from storage.objects where bucket_id = 'postcard-media' order by created_at desc;
```

## 通过标准

- A、B 可以完成注册、好友申请、接受、上传、发送和打开。
- 每一步都能在数据库中找到对应记录。
- C 无法读取 A/B 的私有内容。
- 违规状态变化会返回错误，而不是静默成功。
- 刷新页面后数据仍然存在。

## 常见问题

- `请配置 Supabase 公开密钥`：检查 `.env.local` 并重启 Vite。
- 注册后没有进入应用：检查邮箱确认和 Auth Redirect URL。
- 好友码无法提交：必须输入完整 UUID。
- 上传成功但发送失败：检查 Storage bucket 名称是否为 `postcard-media`，以及迁移是否完整执行。
- 收件箱没有新信：刷新页面，或等待控制器的 30 秒自动刷新。

