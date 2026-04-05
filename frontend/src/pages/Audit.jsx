import { useState, useEffect } from "react";

const API_BASE = "/api/audit"; // adjust to match your backend route

// ── Exported utility — call this from other pages to create a log ──
export async function addLog(description) {
  await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      logID:       crypto.randomUUID(),
      description,
    }),
  });
}

// ── Page component ─────────────────────────────────────────────────
export default function AuditLogManagement() {
  const [logs, setLogs]               = useState([]);
  const [searchId, setSearchId]       = useState("");
  const [searchResult, setSearchResult] = useState(null); // null | "not_found" | log object
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  useEffect(() => { fetchAll(); }, []);

    async function fetchAll() {
    setLoading(true);
    setError("");
    try {
        const res = await fetch(API_BASE);
        if (!res.ok) throw new Error(`Failed to fetch logs (${res.status})`);
        const data = await res.json();
        setLogs([...data].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    } catch (e) {
        setError(e.message);
    } finally {
        setLoading(false);
    }
    }

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchId.trim()) return;
    setError("");
    setSearchResult(null);
    try {
      const res = await fetch(`${API_BASE}/${searchId.trim()}`);
      if (res.status === 404) { setSearchResult("not_found"); return; }
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      setSearchResult(await res.json());
    } catch (e) {
      setError(e.message);
    }
  }

  function clearSearch() {
    setSearchId("");
    setSearchResult(null);
  }

  function formatTimestamp(ts) {
    if (!ts) return "—";
    return new Date(ts).toLocaleString();
  }

  return (
    <div style={s.page}>
      <h1 style={s.heading}>Audit Log Management</h1>

      {error && <div style={s.errorBanner}>{error}</div>}

      {/* ── Search ── */}
      <section style={s.card}>
        <h2 style={s.cardTitle}>Search by ID</h2>
        <form onSubmit={handleSearch} style={s.row}>
          <input
            style={s.input}
            placeholder="Log ID"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
          />
          <button type="submit" style={s.btnPrimary}>Search</button>
          {searchResult !== null && (
            <button type="button" onClick={clearSearch} style={s.btnGhost}>Clear</button>
          )}
        </form>

        {searchResult === "not_found" && (
          <p style={s.muted}>No log found with ID "{searchId}".</p>
        )}
        {searchResult && searchResult !== "not_found" && (
          <LogRow log={searchResult} formatTimestamp={formatTimestamp} highlight />
        )}
      </section>

      {/* ── All Logs ── */}
      <section style={s.card}>
        <div style={s.cardHeader}>
          <h2 style={s.cardTitle}>All Logs</h2>
          <button onClick={fetchAll} style={s.btnGhost} disabled={loading}>
            {loading ? "Loading…" : "↻ Refresh"}
          </button>
        </div>

        {!loading && logs.length === 0 && (
          <p style={s.muted}>No logs found.</p>
        )}

        {logs.length > 0 && (
          <div style={s.tableWrapper}>
            <table style={s.table}>
              <thead>
                <tr>
                  {["Log ID", "Timestamp", "Description"].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <LogRow key={log.logID} log={log} formatTimestamp={formatTimestamp} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ── Sub-component ──────────────────────────────────────────────────
function LogRow({ log, formatTimestamp, highlight }) {
  if (highlight) {
    return (
      <div style={s.highlightRow}>
        {[
          { label: "Log ID",      value: log.logID },
          { label: "Timestamp",   value: formatTimestamp(log.timestamp) },
          { label: "Description", value: log.description },
        ].map(({ label, value }) => (
          <div key={label} style={s.highlightCell}>
            <span style={s.muted}>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    );
  }

  return (
    <tr style={s.tr}>
      <td style={s.td}>{log.logID}</td>
      <td style={s.td}>{formatTimestamp(log.timestamp)}</td>
      <td style={{ ...s.td, ...s.descCell }}>{log.description}</td>
    </tr>
  );
}

// ── Styles ─────────────────────────────────────────────────────────
const s = {
  page: {
    maxWidth: 960,
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
  input: {
    padding: "0.5rem 0.65rem",
    border: "1px solid #d0d0d0",
    borderRadius: 5,
    fontSize: "0.9rem",
    outline: "none",
    width: "100%",
    maxWidth: 320,
    boxSizing: "border-box",
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
  descCell: { whiteSpace: "normal", wordBreak: "break-word" },
  highlightRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "1rem",
    alignItems: "flex-start",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: 6,
    padding: "0.85rem 1rem",
    marginTop: "0.75rem",
  },
  highlightCell: {
    display: "flex",
    flexDirection: "column",
    gap: "0.15rem",
    fontSize: "0.85rem",
  },
  muted: {
    fontSize: "0.85rem",
    color: "#888",
    margin: "0.5rem 0 0",
  },
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