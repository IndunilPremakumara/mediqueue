import { useEffect, useState } from "react";
import API from "../services/api";

const statusConfig = {
  finished: { label: "Completed", bg: "rgba(99,153,34,0.15)", color: "#97C459", dot: "#639922" },
  "In Progress": { label: "In Progress", bg: "rgba(0,201,167,0.12)", color: "#00C9A7", dot: "#00C9A7" },
  booked: { label: "Waiting", bg: "rgba(239,159,39,0.12)", color: "#FAC775", dot: "#EF9F27" },
  cancelled: { label: "Cancelled", bg: "rgba(226,75,74,0.12)", color: "#f09595", dot: "#e24b4a" },
  Scheduled: { label: "Scheduled", bg: "rgba(55,138,221,0.12)", color: "#85B7EB", dot: "#378ADD" },
};

function AdminDashboard({ user, logout }) {
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    API.get("/appointments/all")
      .then(res => setAppointments(res.data))
      .catch(() => {}); // use mock data if offline
  }, []);

  const filters = ["All", "finished", "booked", "cancelled"];
  const filtered = appointments.filter(a => {
    const matchFilter = filter === "All" || a.status === filter;
    const matchSearch = a.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      a.doctor_id.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const initials = (name) => name.split(" ").map(n => n[0]).join("").toUpperCase();
  const formatTime = (t) => {
    try {
      return new Date(t.replace(" ", "T")).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch { return t; }
  };

  const doctorColors = { "Dr. Silva": "#00C9A7", "Dr. Patel": "#7F77DD", "Dr. Reyes": "#378ADD" };

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .app-row:hover { background: rgba(255,255,255,0.06) !important; }
      `}</style>

      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarLogo}>
          <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
            <rect x="0" y="0" width="13" height="13" rx="3" fill="#00C9A7" />
            <rect x="15" y="0" width="13" height="13" rx="3" fill="#00C9A7" opacity="0.5" />
            <rect x="0" y="15" width="13" height="13" rx="3" fill="#00C9A7" opacity="0.5" />
            <rect x="15" y="15" width="13" height="13" rx="3" fill="#00C9A7" />
          </svg>
          <span style={styles.sidebarLogoText}>MediQueue</span>
        </div>

        <nav style={styles.nav}>
          {[
            { icon: "⊞", label: "Dashboard" },
          ].map(({ icon, label }) => (
            <div
              key={label}
              style={{
                ...styles.navItem,
                ...styles.navItemActive
              }}
            >
              <span style={{ fontSize: 16 }}>{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </nav>

        <div style={styles.adminProfile}>
          <div style={styles.adminProfileLeft}>
            <div style={styles.adminAvatar}>{user?.name?.substring(0,2).toUpperCase() || "AD"}</div>
            <div>
              <p style={styles.adminName}>{user?.name || "Admin"}</p>
              <p style={styles.adminRole}>System Administrator</p>
            </div>
          </div>
          <button onClick={logout} style={styles.logoutBtn} title="Logout">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={styles.main}>
        <div style={styles.topBar}>
          <div>
            <h1 style={styles.pageTitle}>Admin Dashboard</h1>
            <p style={styles.pageSub}>Wednesday, April 15 · All Systems Operational</p>
          </div>
          <div style={styles.systemStatus}>
            <span style={styles.statusDot} />
            All services running
          </div>
        </div>

        {/* Dashboard Content */}
        <div style={styles.statsGrid}>
          {[
            { label: "Total Today", value: appointments.length, color: "#fff", icon: "📋" },
            { label: "Completed", value: appointments.filter(a => a.status === "finished").length, color: "#97C459", icon: "✓" },
            { label: "Pending", value: appointments.filter(a => a.status === "booked").length, color: "#FAC775", icon: "⏱" },
            { label: "Cancelled", value: appointments.filter(a => a.status === "cancelled").length, color: "#f09595", icon: "✕" },
          ].map(({ label, value, color, icon }) => (
            <div key={label} style={styles.statCard}>
              <div style={styles.statTop}>
                <span style={styles.statLabel}>{label}</span>
                <span style={{ fontSize: 18 }}>{icon}</span>
              </div>
              <span style={{ ...styles.statValue, color }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Appointments Table */}
        <div style={styles.tableCard}>
          {/* Table controls */}
          <div style={styles.tableHeader}>
            <h2 style={styles.tableTitle}>Recent Appointments</h2>
            <div style={styles.tableControls}>
              <div style={styles.searchWrapper}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  placeholder="Search patient or doctor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={styles.searchInput}
                />
              </div>
            </div>
          </div>

          {/* Filter tabs */}
          <div style={styles.filterRow}>
            {filters.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{ ...styles.filterTab, ...(filter === f ? styles.filterTabActive : {}) }}
              >
                {statusConfig[f]?.label || f}
                <span style={{ ...styles.filterCount, ...(filter === f ? styles.filterCountActive : {}) }}>
                  {f === "All" ? appointments.length : appointments.filter(a => a.status === f).length}
                </span>
              </button>
            ))}
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {["Patient", "Doctor", "Time", "Status", "Action"].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => {
                  const sc = statusConfig[a.status] || statusConfig.Scheduled;
                  const dc = doctorColors[a.doctor_id] || "#888";
                  return (
                    <tr
                      key={a.id}
                      className="app-row"
                      style={{ ...styles.tr, animation: `fadeUp ${0.1 + i * 0.05}s ease both` }}
                    >
                      <td style={styles.td}>
                        <div style={styles.patientCell}>
                          <div style={{ ...styles.miniAvatar, background: `rgba(0,201,167,0.1)`, color: "#00C9A7" }}>
                            {initials(a.patient_name)}
                          </div>
                          <span style={styles.patientCellName}>{a.patient_name}</span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.doctorBadge, color: dc, background: `${dc}18` }}>
                          {a.doctor_id}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.timeCell}>{formatTime(a.appointment_time)}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.statusBadge, background: sc.bg, color: sc.color }}>
                          <span style={{ ...styles.statusDot2, background: sc.dot }} />
                          {sc.label}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <button style={styles.viewBtn}>View</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={styles.tableFooter}>
            <span style={styles.footerText}>Showing {filtered.length} of {appointments.length} appointments</span>
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "'DM Sans', sans-serif",
    background: "#0B0F1A",
    color: "#fff",
  },
  sidebar: {
    width: 220,
    background: "rgba(255,255,255,0.03)",
    borderRight: "1px solid rgba(255,255,255,0.07)",
    display: "flex",
    flexDirection: "column",
    padding: "28px 0",
    flexShrink: 0,
  },
  sidebarLogo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0 24px",
    marginBottom: 36,
  },
  sidebarLogoText: {
    fontFamily: "'Sora', sans-serif",
    fontWeight: 600,
    fontSize: 16,
    color: "#fff",
  },
  nav: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: "0 12px",
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 10,
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
    cursor: "pointer",
  },
  navItemActive: {
    background: "rgba(0,201,167,0.1)",
    color: "#00C9A7",
  },
  adminProfile: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "16px 20px 0",
    borderTop: "1px solid rgba(255,255,255,0.07)",
    marginTop: 8,
  },
  adminProfileLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logoutBtn: {
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.3)",
    cursor: "pointer",
    padding: "8px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
    "&:hover": {
      color: "#e24b4a",
      background: "rgba(226,75,74,0.1)",
    }
  },
  adminAvatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "rgba(226,75,74,0.15)",
    color: "#f09595",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 600,
    flexShrink: 0,
  },
  adminName: { fontSize: 13, fontWeight: 500, margin: 0 },
  adminRole: { fontSize: 11, color: "rgba(255,255,255,0.35)", margin: 0 },
  main: {
    flex: 1,
    padding: "36px 40px",
    overflowY: "auto",
    animation: "fadeUp 0.5s ease",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
  },
  pageTitle: {
    fontFamily: "'Sora', sans-serif",
    fontSize: 26,
    fontWeight: 700,
    margin: "0 0 4px",
    letterSpacing: "-0.5px",
  },
  pageSub: { fontSize: 13, color: "rgba(255,255,255,0.35)", margin: 0 },
  systemStatus: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    fontSize: 12,
    color: "#97C459",
    background: "rgba(99,153,34,0.1)",
    border: "1px solid rgba(99,153,34,0.2)",
    padding: "7px 14px",
    borderRadius: 20,
    fontWeight: 500,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#00C9A7",
    display: "inline-block",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
    marginBottom: 28,
  },
  statCard: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  statTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  statLabel: { fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" },
  statValue: { fontSize: 28, fontFamily: "'Sora', sans-serif", fontWeight: 700, lineHeight: 1 },
  tableCard: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    overflow: "hidden",
  },
  tableHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "22px 24px 0",
    marginBottom: 16,
  },
  tableTitle: {
    fontFamily: "'Sora', sans-serif",
    fontSize: 18,
    fontWeight: 600,
    margin: 0,
    letterSpacing: "-0.3px",
  },
  tableControls: { display: "flex", gap: 10 },
  searchWrapper: { position: "relative" },
  searchInput: {
    padding: "9px 12px 9px 34px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    fontSize: 13,
    color: "#fff",
    outline: "none",
    width: 220,
    fontFamily: "'DM Sans', sans-serif",
  },
  filterRow: {
    display: "flex",
    gap: 4,
    padding: "0 24px",
    marginBottom: 4,
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    paddingBottom: 0,
  },
  filterTab: {
    padding: "9px 14px",
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    display: "flex",
    alignItems: "center",
    gap: 6,
    transition: "color 0.2s",
  },
  filterTabActive: {
    color: "#00C9A7",
    borderBottomColor: "#00C9A7",
  },
  filterCount: {
    fontSize: 11,
    background: "rgba(255,255,255,0.08)",
    padding: "1px 7px",
    borderRadius: 10,
    color: "rgba(255,255,255,0.3)",
  },
  filterCountActive: {
    background: "rgba(0,201,167,0.15)",
    color: "#00C9A7",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    padding: "12px 24px",
    textAlign: "left",
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.6px",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
  },
  tr: {
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    transition: "background 0.15s",
  },
  td: {
    padding: "14px 24px",
    fontSize: 14,
  },
  patientCell: { display: "flex", alignItems: "center", gap: 10 },
  miniAvatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 600,
    flexShrink: 0,
  },
  patientCellName: { fontWeight: 500 },
  doctorBadge: {
    fontSize: 12,
    padding: "4px 10px",
    borderRadius: 20,
    fontWeight: 500,
  },
  timeCell: { fontSize: 13, color: "rgba(255,255,255,0.5)", fontVariantNumeric: "tabular-nums" },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    padding: "5px 12px",
    borderRadius: 20,
    fontWeight: 500,
  },
  statusDot2: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    flexShrink: 0,
  },
  viewBtn: {
    padding: "6px 14px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  tableFooter: {
    padding: "14px 24px",
    borderTop: "1px solid rgba(255,255,255,0.07)",
  },
  footerText: { fontSize: 12, color: "rgba(255,255,255,0.3)" },
  emptyState: {
    padding: "48px",
    textAlign: "center",
  },
  emptyText: { fontSize: 14, color: "rgba(255,255,255,0.3)", margin: 0 },
  placeholderCard: {
    background: "rgba(255,255,255,0.04)",
    border: "1px dashed rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: "80px 40px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    marginTop: 40,
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: 20,
    opacity: 0.5,
  },
  placeholderTitle: {
    fontSize: 24,
    fontFamily: "'Sora', sans-serif",
    fontWeight: 600,
    marginBottom: 10,
  },
  placeholderText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 16,
  },
};

export default AdminDashboard;