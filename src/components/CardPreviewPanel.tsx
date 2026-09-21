import { useRef, useState } from 'react';
import { Download, FileJson, Share2, Copy, Check, Eye } from 'lucide-react';
import type { CardData, CategoryOption } from '../types.js';
import { CATEGORIES } from '../types.js';
import { CardView } from './CardView.js';
import { exportCardElementAsPng, exportSingleCardJson } from '../utils/export.js';

interface CardPreviewPanelProps {
  card: CardData;
  onCopyCard?: (card: CardData) => void;
  categories?: CategoryOption[];
}

export function CardPreviewPanel({ card, onCopyCard, categories }: CardPreviewPanelProps) {
  const cardElementRef = useRef<HTMLDivElement>(null);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const categoryInfo = categories?.find((c) => c.id === card.category) || CATEGORIES.find((c) => c.id === card.category);
  const categoryLabel = categoryInfo?.label || card.category || '未选分区';

  const handleExportJson = () => {
    try {
      exportSingleCardJson(card);
      setExportNotice('已成功导出 JSON 文件');
      setTimeout(() => setExportNotice(null), 3000);
    } catch (err: any) {
      console.error('Export JSON error:', err);
      setExportNotice('导出失败: ' + err.message);
      setTimeout(() => setExportNotice(null), 3000);
    }
  };

  const handleExportPng = async () => {
    if (!cardElementRef.current) return;
    setIsExportingPng(true);
    try {
      await exportCardElementAsPng(cardElementRef.current, `${card.name || 'card'}`);
      setExportNotice('已成功导出卡片图片 (PNG)');
      setTimeout(() => setExportNotice(null), 3000);
    } catch (err: any) {
      console.error('Export PNG error:', err);
      setExportNotice('导出图片失败: ' + err.message);
      setTimeout(() => setExportNotice(null), 3000);
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleShareLink = () => {
    if (!card.id) {
      setExportNotice('请先点击「保存卡片」生成专属分享链接');
      setTimeout(() => setExportNotice(null), 3000);
      return;
    }

    const shareUrl = `${window.location.origin}/c/${card.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedLink(true);
      setExportNotice('已复制分享链接到剪贴板');
      setTimeout(() => {
        setCopiedLink(false);
        setExportNotice(null);
      }, 3000);
    }).catch(() => {
      setExportNotice(`分享链接：${shareUrl}`);
      setTimeout(() => setExportNotice(null), 5000);
    });
  };

  return (
    <div className="bg-white border border-stone-200/90 rounded-none p-4 sm:p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-stone-600" />
            <h3 className="text-sm sm:text-base font-bold text-stone-900">卡片实时预览</h3>
          </div>
          <span className="text-[11px] font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded-none">
            {categoryLabel}
          </span>
        </div>

        {/* The single card preview */}
        <div className="mb-4">
          <div className="p-3 sm:p-4 bg-stone-100 border border-stone-200/80 rounded-none flex items-center justify-center">
            <div className="w-full max-w-md">
              <CardView ref={cardElementRef} card={card} id="active-card-preview" />
            </div>
          </div>
        </div>

        {exportNotice && (
          <div className="mb-3 p-2 text-xs bg-stone-100 border border-stone-300 text-stone-800 rounded-none text-center animate-fade-in">
            {exportNotice}
          </div>
        )}
      </div>

      {/* Export & Share buttons */}
      <div className="pt-3 border-t border-stone-100 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleExportJson}
            className="px-2 sm:px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium text-[11px] sm:text-xs rounded-none border border-stone-300 flex items-center justify-center gap-1 sm:gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            title="下载规范 JSON 数据文件"
          >
            <FileJson className="w-3.5 h-3.5 text-stone-600 shrink-0" />
            <span className="whitespace-nowrap">导出 JSON</span>
          </button>

          <button
            type="button"
            onClick={handleExportPng}
            disabled={isExportingPng}
            className="px-2 sm:px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium text-[11px] sm:text-xs rounded-none border border-stone-300 flex items-center justify-center gap-1 sm:gap-1.5 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
            title="导出为高分辨率 PNG 图片"
          >
            <Download className="w-3.5 h-3.5 text-stone-600 shrink-0" />
            <span className="whitespace-nowrap">{isExportingPng ? '渲染中...' : '导出图片'}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleShareLink}
          className="w-full px-2.5 sm:px-3 py-2 bg-stone-50 hover:bg-stone-100 text-stone-700 text-[11px] sm:text-xs rounded-none border border-stone-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          {copiedLink ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-emerald-700 font-medium whitespace-nowrap">链接已复制</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5 text-stone-500 shrink-0" />
              <span className="truncate">{card.id ? '复制卡片专属链接' : '保存后可生成分享链接'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
