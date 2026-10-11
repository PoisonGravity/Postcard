import {useState} from 'react';
import {usePostcardController} from '../controllers/usePostcardController';
import {configured} from '../services/client';
import {authService} from '../services/authService';
import {friendService} from '../services/friendService';
import {postcardService} from '../services/postcardService';
import {AuthForm} from '../components/AuthForm';
import {Composer} from '../components/Composer';
import {PostcardCard} from '../components/PostcardCard';
export function App(){const c=usePostcardController();const [tab,setTab]=useState('inbox');const me=c.user?.id;
 const accepted=c.friends.filter(f=>f.status==='accepted').map(f=>c.profiles[f.requester_id===me?f.addressee_id:f.requester_id]).filter(Boolean);
 const received=c.cards.filter(p=>p.recipient_id===me);const shown=tab==='sent'?c.cards.filter(p=>p.sender_id===me):received;
 return <main className="app"><header><a className="brand" href="/">邮笺 <small>POSTCARD STUDIO</small></a>{c.user&&<button className="secondary" disabled={c.busy} onClick={()=>c.run(authService.logout)}>退出登录</button>}</header><h1>把风景寄给想念的人</h1>{c.error&&<p role="alert" className="error">{c.error}</p>}{!configured?<section className="panel"><h2>连接你的邮局</h2><p>请在 .env.local 设置 Supabase 项目地址和 publishable key，然后重启开发服务器。</p></section>:c.loading?<p>正在连接邮局…</p>:!c.user?<AuthForm busy={c.busy} run={c.run}/>:<><nav>{[['inbox','收件箱'],['compose','制作明信片'],['friends','好友'],['sent','已寄出'],['album','邮票册']].map(([id,label])=><button key={id} className={tab===id?'':'secondary'} onClick={()=>setTab(id)}>{label}</button>)}</nav>{tab==='compose'?<Composer friends={accepted} busy={c.busy} onSend={i=>c.run(()=>postcardService.send(i))}/>:tab==='friends'?<section className="panel"><h2>好友关系</h2><p>你的好友码：<code>{me}</code></p><form onSubmit={e=>{e.preventDefault();const id=String(new FormData(e.currentTarget).get('id'));c.run(()=>friendService.request(id));}}><label>对方好友码<input name="id" required pattern="[a-fA-F0-9-]{36}"/></label><button disabled={c.busy}>发送好友申请</button></form>{c.friends.map(f=><div className="friend" key={f.id}><span>{c.profiles[f.requester_id===me?f.addressee_id:f.requester_id]?.display_name||'好友'} · {f.status==='accepted'?'已成为好友':f.status==='pending'?'等待接受':'已屏蔽'}</span>{f.status==='pending'&&f.addressee_id===me&&<button disabled={c.busy} onClick={()=>c.run(()=>friendService.accept(f.id))}>接受申请</button>}</div>)}</section>:<>{tab==='album'&&<section className="panel stats"><strong>{received.length} 张来信</strong><strong>{new Set(received.map(p=>p.city).filter(Boolean)).size} 个城市</strong><strong>{accepted.length} 位好友</strong></section>}<section className="cards">{shown.map(card=><PostcardCard key={card.id} card={card} incoming={card.recipient_id===me} onOpen={()=>c.run(()=>postcardService.open(card.id))}/>)}{!shown.length&&<p>这里还没有明信片。邀请好友开始交换风景吧。</p>}</section></>}</>}</main>;
}

