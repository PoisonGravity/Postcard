import {useEffect,useState} from 'react';
import type {Profile,CardInput} from '../models/types';
export function Composer({friends,busy,onSend}:{friends:Profile[];busy:boolean;onSend:(i:CardInput)=>Promise<boolean>}) {
 const [file,setFile]=useState<File|null>(null),[preview,setPreview]=useState('');
 useEffect(()=>{if(!file){setPreview('');return;}const u=URL.createObjectURL(file);setPreview(u);return()=>URL.revokeObjectURL(u)},[file]);
 return <form className="panel composer" onSubmit={async e=>{e.preventDefault();const form=e.currentTarget;if(!file)return;const f=new FormData(form);if(await onSend({recipientId:String(f.get('recipient')),title:String(f.get('title')),body:String(f.get('body')),city:String(f.get('city')),file})){form.reset();setFile(null);}}}>
 <div><h2>写一张明信片</h2><p>首版支持原图寄送。AI 风格生成尚未启用。</p><label className="upload">{preview?<img src={preview} alt="上传照片预览"/>:'选择你的风景照片'}<input type="file" accept="image/jpeg,image/png,image/webp" required onChange={e=>setFile(e.target.files?.[0]??null)}/></label></div>
 <div><label>寄给<select name="recipient" required><option value="">选择好友</option>{friends.map(f=><option key={f.id} value={f.id}>{f.display_name||f.id}</option>)}</select></label><label>标题<input name="title" required maxLength={120}/></label><label>正文<textarea name="body" maxLength={2000}/></label><label>寄出城市<input name="city" maxLength={100}/></label><button disabled={busy||!file||!friends.length}>{busy?'正在上传并寄出…':'寄出明信片'}</button>{!friends.length&&<p>先添加并接受好友，才能寄信。</p>}</div></form>;
}

