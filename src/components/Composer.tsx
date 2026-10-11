import { useEffect, useState, type FormEvent } from 'react';
import type { Profile, CardInput } from '../models/types';
import { applyLocalStyle, localStyles, type LocalStyle } from '../services/styleService';

export function Composer({ friends, busy, onSend }: { friends: Profile[]; busy: boolean; onSend: (input: CardInput) => Promise<boolean> }) {
  const [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState(''), [style, setStyle] = useState<LocalStyle>('original'), [processing, setProcessing] = useState(false);
  useEffect(() => { if (!file) { setPreview(''); return; } const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!file) return; const form = event.currentTarget; const values = new FormData(form); setProcessing(true); try { const rendered = await applyLocalStyle(file, style); const sent = await onSend({ recipientId: String(values.get('recipient')), title: String(values.get('title')), body: String(values.get('body')), city: String(values.get('city')), file: rendered }); if (sent) { form.reset(); setFile(null); setStyle('original'); } } finally { setProcessing(false); } };
  const sending = busy || processing;
  return <form className="panel composer-page" onSubmit={submit}>
    <div className="composer-hero"><span className="eyebrow">CREATE A MEMORY</span><h2>把今天寄出去</h2><p>选一张照片，给它一种气质，再写下想说的话。</p><label className="upload">{preview ? <img src={preview} alt="上传照片预览" /> : <><strong>＋</strong><span>选择一张风景照片</span></>}<input type="file" accept="image/jpeg,image/png,image/webp" required onChange={event => setFile(event.target.files?.[0] ?? null)} /></label></div>
    <div className="composer-fields"><label>寄给<select name="recipient" required><option value="">选择好友</option>{friends.map(friend => <option key={friend.id} value={friend.id}>{friend.display_name || friend.id}</option>)}</select></label><div className="style-picker"><span>照片风格</span><div>{localStyles.map(option => <button type="button" key={option.id} className={style === option.id ? '' : 'secondary'} onClick={() => setStyle(option.id)}>{option.label}<small>{option.description}</small></button>)}</div></div><label>标题<input name="title" required maxLength={120} placeholder="给这段风景一个名字" /></label><label>正文<textarea name="body" maxLength={2000} placeholder="写一句想说的话…" /></label><label>寄出城市<input name="city" maxLength={100} placeholder="例如：厦门" /></label><button className="send-button" disabled={sending || !file || !friends.length}>{sending ? <><span className="spinner" />正在制作并寄出…</> : '寄出明信片 ↗'}</button>{!friends.length && <p>先添加并接受好友，才能寄信。</p>}</div>
    {sending && <div className="send-overlay"><div className="paper-plane">✈</div><strong>{processing ? '正在准备你的风格…' : '正在穿过云层寄出…'}</strong><span>请稍等，照片很快就会抵达</span></div>}
  </form>;
}
