import React, { useState, useEffect } from 'react';
import {
  X,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Trophy,
  ArrowRight,
  RefreshCw,
  Flame,
  Brain,
} from 'lucide-react';
import { Flashcard, FlashcardDeck } from '../../types';
import { api } from '../../lib/api';
import { MarkdownRenderer } from '../common/MarkdownRenderer';

interface FlashcardStudyModalProps {
  deck: FlashcardDeck | null;
  isOpen: boolean;
  onClose: () => void;
  onDeckCompleted?: () => void;
}

export const FlashcardStudyModal: React.FC<FlashcardStudyModalProps> = ({
  deck,
  isOpen,
  onClose,
  onDeckCompleted,
}) => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // Session stats
  const [ratingsCount, setRatingsCount] = useState<{ 1: number; 2: number; 3: number; 4: number }>({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
  });

  useEffect(() => {
    if (!isOpen || !deck) {
      setCards([]);
      setCurrentIndex(0);
      setIsRevealed(false);
      setSessionCompleted(false);
      setRatingsCount({ 1: 0, 2: 0, 3: 0, 4: 0 });
      return;
    }

    setLoading(true);
    // Fetch cards for deck
    api.flashcards.getDeckCards(deck.id)
      .then(res => {
        // Prioritize due cards or new cards
        const sorted = [...res.cards].sort((a, b) => {
          if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
          return 0;
        });
        setCards(sorted);
        setCurrentIndex(0);
        setIsRevealed(false);
        setSessionCompleted(false);
      })
      .catch(err => console.error('Failed to load cards:', err))
      .finally(() => setLoading(false));
  }, [isOpen, deck]);

  // Keyboard navigation for power users (Space = reveal, 1-4 = rating)
  useEffect(() => {
    if (!isOpen || sessionCompleted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsRevealed(prev => !prev);
      } else if (isRevealed) {
        if (e.key === '1') handleRate(1);
        if (e.key === '2') handleRate(2);
        if (e.key === '3') handleRate(3);
        if (e.key === '4') handleRate(4);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isRevealed, currentIndex, cards, sessionCompleted]);

  if (!isOpen || !deck) return null;

  const currentCard = cards[currentIndex];

  const handleRate = async (rating: 1 | 2 | 3 | 4) => {
    if (!currentCard) return;

    try {
      await api.flashcards.reviewCard(currentCard.id, rating);
      setRatingsCount(prev => ({ ...prev, [rating]: prev[rating] + 1 }));

      if (currentIndex + 1 < cards.length) {
        setCurrentIndex(prev => prev + 1);
        setIsRevealed(false);
      } else {
        setSessionCompleted(true);
        if (onDeckCompleted) onDeckCompleted();
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
    }
  };

  const calculateRetention = () => {
    const total = ratingsCount[1] + ratingsCount[2] + ratingsCount[3] + ratingsCount[4];
    if (total === 0) return 0;
    // Recall rate is ratings 3 and 4 (Good and Easy)
    return Math.round(((ratingsCount[3] + ratingsCount[4]) / total) * 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-[520px] max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/40">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <Brain className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                {deck.name}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Anki SM-2 Spaced Repetition Session
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!sessionCompleted && cards.length > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                {currentIndex + 1} / {cards.length}
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {!sessionCompleted && cards.length > 0 && (
          <div className="w-full h-1 bg-neutral-100 dark:bg-neutral-800">
            <div
              className="h-full bg-indigo-600 transition-all duration-300 ease-out"
              style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
            />
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 p-6 md:p-8 flex flex-col justify-center items-center text-center overflow-y-auto">
          {loading ? (
            <div className="space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Loading flashcard queue...
              </p>
            </div>
          ) : cards.length === 0 ? (
            <div className="space-y-3 max-w-sm">
              <div className="p-3 w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 mx-auto flex items-center justify-center">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                No Cards in this Deck Yet
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Add flashcards with questions and answers to begin training your memory with spaced repetition.
              </p>
            </div>
          ) : sessionCompleted ? (
            /* Session Completed Screen */
            <div className="space-y-6 max-w-md w-full">
              <div className="p-4 w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center shadow-inner">
                <Trophy className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">
                  Review Complete!
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  You've reviewed all scheduled cards for today. Your SM-2 memory intervals have been updated.
                </p>
              </div>

              {/* Stats Card */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 text-left">
                <div>
                  <p className="text-xs text-neutral-400 font-medium">Total Reviewed</p>
                  <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                    {cards.length} Cards
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400 font-medium">Retention Score</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {calculateRetention()}%
                  </p>
                </div>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50">
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {ratingsCount[1]}
                  </span>
                  <p className="text-[10px] text-rose-500">Again</p>
                </div>
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {ratingsCount[2]}
                  </span>
                  <p className="text-[10px] text-amber-500">Hard</p>
                </div>
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {ratingsCount[3]}
                  </span>
                  <p className="text-[10px] text-blue-500">Good</p>
                </div>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {ratingsCount[4]}
                  </span>
                  <p className="text-[10px] text-emerald-500">Easy</p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentIndex(0);
                    setIsRevealed(false);
                    setSessionCompleted(false);
                  }}
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  Study Again
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Active Card */
            <div className="w-full flex-1 flex flex-col justify-between max-w-xl">
              {/* Question Face */}
              <div className="space-y-3 my-auto">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                  <span>Question</span>
                  {currentCard.state === 'NEW' ? (
                    <span className="text-indigo-500">• New</span>
                  ) : (
                    <span className="text-emerald-500">• Interval: {currentCard.interval}d</span>
                  )}
                </div>
                <div className="text-lg md:text-xl font-medium text-neutral-900 dark:text-neutral-100 leading-relaxed text-center">
                  <MarkdownRenderer content={currentCard.front} />
                </div>
              </div>

              {/* Answer Face (Revealed) */}
              {isRevealed && (
                <div className="my-auto pt-6 border-t border-neutral-100 dark:border-neutral-800 animate-in fade-in slide-in-from-bottom-2 duration-200 w-full">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mb-3">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Answer & Explanation</span>
                  </div>
                  <div className="text-base text-neutral-800 dark:text-neutral-200 leading-relaxed text-left max-w-lg w-full mx-auto bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 overflow-hidden">
                    <MarkdownRenderer content={currentCard.back} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Actions Bar */}
        {!sessionCompleted && cards.length > 0 && (
          <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50">
            {!isRevealed ? (
              <button
                type="button"
                onClick={() => setIsRevealed(true)}
                className="w-full py-3 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Show Answer</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-500/50 font-mono">
                  Space
                </span>
              </button>
            ) : (
              /* Anki 4-button rating scale */
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleRate(1)}
                  className="flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 transition-colors"
                >
                  <span className="text-xs font-bold">Again</span>
                  <span className="text-[10px] text-rose-500 dark:text-rose-400">&lt; 1 day</span>
                  <span className="text-[9px] font-mono text-neutral-400 mt-0.5">(1)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRate(2)}
                  className="flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300 transition-colors"
                >
                  <span className="text-xs font-bold">Hard</span>
                  <span className="text-[10px] text-amber-500 dark:text-amber-400">
                    {currentCard ? Math.max(1, Math.round(currentCard.interval * 1.2)) : 2}d
                  </span>
                  <span className="text-[9px] font-mono text-neutral-400 mt-0.5">(2)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRate(3)}
                  className="flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 transition-colors"
                >
                  <span className="text-xs font-bold">Good</span>
                  <span className="text-[10px] text-blue-500 dark:text-blue-400">
                    {currentCard ? Math.round(Math.max(1, currentCard.interval) * currentCard.easeFactor) : 6}d
                  </span>
                  <span className="text-[9px] font-mono text-neutral-400 mt-0.5">(3)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRate(4)}
                  className="flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 transition-colors"
                >
                  <span className="text-xs font-bold">Easy</span>
                  <span className="text-[10px] text-emerald-500 dark:text-emerald-400">
                    {currentCard ? Math.round(Math.max(1, currentCard.interval) * currentCard.easeFactor * 1.3) : 10}d
                  </span>
                  <span className="text-[9px] font-mono text-neutral-400 mt-0.5">(4)</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
