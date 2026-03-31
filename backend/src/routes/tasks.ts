import { Router } from 'express';
import { db } from '../db';
import { tasks, logs } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { schedulerService } from '../services/scheduler';

const router = Router();

// Get all tasks
router.get('/', async (req, res) => {
  const allTasks = await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  res.json(allTasks);
});

// Create task
router.post('/', async (req, res) => {
  const { url, interval, recipient } = req.body;
  const result = await db.insert(tasks).values({
    url,
    interval,
    recipient,
    isActive: true,
  }).returning();
  
  const newTask = result[0];
  schedulerService.scheduleTask(newTask);
  res.json(newTask);
});

// Delete task
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(tasks).where(eq(tasks.id, id));
  schedulerService.stopTask(id);
  res.json({ success: true });
});

// Get logs
router.get('/logs', async (req, res) => {
  const recentLogs = await db.select().from(logs).orderBy(desc(logs.timestamp)).limit(50);
  res.json(recentLogs);
});

export default router;
