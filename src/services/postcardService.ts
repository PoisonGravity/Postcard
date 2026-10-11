import { db } from './client';
import type { CardInput, Postcard } from '../models/types';
export function validateCard(input:CardInput) {
 if(!input.recipientId) throw new Error('请选择好友');
 if(!input.title.trim() || input.title.length>120) throw new Error('标题需要 1–120 字');
 if(input.body.length>2000) throw new Error('正文不能超过 2000 字');
 if(!['image/jpeg','image/png','image/webp'].includes(input.file.type)||input.file.size>10*1024*1024) throw new Error('请选择不超过 10MB 的 JPG、PNG 或 WebP 图片');
}
export const postcardService = {
 async list() {const {data,error}=await db().from('postcards').select('*').order('created_at',{ascending:false}); if(error) throw error; return data as Postcard[];},
 async send(input:CardInput) {
  validateCard(input);
  const {data,error}=await db().auth.getUser(); if(error||!data.user) throw error||new Error('请先登录');
  const ext=input.file.type==='image/png'?'png':input.file.type==='image/webp'?'webp':'jpg';
  const path=`${data.user.id}/${crypto.randomUUID()}.${ext}`;
  const upload=await db().storage.from('postcard-media').upload(path,input.file,{upsert:false}); if(upload.error) throw upload.error;
  const sent=await db().rpc('send_postcard',{target_id:input.recipientId,card_title:input.title,card_body:input.body,card_city:input.city,media_path:path});
  if(sent.error) {await db().storage.from('postcard-media').remove([path]); throw sent.error;}
 },
 async open(id:string) {const {error}=await db().rpc('open_postcard',{card_id:id}); if(error) throw error;},
 async image(path:string) {const {data,error}=await db().storage.from('postcard-media').createSignedUrl(path,600); if(error) throw error; return data.signedUrl;}
};

