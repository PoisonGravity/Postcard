export const models = {
 openai: { label: 'GPT Image 2.5 Sunburst', model: 'gpt-image-2.5-sunburst', secret: 'OPENAI_API_KEY' },
 gemini: { label: 'Gemini Flash Image', model: 'gemini-3.1-flash-image', secret: 'GEMINI_API_KEY' },
 bfl: { label: 'FLUX Kontext Pro', model: 'flux-kontext-pro', secret: 'BFL_API_KEY' },
};

export function toBase64(bytes) {
 let value=''; for(let i=0;i<bytes.length;i+=8192) value+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return btoa(value);
}
export function fromBase64(value) { return Uint8Array.from(atob(value),char=>char.charCodeAt(0)); }
export function imageMime(bytes) {
 if(bytes[0]===137 && bytes[1]===80 && bytes[2]===78 && bytes[3]===71) return 'image/png';
 if(bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return 'image/jpeg';
 if(bytes[0]===82 && bytes[1]===73 && bytes[2]===70 && bytes[3]===70 && bytes[8]===87 && bytes[9]===69 && bytes[10]===66 && bytes[11]===80) return 'image/webp';
 throw new Error('INVALID_IMAGE');
}
export function validImage(bytes) {
 if(!bytes.length || bytes.length>10*1024*1024) throw new Error('IMAGE_SIZE');
 return { bytes, mime: imageMime(bytes) };
}
async function jsonRequest(fetcher,url,options) {
 const response=await fetcher(url,options);
 if(!response.ok) throw new Error(`PROVIDER_HTTP_${response.status}`);
 return response.json();
}

// Inject fetch for contract tests. No retries: a timeout may still incur provider charges.
export async function editImage({ provider, model, apiKey, image, prompt, signal }, fetcher=fetch) {
 let data;
 if(provider==='openai') {
  const body=new FormData(); body.set('model',model); body.set('image[]',new Blob([image.bytes],{type:image.mime}),'source.'+(image.mime==='image/png'?'png':'jpg'));
  body.set('prompt',prompt); body.set('size','1024x1536'); body.set('quality','low'); body.set('n','1');
  data=await jsonRequest(fetcher,'https://api.openai.com/v1/images/edits',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`},body,signal});
  if(!data.data?.[0]?.b64_json) throw new Error('NO_IMAGE_OUTPUT');
  return {...validImage(fromBase64(data.data[0].b64_json)),usage:data.usage??null};
 }
 if(provider==='gemini') {
  data=await jsonRequest(fetcher,'https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},signal,body:JSON.stringify({model,input:[{type:'text',text:prompt},{type:'image',mime_type:image.mime,data:toBase64(image.bytes)}],response_format:{type:'image',mime_type:'image/png',aspect_ratio:'2:3',image_size:'1K'}})});
  const result=data.output_image ?? data.outputs?.find(item=>item.type==='image' && item.data);
  if(!result?.data) throw new Error('NO_IMAGE_OUTPUT');
  return {...validImage(fromBase64(result.data)),usage:data.usage??null};
 }
 if(provider==='bfl') {
  if(!['flux-kontext-pro','flux-kontext-max'].includes(model)) throw new Error('UNSUPPORTED_MODEL');
  data=await jsonRequest(fetcher,`https://api.bfl.ai/v1/${model}`,{method:'POST',headers:{'Content-Type':'application/json','x-key':apiKey},signal,body:JSON.stringify({prompt,input_image:toBase64(image.bytes),aspect_ratio:'2:3',output_format:'png'})});
  const url=new URL(data.polling_url);
  if(url.protocol!=='https:' || !(url.hostname==='api.bfl.ai'||url.hostname.endsWith('.bfl.ai'))) throw new Error('INVALID_POLL_URL');
  while(!signal.aborted) {
   const result=await jsonRequest(fetcher,url.href,{headers:{'x-key':apiKey},signal});
   if(result.status==='Ready') {
    const download=new URL(result.result.sample);
    if(download.protocol!=='https:'||!(download.hostname==='bfl.ai'||download.hostname.endsWith('.bfl.ai'))) throw new Error('INVALID_RESULT_URL');
    const response=await fetcher(download.href,{signal}); if(!response.ok) throw new Error('RESULT_DOWNLOAD_FAILED');
    return {...validImage(new Uint8Array(await response.arrayBuffer())),usage:{request_id:data.id}};
   }
   if(['Error','Failed','Content Moderated','Request Moderated'].includes(result.status)) throw new Error('PROVIDER_REJECTED');
   await new Promise((resolve,reject)=>{const timer=setTimeout(resolve,2000);signal.addEventListener('abort',()=>{clearTimeout(timer);reject(new Error('GENERATION_TIMEOUT'));},{once:true});});
  }
  throw new Error('GENERATION_TIMEOUT');
 }
 throw new Error('UNSUPPORTED_PROVIDER');
}

