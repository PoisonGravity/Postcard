# APNs 推送设计

## 当前边界

现有 React/Vite 客户端可以完成账号、好友和明信片业务，但浏览器页面不能直接替代 iOS APNs 客户端。APNs 需要原生 iOS 应用注册设备、取得 device token，再由可信服务端向 Apple 发送通知。

链路是：SwiftUI App 请求通知权限 → iOS 注册 APNs → App 将 device token 和用户 ID 写入 `push_devices` → Supabase Edge Function 监听明信片发送事件 → Edge Function 使用 Apple 的 HTTP/2 Provider API 发送推送 → iPhone 展示通知并打开对应明信片。

Apple 官方说明：Provider Server 负责保存设备 token、生成 payload，并通过 APNs 发送；`.p8` 私钥只能放在服务端密钥中，不能进入前端环境变量。

## 数据设计

`push_devices` 每台设备一行：`user_id`、`device_token`、`platform`、`environment`、`last_seen_at`、`revoked_at`。同一个用户可以有多个 iPhone/iPad，token 变化时按 token upsert；收到 APNs `410` 或 `Unregistered` 后标记失效。

推送 payload 只放导航所需的最小数据：

```json
{
  "aps": { "alert": { "title": "你收到一张明信片", "body": "来自远方的一段风景" }, "sound": "default" },
  "postcard_id": "uuid"
}
```

正文和照片仍从 Supabase 读取，避免把用户内容塞入通知并降低隐私风险。

## 上线前步骤

1. Apple Developer 创建 App ID，开启 Push Notifications。
2. 创建 APNs Auth Key，记录 Team ID、Key ID，并将 `.p8` 放进 Supabase Edge Function Secrets。
3. SwiftUI 客户端请求用户授权、注册 token、处理 token 更新和点击通知。
4. Edge Function 使用 JWT（`iss=Team ID`、`kid=Key ID`）调用 `api.push.apple.com`，区分 sandbox 和 production。
5. 发送明信片成功后发布可靠事件；推送失败只记录日志，不回滚已经成功寄出的明信片。
6. 在真实 iPhone、TestFlight 和 App Store production 环境分别验证授权、前台、后台、冷启动和失效 token。

## 为什么现在先做设计和数据层

当前仓库还没有 SwiftUI target，也没有 Apple Team、Bundle ID、APNs Key 或签名环境。先把 token 数据模型和 Edge Function 契约固定下来，等原生客户端建立后接入，避免把 Apple 私钥或不可测试的推送逻辑写进 Vite 前端。
