export type Tab = 'inbox' | 'compose' | 'friends' | 'sent' | 'album';

const items: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'inbox', label: '收件箱', icon: '⌂' },
  { id: 'friends', label: '好友', icon: '♧' },
  { id: 'compose', label: '制作', icon: '+' },
  { id: 'sent', label: '已寄出', icon: '↗' },
  { id: 'album', label: '邮票册', icon: '▧' },
];

export function BottomNav({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return <nav className="bottom-nav" aria-label="主导航">
    {items.map(item => <button key={item.id} type="button" className={`bottom-nav-item ${item.id === tab ? 'active' : ''} ${item.id === 'compose' ? 'compose-tab' : ''}`} onClick={() => onChange(item.id)}>
      <span className="bottom-nav-icon">{item.icon}</span><span>{item.label}</span>
    </button>)}
  </nav>;
}
