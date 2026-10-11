import type { ReactNode } from 'react';
export type Tab = 'inbox' | 'compose' | 'friends' | 'sent' | 'album';
type IconName = 'inbox' | 'friends' | 'compose' | 'sent' | 'album';
const items: Array<{ id: Tab; label: string; icon: IconName }> = [
  { id: 'inbox', label: '收件箱', icon: 'inbox' }, { id: 'friends', label: '好友', icon: 'friends' }, { id: 'compose', label: '制作', icon: 'compose' }, { id: 'sent', label: '已寄出', icon: 'sent' }, { id: 'album', label: '邮票册', icon: 'album' },
];
function Icon({ name }: { name: IconName }): ReactNode {
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (name === 'inbox') return <svg {...common}><path d="M4 10.5 12 4l8 6.5v8.2a1.3 1.3 0 0 1-1.3 1.3H5.3A1.3 1.3 0 0 1 4 18.7z"/><path d="M4 14h4l1.5 2h5L16 14h4"/></svg>;
  if (name === 'friends') return <svg {...common}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.3"/><path d="M3.5 19c.5-3 2.3-4.5 5.5-4.5s5 1.5 5.5 4.5M14 14.5c2.7-.3 4.8 1 5.5 3.5"/></svg>;
  if (name === 'sent') return <svg {...common}><path d="m5 19 14-7L5 5l1.8 5.4L15 12l-8.2 1.6z"/></svg>;
  if (name === 'album') return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/></svg>;
  return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
}
export function BottomNav({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return <nav className="bottom-nav" aria-label="主导航">{items.map(item => <button key={item.id} type="button" aria-label={item.label} className={`bottom-nav-item ${item.id === tab ? 'active' : ''} ${item.id === 'compose' ? 'compose-tab' : ''}`} onClick={() => onChange(item.id)}><span className="bottom-nav-icon"><Icon name={item.icon} /></span><span className="bottom-nav-label">{item.label}</span></button>)}</nav>;
}
