import { useState, useRef, ChangeEvent, DragEvent, useEffect } from 'react';
import {
  Upload,
  X,
  Check,
  Image as ImageIcon,
  Strikethrough,
  Sparkles,
  AlertCircle,
  RotateCcw,
  Palette,
  Type,
  Wand2,
  Plus,
  CornerDownLeft,
} from 'lucide-react';
import type { CardData, CategoryId, CategoryOption } from '../types.js';
import { CATEGORIES, PRESET_BG_COLORS } from '../types.js';
import { compressImage, validateImageFile } from '../utils/image.js';

interface CardFormProps {
  card: CardData;
  onChange: (updated: CardData) => void;
  onSave: () => Promise<void>;
  onReset: () => void;
  onRevert?: () => void;
  hasChanges?: boolean;
  isSubmitting: boolean;
  isEditing: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  categories?: CategoryOption[];
  onAddCategory?: (category: { label: string; desc?: string }) => Promise<string | void>;
}

export function CardForm({
  card,
  onChange,
  onSave,
  onReset,
  onRevert,
  hasChanges = false,
  isSubmitting,
  isEditing,
  errorMessage,
  successMessage,
  categories,
  onAddCategory,
}: CardFormProps) {
  const [visualMode, setVisualMode] = useState<'mark' | 'image'>(() => {
    return card.imageUrl && !card.mark ? 'image' : 'mark';
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Category addition state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Input references for seamless keyboard flow
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const descInputRef = useRef<HTMLInputElement>(null);
  const markInputRef = useRef<HTMLInputElement>(null);
  const newCatInputRef = useRef<HTMLInputElement>(null);

  const activeCategories = categories && categories.length > 0 ? categories : CATEGORIES;

  // Sync mode if external card data loads with image and no mark
  useEffect(() => {
    if (card.imageUrl && !card.mark) {
      setVisualMode('image');
    }
  }, [card.id]);

  const handleFieldChange = <K extends keyof CardData>(field: K, value: CardData[K]) => {
    onChange({
      ...card,
      [field]: value,
    });
  };

  const handleProcessAndUpload = async (file: File) => {
    setUploadError(null);
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || '不支持的图片格式');
      return;
    }

    setIsUploading(true);
    try {
      const { blob, filename } = await compressImage(file);
      const formData = new FormData();
      formData.append('file', blob, filename);

      const resp = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || '上传失败');
      }

      onChange({
        ...card,
        imageUrl: data.url,
      });
      setVisualMode('image');
    } catch (err: any) {
      setUploadError(err.message || '图片上传遇到问题，请重试');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleProcessAndUpload(file);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleProcessAndUpload(file);
  };

  const removeImage = () => {
    onChange({
      ...card,
      imageUrl: null,
    });
    setUploadError(null);
    setVisualMode('mark');
  };

  // Smart extract text mark from card name with prefix cleanup
  const autoExtractMark = () => {
    const raw = card.name.trim();
    if (!raw) return;

    let clean = raw;
    // Strip "此用户", "本人", "我" prefixes for a more concise and punchy mark
    if (clean.startsWith('此用户')) {
      clean = clean.replace(/^此用户(?:是|为|对|极度|强烈|绝对|从不|不)?/, '').trim();
    } else if (clean.startsWith('本人')) {
      clean = clean.replace(/^本人(?:是|为|对|极度|强烈|绝对|从不|不)?/, '').trim();
    }

    if (!clean) clean = raw;

    // Take 2-6 key characters
    const extracted = clean.slice(0, Math.min(6, clean.length));
    onChange({
      ...card,
      mark: extracted,
    });
    setVisualMode('mark');
  };

  const handleConfirmAddCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setCategoryError('请输入分区名称');
      return;
    }
    if (trimmed.length > 18) {
      setCategoryError('分区名称不能超过 18 个字');
      return;
    }
    if (activeCategories.some((c) => c.label.toLowerCase() === trimmed.toLowerCase())) {
      setCategoryError('该分区已存在');
      return;
    }

    setIsCreatingCategory(true);
    setCategoryError(null);
    try {
      if (onAddCategory) {
        await onAddCategory({ label: trimmed });
      } else {
        handleFieldChange('category', trimmed as CategoryId);
      }
      setIsAddingCategory(false);
      setNewCategoryName('');
    } catch (err: any) {
      setCategoryError(err.message || '创建分区失败');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!card.name.trim()) return;

    // If both mark and image are missing, auto-populate mark with punchy chars from card name
    if (!card.mark?.trim() && !card.imageUrl?.trim()) {
      let candidate = card.name.trim();
      if (candidate.startsWith('此用户')) {
        candidate = candidate.replace(/^此用户(?:是|为|对)?/, '').trim() || candidate;
      }
      const fallbackMark = candidate.slice(0, Math.min(6, candidate.length));
      onChange({
        ...card,
        mark: fallbackMark,
      });
    }

    await onSave();
    // After continuous save, re-focus name input for effortless typing of the next card
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 50);
  };

  // Keyboard shortcut listener on form: Ctrl+Enter / Cmd+Enter to submit anywhere
  const handleFormKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (isFormValid && !isSubmitting && !isUploading) {
        handleSubmit(e as any);
      }
    }
  };

  const isFormValid = Boolean(
    card.name.trim() &&
    ((visualMode === 'mark' && (card.mark?.trim() || card.name.trim())) ||
      (visualMode === 'image' && card.imageUrl?.trim()) ||
      card.mark?.trim() ||
      card.imageUrl?.trim())
  );

  return (
    <div className="bg-white border border-stone-200/90 rounded-none p-4 sm:p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-100 gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight flex items-center gap-2 whitespace-nowrap">
            <span>{isEditing ? '编辑卡片' : '建立卡片'}</span>
            {isEditing && (
              <span className="text-[10px] sm:text-[11px] font-normal text-amber-700 bg-amber-50 px-1.5 sm:px-2 py-0.5 border border-amber-200 whitespace-nowrap">
                正在修改
              </span>
            )}
          </h2>
          <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5 truncate">
            填写名称与信息，即时预览；支持 Ctrl+Enter 快捷保存并连续创建
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isEditing && onRevert && (
            <button
              type="button"
              onClick={onRevert}
              disabled={!hasChanges}
              className={`text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 border transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 ${
                hasChanges
                  ? 'bg-white hover:bg-stone-50 border-stone-300 text-stone-700 cursor-pointer shadow-2xs'
                  : 'bg-stone-50 border-stone-200 text-stone-400 cursor-not-allowed'
              }`}
              title={hasChanges ? '撤销未保存的改动' : '数据未做修改'}
            >
              <RotateCcw className="w-3 h-3 shrink-0" />
              <span>撤销</span>
            </button>
          )}
          <button
            type="button"
            onClick={onReset}
            className="text-[11px] sm:text-xs text-stone-600 hover:text-stone-900 px-2 sm:px-2.5 py-1 bg-stone-100 hover:bg-stone-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="清空当前输入，准备创作新卡片"
          >
            清空重置
          </button>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2 animate-in fade-in duration-200">
          <Check className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-4">
        {/* 1. 卡片基础信息 */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-stone-800 flex items-center gap-1">
                <span>卡片名称</span>
                <span className="text-red-500">*</span>
              </label>
              <span
                className={`text-[10px] ${
                  card.name.length >= 24
                    ? 'text-red-600 font-bold'
                    : card.name.length > 18
                    ? 'text-amber-600'
                    : 'text-stone-400'
                }`}
              >
                {card.name.length} / 24 字
              </span>
            </div>
            <div className="relative">
              <input
                ref={nameInputRef}
                type="text"
                required
                maxLength={24}
                value={card.name}
                onChange={(e) => {
                  const newName = e.target.value;
                  // If user doesn't have a mark or image yet, auto suggest mark from punchy characters
                  if (!card.mark && !card.imageUrl && visualMode === 'mark') {
                    let markCandidate = newName.trim();
                    if (markCandidate.startsWith('此用户')) {
                      markCandidate = markCandidate.replace(/^此用户(?:是|为|对)?/, '').trim() || markCandidate;
                    }
                    onChange({
                      ...card,
                      name: newName,
                      mark: markCandidate.slice(0, 4),
                    });
                  } else {
                    handleFieldChange('name', newName);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    descInputRef.current?.focus();
                  }
                }}
                placeholder="推荐格式：此用户...（例：此用户反对一个中国原则）"
                className="w-full pl-3 pr-8 py-2 text-sm bg-stone-50/70 border border-stone-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900 text-stone-900 placeholder:text-stone-400"
              />
              {card.name && (
                <button
                  type="button"
                  onClick={() => handleFieldChange('name', '')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                  title="清除卡片名称"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between mt-1 text-[10px] text-stone-400">
              <span>推荐以「此用户...」命名，便于直接被收录与套用</span>
              <span className="hidden sm:inline text-stone-400/80">按 Enter 聚焦下一栏</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-stone-800">一句话说明</label>
              <span
                className={`text-[10px] ${
                  card.desc.length >= 60
                    ? 'text-red-600 font-bold'
                    : card.desc.length > 50
                    ? 'text-amber-600'
                    : 'text-stone-400'
                }`}
              >
                {card.desc.length} / 60 字
              </span>
            </div>
            <div className="relative">
              <input
                ref={descInputRef}
                type="text"
                maxLength={60}
                value={card.desc}
                onChange={(e) => handleFieldChange('desc', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    if (visualMode === 'mark') {
                      markInputRef.current?.focus();
                    }
                  }
                }}
                placeholder="例如：吸烟有害健康，二手烟更令人不适"
                className="w-full pl-3 pr-8 py-2 text-sm bg-stone-50/70 border border-stone-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900 text-stone-900 placeholder:text-stone-400"
              />
              {card.desc && (
                <button
                  type="button"
                  onClick={() => handleFieldChange('desc', '')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                  title="清除说明"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2. 所属分区 (紧凑药丸切换 + 新增分区) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-stone-800">所属分区</label>
            {!isAddingCategory && (
              <button
                type="button"
                onClick={() => {
                  setIsAddingCategory(true);
                  setTimeout(() => newCatInputRef.current?.focus(), 50);
                }}
                className="text-[11px] text-stone-600 hover:text-stone-950 flex items-center gap-1 font-medium transition-colors cursor-pointer bg-stone-100 hover:bg-stone-200 px-2 py-0.5 border border-stone-200"
              >
                <Plus className="w-3 h-3 text-stone-600" />
                <span>新增分区</span>
              </button>
            )}
          </div>

          {/* 新增分区内嵌快速输入栏 */}
          {isAddingCategory && (
            <div className="mb-2.5 p-2.5 bg-stone-50 border border-stone-300 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-stone-800 flex items-center gap-1">
                  <Plus className="w-3 h-3 text-stone-700" />
                  新建并选用自定义分区
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCategory(false);
                    setNewCategoryName('');
                    setCategoryError(null);
                  }}
                  className="text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  ref={newCatInputRef}
                  type="text"
                  maxLength={18}
                  value={newCategoryName}
                  onChange={(e) => {
                    setNewCategoryName(e.target.value);
                    setCategoryError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleConfirmAddCategory();
                    } else if (e.key === 'Escape') {
                      setIsAddingCategory(false);
                    }
                  }}
                  placeholder="输入分区名称（如：科技数码、ACG、哲学生活）"
                  className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-900 text-stone-900 placeholder:text-stone-400"
                />
                <button
                  type="button"
                  onClick={handleConfirmAddCategory}
                  disabled={!newCategoryName.trim() || isCreatingCategory}
                  className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white text-xs font-medium transition-colors shrink-0 whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
                >
                  {isCreatingCategory ? '添加中...' : '确认添加'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCategory(false);
                    setNewCategoryName('');
                  }}
                  className="px-2.5 py-1.5 text-xs text-stone-600 hover:text-stone-900 bg-white border border-stone-200 cursor-pointer"
                >
                  取消
                </button>
              </div>
              {categoryError && (
                <p className="text-[11px] text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{categoryError}</span>
                </p>
              )}
            </div>
          )}

          {/* 分区药丸列表 */}
          <div className="flex flex-wrap gap-1.5">
            {activeCategories.map((cat) => {
              const isSelected = card.category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleFieldChange('category', cat.id as CategoryId)}
                  className={`px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs whitespace-nowrap shrink-0 transition-colors border cursor-pointer ${
                    isSelected
                      ? 'border-stone-900 bg-stone-900 text-white font-medium shadow-2xs'
                      : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700'
                  }`}
                  title={cat.desc || cat.label}
                >
                  <span>{cat.label}</span>
                  {cat.isCustom && (
                    <span
                      className={`ml-1 text-[9px] px-1 py-0.2 rounded-xs border ${
                        isSelected
                          ? 'border-stone-700 bg-stone-800 text-stone-200'
                          : 'border-stone-300 bg-stone-200/70 text-stone-600'
                      }`}
                    >
                      自定义
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. 左侧视觉呈现 (文字标记 vs 图片配图) */}
        <div className="p-3 bg-stone-50/70 border border-stone-200 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-semibold text-stone-800 flex items-center gap-1.5 shrink-0 whitespace-nowrap">
              <Sparkles className="w-3.5 h-3.5 text-stone-600 shrink-0" />
              <span>左侧标记与配图</span>
            </label>
            {/* 模式切换 */}
            <div className="flex items-center bg-stone-200/80 p-0.5 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setVisualMode('mark')}
                className={`px-2 sm:px-2.5 py-1 flex items-center gap-1 transition-colors whitespace-nowrap text-[11px] sm:text-xs cursor-pointer ${
                  visualMode === 'mark'
                    ? 'bg-white text-stone-900 font-semibold shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Type className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span className="whitespace-nowrap">文字标记</span>
              </button>
              <button
                type="button"
                onClick={() => setVisualMode('image')}
                className={`px-2 sm:px-2.5 py-1 flex items-center gap-1 transition-colors whitespace-nowrap text-[11px] sm:text-xs cursor-pointer ${
                  visualMode === 'image'
                    ? 'bg-white text-stone-900 font-semibold shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <ImageIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span className="whitespace-nowrap">配图上传</span>
              </button>
            </div>
          </div>

          {/* 模式一：文字标记 */}
          {visualMode === 'mark' && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative min-w-0">
                  <input
                    ref={markInputRef}
                    type="text"
                    maxLength={10}
                    value={card.mark || ''}
                    onChange={(e) => handleFieldChange('mark', e.target.value)}
                    placeholder="输入 1~10 字标记，例如：芋泥波波 / 一中 / 禁烟"
                    className="w-full pl-3 pr-14 py-2 text-sm bg-white border border-stone-200 focus:outline-none focus:ring-1 focus:ring-stone-900 text-stone-900 placeholder:text-stone-400"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {card.mark && (
                      <button
                        type="button"
                        onClick={() => handleFieldChange('mark', '')}
                        className="text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                        title="清除标记"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    <span
                      className={`text-[10px] ${
                        (card.mark || '').length >= 10 ? 'text-red-500 font-bold' : 'text-stone-400'
                      }`}
                    >
                      {(card.mark || '').length}/10
                    </span>
                  </div>
                </div>
                {card.name.trim() && (
                  <button
                    type="button"
                    onClick={autoExtractMark}
                    className="px-2.5 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-200 text-[11px] sm:text-xs text-stone-700 flex items-center gap-1 shrink-0 whitespace-nowrap transition-colors cursor-pointer"
                    title="自动精炼卡片名称核心词作为左侧标记"
                  >
                    <Wand2 className="w-3 h-3 text-stone-500 shrink-0" />
                    <span className="whitespace-nowrap">从卡名提取</span>
                  </button>
                )}
              </div>

              <label className="flex items-center gap-1.5 pt-0.5 cursor-pointer text-[11px] sm:text-xs text-stone-700 select-none">
                <input
                  type="checkbox"
                  checked={card.markStrike}
                  onChange={(e) => handleFieldChange('markStrike', e.target.checked)}
                  className="w-3.5 h-3.5 accent-stone-900 cursor-pointer shrink-0"
                />
                <span className="flex items-center gap-1">
                  <Strikethrough
                    className={`w-3 h-3 shrink-0 ${card.markStrike ? 'text-red-600 font-bold' : 'text-stone-500'}`}
                  />
                  <span>添加醒目红色删除线 (如“禁烟”、“拒绝剧透”)</span>
                  {card.markStrike && (
                    <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-1 py-0.2 ml-1">
                      已启用
                    </span>
                  )}
                </span>
              </label>
            </div>
          )}

          {/* 模式二：图片配图 */}
          {visualMode === 'image' && (
            <div className="pt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={onFileInputChange}
                className="hidden"
              />

              {card.imageUrl ? (
                <div className="flex items-center gap-3 p-2 bg-white border border-stone-200">
                  <div className="w-12 h-10 bg-stone-100 flex items-center justify-center overflow-hidden border border-stone-200 shrink-0">
                    <img
                      src={card.imageUrl}
                      alt="已上传配图"
                      className="h-full w-auto object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-stone-800 truncate">
                      {card.imageUrl === '/Tm.png' ? 'FansLand 官方商标 (Tm.png)' : '配图已准备就绪'}
                    </p>
                    <p className="text-[10px] text-stone-400 font-mono truncate">{card.imageUrl}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
                  >
                    更换
                  </button>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="text-xs p-1 text-red-600 hover:text-red-700 cursor-pointer"
                    title="移除图片"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDrop={onDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed p-3 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? 'border-stone-800 bg-stone-100'
                      : 'border-stone-300 hover:border-stone-400 bg-white'
                  }`}
                >
                  <Upload className="w-4 h-4 mx-auto text-stone-400 mb-1" />
                  <p className="text-xs font-medium text-stone-700">
                    {isUploading ? '正在压缩并上传...' : '点击或拖拽图片文件'}
                  </p>
                  <p className="text-[10px] text-stone-400">支持 PNG/JPG/WebP，自动压缩适配</p>
                </div>
              )}

              {uploadError && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{uploadError}</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* 4. 背景颜色编辑 (紧凑横排) */}
        <div className="p-3 bg-stone-50/70 border border-stone-200 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-stone-600" />
              <span>卡片背景颜色</span>
            </label>
            <div className="flex items-center gap-1.5">
              {card.bgColor && (
                <button
                  type="button"
                  onClick={() => handleFieldChange('bgColor', null)}
                  className="text-[10px] text-stone-500 hover:text-stone-800 underline cursor-pointer"
                  title="恢复为分区自动配色"
                >
                  重置为默认
                </button>
              )}
              <span className="text-[10px] text-stone-500 font-mono">
                {card.bgColor ? card.bgColor : '默认分类色'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {PRESET_BG_COLORS.map((preset, idx) => {
              const isSelected = (card.bgColor || null) === preset.value;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleFieldChange('bgColor', preset.value)}
                  className={`w-6 h-6 border text-[10px] flex items-center justify-center transition-all cursor-pointer ${
                    isSelected ? 'ring-2 ring-stone-900 ring-offset-1 font-bold' : 'hover:opacity-80'
                  } ${preset.border}`}
                  style={{ backgroundColor: preset.value || '#F5F5F4' }}
                  title={`${preset.label}`}
                >
                  {preset.value === null ? (
                    '自'
                  ) : (
                    isSelected && (
                      <Check
                        className={`w-3 h-3 ${
                          preset.value === '#18181B' || preset.value === '#0F172A'
                            ? 'text-white'
                            : 'text-stone-900'
                        }`}
                      />
                    )
                  )}
                </button>
              );
            })}

            {/* 拾色器与色值 */}
            <div className="flex items-center gap-1.5 ml-auto">
              <input
                type="color"
                value={card.bgColor && /^#[0-9A-Fa-f]{6}$/.test(card.bgColor) ? card.bgColor : '#FFFFFF'}
                onChange={(e) => handleFieldChange('bgColor', e.target.value.toUpperCase())}
                className="w-6 h-6 p-0 border border-stone-300 cursor-pointer bg-white"
                title="打开调色板选取任意颜色"
              />
              <input
                type="text"
                value={card.bgColor || ''}
                placeholder="Hex"
                maxLength={7}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  handleFieldChange('bgColor', val ? val : null);
                }}
                className="w-16 px-1.5 py-0.5 text-xs font-mono bg-white border border-stone-200 uppercase"
              />
            </div>
          </div>
        </div>

        {/* 5. 提交按钮与快捷键提示 */}
        <div className="pt-2 space-y-1.5">
          <button
            type="submit"
            disabled={isSubmitting || isUploading || !isFormValid}
            className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white font-medium text-sm transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span>正在保存...</span>
            ) : isEditing ? (
              <span>保存修改</span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span>完成制作并保存卡片</span>
                <span className="text-xs opacity-75 font-normal">（自动进入下一张）</span>
              </span>
            )}
          </button>
          <div className="flex items-center justify-center gap-1 text-[11px] text-stone-400">
            <span>快捷键：</span>
            <kbd className="px-1.5 py-0.5 bg-stone-100 border border-stone-200 text-[10px] font-mono text-stone-600 rounded-none">
              Ctrl
            </kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 bg-stone-100 border border-stone-200 text-[10px] font-mono text-stone-600 rounded-none">
              Enter
            </kbd>
            <span>快速保存</span>
          </div>
        </div>
      </form>
    </div>
  );
}

