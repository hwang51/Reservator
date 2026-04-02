import { useState, useEffect, useRef } from 'react';
import { Bell, Trash2, Plus, Activity, ChevronDown, ChevronUp, Send, UserPlus, X } from 'lucide-react';
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

interface Recipient {
  id: number;
  chatId: string;
  label: string | null;
  createdAt: string;
}

interface Log {
  id: number;
  taskId: number;
  taskUrl: string | null;
  message: string;
  status: string;
  timestamp: string | number;
}

function formatDateTime(ts: string | number): string {
  const d = new Date(typeof ts === 'number' ? ts * 1000 : ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${mm}/${dd} ${hh}:${mi}`;
}

function safeHostname(url: string | null): string {
  if (!url) return '—';
  try { return new URL(url).hostname; } catch { return url; }
}

function parseSlots(message: string): string[] {
  return message.split('\n').map(l => l.trim()).filter(l => l.startsWith('✅'));
}

function LogRow({ log }: { log: Log }) {
  const [expanded, setExpanded] = useState(false);
  const isAvailable = log.status === 'AVAILABLE';
  const isError = log.status === 'ERROR' || log.message.startsWith('오류:');
  const slots = isAvailable ? parseSlots(log.message) : [];

  return (
    <div className={`log-row ${isAvailable ? 'log-available' : isError ? 'log-error' : 'log-unavailable'}`}>
      <div className="log-row-main">
        <span className="log-time">{formatDateTime(log.timestamp)}</span>
        <span className={`log-badge ${isAvailable ? 'badge-available' : isError ? 'badge-error' : 'badge-unavailable'}`}>
          {isAvailable ? '빈자리' : isError ? '오류' : '없음'}
        </span>
        <span className="log-host">{safeHostname(log.taskUrl)}</span>
        {isAvailable && slots.length > 0 ? (
          <button type="button" className="log-expand-btn" onClick={() => setExpanded(v => !v)}>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {slots.length}개 슬롯 보기
          </button>
        ) : isError ? (
          <span className="log-detail-msg">{log.message.replace('오류: ', '')}</span>
        ) : (
          <span className="log-detail-msg log-none">빈자리 없음</span>
        )}
      </div>
      {expanded && isAvailable && (
        <div className="log-slots">
          {slots.map((s, i) => <div key={i} className="log-slot-line">{s}</div>)}
        </div>
      )}
    </div>
  );
}

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [newChatId, setNewChatId] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newIntervalMinutes, setNewIntervalMinutes] = useState(5);
  const [loading, setLoading] = useState(false);
  const logsRef = useRef<HTMLDivElement>(null);
  const prevLogCount = useRef(0);

  const minutesToCron = (minutes: number) =>
    minutes === 60 ? '0 * * * *' : `*/${minutes} * * * *`;

  const cronToLabel = (cron: string) => {
    if (cron === '0 * * * *') return '60분마다';
    const m = cron.match(/^\*\/(\d+)/);
    return m ? `${m[1]}분마다` : cron;
  };

  const API_URL = '/api';

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_URL}/tasks`);
      setTasks(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_URL}/tasks/logs`);
      setLogs(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchRecipients = async () => {
    try {
      const res = await fetch(`${API_URL}/recipients`);
      setRecipients(await res.json());
    } catch (err) { console.error(err); }
  };

  const addRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatId.trim()) return;
    try {
      const res = await fetch(`${API_URL}/recipients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: newChatId.trim(), label: newLabel.trim() || null }),
      });
      if (res.ok) {
        setNewChatId('');
        setNewLabel('');
        await fetchRecipients();
      } else {
        const data = await res.json();
        alert(data.error || '추가 실패');
      }
    } catch (err) { console.error(err); }
  };

  const deleteRecipient = async (id: number) => {
    setRecipients(prev => prev.filter(r => r.id !== id));
    try {
      await fetch(`${API_URL}/recipients/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error(err);
      await fetchRecipients();
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchLogs();
    fetchRecipients();
    const timer = setInterval(() => { fetchTasks(); fetchLogs(); }, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (logs.length > prevLogCount.current && logsRef.current) {
      logsRef.current.scrollTop = 0;
    }
    prevLogCount.current = logs.length;
  }, [logs.length]);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval: minutesToCron(newIntervalMinutes) }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('POST /tasks failed', res.status, text);
        return;
      }
      const newTask = await res.json();
      setTasks(prev => [newTask, ...prev]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const deleteTask = async (id: number) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      const res = await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        console.error('DELETE failed', res.status);
        await fetchTasks();
      }
    } catch (err) {
      console.error(err);
      await fetchTasks();
    }
  };

  const availableCount = logs.filter(l => l.status === 'AVAILABLE').length;

  return (
    <div className="container">
      <header>
        <h1><Bell className="icon-header" /> Reservation Monitor</h1>
        <p>예약 빈자리를 주기적으로 확인하고 텔레그램으로 알려드립니다.</p>
      </header>

      <main>
        <section className="task-form-card">
          <h2><Send size={18} /> 알림 수신자</h2>
          <div className="recipients-list">
            {recipients.map(r => (
              <div key={r.id} className="recipient-row">
                <span className="recipient-chip">{r.chatId}</span>
                {r.label && <span className="recipient-label-text">{r.label}</span>}
                <button type="button" aria-label="삭제" className="btn-icon-danger recipient-delete" onClick={() => deleteRecipient(r.id)}>
                  <X size={14} />
                </button>
              </div>
            ))}
            {recipients.length === 0 && <p className="empty-msg-sm">등록된 수신자가 없습니다.</p>}
          </div>
          <form onSubmit={addRecipient} className="recipient-form">
            <input
              type="text"
              placeholder="Chat ID"
              value={newChatId}
              onChange={e => setNewChatId(e.target.value)}
              className="recipient-input"
            />
            <input
              type="text"
              placeholder="이름 (선택)"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              className="recipient-input recipient-input-label"
            />
            <button type="submit" className="btn-primary btn-sm">
              <UserPlus size={16} /> 추가
            </button>
          </form>
        </section>

        <section className="task-form-card">
          <h2>모니터 추가</h2>
          <form onSubmit={addTask}>
            <div className="form-group">
                <label>확인 주기</label>
                <div className="interval-input-row">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={newIntervalMinutes}
                    onChange={(e) => setNewIntervalMinutes(Number(e.target.value))}
                    title="확인 주기 (분)"
                  />
                  <span className="interval-unit">분마다</span>
                </div>
                <div className="interval-presets">
                  {[1, 3, 5, 10, 30].map(m => (
                    <button
                      key={m}
                      type="button"
                      className={`preset-btn ${newIntervalMinutes === m ? 'active' : ''}`}
                      onClick={() => setNewIntervalMinutes(m)}
                    >
                      {m}분
                    </button>
                  ))}
                </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary">
              <Plus size={18} /> {loading ? '추가 중...' : '모니터 추가'}
            </button>
          </form>
        </section>

        <section className="task-list">
          <h2>활성 모니터</h2>
          <div className="grid">
            {tasks.map(task => (
              <div key={task.id} className="task-card">
                <div className="task-header">
                  <span className={`status-badge ${task.lastStatus === 'AVAILABLE' ? 'available' : 'unavailable'}`}>
                    {task.lastStatus === 'AVAILABLE' ? '빈자리 있음' : task.lastStatus === 'UNAVAILABLE' ? '빈자리 없음' : '대기 중'}
                  </span>
                  <button type="button" aria-label="삭제" onClick={() => deleteTask(task.id)} className="btn-icon-danger">
                    <Trash2 size={16} />
                  </button>
                </div>
                <h3>{safeHostname(task.url)}</h3>
                <p className="task-url">{task.url}</p>
                <div className="task-footer">
                  <span><Activity size={14} /> {cronToLabel(task.interval)}</span>
                </div>
              </div>
            ))}
            {tasks.length === 0 && <p className="empty-msg">등록된 모니터가 없습니다. 위에서 추가해주세요.</p>}
          </div>
        </section>

        <section className="logs-section">
          <div className="logs-header">
            <h2>확인 내역</h2>
            <div className="logs-summary">
              <span className="summary-total">총 {logs.length}회 확인</span>
              {availableCount > 0 && (
                <span className="summary-available">빈자리 발견 {availableCount}회</span>
              )}
            </div>
          </div>
          <div className="logs-container" ref={logsRef}>
            {logs.length === 0
              ? <p className="log-empty">아직 확인 내역이 없습니다. 모니터를 추가하면 자동으로 기록됩니다.</p>
              : logs.map(log => <LogRow key={log.id} log={log} />)
            }
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
