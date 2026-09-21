import { useEffect, useState, useRef } from 'react';
import { Download, FileJson, Copy, ArrowLeft, Share2, Check, AlertCircle } from 'lucide-react';
import type { CardData } from '../types.js';
import { CardView } from './CardView.js';
import { exportSingleCardJson, exportCardElementAsPng } from '../utils/export.js';

interface ShareCardViewProps {
  cardId: string;
  onCopyToMyCards: (card: CardData) => void;
  onGoHome: () => void;
}

export function ShareCardView({ cardId, onCopyToMyCards, onGoHome }: ShareCardViewProps) {
  const [card, setCard] = useState<CardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadCard() {
      setIsLoading(true);
      setError(null);
      try {
        const resp = await fetch(`/api/cards/${cardId}`);
        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data.error || '获取卡片失败');
        }
        setCard(data.card);
      } catch (err: any) {
        setError(err.message || '卡片不存在或已被删除');
      } finally {
        setIsLoading(false);
      }
    }
    loadCard();
  }, [cardId]);

  const handleExportJson = () => {
    if (!card) return;
    exportSingleCardJson(card);
  };

  const handleExportPng = async () => {
    if (!card || !cardRef.current) return;
    setIsExportingPng(true);
    try {
      await exportCardElementAsPng(cardRef.current, card.name);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const handleCopyToMine = () => {
    if (!card) return;
    onCopyToMyCards(card);
    setCopySuccess(true);
  };

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-900 flex flex-col justify-between p-3 sm:p-6">
      <div className="max-w-xl mx-auto w-full pt-4 sm:pt-8">
        {/* Navigation bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={onGoHome}
            className="text-xs font-medium text-stone-600 hover:text-stone-900 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 rounded-none shadow-xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>返回制作站</span>
          </button>

          <div className="flex items-center gap-2">
            <img
              src="/Tm.png"
              alt="FansLand"
              className="w-5 h-5 object-contain"
            />
            <span className="text-xs text-stone-600 font-semibold">
              FansLand 2.0 虚拟国家卡片分享
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white border border-stone-200 p-12 text-center text-xs text-stone-400">
            正在读取卡片信息...
          </div>
        ) : error || !card ? (
          <div className="bg-white border border-red-200 p-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
            <p className="text-sm font-semibold text-stone-800">{error || '未找到该卡片'}</p>
            <p className="text-xs text-stone-500">可能该卡片已被删除或链接有误</p>
            <button
              type="button"
              onClick={onGoHome}
              className="mt-2 px-4 py-2 bg-stone-900 text-white text-xs font-medium rounded-none hover:bg-stone-800"
            >
              制作我自己的卡片
            </button>
          </div>
        ) : (
          <div className="bg-white border border-stone-200/90 rounded-none p-5 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-stone-100 pb-4">
              <span className="text-[10px] font-bold tracking-wider text-stone-400 uppercase">
                FansLand 2.0 Card Preview
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-stone-900 mt-1">
                {card.name}
              </h1>
              <p className="text-xs text-stone-500 mt-0.5">
                此卡片可直接导出交付给游戏运营者，或复制保存到本地卡包中继续修改
              </p>
            </div>

            {/* Card preview section */}
            <div className="p-4 bg-stone-100 border border-stone-200/80 rounded-none flex items-center justify-center">
              <div className="w-full max-w-sm">
                <CardView ref={cardRef} card={card} id="share-card-element" />
              </div>
            </div>

            {copySuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between rounded-none">
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>已成功复制此卡片到「我的卡片」！</span>
                </span>
                <button
                  type="button"
                  onClick={onGoHome}
                  className="underline font-semibold hover:text-emerald-950"
                >
                  去编辑
                </button>
              </div>
            )}

            {/* The 3 Required Buttons */}
            <div className="pt-2 border-t border-stone-100 space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* 1. 导出 JSON */}
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="px-3 py-2.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-900 font-medium text-xs rounded-none flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileJson className="w-4 h-4 text-stone-700" />
                  <span>导出 JSON</span>
                </button>

                {/* 2. 导出图片 */}
                <button
                  type="button"
                  onClick={handleExportPng}
                  disabled={isExportingPng}
                  className="px-3 py-2.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-900 font-medium text-xs rounded-none flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4 text-stone-700" />
                  <span>{isExportingPng ? '渲染中...' : '导出图片 (PNG)'}</span>
                </button>

                {/* 3. 复制一张到我的卡片 */}
                <button
                  type="button"
                  onClick={handleCopyToMine}
                  className="px-3 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs rounded-none flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <Copy className="w-4 h-4" />
                  <span>复制到我的卡片</span>
                </button>
              </div>

              {/* Share link button */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full py-2 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs rounded-none flex items-center justify-center gap-1.5 transition-colors"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-medium">链接已复制到剪贴板，快发到群里吧</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-stone-500" />
                    <span>复制此卡片专属分享链接</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="py-6 text-center text-xs text-stone-400 flex items-center justify-center gap-2">
        <img src="/Tm.png" alt="FansLand" className="w-4 h-4 object-contain opacity-70" />
        <span>FansLand 2.0 · 虚拟国家个性化卡片制作站</span>
      </div>
    </div>
  );
}
