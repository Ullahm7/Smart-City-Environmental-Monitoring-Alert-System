import { useState, useEffect } from "react";
import { addLog } from "./Audit";
 
const RULES_BASE   = "/api/alerts/rules";
const HISTORY_BASE = "/api/alerts/history";
const ACK_URL      = "/api/alerts/acknowledge";
const RESOLVE_URL  = "/api/alerts/resolve";
 
const SENSOR_TYPES = ["AIR_QUALITY","TEMPERATURE","HUMIDITY","NOISE","UV_INDEX","RAINFALL","WIND"];
const CONDITIONS   = ["GREATER_THAN","LESS_THAN"];
const STATUSES     = ["ALL","ACTIVE","ACKNOWLEDGED","RESOLVED"];
 
const EMPTY_FORM = {
  name:      "",
  region:    "",
  type:      SENSOR_TYPES[0],
  threshold: "",
  condition: CONDITIONS[0],
};
 
export default function AlertManagement() {
  const [rules, setRules]               = useState([]);
  const [history, setHistory]           = useState([]);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading]           = useState(false);
  const [histLoading, setHistLoading]   = useState(false);
  const [error, setError]               = useState("");
 
  useEffect(() => { fetchRules(); fetchHistory(); }, []);
 
  // ── Rules ───────────────────────────────────────────────────────────────────
 
  async function fetchRules() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(RULES_BASE);
      if (!res.ok) throw new Error(`Failed to fetch rules (${res.status})`);
      setRules(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
 
  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${RULES_BASE}/create`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:      form.name,
          region:    form.region,
          type:      form.type,
          threshold: parseFloat(form.threshold),
          condition: form.condition,
        }),
      });
      if (!res.ok) throw new Error(`Create failed (${res.status})`);
      await addLog(`Alert rule "${form.name}" created for region ${form.region} — ${form.type} ${form.condition} ${form.threshold}`);
      setForm(EMPTY_FORM);
      fetchRules();
    } catch (e) {
      setError(e.message);
    }
  }
 
  async function handleDeleteRule(rule) {
    setError("");
    try {
      const res = await fetch(`${RULES_BASE}/delete`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id }),
      });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      await addLog(`Alert rule "${rule.name}" (ID ${rule.id}) deleted`);
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
    } catch (e) {
      setError(e.message);
    }
  }
 
  // ── Alert history ───────────────────────────────────────────────────────────
 
  async function fetchHistory(status) {
    setHistLoading(true);
    setError("");
    const filter = status && status !== "ALL" ? `?status=${status}` : "";
    try {
      const res = await fetch(`${HISTORY_BASE}${filter}`);
      if (!res.ok) throw new Error(`Failed to fetch history (${res.status})`);
      const data = await res.json();
      setHistory([...data].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    } catch (e) {
      setError(e.message);
    } finally {
      setHistLoading(false);
    }
  }
 
  function handleFilterChange(val) {
    setStatusFilter(val);
    fetchHistory(val);
  }
 
  async function handleAcknowledge(alert) {
    setError("");
    try {
      const res = await fetch(ACK_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: alert.id }),
      });
      if (!res.ok) throw new Error(`Acknowledge failed (${res.status})`);
      await addLog(`Alert ID ${alert.id} ("${alert.ruleName}") acknowledged`);
      fetchHistory(statusFilter);
    } catch (e) {
      setError(e.message);
    }
  }
 
  async function handleResolve(alert) {
    setError("");
    try {
      const res = await fetch(RESOLVE_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: alert.id }),
      });
      if (!res.ok) throw new Error(`Resolve failed (${res.status})`);
      await addLog(`Alert ID ${alert.id} ("${alert.ruleName}") resolved`);
      fetchHistory(statusFilter);
    } catch (e) {
      setError(e.message);
    }
  }
 
  // ── Helpers ─────────────────────────────────────────────────────────────────
 
  function formatTimestamp(ts) {
    if (!ts) return "—";
    return new Date(ts).toLocaleString();
  }
 
  function statusBadge(status) {
    const colours = {
      ACTIVE:       { background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5" },
      ACKNOWLEDGED: { background: "#fffbeb", color: "#d97706", border: "1px solid #fcd34d" },
      RESOLVED:     { background: "#f0fdf4", color: "#16a34a", border: "1px solid #86efac" },
    };
    return (
      <span style={{ ...s.badge, ...(colours[status] ?? {}) }}>{status}</span>
    );
  }
 
  // ── Render ──────────────────────────────────────────────────────────────────
 
  return (
    <div style={s.page}>
      <h1 style={s.heading}>Alert Management</h1>
 
      {error && <div style={s.errorBanner}>{error}</div>}
 
      {/* ── Create Rule ── */}
      <section style={s.card}>
        <h2 style={s.cardTitle}>Create Alert Rule</h2>
        <form onSubmit={handleCreate} style={s.formGrid}>
 
          <label style={s.fieldLabel}>
            Rule Name
            <input
              style={s.input}
              type="text"
              required
              placeholder="e.g. High PM2.5"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
 
          <label style={s.fieldLabel}>
            Region ID
            <input
              style={s.input}
              type="text"
              required
              placeholder="UUID of the region"
              value={form.region}
              onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
            />
          </label>
 
          <label style={s.fieldLabel}>
            Sensor Type
            <select
              style={s.input}
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              {SENSOR_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>
          </label>
 
          <label style={s.fieldLabel}>
            Threshold Value
            <input
              style={s.input}
              type="number"
              step="any"
              required
              placeholder="e.g. 100"
              value={form.threshold}
              onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))}
            />
          </label>
 
          <label style={s.fieldLabel}>
            Condition
            <select
              style={s.input}
              value={form.condition}
              onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
            >
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
              ))}
            </select>
          </label>
 
          <div style={s.formFooter}>
            <button type="submit" style={s.btnPrimary}>+ Create Rule</button>
          </div>
        </form>
      </section>
 
      {/* ── Rules List ── */}
      <section style={s.card}>
        <div style={s.cardHeader}>
          <h2 style={s.cardTitle}>Active Rules</h2>
          <button onClick={fetchRules} style={s.btnGhost} disabled={loading}>
            {loading ? "Loading…" : "↻ Refresh"}
          </button>
        </div>
 
        {!loading && rules.length === 0 && (
          <p style={s.muted}>No alert rules configured.</p>
        )}
 
        {rules.length > 0 && (
          <div style={s.tableWrapper}>
            <table style={s.table}>
              <thead>
                <tr>
                  {["ID", "Name", "Region", "Type", "Condition", "Threshold", ""].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id} style={s.tr}>
                    <td style={s.td}>{rule.id}</td>
                    <td style={s.td}>{rule.name}</td>
                    <td style={{ ...s.td, ...s.mono }}>{rule.region}</td>
                    <td style={s.td}>{rule.type?.replace(/_/g, " ")}</td>
                    <td style={s.td}>{rule.condition?.replace(/_/g, " ")}</td>
                    <td style={s.td}>{rule.threshold}</td>
                    <td style={s.td}>
                      <button onClick={() => handleDeleteRule(rule)} style={s.btnDelete}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
 
      {/* ── Alert History ── */}
      <section style={s.card}>
        <div style={s.cardHeader}>
          <h2 style={s.cardTitle}>Alert History</h2>
          <div style={s.row}>
            <select
              style={{ ...s.input, maxWidth: 160 }}
              value={statusFilter}
              onChange={(e) => handleFilterChange(e.target.value)}
            >
              {STATUSES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
            <button
              onClick={() => fetchHistory(statusFilter)}
              style={s.btnGhost}
              disabled={histLoading}
            >
              {histLoading ? "Loading…" : "↻ Refresh"}
            </button>
          </div>
        </div>
 
        {!histLoading && history.length === 0 && (
          <p style={s.muted}>No alerts found{statusFilter !== "ALL" ? ` with status ${statusFilter}` : ""}.</p>
        )}
 
        {history.length > 0 && (
          <div style={s.tableWrapper}>
            <table style={s.table}>
              <thead>
                <tr>
                  {["ID", "Rule", "Region", "Type", "Value", "Threshold", "Timestamp", "Status", ""].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((alert) => (
                  <tr key={alert.id} style={s.tr}>
                    <td style={s.td}>{alert.id}</td>
                    <td style={s.td}>{alert.ruleName}</td>
                    <td style={{ ...s.td, ...s.mono }}>{alert.region}</td>
                    <td style={s.td}>{alert.type?.replace(/_/g, " ")}</td>
                    <td style={s.td}>{alert.triggeringValue?.toFixed(2)}</td>
                    <td style={s.td}>
                      {alert.condition?.replace(/_/g, " ")} {alert.threshold}
                    </td>
                    <td style={s.td}>{formatTimestamp(alert.timestamp)}</td>
                    <td style={s.td}>{statusBadge(alert.status)}</td>
                    <td style={s.td}>
                      <div style={s.row}>
                        {alert.status === "ACTIVE" && (
                          <button onClick={() => handleAcknowledge(alert)} style={s.btnAck}>
                            Acknowledge
                          </button>
                        )}
                        {(alert.status === "ACTIVE" || alert.status === "ACKNOWLEDGED") && (
                          <button onClick={() => handleResolve(alert)} style={s.btnResolve}>
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
 
// ── Styles (matching Audit/Region/Sensor pattern) ────────────────────────────
const s = {
  page: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "2.5rem 1.5rem",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    color: "#1a1a1a",
  },
  heading: {
    fontSize: "1.75rem",
    fontWeight: 700,
    marginBottom: "1.75rem",
    borderBottom: "2px solid #e5e5e5",
    paddingBottom: "0.75rem",
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e5e5",
    borderRadius: 8,
    padding: "1.5rem",
    marginBottom: "1.5rem",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
  },
  cardTitle: {
    fontSize: "1rem",
    fontWeight: 600,
    margin: "0 0 1rem",
  },
  row: {
    display: "flex",
    gap: "0.5rem",
    flexWrap: "wrap",
    alignItems: "center",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: "0.75rem",
  },
  formFooter: {
    gridColumn: "1 / -1",
    display: "flex",
    justifyContent: "flex-end",
  },
  fieldLabel: {
    display: "flex",
    flexDirection: "column",
    gap: "0.3rem",
    fontSize: "0.8rem",
    fontWeight: 500,
    color: "#555",
  },
  input: {
    padding: "0.5rem 0.65rem",
    border: "1px solid #d0d0d0",
    borderRadius: 5,
    fontSize: "0.9rem",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    background: "#fff",
  },
  btnPrimary: {
    padding: "0.5rem 1.1rem",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 5,
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "0.9rem",
    whiteSpace: "nowrap",
  },
  btnGhost: {
    padding: "0.5rem 1.1rem",
    background: "transparent",
    color: "#555",
    border: "1px solid #d0d0d0",
    borderRadius: 5,
    fontWeight: 500,
    cursor: "pointer",
    fontSize: "0.9rem",
    whiteSpace: "nowrap",
  },
  btnDelete: {
    padding: "0.3rem 0.75rem",
    background: "transparent",
    color: "#dc2626",
    border: "1px solid #fca5a5",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: "0.8rem",
    fontWeight: 500,
  },
  btnAck: {
    padding: "0.3rem 0.6rem",
    background: "#fffbeb",
    color: "#d97706",
    border: "1px solid #fcd34d",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: "0.75rem",
    fontWeight: 500,
    whiteSpace: "nowrap",
  },
  btnResolve: {
    padding: "0.3rem 0.6rem",
    background: "#f0fdf4",
    color: "#16a34a",
    border: "1px solid #86efac",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: "0.75rem",
    fontWeight: 500,
    whiteSpace: "nowrap",
  },
  badge: {
    display: "inline-block",
    padding: "0.2rem 0.5rem",
    borderRadius: 4,
    fontSize: "0.75rem",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  tableWrapper: { overflowX: "auto" },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.9rem",
  },
  th: {
    textAlign: "left",
    padding: "0.6rem 0.75rem",
    borderBottom: "2px solid #e5e5e5",
    fontWeight: 600,
    fontSize: "0.8rem",
    color: "#555",
    whiteSpace: "nowrap",
  },
  tr: { borderBottom: "1px solid #f0f0f0" },
  td: { padding: "0.65rem 0.75rem", whiteSpace: "nowrap" },
  mono: { fontSize: "0.78rem", fontFamily: "monospace", color: "#555" },
  muted: { fontSize: "0.85rem", color: "#888", margin: "0.5rem 0 0" },
  errorBanner: {
    background: "#fef2f2",
    border: "1px solid #fca5a5",
    color: "#dc2626",
    padding: "0.75rem 1rem",
    borderRadius: 6,
    marginBottom: "1.25rem",
    fontSize: "0.9rem",
  },
};