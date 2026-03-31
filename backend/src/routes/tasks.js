"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const scheduler_1 = require("../services/scheduler");
const router = (0, express_1.Router)();
// Get all tasks
router.get('/', async (req, res) => {
    const allTasks = await db_1.db.select().from(schema_1.tasks).orderBy((0, drizzle_orm_1.desc)(schema_1.tasks.createdAt));
    res.json(allTasks);
});
// Create task
router.post('/', async (req, res) => {
    const { url, interval, recipient } = req.body;
    const result = await db_1.db.insert(schema_1.tasks).values({
        url,
        interval,
        recipient,
        isActive: true,
    }).returning();
    const newTask = result[0];
    scheduler_1.schedulerService.scheduleTask(newTask);
    res.json(newTask);
});
// Delete task
router.delete('/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    await db_1.db.delete(schema_1.tasks).where((0, drizzle_orm_1.eq)(schema_1.tasks.id, id));
    scheduler_1.schedulerService.stopTask(id);
    res.json({ success: true });
});
// Get logs
router.get('/logs', async (req, res) => {
    const recentLogs = await db_1.db.select().from(schema_1.logs).orderBy((0, drizzle_orm_1.desc)(schema_1.logs.timestamp)).limit(50);
    res.json(recentLogs);
});
exports.default = router;
//# sourceMappingURL=tasks.js.map