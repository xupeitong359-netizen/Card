import { useState, useRef } from 'react';
import { Download, FileJson, Copy, Trash2, Edit3, Share2, Layers, Check, ExternalLink } from 'lucide-react';
import type { CardData } from '../types.js';
import { CardView } from './CardView.js';
import { exportMultipleCardsJson, exportSingleCardJson, exportCardElementAsPng } from '../utils/export.js';

interface MyCardsListProps {
  cards: CardData[];
  onEdit: (card: CardData) => void;
  onDuplicate: (card: CardData) => void;
  onDelete: (id: string) => void;
  onOpenShare: (id: string) => void;
  isLoading: boolean;
}

export function MyCardsList({
  cards,
  onEdit,
  onDuplicate,
  onDelete,
  onOpenShare,
  isLoading,
}: MyCardsListProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleBatchExport = () => {
    if (cards.length === 0) return;
    exportMultipleCardsJson(cards);
  };

  const handleCopyLink = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/c/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  const handleDownloadSinglePng = async (card: CardData, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!card.id) return;
    const el = cardRefs.current[card.id];
    if (el) {
      await exportCardElementAsPng(el, card.name);
    }
  };

  const handleDownloadSingleJson = (card: CardData, e: React.MouseEvent) => {
    e.stopPropagation();
    exportSingleCardJson(card);
  };

  return (
    <div className="bg-white border border-stone-200/90 rounded-none p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 border-b border-stone-100 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-stone-700" />
            <h3 className="text-base font-bold text-stone-900">我的卡片</h3>
            <span className="text-xs bg-stone-100 text-stone-700 font-semibold px-2 py-0.5 rounded-none border border-stone-200">
              共 {cards.length} 张
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            保存在此浏览器中，可随时继续编辑、复制、删除或批量导出交付
          </p>
        </div>

        {cards.length > 0 && (
          <button
            type="button"
            onClick={handleBatchExport}
            className="px-2.5 sm:px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-medium text-[11px] sm:text-xs rounded-none transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm whitespace-nowrap shrink-0"
          >
            <FileJson className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">批量导出 JSON ({cards.length})</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-xs text-stone-400">正在加载我的卡片...</div>
      ) : cards.length === 0 ? (
        <div className="py-12 text-center border-2 border-dashed border-stone-200 rounded-none bg-stone-50/50">
          <p className="text-sm font-medium text-stone-600">这台浏览器尚未制作过卡片</p>
          <p className="text-xs text-stone-400 mt-1">
            在上方表单中填写名称并上传配图或文字标记，即可开始制作
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Card grid: 2 columns dense layout with 3px gap, straight corners, no border */}
          <div className="p-2 bg-stone-900 rounded-none border border-stone-800">
            <div className="grid grid-cols-2 gap-[3px]">
              {cards.map((card) => {
                const isSelected = selectedCardId === card.id;
                return (
                  <div
                    key={card.id}
                    className="relative group cursor-pointer"
                    onClick={() => setSelectedCardId(isSelected ? null : (card.id || null))}
                  >
                    <div
                      ref={(el) => {
                        if (card.id) cardRefs.current[card.id] = el;
                      }}
                    >
                      <CardView card={card} />
                    </div>

                    {/* Quick action bar on top-right on hover (High efficiency) */}
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(card);
                        }}
                        title="立即编辑"
                        className="p-1 bg-stone-900/90 hover:bg-stone-950 text-white rounded-none shadow-xs text-[10px]"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDownloadSinglePng(card, e)}
                        title="导出PNG图片"
                        className="p-1 bg-stone-900/90 hover:bg-stone-950 text-white rounded-none shadow-xs text-[10px]"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Desktop hover badge / click indicator */}
                    <div
                      className={`absolute inset-0 transition-opacity pointer-events-none ${
                        isSelected
                          ? 'ring-2 ring-stone-950 bg-stone-900/10'
                          : 'group-hover:bg-black/5 opacity-0 group-hover:opacity-100'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] text-stone-400">
            * 提示：点击任意卡片可在下方展开操作面板（编辑、复制、单张导出或删除）
          </p>

          {/* Expanded selected card actions drawer */}
          {selectedCardId && (
            (() => {
              const activeCard = cards.find((c) => c.id === selectedCardId);
              if (!activeCard) return null;
              return (
                <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-none animate-fade-in">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2.5 border-b border-stone-200/80 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-900">选中卡片：{activeCard.name}</span>
                      <span className="text-[10px] text-stone-500 font-mono">ID: {activeCard.id}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCardId(null)}
                      className="text-xs text-stone-400 hover:text-stone-600"
                    >
                      收起
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(activeCard)}
                      className="px-3 py-1.5 bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 text-xs font-medium rounded-none flex items-center gap-1.5 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-stone-600" />
                      <span>继续编辑</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDuplicate(activeCard)}
                      className="px-3 py-1.5 bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 text-xs font-medium rounded-none flex items-center gap-1.5 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5 text-stone-600" />
                      <span>复制一张</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDownloadSingleJson(activeCard, e)}
                      className="px-3 py-1.5 bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 text-xs font-medium rounded-none flex items-center gap-1.5 transition-colors"
                    >
                      <FileJson className="w-3.5 h-3.5 text-stone-600" />
                      <span>导出 JSON</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDownloadSinglePng(activeCard, e)}
                      className="px-3 py-1.5 bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 text-xs font-medium rounded-none flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-stone-600" />
                      <span>导出 PNG 图片</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleCopyLink(activeCard.id!, e)}
                      className="px-3 py-1.5 bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 text-xs font-medium rounded-none flex items-center gap-1.5 transition-colors"
                    >
                      {copiedId === activeCard.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-medium">链接已复制</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5 text-stone-600" />
                          <span>复制分享链接</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenShare(activeCard.id!)}
                      className="px-3 py-1.5 bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 text-xs rounded-none flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3 text-stone-500" />
                      <span>打开独立预览页</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`确定要从我的卡片中移除「${activeCard.name}」吗？`)) {
                          onDelete(activeCard.id!);
                          setSelectedCardId(null);
                        }
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-red-50 border border-red-200 text-red-600 text-xs font-medium rounded-none flex items-center gap-1.5 ml-auto transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      <span>删除</span>
                    </button>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}
    </div>
  );
}
