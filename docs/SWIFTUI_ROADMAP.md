# SwiftUI 客户端路线

SwiftUI 是 Apple 官方的声明式 UI 框架，用 Swift 描述页面、导航、动画、状态和系统能力。它能直接调用 iOS 的照片选择器、通知权限、APNs 注册、后台生命周期和安全存储，这些能力比网页更适合最终的 iPhone App。

## 当前建议

现在不立即替换 React MVP。React 版本适合继续验证好友关系、明信片业务、风格生成和 Supabase 数据闭环；SwiftUI 需要 Xcode、macOS、Apple Developer Team、Bundle ID、签名证书和真实 iPhone 才能完整验证。

## 何时开始

当以下条件满足时建立 `ios/Postcard/` SwiftUI 工程：

- 产品交互和数据库接口稳定；
- Apple Developer 账号、Bundle ID 和 Push Notifications 能力已开通；
- 需要 APNs、照片库、相机、分享扩展或 App Store TestFlight；
- 已确定 iOS 最低版本和品牌图标资源。

## 首个原生迭代

1. `TabView`：收件箱、好友、制作、已寄出、邮票册；中间制作入口使用自定义突出按钮。
2. `NavigationStack`：收件箱进入明信片详情，使用 `rotation3DEffect` 实现翻页。
3. `PhotosPicker`：选择照片并上传 Supabase Storage。
4. `UNUserNotificationCenter` 和 `registerForRemoteNotifications`：注册 APNs token。
5. Keychain 保存 Supabase session，通知点击通过 `postcard_id` 深链到详情。

SwiftUI 与当前 React 客户端可以共用 Supabase 表、RPC、Storage 和 Edge Functions，因此不需要重写后端。
