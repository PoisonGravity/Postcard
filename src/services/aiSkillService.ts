import { db } from './client';

export type AISkill = { id: string; version: string; name: string; summary: string; status: 'ready'|'coming-soon' };
export const postcardAISkills: AISkill[] = [
 { id: 'photo-to-zine-postcard', version: '3.3', name: '旅行手账明信片', summary: '保留原图，生成手绘主体、三色色板和配套背面', status: 'ready' },
];
export type AIGenerationJob = { id: string; skill_id: string; status: 'queued'|'generating'|'succeeded'|'failed'; source_path: string; front_path: string|null; back_path: string|null; error_code: string|null; postcard_id: string|null; created_at: string; metadata: {title?:string;location?:string;prompt?:string} };
export type AICapabilities = { available: boolean; provider: string; model: string; daily_limit: number };
export const generationMessages: Record<string,string> = {
 MODEL_NOT_CONFIGURED:'图像模型还未配置，请先在 Supabase 配置模型密钥。',
 DAILY_LIMIT:'今天的生成次数已用完，请明天再试。', ACTIVE_JOB:'已有一张明信片正在生成，请等它完成。',
 PROVIDER_REJECTED:'模型未能处理这张图片，请尝试更换照片或补充要求。',
 GENERATION_TIMEOUT:'生成超时，模型请求可能仍有费用。请先查看任务状态再决定是否重新生成。',
 GENERATION_FAILED:'生成失败，请查看任务记录后再尝试。', NO_IMAGE_OUTPUT:'模型没有返回图片，请调整要求后再生成。',
 INVALID_IMAGE:'请选择 JPG、PNG 或 WebP 照片。', IMAGE_SIZE:'照片需要小于 10MB。',
};
async function invoke(body: FormData|object) {
 const {data,error}=await db().functions.invoke('generate-postcard',{body});
 if(error){const context=(error as {context?:Response}).context; const result=context?await context.json().catch(()=>null):null;throw new Error(generationMessages[result?.error]||'暂时无法连接生成服务，请检查 Supabase 函数部署和网络。');}
 if(data?.error) throw new Error(generationMessages[data.error]||'生成服务返回错误。');
 return data;
}
export const aiGenerationService = {
 async capabilities():Promise<AICapabilities> {return invoke({action:'capabilities'});},
 async start(file:File,skillId:string,requestKey:string,metadata:{prompt:string;title:string;city:string}):Promise<AIGenerationJob> {
  const skill=postcardAISkills.find(item=>item.id===skillId); if(!skill) throw new Error('请选择一个 AI Skill。');
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024) throw new Error('请选择不超过 10MB 的 JPG、PNG 或 WebP 图片。');
  const form=new FormData();form.set('skill_id',skill.id);form.set('skill_version',skill.version);form.set('source_file',file,file.name);form.set('request_key',requestKey);
  Object.entries(metadata).forEach(([key,value])=>form.set(key,value));
  const data=await invoke(form);if(!data.job?.id) throw new Error('生成服务未返回任务编号。');return data.job;
 },
 async generate(file:File,skillId:string,prompt:string):Promise<AIGenerationJob> { return this.start(file,skillId,crypto.randomUUID(),{prompt,title:'',city:''}); },
 async get(id:string):Promise<AIGenerationJob>{const {data,error}=await db().from('ai_generation_jobs').select('*').eq('id',id).single();if(error)throw error;return data;},
 async latest():Promise<AIGenerationJob|null>{const {data,error}=await db().from('ai_generation_jobs').select('*').is('postcard_id',null).order('created_at',{ascending:false}).limit(1).maybeSingle();if(error)throw error;return data;},
 async image(path:string){const {data,error}=await db().storage.from('postcard-media').createSignedUrl(path,600);if(error)throw error;return data.signedUrl;},
 async sendPostcard(jobId:string,recipientId:string,title:string,body:string,city:string){const {error}=await db().rpc('send_ai_postcard',{job_id:jobId,target_id:recipientId,card_title:title.trim(),card_body:body,card_city:city});if(error)throw error;},
};

