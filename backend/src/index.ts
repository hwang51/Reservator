import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import taskRoutes from './routes/tasks';
import { schedulerService } from './services/scheduler';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/tasks', taskRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start scheduler
schedulerService.startAllTasks();

app.listen(port, () => {
  console.log(`[SERVER] Server running at http://localhost:${port}`);
});
