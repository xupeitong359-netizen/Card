export type CategoryId = string;

export interface CategoryOption {
  id: CategoryId;
  label: string;
  desc?: string;
  isCustom?: boolean;
}

export const CATEGORIES: CategoryOption[] = [
  { id: 'babel', label: '语言', desc: '方言、外语、流行语梗' },
  { id: 'politics', label: '公共立场', desc: '社会态度、价值观念' },
  { id: 'culture', label: '地区与文化', desc: '籍贯、生活习惯与地域文化' },
  { id: 'game', label: '游戏圈', desc: '游戏阵营、厨力与玩家梗' },
  { id: 'creative', label: '创作与学术', desc: '专业领域、创作偏好与学派' },
  { id: 'media', label: '娱乐与阅读', desc: '追剧、听歌、动漫与书籍' },
  { id: 'fansland', label: '粉丝大陆身份', desc: '虚拟国家城邦、称号与角色' },
];

export interface CardData {
  id?: string;
  name: string;
  category: CategoryId;
  desc: string;
  imageUrl: string | null;
  mark: string | null;
  markStrike: boolean;
  bgColor?: string | null;
  createdAt?: number;
  updatedAt?: number;
}

export interface ExportCardJson {
  name: string;
  category: CategoryId;
  desc: string;
  imageUrl: string | null;
  mark: string | null;
  markStrike: boolean;
  bgColor?: string | null;
}

export const PALETTE = [
  { card: 'bg-sky-50',     icon: 'bg-sky-200/70',     text: 'text-sky-900' },
  { card: 'bg-amber-50',   icon: 'bg-amber-200/70',   text: 'text-amber-900' },
  { card: 'bg-violet-50',  icon: 'bg-violet-200/70',  text: 'text-violet-900' },
  { card: 'bg-emerald-50', icon: 'bg-emerald-200/70', text: 'text-emerald-900' },
  { card: 'bg-pink-50',    icon: 'bg-pink-200/70',    text: 'text-pink-900' },
  { card: 'bg-blue-50',    icon: 'bg-blue-200/70',    text: 'text-blue-900' },
  { card: 'bg-rose-50',    icon: 'bg-rose-200/70',    text: 'text-rose-900' },
  { card: 'bg-teal-50',    icon: 'bg-teal-200/70',    text: 'text-teal-900' },
  { card: 'bg-orange-50',  icon: 'bg-orange-200/70',  text: 'text-orange-900' },
  { card: 'bg-indigo-50',  icon: 'bg-indigo-200/70',  text: 'text-indigo-900' },
];

export const hash = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
};

export function getCardTheme(seed?: string) {
  const s = seed || 'default-preview-seed';
  return PALETTE[hash(s) % PALETTE.length];
}

export function isDarkColor(colorStr?: string | null): boolean {
  if (!colorStr) return false;
  const c = colorStr.trim();
  if (c.startsWith('#')) {
    let hex = c.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map(x => x + x).join('');
    }
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq < 135;
    }
  }
  const rgbMatch = c.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq < 135;
  }
  return false;
}

export const PRESET_BG_COLORS = [
  { label: '默认/自动', value: null, border: 'border-stone-300' },
  { label: '纯白', value: '#FFFFFF', border: 'border-stone-300' },
  { label: '浅暖灰', value: '#F5F5F4', border: 'border-stone-300' },
  { label: '浅天蓝', value: '#F0F9FF', border: 'border-sky-200' },
  { label: '浅草绿', value: '#F0FDF4', border: 'border-emerald-200' },
  { label: '浅鹅黄', value: '#FFFBEB', border: 'border-amber-200' },
  { label: '浅紫罗兰', value: '#F5F3FF', border: 'border-violet-200' },
  { label: '浅玫瑰粉', value: '#FFF1F2', border: 'border-rose-200' },
  { label: '极夜黑', value: '#18181B', border: 'border-stone-800' },
  { label: '深空蓝', value: '#0F172A', border: 'border-slate-800' },
];
