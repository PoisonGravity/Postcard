import { createClient } from '@supabase/supabase-js';
import { zineSkill } from './skills/catalog.ts';
import { buildPrompt } from './prompts.mjs';
import { editImage, validImage, models } from './providers/index.mjs';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const env = (key: string) => { const value = Deno.env.get(key); if (!value) throw new Error(`MISSING_SECRET_${key}`); return value; };
const publicError = (error: unknown) => {
 const value = error instanceof Error ? error.message : (error as {message?:string})?.message || 'GENERATION_FAILED';
 return ['DAILY_LIMIT','ACTIVE_JOB','INVALID_IMAGE','IMAGE_SIZE','SOURCE_REQUIRED','SKILL_UNSUPPORTED','INVALID_REQUEST_KEY','NO_IMAGE_OUTPUT','PROVIDER_REJECTED','MODEL_NOT_CONFIGURED'].find(code => value.includes(code)) || (value.includes('abort') ? 'GENERATION_TIMEOUT' : 'GENERATION_FAILED');
};
const providerName = () => (Deno.env.get('AI_IMAGE_PROVIDER') || 'gemini') as keyof typeof models;

async function processJob(admin: ReturnType<typeof createClient>, job: any, source: any, apiKey: string) {
 const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 110000);
 try {
  const provider = job.provider;
  const front = await editImage({ provider, model: job.model, apiKey, image: source, prompt: buildPrompt(zineSkill.instructions, 'front', job.metadata), signal: controller.signal });
  const frontPath = `${job.user_id}/ai/${job.id}-front.${front.mime === 'image/jpeg' ? 'jpg' : 'png'}`;
  const frontUpload = await admin.storage.from('postcard-media').upload(frontPath, front.bytes, { contentType: front.mime, upsert: false }); if (frontUpload.error) throw frontUpload.error;
  const partial = await admin.from('ai_generation_jobs').update({ front_path: frontPath, updated_at: new Date().toISOString() }).eq('id', job.id); if (partial.error) throw partial.error;
  const back = await editImage({ provider, model: job.model, apiKey, image: front, prompt: buildPrompt(zineSkill.instructions, 'back', job.metadata), signal: controller.signal });
  const backPath = `${job.user_id}/ai/${job.id}-back.${back.mime === 'image/jpeg' ? 'jpg' : 'png'}`;
  const backUpload = await admin.storage.from('postcard-media').upload(backPath, back.bytes, { contentType: back.mime, upsert: false }); if (backUpload.error) throw backUpload.error;
  const done = await admin.from('ai_generation_jobs').update({ status:'succeeded', back_path:backPath, usage:{front:front.usage,back:back.usage}, updated_at:new Date().toISOString() }).eq('id',job.id); if(done.error) throw done.error;
 } catch(error) {
  const failed = await admin.from('ai_generation_jobs').update({status:'failed',error_code:publicError(error),updated_at:new Date().toISOString()}).eq('id',job.id);
  if(failed.error) console.error('Unable to persist job failure',job.id);
 } finally { clearTimeout(timer); }
}

Deno.serve(async request => {
 if(request.method==='OPTIONS') return new Response('ok',{headers:cors});
 if(request.method!=='POST') return json({error:'METHOD_NOT_ALLOWED'},405);
 try {
  const authorization=request.headers.get('Authorization');
  if(!authorization?.startsWith('Bearer ')) return json({error:'AUTH_REQUIRED'},401);
  const url=env('SUPABASE_URL');
  const userClient=createClient(url,env('SUPABASE_ANON_KEY'),{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
  const {data:{user},error}=await userClient.auth.getUser(); if(error||!user) return json({error:'AUTH_REQUIRED'},401);
  const provider=providerName(); const config=models[provider];
  if(request.headers.get('Content-Type')?.includes('application/json')) {
   const body=await request.json();
   if(body.action!=='capabilities') return json({error:'INVALID_ACTION'},400);
   return json({skills:[{id:zineSkill.id,version:zineSkill.version,name:zineSkill.name}],provider,model:config?(Deno.env.get('AI_IMAGE_MODEL')||config.model):null,available:Boolean(config&&Deno.env.get(config.secret)),daily_limit:10});
  }
  if(!config||!Deno.env.get(config.secret)) return json({error:'MODEL_NOT_CONFIGURED'},503);
  if(Number(request.headers.get('Content-Length'))>11*1024*1024) return json({error:'IMAGE_SIZE'},413);
  const form=await request.formData(); const file=form.get('source_file');
  if(!(file instanceof File)) return json({error:'SOURCE_REQUIRED'},400);
  if(file.size>10*1024*1024) return json({error:'IMAGE_SIZE'},413);
  const skillId=String(form.get('skill_id')||''); const version=String(form.get('skill_version')||'');
  if(skillId!==zineSkill.id||version!==zineSkill.version) return json({error:'SKILL_UNSUPPORTED'},400);
  const requestKey=String(form.get('request_key')||'');
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestKey)) return json({error:'INVALID_REQUEST_KEY'},400);
  const admin=createClient(url,env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
  const existing=await admin.from('ai_generation_jobs').select('*').eq('user_id',user.id).eq('request_key',requestKey).maybeSingle();
  if(existing.error) throw existing.error;
  if(existing.data) return json({job:existing.data},202);
  const source=validImage(new Uint8Array(await file.arrayBuffer()));
  const path=`${user.id}/ai/${requestKey}.${source.mime==='image/png'?'png':source.mime==='image/webp'?'webp':'jpg'}`;
  const upload=await admin.storage.from('postcard-media').upload(path,source.bytes,{contentType:source.mime,upsert:false});
  if(upload.error) throw upload.error;
  const metadata={prompt:String(form.get('prompt')||'').slice(0,1000),title:String(form.get('title')||'').slice(0,120),location:String(form.get('city')||'').slice(0,100),date:String(form.get('date')||'').slice(0,30)};
  const reserved=await admin.rpc('reserve_ai_job',{owner:user.id,request_key:requestKey,skill:skillId,version,provider_name:provider,model_name:Deno.env.get('AI_IMAGE_MODEL')||config.model,photo_path:path,card_metadata:metadata});
  if(reserved.error){await admin.storage.from('postcard-media').remove([path]);throw reserved.error;}
  const job=Array.isArray(reserved.data)?reserved.data[0]:reserved.data;
  const claim=await admin.from('ai_generation_jobs').update({status:'generating',updated_at:new Date().toISOString()}).eq('id',job.id).eq('status','queued').select('*').maybeSingle();
  if(claim.error) throw claim.error;
  if(claim.data) EdgeRuntime.waitUntil(processJob(admin,claim.data,source,env(config.secret)));
  return json({job:claim.data||job},202);
 } catch(error) { return json({error:publicError(error)},400); }
});

