import { useState, useEffect } from "react";

const API_BASE = "/api/region"; // adjust if your Vite proxy path differs

const EMPTY_FORM = {
  regionName: "",
  minLat: "",
  minLon: "",
  maxLat: "",
  maxLon: "",
};

export default function RegionManagement() {
  const [regions, setRegions] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [searchId, setSearchId] = useState("");
  const [searchResult, setSearchResult] = useState(null); // null | "not_found" | region object
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Fetch all on mount ──────────────────────────────────────
  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error(`Failed to fetch regions (${res.status})`);
      const data = await res.json();

      console.log(data);
      setRegions(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Search by ID ────────────────────────────────────────────
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

  // ── Create ──────────────────────────────────────────────────
  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regionName: form.regionName,
          regionID:   crypto.randomUUID(),
          minLat:     parseFloat(form.minLat),
          minLon:     parseFloat(form.minLon),
          maxLat:     parseFloat(form.maxLat),
          maxLon:     parseFloat(form.maxLon),
        }),
      });
      if (!res.ok) throw new Error(`Create failed (${res.status})`);
      setForm(EMPTY_FORM);
      fetchAll();
    } catch (e) {
      setError(e.message);
    }
  }

  // ── Delete ──────────────────────────────────────────────────
  async function handleDelete(id) {
    setError("");
    try {
      const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      setRegions((prev) => prev.filter((r) => r.regionID !== id));
      if (searchResult && searchResult !== "not_found" && searchResult.regionID === id) {
        clearSearch();
      }
    } catch (e) {
      setError(e.message);
    }
  }

  // ── Render ──────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <h1 style={s.heading}>Region Management</h1>

      {error && <div style={s.errorBanner}>{error}</div>}

      {/* ── Search ── */}
      <section style={s.card}>
        <h2 style={s.cardTitle}>Search by ID</h2>
        <form onSubmit={handleSearch} style={s.row}>
          <input
            style={s.input}
            placeholder="Region ID"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
          />
          <button type="submit" style={s.btnPrimary}>Search</button>
          {searchResult !== null && (
            <button type="button" onClick={clearSearch} style={s.btnGhost}>Clear</button>
          )}
        </form>

        {searchResult === "not_found" && (
          <p style={s.muted}>No region found with ID "{searchId}".</p>
        )}
        {searchResult && searchResult !== "not_found" && (
          <RegionRow region={searchResult} onDelete={handleDelete} highlight />
        )}
      </section>

      {/* ── Create ── */}
      <section style={s.card}>
        <h2 style={s.cardTitle}>Create Region</h2>
        <form onSubmit={handleCreate} style={s.formGrid}>
          {[
            { key: "regionName", label: "Region Name",       type: "text" },
            { key: "minLat",     label: "Minimum Latitude",  type: "number" },
            { key: "minLon",     label: "Minimum Longitude", type: "number" },
            { key: "maxLat",     label: "Maximum Latitude",  type: "number" },
            { key: "maxLon",     label: "Maximum Longitude", type: "number" },
          ].map(({ key, label, type }) => (
            <label key={key} style={s.fieldLabel}>
              {label}
              <input
                style={s.input}
                type={type}
                step="any"
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

      {/* ── List ── */}
      <section style={s.card}>
        <div style={s.cardHeader}>
          <h2 style={s.cardTitle}>All Regions</h2>
          <button onClick={fetchAll} style={s.btnGhost} disabled={loading}>
            {loading ? "Loading…" : "↻ Refresh"}
          </button>
        </div>

        {!loading && regions.length === 0 && (
          <p style={s.muted}>No regions found.</p>
        )}

        {regions.length > 0 && (
          <div style={s.tableWrapper}>
            <table style={s.table}>
              <thead>
                <tr>
                  {["Region Name", "Region ID", "Minimum Latitude", "Minimum Longitude", "Maximum Latitude", "Maximum Longitude", ""].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {regions.map((r) => (
                  <RegionRow key={r.regionID} region={r} onDelete={handleDelete} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ── Sub-component: one region row (works in both table and card) ──
function RegionRow({ region, onDelete, highlight }) {
  const cells = [
    region.regionName,
    region.regionID,
    region.coordinates?.minLat,
    region.coordinates?.minLon,
    region.coordinates?.maxLat,
    region.coordinates?.maxLon,
  ];

  if (highlight) {
    return (
      <div style={s.highlightRow}>
        {["Region Name","Region ID","Minimum Latitude","Minimum Longitude","Maximum Latitude","Maximum Longitude"].map((label, i) => (
          <div key={label} style={s.highlightCell}>
            <span style={s.muted}>{label}</span>
            <strong>{cells[i]}</strong>
          </div>
        ))}
        <button onClick={() => onDelete(region.regionID)} style={s.btnDelete}>Delete</button>
      </div>
    );
  }

  return (
    <tr style={s.tr}>
      {cells.map((val, i) => (
        <td key={i} style={s.td}>{val}</td>
      ))}
      <td style={s.td}>
        <button onClick={() => onDelete(region.regionID)} style={s.btnDelete}>Delete</button>
      </td>
    </tr>
  );
}

// ── Styles ────────────────────────────────────────────────────
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