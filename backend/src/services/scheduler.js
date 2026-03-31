"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.schedulerService = exports.SchedulerService = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const scraper_1 = require("./scraper");
const notifier_1 = require("./notifier");
class SchedulerService {
    activeJobs = new Map();
    async startAllTasks() {
        const allTasks = await db_1.db.select().from(schema_1.tasks).where((0, drizzle_orm_1.eq)(schema_1.tasks.isActive, true));
        for (const task of allTasks) {
            this.scheduleTask(task);
        }
    }
    scheduleTask(task) {
        if (this.activeJobs.has(task.id)) {
            this.activeJobs.get(task.id)?.stop();
        }
        const job = node_cron_1.default.schedule(task.interval, async () => {
            console.log(`[SCHEDULE] Checking URL: ${task.url}`);
            const result = await scraper_1.scraperService.checkAvailability(task.url);
            // Log to database
            await db_1.db.insert(schema_1.logs).values({
                taskId: task.id,
                message: result.message,
                status: result.available ? 'AVAILABLE' : 'UNAVAILABLE',
                timestamp: new Date()
            });
            // Update task last status
            await db_1.db.update(schema_1.tasks)
                .set({ lastStatus: result.available ? 'AVAILABLE' : 'UNAVAILABLE' })
                .where((0, drizzle_orm_1.eq)(schema_1.tasks.id, task.id));
            // Notify if available and it was previously not available (or first time)
            if (result.available && task.lastStatus !== 'AVAILABLE') {
                const smsMessage = `[예약 알림] ${result.message}\nURL: ${task.url}`;
                await notifier_1.notifierService.sendSMS(task.recipient, smsMessage);
            }
        });
        this.activeJobs.set(task.id, job);
        console.log(`[SCHEDULE] Scheduled task ID ${task.id} with interval ${task.interval}`);
    }
    stopTask(taskId) {
        if (this.activeJobs.has(taskId)) {
            this.activeJobs.get(taskId)?.stop();
            this.activeJobs.delete(taskId);
        }
    }
}
exports.SchedulerService = SchedulerService;
exports.schedulerService = new SchedulerService();
//# sourceMappingURL=scheduler.js.map