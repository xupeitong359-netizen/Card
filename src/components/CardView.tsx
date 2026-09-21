import { forwardRef } from 'react';
import type { CardData } from '../types.js';
import { PALETTE, hash, isDarkColor } from '../types.js';

interface CardViewProps {
  card: CardData;
  className?: string;
  id?: string;
  onClick?: () => void;
}

export const CardView = forwardRef<HTMLDivElement, CardViewProps>(function CardView(
  { card, className = '', id, onClick },
  ref
) {
  // Use card id or deterministic fallback string for hash
  const hashSeed = card.id || `${card.name}_${card.category}_${card.mark || card.imageUrl || 'preview'}`;
  const theme = PALETTE[hash(hashSeed) % PALETTE.length];

  const hasMark = Boolean(card.mark && card.mark.trim());
  const hasImage = Boolean(card.imageUrl && card.imageUrl.trim());

  const customBg = Boolean(card.bgColor && card.bgColor.trim());
  const isDark = customBg ? isDarkColor(card.bgColor) : false;

  const cardBgClass = customBg ? '' : theme.card;
  const titleClass = customBg
    ? (isDark ? 'text-white' : 'text-stone-950')
    : theme.text;
  const descClass = customBg
    ? (isDark ? 'text-stone-300/90' : 'text-stone-600')
    : 'text-stone-600';
  const markContainerClass = customBg
    ? (isDark ? 'bg-white/15 text-white' : 'bg-stone-900/10 text-stone-900')
    : `${theme.icon} ${theme.text}`;
  const noImageClass = customBg
    ? (isDark ? 'text-stone-400 bg-white/10' : 'text-stone-400 bg-stone-200/50')
    : `text-stone-400 bg-stone-200/50 ${theme.text}`;

  // Adaptive font size & line height for text mark
  const markText = (card.mark || '').trim();
  const markLen = markText.length;
  let markFontSize = 'text-xs sm:text-base';
  if (markLen >= 7) {
    markFontSize = 'text-[9px] sm:text-[11px] leading-[1.15] tracking-tighter';
  } else if (markLen >= 5) {
    markFontSize = 'text-[10px] sm:text-xs leading-[1.2] tracking-tight';
  } else if (markLen >= 3) {
    markFontSize = 'text-[11px] sm:text-sm leading-tight';
  } else {
    markFontSize = 'text-xs sm:text-base leading-tight font-black';
  }

  return (
    <div
      ref={ref}
      id={id}
      onClick={onClick}
      className={`group relative flex items-stretch rounded-none border-0 overflow-hidden select-none p-1 sm:p-1.5 transition-shadow ${cardBgClass} ${className}`}
      style={{
        borderRadius: 0,
        backgroundColor: customBg ? card.bgColor! : undefined,
      }}
    >
      {/* Icon / Mark block: fixed height (mobile ~44px, desktop ~64px) with adaptive width for text mark */}
      <div className="shrink-0 flex items-center justify-center overflow-hidden">
        {hasMark ? (
          <div
            className={`min-w-[44px] max-w-[80px] sm:min-w-[64px] sm:max-w-[108px] h-[44px] sm:h-[64px] flex items-center justify-center text-center font-bold px-1 sm:px-1.5 shrink-0 ${markContainerClass}`}
          >
            <span
              className={`w-full break-words text-center select-none ${markFontSize} ${
                card.markStrike ? 'line-through decoration-2 decoration-red-600' : ''
              }`}
            >
              {markText}
            </span>
          </div>
        ) : hasImage ? (
          <div className="h-[44px] sm:h-[64px] flex items-center justify-center shrink-0 overflow-hidden bg-white/40">
            <img
              src={card.imageUrl!}
              alt={card.name || '卡片配图'}
              crossOrigin="anonymous"
              className="h-full w-auto max-w-[90px] sm:max-w-[130px] object-contain block shrink-0"
            />
          </div>
        ) : (
          <div
            className={`w-[44px] h-[44px] sm:w-[64px] sm:h-[64px] flex flex-col items-center justify-center text-[10px] sm:text-xs shrink-0 ${noImageClass}`}
          >
            <span>无配图</span>
          </div>
        )}
      </div>

      {/* Right side text */}
      <div className="flex-1 min-w-0 flex flex-col justify-center px-1.5 sm:px-2 py-0.5 overflow-hidden">
        <div
          className={`font-bold text-xs sm:text-sm truncate leading-snug tracking-tight ${titleClass}`}
          title={card.name || '待填写卡片名称'}
        >
          {card.name || '待填写卡片名称'}
        </div>
        {card.desc && card.desc.trim() ? (
          <div
            className={`text-[10px] sm:text-xs line-clamp-2 leading-tight mt-0.5 break-words font-normal ${descClass}`}
            title={card.desc}
          >
            {card.desc}
          </div>
        ) : null}
      </div>
    </div>
  );
});

