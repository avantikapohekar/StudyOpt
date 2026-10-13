import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  Brain,
  HelpCircle,
  FolderPlus,
  Tag,
  Loader2,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { FlashcardDeck, Flashcard, Subject } from '../../types';
import { api } from '../../lib/api';
import { normalizeTags, tagsToInputString } from '../../lib/tagUtils';
import { MarkdownRenderer } from '../common/MarkdownRenderer';

interface DeckManagerModalProps {
  deck: FlashcardDeck | null; // null if creating a new deck
  isOpen: boolean;
  onClose: () => void;
  onDeckUpdated: () => void;
  subjects: Subject[];
}

export const DeckManagerModal: React.FC<DeckManagerModalProps> = ({
  deck,
  isOpen,
  onClose,
  onDeckUpdated,
  subjects,
}) => {
  // Deck details
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [tagsInput, setTagsInput] = useState('');
  const [savingDeck, setSavingDeck] = useState(false);
  const [deckError, setDeckError] = useState<string | null>(null);

  // Cards in deck
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);

  // New card form
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [savingCard, setSavingCard] = useState(false);
  const [cardPreview, setCardPreview] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (deck) {
      setName(deck.name);
      setDescription(deck.description || '');
      setSubjectId(deck.subjectId || '');
      setTagsInput(tagsToInputString(deck.tagList || deck.tags));

      setLoadingCards(true);
      api.flashcards.getDeckCards(deck.id)
        .then(res => setCards(res.cards))
        .catch(err => console.error('Failed to load cards:', err))
        .finally(() => setLoadingCards(false));
    } else {
      setName('');
      setDescription('');
      setSubjectId('');
      setTagsInput('');
      setCards([]);
    }

    setFront('');
    setBack('');
    setEditingCardId(null);
    setDeckError(null);
  }, [isOpen, deck]);

  if (!isOpen) return null;

  const handleSaveDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setDeckError('Deck name is required');
      return;
    }

    setSavingDeck(true);
    setDeckError(null);
    try {
      const parsedTags = normalizeTags(tagsInput);

      if (deck) {
        await api.flashcards.updateDeck(deck.id, {
          name: name.trim(),
          description: description.trim(),
          subjectId: subjectId || null,
          tags: parsedTags,
        });
      } else {
        await api.flashcards.createDeck({
          name: name.trim(),
          description: description.trim(),
          subjectId: subjectId || null,
          tags: parsedTags,
        });
      }

      onDeckUpdated();
      if (!deck) {
        onClose();
      }
    } catch (err: any) {
      setDeckError(err.message || 'Failed to save deck');
    } finally {
      setSavingDeck(false);
    }
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deck || !front.trim() || !back.trim()) return;

    setSavingCard(true);
    try {
      if (editingCardId) {
        const res = await api.flashcards.updateCard(editingCardId, {
          front: front.trim(),
          back: back.trim(),
        });
        setCards(prev => prev.map(c => (c.id === editingCardId ? res.card : c)));
      } else {
        const res = await api.flashcards.createCard(deck.id, {
          front: front.trim(),
          back: back.trim(),
        });
        setCards(prev => [...prev, res.card]);
      }

      setFront('');
      setBack('');
      setEditingCardId(null);
      onDeckUpdated();
    } catch (err: any) {
      console.error('Failed to save card:', err);
    } finally {
      setSavingCard(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!window.confirm('Delete this flashcard?')) return;
    try {
      await api.flashcards.deleteCard(cardId);
      setCards(prev => prev.filter(c => c.id !== cardId));
      onDeckUpdated();
    } catch (err) {
      console.error('Failed to delete card:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <Brain className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {deck ? `Manage Deck: ${deck.name}` : 'Create New Flashcard Deck'}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Configured with Anki SM-2 Spaced Repetition Algorithm
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {deckError && (
            <div className="flex items-start gap-2.5 p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span>{deckError}</span>
            </div>
          )}

          {/* Deck Metadata Form */}
          <form onSubmit={handleSaveDeck} className="space-y-4 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Deck Title *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Distributed Systems & Consensus"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Associated Course
                </label>
                <select
                  value={subjectId}
                  onChange={e => setSubjectId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                >
                  <option value="">General Knowledge / No Subject</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Deck Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="High-yield formulas, proof steps, and exam questions..."
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1 mr-3 space-y-1">
                <label className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={e => setTagsInput(e.target.value)}
                  placeholder="midterm, algorithms, proofs"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>
              <button
                type="submit"
                disabled={savingDeck}
                className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-colors disabled:opacity-60"
              >
                {savingDeck ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{deck ? 'Update Deck' : 'Create Deck'}</span>
              </button>
            </div>
          </form>

          {/* Cards Section (If editing existing deck) */}
          {deck && (
            <div className="space-y-4 pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    Flashcards ({cards.length})
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Add front question and back answer with markdown formatting
                  </p>
                </div>
              </div>

              {/* Add / Edit Card Box */}
              <form onSubmit={handleSaveCard} className="p-4 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                    {editingCardId ? 'Edit Flashcard' : 'Add New Card to Deck'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCardPreview(!cardPreview)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors ${
                      cardPreview
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>{cardPreview ? 'Edit Inputs' : 'Preview Math & Markdown'}</span>
                  </button>
                </div>

                {cardPreview ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs">
                    <div className="space-y-1">
                      <span className="font-bold text-[10px] uppercase text-neutral-400">Front (Question Preview)</span>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-700 min-h-[68px]">
                        {front.trim() ? (
                          <MarkdownRenderer content={front} dense />
                        ) : (
                          <span className="text-neutral-400 italic">No question entered yet</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="font-bold text-[10px] uppercase text-neutral-400">Back (Answer Preview)</span>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-700 min-h-[68px]">
                        {back.trim() ? (
                          <MarkdownRenderer content={back} dense />
                        ) : (
                          <span className="text-neutral-400 italic">No answer entered yet</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-neutral-500 mb-1">
                        Front: Prompt / Question (supports Markdown & $math$)
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={front}
                        onChange={e => setFront(e.target.value)}
                        placeholder="e.g. State the Spectral Theorem for symmetric matrices..."
                        className="w-full p-2.5 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-neutral-500 mb-1">
                        Back: Answer & Details (supports Markdown & $$math$$)
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={back}
                        onChange={e => setBack(e.target.value)}
                        placeholder="e.g. 1. All eigenvalues are real. 2. Eigenvectors are orthogonal..."
                        className="w-full p-2.5 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none font-mono"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  {editingCardId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCardId(null);
                        setFront('');
                        setBack('');
                      }}
                      className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={savingCard}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                  >
                    {savingCard ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>{editingCardId ? 'Save Changes' : 'Add Card'}</span>
                  </button>
                </div>
              </form>

              {/* Cards List */}
              <div className="space-y-2">
                {loadingCards ? (
                  <p className="text-xs text-neutral-400 text-center py-4">Loading cards...</p>
                ) : cards.length === 0 ? (
                  <p className="text-xs text-neutral-400 text-center py-4">No cards yet.</p>
                ) : (
                  cards.map((card, idx) => (
                    <div
                      key={card.id}
                      className="flex items-start justify-between p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      <div className="space-y-1.5 pr-4 min-w-0 flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                            #{idx + 1}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            Interval: {card.interval}d • Due: {card.dueDate}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                          <MarkdownRenderer content={`**Q:** ${card.front}`} dense />
                        </div>
                        <div className="text-xs text-neutral-600 dark:text-neutral-400 max-h-24 overflow-hidden">
                          <MarkdownRenderer content={`**A:** ${card.back}`} dense />
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCardId(card.id);
                            setFront(card.front);
                            setBack(card.back);
                          }}
                          className="p-1.5 text-neutral-400 hover:text-indigo-600 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCard(card.id)}
                          className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
