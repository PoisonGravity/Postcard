import { useEffect, useState } from 'react';
import type { Postcard } from '../models/types';
import { postcardService } from '../services/postcardService';

export function PostcardViewer({ card, incoming, onClose, onOpen }: { card: Postcard; incoming: boolean; onClose: () => void; onOpen: () => void }) {
  const [url, setUrl] = useState('');
  const [flipped, setFlipped] = useState(false);
  useEffect(() => { let active = true; postcardService.image(card.source_path).then(value => { if (active) setUrl(value); }); return () => { active = false; }; }, [card.source_path]);
  const open = () => { if (incoming && card.status === 'sent') onOpen(); setFlipped(true); };
  return <div className="viewer-backdrop" role="dialog" aria-modal="true" aria-label="明信片详情" onClick={onClose}>
    <div className={`postcard-viewer ${flipped ? 'flipped' : ''}`} onClick={event => event.stopPropagation()}>
      <button className="viewer-close" type="button" onClick={onClose} aria-label="关闭">×</button>
      <div className="viewer-card" onClick={open}>
        <div className="viewer-face viewer-front">{url ? <img src={url} alt={card.title} /> : <div className="image-placeholder">正在展开照片…</div>}<span className="viewer-hint">轻触翻面</span></div>
        <div className="viewer-face viewer-back"><div className="stamp">邮笺</div><h2>{card.title}</h2><p>{card.body || '这张明信片还没有写下正文。'}</p><div className="address-lines">收件地：{card.city || '世界某处'}<br />{new Date(card.created_at).toLocaleDateString()}</div></div>
      </div>
    </div>
  </div>;
}
