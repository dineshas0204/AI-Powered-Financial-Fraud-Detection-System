import { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { Shield, AlertTriangle, CheckCircle, Activity, DollarSign, Eye, RefreshCw, Send, Zap } from "lucide-react";

const API = "http://localhost:8000";

// ──────────────────────────────────────────────
// Color palette
// ──────────────────────────────────────────────
const COLORS = {
  critical: "#ef4444",
  high:     "#f97316",
  medium:   "#eab308",
  low:      "#22c55e",
  bg:       "#0a0e1a",
  card:     "#111827",
  border:   "#1f2937",
  accent:   "#6366f1"
};

const RISK_COLOR = { CRITICAL: COLORS.critical, HIGH: COLORS.high, MEDIUM: COLORS.medium, LOW: COLORS.low };
const RISK_BG    = { CRITICAL: "bg-red-900/30 border-red-700", HIGH: "bg-orange-900/30 border-orange-700", MEDIUM: "bg-yellow-900/30 border-yellow-700", LOW: "bg-green-900/30 border-green-700" };

// ──────────────────────────────────────────────
// Stat Card
// ──────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = "text-white" }) {
  return (
    <div className="rounded-xl border p-5" style={{ background: COLORS.card, borderColor: COLORS.border }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-400 text-sm font-medium">{label}</span>
        <Icon size={18} className="text-indigo-400" />
      </div>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-gray-500 text-xs mt-1">{sub}</div>}
    </div>
  );
}

// ──────────────────────────────────────────────
// Risk Badge
// ──────────────────────────────────────────────
function RiskBadge({ level }) {
  const styles = {
    CRITICAL: "bg-red-500/20 text-red-400 border border-red-500/40",
    HIGH:     "bg-orange-500/20 text-orange-400 border border-orange-500/40",
    MEDIUM:   "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40",
    LOW:      "bg-green-500/20 text-green-400 border border-green-500/40",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${styles[level] || styles.LOW}`}>
      {level}
    </span>
  );
}

// ──────────────────────────────────────────────
// Score Ring
// ──────────────────────────────────────────────
function ScoreRing({ score, level }) {
  const pct = score / 100;
  const r = 36, cx = 44, cy = 44;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  const color = RISK_COLOR[level] || COLORS.low;
  return (
    <svg width="88" height="88" viewBox="0 0 88 88">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1f2937" strokeWidth="8" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: "stroke-dasharray 0.5s" }} />
      <text x={cx} y={cy + 5} textAnchor="middle" fill={color} fontSize="16" fontWeight="bold">{score}</text>
    </svg>
  );
}

// ──────────────────────────────────────────────
// Analyze Form
// ──────────────────────────────────────────────
function AnalyzeForm({ onResult }) {
  const [form, setForm] = useState({
    user_id: "USR001", amount: "1250.00",
    merchant_category: "online", hour_of_day: "14",
    day_of_week: "1", location_mismatch: "0",
    velocity_last_hour: "2", distance_from_home_km: "15",
    prev_txn_amount: "320", account_age_days: "730",
    failed_attempts_today: "0", is_international: "0"
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setLoading(true);
    try {
      const body = { ...form };
      ["amount","hour_of_day","day_of_week","location_mismatch","velocity_last_hour",
       "distance_from_home_km","prev_txn_amount","account_age_days","failed_attempts_today","is_international"]
        .forEach(k => body[k] = Number(body[k]));
      const r = await fetch(`${API}/analyze-transaction`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await r.json();
      setResult(data);
      onResult && onResult(data);
    } catch {
      setResult({ error: "Cannot connect to API. Make sure the backend is running on port 8000." });
    }
    setLoading(false);
  };

  const Field = ({ label, k, type = "text", options }) => (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      {options ? (
        <select value={form[k]} onChange={e => set(k, e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none">
          {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      ) : (
        <input type={type} value={form[k]} onChange={e => set(k, e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" />
      )}
    </div>
  );

  return (
    <div className="rounded-xl border p-6" style={{ background: COLORS.card, borderColor: COLORS.border }}>
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Send size={18} className="text-indigo-400" /> Analyze Transaction
      </h2>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Field label="User ID" k="user_id" />
        <Field label="Amount ($)" k="amount" type="number" />
        <Field label="Merchant Category" k="merchant_category" options={[
          {v:"grocery",l:"Grocery"},{v:"online",l:"Online"},{v:"restaurant",l:"Restaurant"},
          {v:"crypto",l:"Crypto"},{v:"atm",l:"ATM"},{v:"retail",l:"Retail"},
          {v:"wire_transfer",l:"Wire Transfer"},{v:"gas",l:"Gas"},{v:"healthcare",l:"Healthcare"}
        ]} />
        <Field label="Hour of Day (0–23)" k="hour_of_day" type="number" />
        <Field label="Day of Week (0=Mon)" k="day_of_week" type="number" />
        <Field label="Location Mismatch" k="location_mismatch" options={[{v:"0",l:"No"},{v:"1",l:"Yes"}]} />
        <Field label="Velocity (txns/hr)" k="velocity_last_hour" type="number" />
        <Field label="Distance from Home (km)" k="distance_from_home_km" type="number" />
        <Field label="Prev Txn Amount ($)" k="prev_txn_amount" type="number" />
        <Field label="Account Age (days)" k="account_age_days" type="number" />
        <Field label="Failed Attempts Today" k="failed_attempts_today" type="number" />
        <Field label="International" k="is_international" options={[{v:"0",l:"No"},{v:"1",l:"Yes"}]} />
      </div>

      <button onClick={submit} disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
        {loading ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
        {loading ? "Analyzing..." : "Run Fraud Detection"}
      </button>

      {result && (
        <div className={`mt-4 rounded-xl border p-4 ${result.error ? "border-red-700 bg-red-900/20" : RISK_BG[result.risk_level]}`}>
          {result.error ? (
            <p className="text-red-400 text-sm">{result.error}</p>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-3">
                <ScoreRing score={result.risk_score} level={result.risk_level} />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <RiskBadge level={result.risk_level} />
                    {result.alert_created && (
                      <span className="text-xs bg-red-800/50 text-red-300 px-2 py-0.5 rounded-full">Alert #{result.alert_id}</span>
                    )}
                  </div>
                  <div className="text-white font-semibold">{result.recommended_action}</div>
                  <div className="text-gray-400 text-xs mt-1">
                    Fraud Prob: {(result.fraud_probability * 100).toFixed(1)}% · Txn: {result.transaction_id}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                {result.risk_factors.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-gray-300">
                    <span className="text-yellow-400 mt-0.5">⚠</span>{f}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Alerts Table
// ──────────────────────────────────────────────
function AlertsTable({ alerts }) {
  if (!alerts.length) return (
    <div className="text-center py-12 text-gray-500">
      <Shield size={40} className="mx-auto mb-3 opacity-30" />
      No alerts yet. Analyze some transactions to generate alerts.
    </div>
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ borderColor: COLORS.border }}>
            {["Alert ID","User","Amount","Risk","Score","Action","Status"].map(h => (
              <th key={h} className="text-left text-gray-400 font-medium py-2 px-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {alerts.map(a => (
            <tr key={a.alert_id} className="border-b hover:bg-white/5 transition-colors" style={{ borderColor: COLORS.border }}>
              <td className="py-3 px-3 font-mono text-indigo-400">#{a.alert_id}</td>
              <td className="py-3 px-3 text-gray-300">{a.user_id}</td>
              <td className="py-3 px-3 text-white font-medium">${Number(a.amount).toLocaleString()}</td>
              <td className="py-3 px-3"><RiskBadge level={a.risk_level} /></td>
              <td className="py-3 px-3 text-gray-300">{a.risk_score}/100</td>
              <td className="py-3 px-3 text-gray-400 max-w-48 truncate">{a.recommended_action}</td>
              <td className="py-3 px-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  a.status === "OPEN" ? "bg-red-900/40 text-red-400" : "bg-green-900/40 text-green-400"
                }`}>{a.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Dashboard
// ──────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [simLoading, setSimLoading] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const r = await fetch(`${API}/alerts`);
      const d = await r.json();
      setAlerts(d.alerts || []);
      setStats(d.stats);
    } catch {}
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  // Build chart data from alerts
  useEffect(() => {
    const buckets = {};
    alerts.forEach(a => {
      const hr = new Date(a.timestamp).getHours();
      const key = `${hr}:00`;
      if (!buckets[key]) buckets[key] = { time: key, fraud: 0, safe: 0 };
      if (["HIGH","CRITICAL"].includes(a.risk_level)) buckets[key].fraud++;
      else buckets[key].safe++;
    });
    setChartData(Object.values(buckets).sort((a, b) => parseInt(a.time) - parseInt(b.time)));
  }, [alerts]);

  const simulate = async () => {
    setSimLoading(true);
    try {
      await fetch(`${API}/simulate-batch?count=15`);
      await fetchAlerts();
    } catch {}
    setSimLoading(false);
  };

  const pieData = stats ? [
    { name: "Critical", value: stats.critical_alerts || 0, color: COLORS.critical },
    { name: "High",     value: stats.high_alerts || 0,     color: COLORS.high },
    { name: "Other",    value: (stats.total_alerts || 0) - (stats.critical_alerts || 0) - (stats.high_alerts || 0), color: COLORS.accent },
  ] : [];

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: Activity },
    { id: "analyze",   label: "Analyze",   icon: Zap },
    { id: "alerts",    label: `Alerts ${alerts.length ? `(${alerts.length})` : ""}`, icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen text-white" style={{ background: COLORS.bg, fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: COLORS.border, background: COLORS.card }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Shield size={16} />
          </div>
          <div>
            <div className="font-bold text-white">FraudGuard AI</div>
            <div className="text-xs text-gray-400">Real-time Financial Fraud Detection</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-green-400">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            System Active
          </span>
          <button onClick={simulate} disabled={simLoading}
            className="ml-4 bg-indigo-700/50 hover:bg-indigo-700 border border-indigo-600 text-indigo-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50">
            {simLoading ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
            Simulate Batch
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b px-6" style={{ borderColor: COLORS.border }}>
        <div className="flex gap-1 py-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id ? "bg-indigo-600/20 text-indigo-300 border border-indigo-600/40" : "text-gray-400 hover:text-white"
              }`}>
              <t.icon size={14} />{t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        {/* ── DASHBOARD TAB ── */}
        {tab === "dashboard" && (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-4 gap-4">
              <StatCard icon={Activity} label="Total Alerts" value={stats?.total_alerts ?? 0} sub="All time" />
              <StatCard icon={AlertTriangle} label="Open Alerts" value={stats?.open_alerts ?? 0} sub="Needs review" color="text-red-400" />
              <StatCard icon={Eye} label="Critical" value={stats?.critical_alerts ?? 0} sub="Immediate action" color="text-orange-400" />
              <StatCard icon={CheckCircle} label="Resolved" value={stats?.resolved_alerts ?? 0} sub="Closed alerts" color="text-green-400" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-3 gap-4">
              {/* Area chart */}
              <div className="col-span-2 rounded-xl border p-5" style={{ background: COLORS.card, borderColor: COLORS.border }}>
                <h3 className="text-sm font-semibold text-gray-300 mb-4">Fraud Activity by Hour</h3>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="fraud" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.critical} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={COLORS.critical} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                      <XAxis dataKey="time" tick={{ fill: "#6b7280", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
                      <Area type="monotone" dataKey="fraud" stroke={COLORS.critical} fill="url(#fraud)" name="Fraud Alerts" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-56 flex items-center justify-center text-gray-500 text-sm">
                    No data yet — simulate a batch or analyze transactions
                  </div>
                )}
              </div>

              {/* Pie chart */}
              <div className="rounded-xl border p-5" style={{ background: COLORS.card, borderColor: COLORS.border }}>
                <h3 className="text-sm font-semibold text-gray-300 mb-4">Alert Distribution</h3>
                {pieData.some(d => d.value > 0) ? (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                          dataKey="value" stroke="none">
                          {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1 mt-2">
                      {pieData.map(d => (
                        <div key={d.name} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                            <span className="text-gray-400">{d.name}</span>
                          </span>
                          <span className="text-white font-medium">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-48 flex items-center justify-center text-gray-500 text-sm text-center">
                    Simulate a batch to see distribution
                  </div>
                )}
              </div>
            </div>

            {/* Recent alerts preview */}
            <div className="rounded-xl border p-5" style={{ background: COLORS.card, borderColor: COLORS.border }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-300">Recent Alerts</h3>
                <button onClick={() => setTab("alerts")} className="text-xs text-indigo-400 hover:text-indigo-300">View all →</button>
              </div>
              <AlertsTable alerts={alerts.slice(0, 5)} />
            </div>
          </div>
        )}

        {/* ── ANALYZE TAB ── */}
        {tab === "analyze" && (
          <div className="max-w-2xl mx-auto">
            <AnalyzeForm onResult={fetchAlerts} />
          </div>
        )}

        {/* ── ALERTS TAB ── */}
        {tab === "alerts" && (
          <div className="rounded-xl border p-5" style={{ background: COLORS.card, borderColor: COLORS.border }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">All Fraud Alerts</h2>
              <button onClick={fetchAlerts} className="text-gray-400 hover:text-white">
                <RefreshCw size={16} />
              </button>
            </div>
            <AlertsTable alerts={alerts} />
          </div>
        )}
      </div>
    </div>
  );
}