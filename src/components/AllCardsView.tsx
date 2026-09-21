import { useState, useRef, useMemo } from 'react';
import { Search, Plus, Download, FileJson, Copy, Share2, Layers, Check, ExternalLink } from 'lucide-react';
import type { CardData, CategoryId, CategoryOption } from '../types.js';
import { CATEGORIES } from '../types.js';
import { CardView } from './CardView.js';
import { exportCardElementAsPng, exportSingleCardJson } from '../utils/export.js';

interface AllCardsViewProps {
  cards: CardData[];
  myCardIds: string[];
  isLoading: boolean;
  onUseCard: (card: CardData) => void;
  onGoCreate: () => void;
  onOpenShare: (id: string) => void;
  onRefresh?: () => void;
  categories?: CategoryOption[];
}

export function AllCardsView({
  cards,
  myCardIds,
  isLoading,
  onUseCard,
  onGoCreate,
  onOpenShare,
  categories,
}: AllCardsViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const displayCategories = useMemo(() => {
    const base = categories && categories.length > 0 ? categories : CATEGORIES;
    const map = new Map<string, CategoryOption>();
    for (const c of base) {
      map.set(c.id, c);
    }
    // Also discover any category string present on cards
    for (const card of cards) {
      if (card.category && !map.has(card.category)) {
        map.set(card.category, { id: card.category, label: card.category, isCustom: true });
      }
    }
    return Array.from(map.values());
  }, [categories, cards]);

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const matchCat = selectedCategory === 'all' || card.category === selectedCategory;
      if (!matchCat) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      const matchName = card.name.toLowerCase().includes(q);
      const matchDesc = card.desc.toLowerCase().includes(q);
      const matchMark = card.mark?.toLowerCase().includes(q);
      return matchName || matchDesc || matchMark;
    });
  }, [cards, selectedCategory, searchQuery]);

  const handleCopyLink = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/c/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  const handleDownloadPng = async (card: CardData, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!card.id) return;
    const el = cardRefs.current[card.id];
    if (el) {
      await exportCardElementAsPng(el, card.name);
    }
  };

  const handleDownloadJson = (card: CardData, e: React.MouseEvent) => {
    e.stopPropagation();
    exportSingleCardJson(card);
  };

  return (
    <div className="bg-white border border-stone-200/90 rounded-none p-4 sm:p-6 shadow-sm space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-stone-700 shrink-0" />
            <h3 className="text-base font-bold text-stone-900 tracking-tight whitespace-nowrap">全部卡片</h3>
            <span className="text-[11px] bg-stone-100 text-stone-700 font-semibold px-2 py-0.5 rounded-none border border-stone-200 whitespace-nowrap shrink-0">
              共 {cards.length} 张
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5">
            浏览所有制作并保存的个性化卡片，可一键复用为模板或直接导出
          </p>
        </div>

        <button
          type="button"
          onClick={onGoCreate}
          className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs rounded-none transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          <span>制作新卡片</span>
        </button>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="space-y-2.5">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="按卡片名称、标记或说明搜索..."
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-stone-50/80 border border-stone-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900 text-stone-900 placeholder:text-stone-400"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 text-[11px] sm:text-xs whitespace-nowrap shrink-0 transition-colors border ${
              selectedCategory === 'all'
                ? 'border-stone-900 bg-stone-900 text-white font-medium'
                : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700'
            }`}
          >
            全部 ({cards.length})
          </button>
          {displayCategories.map((cat) => {
            const count = cards.filter((c) => c.category === cat.id).length;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 text-[11px] sm:text-xs whitespace-nowrap shrink-0 transition-colors border ${
                  isSelected
                    ? 'border-stone-900 bg-stone-900 text-white font-medium'
                    : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700'
                }`}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards List or Empty State */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-stone-400">
          正在加载卡片库...
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="py-12 text-center space-y-2 border border-dashed border-stone-200 p-6 bg-stone-50/50">
          <p className="text-xs text-stone-500">
            {searchQuery || selectedCategory !== 'all' ? '未找到符合条件的卡片' : '暂无已保存的卡片'}
          </p>
          <button
            type="button"
            onClick={onGoCreate}
            className="px-3 py-1.5 bg-stone-900 text-white text-xs font-medium inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>立即制作第一张卡片</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:gap-3.5 pt-1">
          {filteredCards.map((card) => {
            const isMine = card.id ? myCardIds.includes(card.id) : false;
            return (
              <div
                key={card.id || card.name}
                className="border border-stone-200 bg-white p-1.5 sm:p-2.5 flex flex-col justify-between hover:border-stone-300 transition-colors"
              >
                {/* Visual Card Component */}
                <div className="w-full flex justify-center bg-stone-100/60 p-1 sm:p-1.5 border border-stone-200/50">
                  <div className="w-full max-w-full">
                    <CardView
                      ref={(el) => {
                        if (card.id) cardRefs.current[card.id] = el;
                      }}
                      card={card}
                    />
                  </div>
                </div>

                {/* Compact Action Bar directly below card (No redundant description) */}
                <div className="flex items-center justify-between gap-1 pt-2 mt-1 border-t border-stone-100">
                  <div className="flex items-center gap-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => onUseCard(card)}
                      className="px-1.5 sm:px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 text-[10px] sm:text-xs font-medium flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      title="以此卡片为模板在工作台继续制作"
                    >
                      <Copy className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-stone-600 shrink-0" />
                      <span className="whitespace-nowrap">套用</span>
                    </button>
                    {isMine && (
                      <span className="text-[9px] sm:text-[10px] bg-stone-100 text-stone-700 px-1 py-0.5 border border-stone-200 font-medium whitespace-nowrap shrink-0">
                        我的
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleDownloadPng(card, e)}
                      className="p-1 text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                      title="导出 PNG 图片"
                    >
                      <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDownloadJson(card, e)}
                      className="p-1 text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                      title="导出规范 JSON"
                    >
                      <FileJson className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>

                    {card.id && (
                      <button
                        type="button"
                        onClick={(e) => handleCopyLink(card.id!, e)}
                        className="p-1 text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                        title="复制专属链接"
                      >
                        {copiedId === card.id ? (
                          <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600" />
                        ) : (
                          <Share2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
