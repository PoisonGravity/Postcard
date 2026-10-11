export type LocalStyle = 'original' | 'pixel' | 'ink' | 'sketch';

export const localStyles: Array<{ id: LocalStyle; label: string; description: string }> = [
  { id: 'original', label: '原图', description: '保留照片原貌' },
  { id: 'pixel', label: '像素画', description: '低分辨率复古颗粒' },
  { id: 'ink', label: '水墨画', description: '低饱和墨色与留白' },
  { id: 'sketch', label: '简笔画', description: '边缘线稿效果' },
];

function filterFor(style: LocalStyle) {
  if (style === 'ink') return 'grayscale(1) contrast(1.18) sepia(.18)';
  if (style === 'sketch') return 'grayscale(1) contrast(1.8) brightness(1.08)';
  return 'none';
}

export async function applyLocalStyle(file: File, style: LocalStyle): Promise<File> {
  if (style === 'original') return file;
  const bitmap = await createImageBitmap(file);
  const scale = style === 'pixel' ? Math.min(1, 480 / bitmap.width) : Math.min(1, 1600 / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d'); if (!context) return file;
  context.filter = filterFor(style); context.imageSmoothingEnabled = style !== 'pixel'; context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  if (style === 'pixel') { const small = document.createElement('canvas'); small.width = Math.max(1, Math.round(canvas.width / 4)); small.height = Math.max(1, Math.round(canvas.height / 4)); const smallContext = small.getContext('2d'); if (smallContext) { smallContext.imageSmoothingEnabled = false; smallContext.drawImage(canvas, 0, 0, small.width, small.height); context.clearRect(0, 0, canvas.width, canvas.height); context.imageSmoothingEnabled = false; context.drawImage(small, 0, 0, canvas.width, canvas.height); } }
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', .9));
  return blob ? new File([blob], `${file.name.replace(/\.[^.]+$/, '')}-${style}.jpg`, { type: 'image/jpeg' }) : file;
}
