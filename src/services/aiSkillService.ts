export type AISkillKind = 'scene' | 'collage' | 'retouch' | 'lighting';
export type AISkill = { id: string; name: string; summary: string; kind: AISkillKind; status: 'planned' | 'ready'; };

export const postcardAISkills: AISkill[] = [
  { id: 'postcard-collage', name: '旅行解构拼贴', summary: '把风景拆成照片、纸张和文字层次', kind: 'collage', status: 'planned' },
  { id: 'postcard-film-light', name: '电影感光影', summary: '重建天空、阴影和暖色光线', kind: 'lighting', status: 'planned' },
  { id: 'postcard-sky', name: '晴空焕新', summary: '识别天空并生成更干净的旅行氛围', kind: 'scene', status: 'planned' },
  { id: 'postcard-watercolor', name: '旅行手绘海报', summary: '保留地标轮廓，生成手绘海报构图', kind: 'collage', status: 'planned' },
];

export type AIGenerationRequest = { skillId: string; sourceFile: File; prompt?: string; strength?: number };

export function buildAIGenerationRequest(input: AIGenerationRequest) {
  return { skill_id: input.skillId, prompt: input.prompt || '', strength: input.strength ?? .7, source_file_name: input.sourceFile.name };
}

export async function generateWithAISkill(_input: AIGenerationRequest): Promise<never> {
  throw new Error('AI Skill 接口已预留，等待图像生成服务接入。当前可先使用本地摄影滤镜。');
}
