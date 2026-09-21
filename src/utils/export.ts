import { toPng } from 'html-to-image';
import type { CardData, ExportCardJson } from '../types.js';

export function formatCardForExport(card: CardData): ExportCardJson {
  let fullImageUrl: string | null = null;
  if (card.imageUrl) {
    if (card.imageUrl.startsWith('http://') || card.imageUrl.startsWith('https://')) {
      fullImageUrl = card.imageUrl;
    } else if (card.imageUrl.startsWith('/')) {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      fullImageUrl = `${origin}${card.imageUrl}`;
    } else {
      fullImageUrl = card.imageUrl;
    }
  }

  return {
    name: card.name,
    category: card.category,
    desc: card.desc || '',
    imageUrl: fullImageUrl,
    mark: card.mark ? card.mark : null,
    markStrike: Boolean(card.markStrike),
    bgColor: card.bgColor || null,
  };
}

export function downloadJsonFile(data: ExportCardJson | ExportCardJson[], filename: string) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportSingleCardJson(card: CardData) {
  const formatted = formatCardForExport(card);
  const safeName = (card.name || 'card').replace(/[\\/:*?"<>|]/g, '_');
  downloadJsonFile(formatted, `${safeName}.json`);
}

export function exportMultipleCardsJson(cards: CardData[]) {
  const formatted = cards.map(formatCardForExport);
  downloadJsonFile(formatted, `fansland-cards-${Date.now()}.json`);
}

export async function exportCardElementAsPng(element: HTMLElement, filename?: string): Promise<void> {
  // Use toPng with high pixelRatio for crisp preview export
  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 3,
    backgroundColor: '#ffffff',
  });

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename ? `${filename.replace(/[\\/:*?"<>|]/g, '_')}.png` : `fansland-card-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
