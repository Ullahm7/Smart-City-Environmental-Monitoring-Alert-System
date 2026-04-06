import { useState, useEffect } from "react";
import { addLog } from "./Audit";

const API_BASE = "/api/sensors";

const EMPTY_FORM = {
  name: "",
  region: "",
};

export default function SensorManagement() {
  const [sensors, setSensors] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [searchId, setSearchId] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Store credentials for sensors created in this session (keyed by sensor ID)
  const [credentials, setCredentials] = useState({});

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error(`Failed to fetch sensors (${res.status})`);
      const data = await res.json();
      console.log(data);
      setSensors(data);
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

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          region: form.region,
        }),
      });
      if (!res.ok) throw new Error(`Create failed (${res.status})`);
      await addLog(`Sensor ${form.name} was created`)
      const data = await res.json();
      // Store full response for this sensor (only available from create response)
      if (data.sensor?.id) {
        setCredentials((prev) => ({
          ...prev,
          [data.sensor.id]: data,
        }));
      }
      setForm(EMPTY_FORM);
      // Refresh the sensor list from the backend (credentials state persists)
      fetchAll();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(id) {
    setError("");
    try {
      const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      await addLog(`Sensor ID ${id} was deleted`)
      setSensors((prev) => prev.filter((s) => s.id !== id));
      // Clear credentials if they exist for this sensor
      setCredentials((prev) => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
      if (searchResult && searchResult !== "not_found" && searchResult.id === id) {
        clearSearch();
      }
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div style={s.page}>
      <h1 style={s.heading}>Sensor Management</h1>

      {error && <div style={s.errorBanner}>{error}</div>}

      {/* Search */}
      <section style={s.card}>
        <h2 style={s.cardTitle}>Search by ID</h2>
        <form onSubmit={handleSearch} style={s.row}>
          <input
            style={s.input}
            placeholder="Sensor ID"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
          />
          <button type="submit" style={s.btnPrimary}>Search</button>
          {searchResult !== null && (
            <button type="button" onClick={clearSearch} style={s.btnGhost}>Clear</button>
          )}
        </form>

        {searchResult === "not_found" && (
          <p style={s.muted}>No sensor found with ID "{searchId}".</p>
        )}
        {searchResult && searchResult !== "not_found" && (
          <SensorRow sensor={searchResult} onDelete={handleDelete} highlight />
        )}
      </section>

      {/* Create */}
      <section style={s.card}>
        <h2 style={s.cardTitle}>Create Sensor</h2>
        <form onSubmit={handleCreate} style={s.formGrid}>
          {[
            { key: "name", label: "Sensor Name", type: "text" },
            { key: "region", label: "Region ID", type: "text" },
          ].map(({ key, label, type }) => (
            <label key={key} style={s.fieldLabel}>
              {label}
              <input
                style={s.input}
                type={type}
                required
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </label>
          ))}
          <div style={s.formFooter}>
            <button type="submit" style={s.btnPrimary}>+ Create</button>
          </div>
        </form>
      </section>

      {/* List */}
      <section style={s.card}>
        <div style={s.cardHeader}>
          <h2 style={s.cardTitle}>All Sensors</h2>
          <button onClick={fetchAll} style={s.btnGhost} disabled={loading}>
            {loading ? "Loading…" : "↻ Refresh"}
          </button>
        </div>

        {!loading && sensors.length === 0 && (
          <p style={s.muted}>No sensors found.</p>
        )}

        {sensors.length > 0 && (
          <div style={s.tableWrapper}>
            <table style={s.table}>
              <thead>
                <tr>
                  {["Sensor Name", "Sensor ID", "Region ID", "Credentials", ""].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sensors.map((sensor) => (
                  <SensorRow
                    key={sensor.id}
                    sensor={sensor}
                    onDelete={handleDelete}
                    credentials={credentials[sensor.id]}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function downloadJson(filename, content) {
  const blob = new Blob([JSON.stringify(content, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function SensorRow({ sensor, onDelete, highlight, credentials }) {
  const cells = [
    sensor.name,
    sensor.id,
    sensor.region,
  ];

  if (highlight) {
    return (
      <div style={s.highlightRow}>
        {["Sensor Name", "Sensor ID", "Region ID"].map((label, i) => (
          <div key={label} style={s.highlightCell}>
            <span style={s.muted}>{label}</span>
            <strong>{cells[i]}</strong>
          </div>
        ))}
        <button onClick={() => onDelete(sensor.id)} style={s.btnDelete}>Delete</button>
      </div>
    );
  }

  return (
    <tr style={s.tr}>
      {cells.map((val, i) => (
        <td key={i} style={s.td}>{val}</td>
      ))}
      <td style={s.td}>
        {credentials ? (
          <button
            onClick={() => downloadJson(`${sensor.id}-credentials.json`, credentials)}
            style={s.btnCredential}
          >
            Download Credentials
          </button>
        ) : (
          <span style={s.muted}>-</span>
        )}
      </td>
      <td style={s.td}>
        <button onClick={() => onDelete(sensor.id)} style={s.btnDelete}>Delete</button>
      </td>
    </tr>
  );
}

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
  btnCredential: {
    padding: "0.3rem 0.6rem",
    background: "#f0fdf4",
    color: "#166534",
    border: "1px solid #86efac",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: "0.75rem",
    fontWeight: 500,
  },
  credentialButtons: {
    display: "flex",
    gap: "0.4rem",
  },
  tableWrapper: {
    overflowX: "auto",
  },
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
  tr: {
    borderBottom: "1px solid #f0f0f0",
  },
  td: {
    padding: "0.65rem 0.75rem",
    whiteSpace: "nowrap",
  },
  highlightRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "1rem",
    alignItems: "center",
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
