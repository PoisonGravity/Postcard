export type LocalStyle = 'original' | 'vivid' | 'warm' | 'cool' | 'film' | 'mono' | 'fade';

export type FilterPreset = { id: LocalStyle; label: string; description: string; css: string };

export const localStyles: FilterPreset[] = [
  { id: 'original', label: '原图', description: '不改变颜色', css: 'none' },
  { id: 'vivid', label: '鲜明', description: '增强色彩和层次', css: 'saturate(1.28) contrast(1.08) brightness(1.03)' },
  { id: 'warm', label: '暖阳', description: '温暖的旅行色调', css: 'sepia(.16) saturate(1.16) contrast(1.04) brightness(1.04)' },
  { id: 'cool', label: '冷调', description: '清透的蓝绿色调', css: 'hue-rotate(12deg) saturate(1.08) contrast(1.06) brightness(1.02)' },
  { id: 'film', label: '胶片', description: '柔和、低饱和颗粒感', css: 'sepia(.2) saturate(.82) contrast(1.08) brightness(1.05)' },
  { id: 'mono', label: '黑白', description: '高对比黑白照片', css: 'grayscale(1) contrast(1.16) brightness(1.04)' },
  { id: 'fade', label: '褪色', description: '轻柔的旧照片质感', css: 'saturate(.72) contrast(.9) brightness(1.08) sepia(.08)' },
];

export function filterCss(style: LocalStyle): string { return localStyles.find(item => item.id === style)?.css || 'none'; }

export async function applyLocalStyle(file: File, style: LocalStyle): Promise<File> {
  if (style === 'original') return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / bitmap.width);
  const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d'); if (!context) return file;
  context.filter = filterCss(style); context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', .92));
  return blob ? new File([blob], `${file.name.replace(/\.[^.]+$/, '')}-${style}.jpg`, { type: 'image/jpeg' }) : file;
}
