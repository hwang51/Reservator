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

const DEFAULT_URL = 'https://w2.applyto.kr/100_CSC/00_info.asp?ukey=A67FDE4&School_id=505355&inning=2019-01&Z19_SN=&part_id=&student_id=&A50_ID=&number_id=&gate_id=';

// Create task
router.post('/', async (req, res) => {
  const { interval } = req.body;
  const recipient = process.env.TELEGRAM_CHAT_ID || ''; // 쉼표 구분 다중 chat_id 지원
  const result = await db.insert(tasks).values({
    url: DEFAULT_URL,
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
  schedulerService.stopTask(id);
  await db.delete(logs).where(eq(logs.taskId, id));
  await db.delete(tasks).where(eq(tasks.id, id));
  res.json({ success: true });
});

// Get logs (with task URL joined)
router.get('/logs', async (req, res) => {
  const recentLogs = await db
    .select({
      id: logs.id,
      taskId: logs.taskId,
      taskUrl: tasks.url,
      message: logs.message,
      status: logs.status,
      timestamp: logs.timestamp,
    })
    .from(logs)
    .leftJoin(tasks, eq(logs.taskId, tasks.id))
    .orderBy(desc(logs.timestamp))
    .limit(100);
  res.json(recentLogs);
});

export default router;
