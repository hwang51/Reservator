import { Router } from 'express';
import { db } from '../db';
import { recipients } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// Get all recipients
router.get('/', async (_req, res) => {
  const all = await db.select().from(recipients).orderBy(desc(recipients.createdAt));
  res.json(all);
});

// Add recipient
router.post('/', async (req, res) => {
  const { chatId, label } = req.body;
  if (!chatId || typeof chatId !== 'string' || !chatId.trim()) {
    res.status(400).json({ error: 'chatId is required' });
    return;
  }
  try {
    const result = await db.insert(recipients).values({
      chatId: chatId.trim(),
      label: label?.trim() || null,
    }).returning();
    res.json(result[0]);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      res.status(409).json({ error: 'This chat ID already exists' });
      return;
    }
    throw err;
  }
});

// Delete recipient
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(recipients).where(eq(recipients.id, id));
  res.json({ success: true });
});

export default router;
