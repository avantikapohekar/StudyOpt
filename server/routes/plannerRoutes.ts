import { Router, Request, Response } from 'express';
import { dbInstance, EventType } from '../db.js';
import { authenticateUser } from '../auth.js';

export const plannerRouter = Router();
plannerRouter.use(authenticateUser);

// Get timetable events
plannerRouter.get('/timetable-events', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { eventType, subjectId } = req.query;

  let events = dbInstance.db.timetableEvents.filter(e => e.userId === userId);

  if (eventType) {
    events = events.filter(e => e.eventType === eventType);
  }
  if (subjectId) {
    events = events.filter(e => e.subjectId === subjectId);
  }

  // Enhance with subject information
  const enhancedEvents = events.map(evt => {
    const subject = evt.subjectId ? dbInstance.db.subjects.find(s => s.id === evt.subjectId) : null;
    return {
      ...evt,
      subjectName: subject ? subject.name : null,
      subjectCode: subject ? subject.code : null,
      color: evt.color || (subject ? subject.color : '#10b981'),
    };
  });

  return res.json({ events: enhancedEvents });
});

// Helper: detect overlap
function hasTimeOverlap(
  userId: string,
  startsAt: Date,
  endsAt: Date,
  excludeEventId?: string
): boolean {
  return dbInstance.db.timetableEvents.some(evt => {
    if (evt.userId !== userId) return false;
    if (excludeEventId && evt.id === excludeEventId) return false;

    const s = new Date(evt.startsAt);
    const e = new Date(evt.endsAt);

    // Overlap condition: start < other.end && end > other.start
    return startsAt < e && endsAt > s;
  });
}

// Create timetable event
plannerRouter.post('/timetable-events', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { title, subjectId, eventType, startsAt, endsAt, recurrenceRule, location, color } = req.body;

  if (!title || !startsAt || !endsAt) {
    return res.status(400).json({ error: 'Validation Error', message: 'Title, start time, and end time are required' });
  }

  const startDate = new Date(startsAt);
  const endDate = new Date(endsAt);

  if (endDate <= startDate) {
    return res.status(400).json({ error: 'Validation Error', message: 'End time must be after start time' });
  }

  const isOverlap = hasTimeOverlap(userId, startDate, endDate);

  const newEvent = {
    id: `event_${Date.now()}`,
    userId,
    subjectId: subjectId || null,
    title: title.trim(),
    eventType: (eventType as EventType) || 'CLASS',
    startsAt: startDate.toISOString(),
    endsAt: endDate.toISOString(),
    recurrenceRule: recurrenceRule || null,
    location: location ? location.trim() : null,
    color: color || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dbInstance.db.timetableEvents.push(newEvent);
  dbInstance.save();

  const subject = newEvent.subjectId ? dbInstance.db.subjects.find(s => s.id === newEvent.subjectId) : null;

  return res.status(201).json({
    event: {
      ...newEvent,
      subjectName: subject ? subject.name : null,
      subjectCode: subject ? subject.code : null,
      color: newEvent.color || (subject ? subject.color : '#10b981'),
      hasOverlapConflict: isOverlap,
    },
  });
});

// Update event
plannerRouter.patch('/timetable-events/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const event = dbInstance.db.timetableEvents.find(e => e.id === id && e.userId === userId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const { title, subjectId, eventType, startsAt, endsAt, recurrenceRule, location, color } = req.body;

  if (title !== undefined) event.title = title.trim();
  if (subjectId !== undefined) event.subjectId = subjectId || null;
  if (eventType !== undefined) event.eventType = eventType;
  if (startsAt !== undefined) event.startsAt = new Date(startsAt).toISOString();
  if (endsAt !== undefined) event.endsAt = new Date(endsAt).toISOString();
  if (recurrenceRule !== undefined) event.recurrenceRule = recurrenceRule;
  if (location !== undefined) event.location = location ? location.trim() : null;
  if (color !== undefined) event.color = color;

  event.updatedAt = new Date().toISOString();
  dbInstance.save();

  const subject = event.subjectId ? dbInstance.db.subjects.find(s => s.id === event.subjectId) : null;

  return res.json({
    event: {
      ...event,
      subjectName: subject ? subject.name : null,
      subjectCode: subject ? subject.code : null,
      color: event.color || (subject ? subject.color : '#10b981'),
    },
  });
});

// Delete event
plannerRouter.delete('/timetable-events/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const event = dbInstance.db.timetableEvents.find(e => e.id === id && e.userId === userId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  dbInstance.db.timetableEvents = dbInstance.db.timetableEvents.filter(e => e.id !== id);
  dbInstance.save();

  return res.json({ success: true, message: 'Event deleted' });
});
