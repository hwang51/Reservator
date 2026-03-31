import { useState, useEffect } from 'react';
import { Bell, Trash2, Plus, Play, Pause, Activity } from 'lucide-react';
import './App.css';

interface Task {
  id: number;
  url: string;
  interval: string;
  recipient: string;
  lastStatus: string | null;
  isActive: boolean;
  createdAt: string;
}

interface Log {
  id: number;
  taskId: number;
  message: string;
  status: string;
  timestamp: string;
}

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [newRecipient, setNewRecipient] = useState('');
  const [newInterval, setNewInterval] = useState('*/5 * * * *');
  const [loading, setLoading] = useState(false);

  const API_URL = 'http://localhost:5000/api';

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_URL}/tasks`);
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_URL}/tasks/logs`);
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchLogs();
    const timer = setInterval(() => {
      fetchTasks();
      fetchLogs();
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl, recipient: newRecipient, interval: newInterval }),
      });
      setNewUrl('');
      setNewRecipient('');
      fetchTasks();
    } catch (err) {
      console.error('Failed to add task', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (id: number) => {
    try {
      await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE' });
      fetchTasks();
    } catch (err) {
      console.error('Failed to delete task', err);
    }
  };

  return (
    <div className="container">
      <header>
        <h1><Bell className="icon-header" /> Reservation Monitor</h1>
        <p>Periodically checks URLs and notifies via SMS when available.</p>
      </header>

      <main>
        <section className="task-form-card">
          <h2>Add New Monitor</h2>
          <form onSubmit={addTask}>
            <div className="form-group">
              <label>Target URL</label>
              <input 
                type="url" 
                value={newUrl} 
                onChange={(e) => setNewUrl(e.target.value)} 
                placeholder="https://www.applyto.kr/..." 
                required 
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Recipient Number</label>
                <input 
                  type="tel" 
                  value={newRecipient} 
                  onChange={(e) => setNewRecipient(e.target.value)} 
                  placeholder="01012345678" 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Interval (Cron)</label>
                <input 
                  type="text" 
                  value={newInterval} 
                  onChange={(e) => setNewInterval(e.target.value)} 
                  placeholder="*/5 * * * *" 
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary">
              <Plus size={18} /> {loading ? 'Adding...' : 'Add Task'}
            </button>
          </form>
        </section>

        <section className="task-list">
          <h2>Active Monitors</h2>
          <div className="grid">
            {tasks.map(task => (
              <div key={task.id} className="task-card">
                <div className="task-header">
                  <span className={`status-badge ${task.lastStatus === 'AVAILABLE' ? 'available' : 'unavailable'}`}>
                    {task.lastStatus || 'WAITING'}
                  </span>
                  <button onClick={() => deleteTask(task.id)} className="btn-icon-danger">
                    <Trash2 size={16} />
                  </button>
                </div>
                <h3>{new URL(task.url).hostname}</h3>
                <p className="task-url">{task.url}</p>
                <div className="task-footer">
                  <span><Activity size={14} /> {task.interval}</span>
                  <span><Bell size={14} /> {task.recipient}</span>
                </div>
              </div>
            ))}
            {tasks.length === 0 && <p className="empty-msg">No active monitors. Add one above!</p>}
          </div>
        </section>

        <section className="logs-section">
          <h2>Recent Activity</h2>
          <div className="logs-container">
            {logs.map(log => (
              <div key={log.id} className="log-entry">
                <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className={`log-status ${log.status.toLowerCase()}`}>{log.status}</span>
                <span className="log-msg">{log.message}</span>
              </div>
            ))}
            {logs.length === 0 && <p className="empty-msg">No logs yet.</p>}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
