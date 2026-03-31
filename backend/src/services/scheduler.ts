import cron, { ScheduledTask } from 'node-cron';
import { db } from '../db';
import { tasks, logs } from '../db/schema';
import { eq } from 'drizzle-orm';
import { scraperService } from './scraper';
import { notifierService } from './notifier';

export class SchedulerService {
  private activeJobs: Map<number, ScheduledTask> = new Map();

  async startAllTasks() {
    const allTasks = await db.select().from(tasks).where(eq(tasks.isActive, true));
    for (const task of allTasks) {
      this.scheduleTask(task);
    }
  }

  scheduleTask(task: any) {
    if (this.activeJobs.has(task.id)) {
      this.activeJobs.get(task.id)?.stop();
    }

    const job = cron.schedule(task.interval, async () => {
      console.log(`[SCHEDULE] Checking URL: ${task.url}`);
      
      const result = await scraperService.checkAvailability(task.url);
      
      // Log to database
      await db.insert(logs).values({
        taskId: task.id,
        message: result.message,
        status: result.available ? 'AVAILABLE' : 'UNAVAILABLE',
        timestamp: new Date()
      });

      // Update task last status
      await db.update(tasks)
        .set({ lastStatus: result.available ? 'AVAILABLE' : 'UNAVAILABLE' })
        .where(eq(tasks.id, task.id));

      // Notify if available and it was previously not available (or first time)
      if (result.available && task.lastStatus !== 'AVAILABLE') {
        const smsMessage = `[예약 알림] ${result.message}\nURL: ${task.url}`;
        await notifierService.sendSMS(task.recipient, smsMessage);
      }
    });

    this.activeJobs.set(task.id, job);
    console.log(`[SCHEDULE] Scheduled task ID ${task.id} with interval ${task.interval}`);
  }

  stopTask(taskId: number) {
    if (this.activeJobs.has(taskId)) {
      this.activeJobs.get(taskId)?.stop();
      this.activeJobs.delete(taskId);
    }
  }
}

export const schedulerService = new SchedulerService();
