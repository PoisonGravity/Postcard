# 明信片滤镜设计

## 选择实现方式

当前 Web MVP 使用浏览器 Canvas 的 `filter` 组合实现预览和导出。CSS Filter Effects 提供 brightness、contrast、saturate、hue-rotate、sepia、grayscale 等基础能力，并且可以按顺序组合；预览和最终导出的 Canvas 参数来自同一份预设，避免“预览一个样子、寄出另一个样子”。

当前预设是摄影滤镜：原图、鲜明、暖阳、冷调、胶片、黑白、褪色。它们调整颜色、对比度、亮度和饱和度，不再把照片强行变成像素画或水墨画。

## SwiftUI 映射

原生 iOS 使用 Core Image 的 `CIImage`、`CIFilter` 和 `CIContext`。Apple 的 Core Image 内置了 `CIPhotoEffectChrome`、`CIPhotoEffectFade`、`CIPhotoEffectInstant`、`CIPhotoEffectMono`、`CIPhotoEffectNoir`、`CIPhotoEffectProcess`、`CIPhotoEffectTonal` 和 `CIPhotoEffectTransfer` 等照片效果。React 端的预设名称会映射到这些原生滤镜或由 `CIColorControls`、`CISepiaTone`、`CIHueAdjust` 组合出来的滤镜链。

## AI 接口预留

滤镜和 AI 风格应保持两条路径：

- `local`：即时预览、无需网络、低成本，使用滤镜参数导出；
- `ai`：上传原图和 style skill ID 到后端任务，异步生成 `rendered_path`，完成后刷新预览。

未来的 `StylePreset` 可以统一包含 `id`、`kind`、`label`、`preview`、`cssFilter`、`nativeFilterRecipe` 和 `aiSkillId`，这样 UI 不需要知道具体是本地滤镜还是 AI 生成。

## 限制

Canvas 适合 MVP 的非破坏性颜色滤镜；复杂 LUT、局部调整、曲线、实时视频和高分辨率 RAW 应在 SwiftUI 中使用 Core Image/Metal。上传前应限制最长边和文件大小，避免手机内存峰值。
