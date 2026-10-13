import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import {
  dbInstance,
  FlashcardDeckRecord,
  FlashcardRecord,
  FlashcardReviewLogRecord,
  FlashcardFormat,
  FlashcardState
} from '../db.js';
import { authenticateUser } from '../auth.js';
import { normalizeTags, serializeTags } from '../tagUtils.js';

export const flashcardRouter = Router();
flashcardRouter.use(authenticateUser);

function getTodayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

// 1. GET /flashcards/decks (Get all decks with card count & due stats)
flashcardRouter.get('/flashcards/decks', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const today = getTodayIsoDate();

  const decks = dbInstance.db.flashcardDecks.filter(d => d.userId === userId);
  const userCards = dbInstance.db.flashcards.filter(c => c.userId === userId);

  const enhancedDecks = decks.map(d => {
    const cards = userCards.filter(c => c.deckId === d.id);
    const dueCards = cards.filter(c => c.dueDate <= today);
    const newCards = cards.filter(c => c.state === 'NEW');
    const learningCards = cards.filter(c => c.state === 'LEARNING' || c.state === 'RELEARNING');
    const reviewCards = cards.filter(c => c.state === 'REVIEW' && c.dueDate <= today);

    const subject = d.subjectId ? dbInstance.db.subjects.find(s => s.id === d.subjectId) : null;
    const topic = d.topicId ? dbInstance.db.topics.find(t => t.id === d.topicId) : null;
    const tagList = normalizeTags(d.tags);

    return {
      ...d,
      cardCount: cards.length,
      dueCount: dueCards.length,
      newCount: newCards.length,
      learningCount: learningCards.length,
      reviewCount: reviewCards.length,
      subjectName: subject ? subject.name : null,
      subjectCode: subject ? subject.code : null,
      subjectColor: subject ? subject.color : null,
      topicTitle: topic ? topic.title : null,
      tagList,
    };
  });

  return res.json({ decks: enhancedDecks });
});

// 2. POST /flashcards/decks (Create deck)
flashcardRouter.post('/flashcards/decks', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { name, description, subjectId, topicId, tags } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Deck name is required.' });
  }

  const newDeck: FlashcardDeckRecord = {
    id: crypto.randomUUID(),
    userId,
    subjectId: subjectId || null,
    topicId: topicId || null,
    name: name.trim(),
    description: description || '',
    tags: serializeTags(tags),
    cardCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dbInstance.db.flashcardDecks.unshift(newDeck);
  dbInstance.save();

  return res.status(201).json({
    deck: {
      ...newDeck,
      tagList: normalizeTags(newDeck.tags),
    },
  });
});

// 3. PATCH /flashcards/decks/:id (Update deck)
flashcardRouter.patch('/flashcards/decks/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const deck = dbInstance.db.flashcardDecks.find(d => d.id === req.params.id && d.userId === userId);

  if (!deck) {
    return res.status(404).json({ error: 'Deck not found' });
  }

  const { name, description, subjectId, topicId, tags } = req.body;
  if (name !== undefined) deck.name = name.trim();
  if (description !== undefined) deck.description = description;
  if (subjectId !== undefined) deck.subjectId = subjectId || null;
  if (topicId !== undefined) deck.topicId = topicId || null;
  if (tags !== undefined) {
    deck.tags = serializeTags(tags);
  }

  deck.updatedAt = new Date().toISOString();
  dbInstance.save();

  return res.json({
    deck: {
      ...deck,
      tagList: normalizeTags(deck.tags),
    },
  });
});

// 4. DELETE /flashcards/decks/:id (Delete deck and its cards)
flashcardRouter.delete('/flashcards/decks/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const deckIndex = dbInstance.db.flashcardDecks.findIndex(d => d.id === req.params.id && d.userId === userId);

  if (deckIndex === -1) {
    return res.status(404).json({ error: 'Deck not found' });
  }

  const deckId = dbInstance.db.flashcardDecks[deckIndex].id;
  // Remove all cards in deck
  const deckCards = dbInstance.db.flashcards.filter(c => c.deckId === deckId);
  const cardIds = new Set(deckCards.map(c => c.id));

  dbInstance.db.flashcards = dbInstance.db.flashcards.filter(c => c.deckId !== deckId);
  dbInstance.db.flashcardReviewLogs = dbInstance.db.flashcardReviewLogs.filter(rl => !cardIds.has(rl.cardId));
  dbInstance.db.flashcardDecks.splice(deckIndex, 1);
  dbInstance.save();

  return res.json({ success: true, message: 'Deck deleted successfully' });
});

// 5. GET /flashcards/decks/:id/cards (List cards in deck)
flashcardRouter.get('/flashcards/decks/:id/cards', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const deck = dbInstance.db.flashcardDecks.find(d => d.id === req.params.id && d.userId === userId);

  if (!deck) {
    return res.status(404).json({ error: 'Deck not found' });
  }

  const cards = dbInstance.db.flashcards.filter(c => c.deckId === deck.id && c.userId === userId);
  return res.json({ cards, deck });
});

// 6. POST /flashcards/decks/:id/cards (Create card)
flashcardRouter.post('/flashcards/decks/:id/cards', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const deck = dbInstance.db.flashcardDecks.find(d => d.id === req.params.id && d.userId === userId);

  if (!deck) {
    return res.status(404).json({ error: 'Deck not found' });
  }

  const { front, back, format } = req.body;
  if (!front || !front.trim() || !back || !back.trim()) {
    return res.status(400).json({ error: 'Front and back are required.' });
  }

  const today = getTodayIsoDate();
  const newCard: FlashcardRecord = {
    id: crypto.randomUUID(),
    deckId: deck.id,
    userId,
    front: front.trim(),
    back: back.trim(),
    format: (format as FlashcardFormat) || 'BASIC',
    interval: 0,
    repetitions: 0,
    easeFactor: 2.5,
    dueDate: today,
    lastReviewedAt: null,
    state: 'NEW',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dbInstance.db.flashcards.push(newCard);
  deck.cardCount = dbInstance.db.flashcards.filter(c => c.deckId === deck.id).length;
  deck.updatedAt = new Date().toISOString();
  dbInstance.save();

  return res.status(201).json({ card: newCard });
});

// 7. PATCH /flashcards/cards/:id (Edit card)
flashcardRouter.patch('/flashcards/cards/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const card = dbInstance.db.flashcards.find(c => c.id === req.params.id && c.userId === userId);

  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }

  const { front, back, format } = req.body;
  if (front !== undefined) card.front = front.trim();
  if (back !== undefined) card.back = back.trim();
  if (format !== undefined) card.format = format;

  card.updatedAt = new Date().toISOString();
  dbInstance.save();

  return res.json({ card });
});

// 8. DELETE /flashcards/cards/:id (Delete card)
flashcardRouter.delete('/flashcards/cards/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const index = dbInstance.db.flashcards.findIndex(c => c.id === req.params.id && c.userId === userId);

  if (index === -1) {
    return res.status(404).json({ error: 'Card not found' });
  }

  const card = dbInstance.db.flashcards[index];
  const deck = dbInstance.db.flashcardDecks.find(d => d.id === card.deckId);

  dbInstance.db.flashcardReviewLogs = dbInstance.db.flashcardReviewLogs.filter(rl => rl.cardId !== card.id);
  dbInstance.db.flashcards.splice(index, 1);

  if (deck) {
    deck.cardCount = dbInstance.db.flashcards.filter(c => c.deckId === deck.id).length;
    deck.updatedAt = new Date().toISOString();
  }
  dbInstance.save();

  return res.json({ success: true, message: 'Card deleted successfully' });
});

// 9. POST /flashcards/cards/:id/review (Submit Anki SM-2 Rating: 1: Again, 2: Hard, 3: Good, 4: Easy)
flashcardRouter.post('/flashcards/cards/:id/review', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const card = dbInstance.db.flashcards.find(c => c.id === req.params.id && c.userId === userId);

  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }

  const { rating } = req.body;
  const q = Number(rating);

  if (![1, 2, 3, 4].includes(q)) {
    return res.status(400).json({ error: 'Rating must be 1 (Again), 2 (Hard), 3 (Good), or 4 (Easy)' });
  }

  const prevInterval = card.interval;
  let newInterval: number;
  let newRepetitions = card.repetitions;
  let newEase = card.easeFactor;
  let newState: FlashcardState = card.state;

  if (q === 1) {
    // Lapse / Again
    newRepetitions = 0;
    newInterval = 1;
    newEase = Math.max(1.3, Number((newEase - 0.20).toFixed(2)));
    newState = 'RELEARNING';
  } else if (q === 2) {
    // Hard
    newRepetitions += 1;
    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 3;
    } else {
      newInterval = Math.max(prevInterval + 1, Math.round(prevInterval * 1.2));
    }
    newEase = Math.max(1.3, Number((newEase - 0.15).toFixed(2)));
    newState = 'REVIEW';
  } else if (q === 3) {
    // Good
    newRepetitions += 1;
    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(prevInterval * newEase);
    }
    newState = 'REVIEW';
  } else {
    // Easy (q === 4)
    newRepetitions += 1;
    if (newRepetitions === 1) {
      newInterval = 4;
    } else if (newRepetitions === 2) {
      newInterval = 10;
    } else {
      newInterval = Math.round(prevInterval * newEase * 1.30);
    }
    newEase = Math.min(3.0, Number((newEase + 0.15).toFixed(2)));
    newState = 'REVIEW';
  }

  // Calculate next due date
  const nextDueDate = new Date();
  nextDueDate.setDate(nextDueDate.getDate() + newInterval);
  const nextDueDateIso = nextDueDate.toISOString().split('T')[0];

  // Update card
  card.interval = newInterval;
  card.repetitions = newRepetitions;
  card.easeFactor = newEase;
  card.dueDate = nextDueDateIso;
  card.state = newState;
  card.lastReviewedAt = new Date().toISOString();
  card.updatedAt = new Date().toISOString();

  // Log review
  const reviewLog: FlashcardReviewLogRecord = {
    id: crypto.randomUUID(),
    cardId: card.id,
    userId,
    rating: q,
    previousInterval: prevInterval,
    newInterval,
    easeFactor: newEase,
    reviewedAt: new Date().toISOString(),
  };

  dbInstance.db.flashcardReviewLogs.push(reviewLog);
  dbInstance.save();

  return res.json({
    card,
    reviewLog,
    nextIntervalDays: newInterval,
    nextDueDate: nextDueDateIso,
  });
});

// 10. GET /flashcards/due (Get cards due for review)
flashcardRouter.get('/flashcards/due', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { deckId } = req.query;
  const today = getTodayIsoDate();

  let dueCards = dbInstance.db.flashcards.filter(c => c.userId === userId && c.dueDate <= today);

  if (deckId && typeof deckId === 'string') {
    dueCards = dueCards.filter(c => c.deckId === deckId);
  }

  const enhanced = dueCards.map(c => {
    const deck = dbInstance.db.flashcardDecks.find(d => d.id === c.deckId);
    return {
      ...c,
      deckName: deck ? deck.name : 'Unknown Deck',
    };
  });

  return res.json({ dueCards: enhanced, count: enhanced.length });
});
