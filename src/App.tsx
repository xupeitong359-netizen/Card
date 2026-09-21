import { useState, useEffect, useCallback } from 'react';
import { Compass, User, HelpCircle } from 'lucide-react';
import type { CardData, CategoryId, CategoryOption } from './types.js';
import { CATEGORIES } from './types.js';
import { CardForm } from './components/CardForm.js';
import { CardPreviewPanel } from './components/CardPreviewPanel.js';
import { MyCardsList } from './components/MyCardsList.js';
import { ShareCardView } from './components/ShareCardView.js';
import { AllCardsView } from './components/AllCardsView.js';
import { WelcomeModal } from './components/WelcomeModal.js';

const STORAGE_KEY = 'fansland_card_ids';

const DEFAULT_EMPTY_CARD: CardData = {
  name: '',
  category: 'culture',
  desc: '',
  imageUrl: null,
  mark: null,
  markStrike: false,
};

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return typeof window !== 'undefined' ? window.location.pathname : '/';
  });

  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('mine');
  const [currentCard, setCurrentCard] = useState<CardData>(DEFAULT_EMPTY_CARD);
  const [originalCard, setOriginalCard] = useState<CardData | null>(null);
  const [myCardIds, setMyCardIds] = useState<string[]>([]);
  const [myCards, setMyCards] = useState<CardData[]>([]);
  const [allCards, setAllCards] = useState<CardData[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [isLoadingAllCards, setIsLoadingAllCards] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>(() => {
    try {
      const stored = localStorage.getItem('fansland_categories');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return CATEGORIES;
  });
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(() => {
    try {
      return localStorage.getItem('fansland_welcome_dismissed') !== 'true';
    } catch {
      return true;
    }
  });

  const handleCloseWelcomeModal = (dontShowAgain?: boolean) => {
    setIsWelcomeModalOpen(false);
    if (dontShowAgain) {
      try {
        localStorage.setItem('fansland_welcome_dismissed', 'true');
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Initialize router listener
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState(null, '', path);
    setCurrentPath(path);
  };

  // Load card IDs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setMyCardIds(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load card IDs from localStorage', e);
    }
  }, []);

  // Fetch cards data whenever myCardIds change
  const fetchMyCards = useCallback(async (ids: string[]) => {
    if (!ids || ids.length === 0) {
      setMyCards([]);
      return;
    }
    setIsLoadingCards(true);
    try {
      const resp = await fetch(`/api/cards?ids=${encodeURIComponent(ids.join(','))}`);
      const data = await resp.json();
      if (resp.ok && Array.isArray(data.cards)) {
        setMyCards(data.cards);
      }
    } catch (err) {
      console.error('Failed to fetch cards:', err);
    } finally {
      setIsLoadingCards(false);
    }
  }, []);

  // Fetch all recent cards for the "全部" view
  const fetchAllCards = useCallback(async () => {
    setIsLoadingAllCards(true);
    try {
      const resp = await fetch('/api/cards');
      const data = await resp.json();
      if (resp.ok && Array.isArray(data.cards)) {
        setAllCards(data.cards);
      }
    } catch (err) {
      console.error('Failed to fetch all cards:', err);
    } finally {
      setIsLoadingAllCards(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const resp = await fetch('/api/categories');
      const data = await resp.json();
      if (resp.ok && Array.isArray(data.categories) && data.categories.length > 0) {
        setCategories(data.categories);
        try {
          localStorage.setItem('fansland_categories', JSON.stringify(data.categories));
        } catch {}
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);

  useEffect(() => {
    fetchMyCards(myCardIds);
  }, [myCardIds, fetchMyCards]);

  useEffect(() => {
    fetchAllCards();
    fetchCategories();
  }, [fetchAllCards, fetchCategories]);

  const handleAddCategory = async (newCat: { label: string; desc?: string }): Promise<string> => {
    const resp = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCat),
    });
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data.error || '创建分区失败');
    }
    const created = data.category;
    setCategories((prev) => {
      const exists = prev.some((c) => c.id === created.id || c.label === created.label);
      if (exists) return prev;
      const updated = [...prev, created];
      try {
        localStorage.setItem('fansland_categories', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Auto select created category for current card
    setCurrentCard((prev) => ({
      ...prev,
      category: created.id,
    }));

    return created.id;
  };

  // Persist card IDs to localStorage
  const saveCardIdsToStorage = (ids: string[]) => {
    setMyCardIds(ids);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch (e) {
      console.error('Failed to save card IDs', e);
    }
  };

  // Save current card (POST or PUT)
  const handleSaveCard = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // Front-end validations
    const nameTrimmed = currentCard.name.trim();
    if (!nameTrimmed) {
      setErrorMessage('请输入卡片名称');
      return;
    }
    if (nameTrimmed.length > 24) {
      setErrorMessage('卡片名称不能超过 24 个字');
      return;
    }

    let finalMark = currentCard.mark ? currentCard.mark.trim() : null;
    const finalImage = currentCard.imageUrl ? currentCard.imageUrl.trim() : null;

    // If neither mark nor image provided, automatically use the first characters of the name as text mark
    if (!finalMark && !finalImage) {
      finalMark = nameTrimmed.slice(0, Math.min(10, nameTrimmed.length));
    }

    setIsSubmitting(true);
    try {
      const isUpdating = Boolean(currentCard.id);
      const url = isUpdating ? `/api/cards/${currentCard.id}` : '/api/cards';
      const method = isUpdating ? 'PUT' : 'POST';

      const payload = {
        name: nameTrimmed,
        category: currentCard.category,
        desc: currentCard.desc ? currentCard.desc.trim() : '',
        imageUrl: finalImage || null,
        mark: finalMark || null,
        markStrike: Boolean(currentCard.markStrike),
        bgColor: currentCard.bgColor || null,
      };

      const resp = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || '保存卡片失败');
      }

      const savedCard: CardData = data.card;

      // Add to local IDs if new
      if (!myCardIds.includes(savedCard.id!)) {
        const nextIds = [savedCard.id!, ...myCardIds];
        saveCardIdsToStorage(nextIds);
      } else {
        // Update in state directly
        setMyCards((prev) => prev.map((c) => (c.id === savedCard.id ? savedCard : c)));
      }

      // Refresh all cards pool
      fetchAllCards();

      // 关键：完成一个卡片的创建后，自动进入下一个卡片的创建
      const nextEmptyCard: CardData = {
        ...DEFAULT_EMPTY_CARD,
        category: savedCard.category, // 保留当前分类，便于连续录入同分类卡片
      };
      setCurrentCard(nextEmptyCard);
      setOriginalCard(null);

      setSuccessMessage(
        isUpdating
          ? `「${savedCard.name}」已保存！已就绪可创建新卡片`
          : `「${savedCard.name}」创建成功！已自动进入下一张卡片创建`
      );
      setTimeout(() => setSuccessMessage(null), 3500);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setErrorMessage(err.message || '网络异常，保存卡片失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetCard = () => {
    setCurrentCard(DEFAULT_EMPTY_CARD);
    setOriginalCard(null);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleEditCard = (card: CardData) => {
    const cloned = { ...card };
    setCurrentCard(cloned);
    setOriginalCard(cloned);
    setErrorMessage(null);
    setSuccessMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRevertCard = () => {
    if (!originalCard) return;
    setCurrentCard({ ...originalCard });
    setErrorMessage(null);
    setSuccessMessage(`已撤销修改，恢复至「${originalCard.name}」的原始数据`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDuplicateCard = (card: CardData) => {
    setCurrentCard({
      ...card,
      id: undefined,
      name: `${card.name} (副本)`.slice(0, 24),
    });
    setOriginalCard(null);
    setErrorMessage(null);
    setSuccessMessage(`已复制「${card.name}」的配置到表单中，可微调后点击保存`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteCard = (id: string) => {
    const nextIds = myCardIds.filter((item) => item !== id);
    saveCardIdsToStorage(nextIds);
    setMyCards((prev) => prev.filter((c) => c.id !== id));
    if (currentCard.id === id) {
      handleResetCard();
    }
  };

  // Route match: /c/:id
  const matchShareRoute = currentPath.match(/^\/c\/([a-zA-Z0-9_-]+)/);
  if (matchShareRoute) {
    const shareId = matchShareRoute[1];
    return (
      <ShareCardView
        cardId={shareId}
        onCopyToMyCards={(card) => {
          if (!myCardIds.includes(card.id!)) {
            saveCardIdsToStorage([card.id!, ...myCardIds]);
          }
          setCurrentCard({ ...card });
        }}
        onGoHome={() => navigateTo('/')}
      />
    );
  }

  // Check if currentCard has modifications compared to original snapshot
  const hasCardChanges = Boolean(
    originalCard &&
      (currentCard.name !== originalCard.name ||
        currentCard.category !== originalCard.category ||
        (currentCard.desc || '') !== (originalCard.desc || '') ||
        (currentCard.imageUrl || null) !== (originalCard.imageUrl || null) ||
        (currentCard.mark || null) !== (originalCard.mark || null) ||
        Boolean(currentCard.markStrike) !== Boolean(originalCard.markStrike) ||
        (currentCard.bgColor || null) !== (originalCard.bgColor || null))
  );

  return (
    <div className="min-h-screen bg-stone-100/60 text-stone-900 flex flex-col justify-between selection:bg-stone-900 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-18 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img
              src="/Tm.png"
              alt="V15"
              className="h-9 sm:h-13 w-auto object-contain shrink-0 select-none"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap">
                <span className="font-bold text-sm sm:text-lg tracking-tight text-stone-950 whitespace-nowrap">
                  V15
                </span>
                <span className="text-xs sm:text-sm text-stone-600 font-medium whitespace-nowrap">
                  个性化卡片制作站
                </span>
              </div>
              <p className="text-[10px] text-stone-400 hidden sm:block truncate">
                无需注册登录 · 即开即做 · 规范数据导出
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsWelcomeModalOpen(true)}
              className="text-[11px] sm:text-xs font-medium text-stone-700 hover:text-stone-950 bg-white hover:bg-stone-50 px-2.5 py-1.5 rounded-none transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 border border-stone-200 cursor-pointer"
              title="查看创作须知与规范"
            >
              <HelpCircle className="w-3.5 h-3.5 text-stone-500 shrink-0" />
              <span className="whitespace-nowrap">创作须知</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace (No Hero Banner) */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 w-full space-y-6 flex-1 pb-24 sm:pb-28">
        {activeTab === 'all' ? (
          /* 全部卡片库视图 */
          <AllCardsView
            cards={allCards}
            myCardIds={myCardIds}
            isLoading={isLoadingAllCards}
            categories={categories}
            onUseCard={(card) => {
              handleDuplicateCard(card);
              setActiveTab('mine');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onGoCreate={() => {
              handleResetCard();
              setActiveTab('mine');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenShare={(id) => navigateTo(`/c/${id}`)}
            onRefresh={fetchAllCards}
          />
        ) : (
          /* 我的工作区视图 (制作器 + 我的卡片) */
          <>
            {/* 2-Column Responsive Layout: Form + Live Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
              {/* Left Column: Form (7 cols on desktop) */}
              <div className="lg:col-span-7">
                <CardForm
                  card={currentCard}
                  onChange={setCurrentCard}
                  onSave={handleSaveCard}
                  onReset={handleResetCard}
                  onRevert={handleRevertCard}
                  hasChanges={hasCardChanges}
                  isSubmitting={isSubmitting}
                  isEditing={Boolean(currentCard.id)}
                  errorMessage={errorMessage}
                  successMessage={successMessage}
                  categories={categories}
                  onAddCategory={handleAddCategory}
                />
              </div>

              {/* Right Column: Preview + Instant Actions (5 cols on desktop) */}
              <div className="lg:col-span-5 lg:sticky lg:top-20">
                <CardPreviewPanel
                  card={currentCard}
                  onCopyCard={handleDuplicateCard}
                  categories={categories}
                />
              </div>
            </div>

            {/* My Cards Section */}
            <div id="my-cards" className="pt-2">
              <MyCardsList
                cards={myCards}
                onEdit={handleEditCard}
                onDuplicate={handleDuplicateCard}
                onDelete={handleDeleteCard}
                onOpenShare={(id) => navigateTo(`/c/${id}`)}
                isLoading={isLoadingCards}
              />
            </div>
          </>
        )}
      </main>

      {/* Understated Minimalist Footer */}
      <footer className="border-t border-stone-200 bg-white py-4 text-center text-xs text-stone-400 mb-16">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-center gap-2">
          <img
            src="/Tm.png"
            alt="V15"
            className="w-4 h-4 object-contain"
          />
          <span className="whitespace-nowrap">V15 虚拟国家卡片制作站</span>
        </div>
      </footer>

      {/* 现代化、优美浮动胶囊底栏导航 */}
      <nav
        aria-label="底栏导航"
        className="fixed bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-[92vw]"
      >
        <div className="flex items-center gap-1 p-1 sm:p-1.5 bg-stone-950/85 text-white backdrop-blur-xl border border-stone-800/80 rounded-full shadow-[0_12px_36px_rgba(0,0,0,0.3)] transition-all">
          {/* 按钮 1：全部 */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('all');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer select-none whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-white text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-stone-100 hover:bg-white/10'
            }`}
          >
            <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="whitespace-nowrap">全部</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full transition-colors whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-800 text-stone-300'
              }`}
            >
              {allCards.length}
            </span>
          </button>

          {/* 细微中性分隔线 */}
          <div className="w-[1px] h-4 bg-stone-800/80 mx-0.5" />

          {/* 按钮 2：我的 */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('mine');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer select-none whitespace-nowrap ${
              activeTab === 'mine'
                ? 'bg-white text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-stone-100 hover:bg-white/10'
            }`}
          >
            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="whitespace-nowrap">我的</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full transition-colors whitespace-nowrap ${
                activeTab === 'mine'
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-800 text-stone-300'
              }`}
            >
              {myCards.length}
            </span>
          </button>
        </div>
      </nav>

      {/* 欢迎与创作须知弹窗 */}
      <WelcomeModal
        isOpen={isWelcomeModalOpen}
        onClose={handleCloseWelcomeModal}
      />
    </div>
  );
}
