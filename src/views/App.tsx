import { useState } from 'react';
import { usePostcardController } from '../controllers/usePostcardController';
import { configured } from '../services/client';
import { authService } from '../services/authService';
import { friendService } from '../services/friendService';
import { postcardService } from '../services/postcardService';
import { AuthForm } from '../components/AuthForm';
import { Composer } from '../components/Composer';
import { PostcardCard } from '../components/PostcardCard';
import { PostcardViewer } from '../components/PostcardViewer';
import { BottomNav, type Tab } from '../components/BottomNav';

export function App() {
  const c = usePostcardController();
  const [tab, setTab] = useState<Tab>('inbox');
  const [copied, setCopied] = useState(false);
  const [selected, setSelected] = useState<{ id: string; incoming: boolean } | null>(null);
  const me = c.user?.id;
  const accepted = c.friends.filter(f => f.status === 'accepted').map(f => c.profiles[f.requester_id === me ? f.addressee_id : f.requester_id]).filter(Boolean);
  const received = c.cards.filter(p => p.recipient_id === me);
  const shown = tab === 'sent' ? c.cards.filter(p => p.sender_id === me) : received;
  const selectedCard = selected ? c.cards.find(card => card.id === selected.id) : undefined;
  const copyFriendCode = async () => { if (!me) return; try { await navigator.clipboard.writeText(me); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { setCopied(false); } };
  const openCard = (id: string, incoming: boolean) => setSelected({ id, incoming });

  return <main className="app"><header><a className="brand" href="/">邮笺 <small>POSTCARD STUDIO</small></a>{c.user && <button className="secondary logout" disabled={c.busy} onClick={() => c.run(authService.logout)}>退出登录</button>}</header>
    {!configured ? <section className="panel connect-panel"><h2>连接你的邮局</h2><p>请在 .env.local 设置 Supabase 项目地址和 publishable key，然后重启开发服务器。</p></section> : c.loading ? <p>正在连接邮局…</p> : !c.user ? <AuthForm busy={c.busy} run={c.run} /> : <>
      <section className="page-heading"><span className="eyebrow">POSTCARD STUDIO</span><h1>{tab === 'inbox' ? '来自远方的信' : tab === 'compose' ? '制作一张明信片' : tab === 'friends' ? '和朋友保持联系' : tab === 'sent' ? '已经寄出的风景' : '你的邮票册'}</h1><p>{tab === 'inbox' ? '每一张来信，都是一个人认真想起你。' : '把生活里值得分享的片刻，留给重要的人。'}</p></section>
      {c.error && <p role="alert" className="error">{c.error}</p>}
      {tab === 'compose' ? <Composer friends={accepted} busy={c.busy} onSend={input => c.run(() => postcardService.send(input))} /> : tab === 'friends' ? <section className="panel friends-page"><h2>好友关系</h2><div className="friend-code"><span>你的好友码：<code>{me}</code></span><button type="button" className="secondary" onClick={copyFriendCode}>{copied ? '已复制' : '复制好友码'}</button></div><form onSubmit={e => { e.preventDefault(); const id = String(new FormData(e.currentTarget).get('id')); c.run(() => friendService.request(id)); }}><label>对方好友码<input name="id" required pattern="[a-fA-F0-9-]{36}" placeholder="粘贴好友码" /></label><button disabled={c.busy}>发送好友申请</button></form>{c.friends.map(f => <div className="friend" key={f.id}><span>{c.profiles[f.requester_id === me ? f.addressee_id : f.requester_id]?.display_name || '好友'} · {f.status === 'accepted' ? '已成为好友' : f.status === 'pending' ? '等待接受' : '已屏蔽'}</span>{f.status === 'pending' && f.addressee_id === me && <button disabled={c.busy} onClick={() => c.run(() => friendService.accept(f.id))}>接受申请</button>}</div>)}</section> : <>{tab === 'album' && <section className="panel stats"><strong>{received.length} 张来信</strong><strong>{new Set(received.map(p => p.city).filter(Boolean)).size} 个城市</strong><strong>{accepted.length} 位好友</strong></section>}<section className="cards">{shown.map(card => <PostcardCard key={card.id} card={card} incoming={card.recipient_id === me} onOpen={() => openCard(card.id, card.recipient_id === me)} />)}{!shown.length && <p className="empty-state">这里还没有明信片。邀请好友开始交换风景吧。</p>}</section></>}
      <BottomNav tab={tab} onChange={setTab} />
      {selectedCard && selected && <PostcardViewer card={selectedCard} incoming={selected.incoming} onClose={() => setSelected(null)} onOpen={() => c.run(() => postcardService.open(selectedCard.id))} />}
    </>}
  </main>;
}
