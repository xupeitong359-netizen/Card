import { useState } from 'react';
import { ShieldAlert, CheckCircle2, Sparkles, X, FileText } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: (dontShowAgain?: boolean) => void;
}

export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onClose(dontShowAgain);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg bg-white border border-stone-300 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 bg-stone-50/80 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-stone-200/80 text-stone-700 text-[11px] font-semibold">
              <Sparkles className="w-3 h-3 text-stone-700" />
              <span>创作须知</span>
            </div>
            <h2 id="welcome-modal-title" className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
              欢迎使用个性化卡片制作网站
            </h2>
            <p className="text-xs text-stone-500">
              您无需登录即可直接开始创作，卡片将即时生成并存储
            </p>
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            className="text-stone-400 hover:text-stone-700 p-1 transition-colors"
            title="关闭提示"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body / Guidelines */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs leading-relaxed text-stone-600">
          {/* Item 1: 免登录与正式网站套用提醒 */}
          <div className="p-3 bg-stone-50 border border-stone-200 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-stone-900 text-xs">
              <CheckCircle2 className="w-4 h-4 text-stone-800 shrink-0" />
              <span>免登录创作与格式要求</span>
            </div>
            <p className="text-stone-600 text-[11px] sm:text-xs">
              您无需登录就可以开始创作。请特别留意：<strong>您制作的卡片很可能会被直接套用在正式网站上</strong>，请务必注意卡片名称、一句话说明与配图的排版格式及整洁度。
            </p>
          </div>

          {/* Item 2: 内容规范 */}
          <div className="p-3 bg-stone-50 border border-stone-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-stone-900 text-xs">
              <ShieldAlert className="w-4 h-4 text-stone-800 shrink-0" />
              <span>内容准则与发布红线</span>
            </div>
            <div className="space-y-1.5 pl-6 text-[11px] sm:text-xs">
              <div className="flex items-start gap-1.5">
                <span className="font-semibold text-stone-800 shrink-0">允许表达：</span>
                <span className="text-stone-700">允许政治敏感、允许政治立场表达。</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="font-semibold text-rose-700 shrink-0">绝对严禁：</span>
                <span className="text-stone-700">严禁色情、血腥、暴力、引人不适或虐待他人的任何内容。违规卡片将被清理下架。</span>
              </div>
            </div>
          </div>

          {/* Item 3: 命名建议 */}
          <div className="p-3 bg-stone-50 border border-stone-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-stone-900 text-xs">
              <FileText className="w-4 h-4 text-stone-800 shrink-0" />
              <span>卡片命名推荐</span>
            </div>
            <p className="text-stone-600 text-[11px] sm:text-xs">
              为了在主页与个人身份展示中达到最佳语境，推荐在卡片名称前加入：<strong className="text-stone-900 font-bold">此用户...</strong>
            </p>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <span className="inline-block px-2 py-1 bg-white border border-stone-300 font-mono text-[11px] text-stone-800">
                例：此用户反对一个中国原则
              </span>
              <span className="inline-block px-2 py-1 bg-white border border-stone-300 font-mono text-[11px] text-stone-800">
                例：此用户不吸烟
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-stone-200 bg-stone-50/50 flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-stone-500 hover:text-stone-800">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded-none border-stone-300 text-stone-900 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-[11px] whitespace-nowrap">下次不再弹出</span>
          </label>

          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold tracking-wide transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          >
            已知悉，开始创作
          </button>
        </div>
      </div>
    </div>
  );
}
