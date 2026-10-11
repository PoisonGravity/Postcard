import { useEffect, useState } from 'react';
import type { Postcard } from '../models/types';
import { postcardService } from '../services/postcardService';
export function PostcardCard({ card, incoming, onOpen }: { card: Postcard; incoming: boolean; onOpen: () => void }) {
 const [url,setUrl]=useState(''),[error,setError]=useState('');
 useEffect(()=>{let alive=true;postcardService.image(card.source_path).then(u=>{if(alive)setUrl(u)}).catch(()=>{if(alive)setError('照片暂时不可用')});return()=>{alive=false}},[card.source_path]);
 const sealed=incoming&&card.status==='sent';
 return <article className={`postcard ${sealed?'sealed':''}`} onClick={onOpen} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')onOpen()}}>{sealed?<div className="envelope">✉<span>轻触拆开来信</span></div>:<>{url?<img src={url} alt={card.title}/>:<p>{error||'正在取出照片…'}</p>}<div className="card-body"><h3>{card.title}</h3><p className="message">{card.body}</p></div></>}<footer>{card.city||'未标注地点'} · {new Date(card.created_at).toLocaleDateString()} · {incoming?'收到':'寄出'}{card.status==='opened'?' · 已打开':''}</footer></article>;
}
