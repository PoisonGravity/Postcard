# 像素蛋糕公开功能研究与邮笺转译

公开资料显示，像素蛋糕把 AI 修图组织成“AI 工具箱”和场景化工具，而不是一个泛化的单一提示词入口。公开功能包括 AI 仿色、换天空、AI 点修、创成式填充、AI 补光、老照片修复、风格参考和批量应用。

邮笺采用相同的工作流思想，但把场景限定为旅行明信片：用户上传照片后先选择本地摄影滤镜；如果选择 AI Skill，则创建一个异步生成任务，返回处理中状态和多结果候选，用户在对比页选择一个结果后再写文字和寄出。

## 代码结构

- `src/services/aiSkillService.ts`：Skill 元数据、请求 DTO 和未来生成入口；不复制竞品代码或资源。
- `style_skills`：保存 Skill 名称、版本、提示模板和公开性。
- `postcards.rendered_path`：保存 AI 生成结果，原图 `source_path` 保留用于重新编辑。
- 前端状态：`idle → uploading → analyzing → generating → candidates → selected → sending`。

## 下一步服务接口

```http
POST /functions/v1/generate-postcard-style
Content-Type: multipart/form-data

source_file=<image>
skill_id=postcard-collage
prompt=保留海岸线和白色建筑
strength=0.7
```

返回任务 ID 后通过 Supabase Realtime 或轮询获取候选图。生成服务的 API Key 只能放在 Edge Function Secrets 中，不能放在 Vite 前端变量里。
