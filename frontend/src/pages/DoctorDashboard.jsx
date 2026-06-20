import { useState, useEffect } from "react";
import API from "../services/api";
import socket from "../services/socket";

function DoctorDashboard({ user, logout }) {
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [called, setCalled] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    console.log("[Socket] Attempting to connect... ID:", user.id);
    
    // Add connection debugging
    socket.on("connect", () => console.log("✅ [Socket] Connected to Gateway"));
    socket.on("connect_error", (err) => console.error("❌ [Socket] Connection Error:", err));
    socket.on("disconnect", (reason) => console.warn("⚠️ [Socket] Disconnected:", reason));
    API.get(`/queue/list/${user.id}`)
      .then(res => {
        // Map backend list to UI structure
        setQueue(res.data.map((p, i) => ({
          id: i,
          name: p.name,
          time: p.time,
          status: "Waiting",
          reason: "Consultation"
        })));
      })
      .catch(() => setQueue([]));

    // Listen for updates
    const handleUpdate = (data) => {
       console.log("[Socket] Doctor received update:", data);
       
       // If a new patient was called (nowServing is present)
       if (data && data.nowServing) {
         setCurrent({ 
           name: data.nowServing, 
           time: data.time || "N/A", 
           status: "In Progress", 
           reason: "Current Patient" 
         });
       }

       // Always refresh the waiting list
       API.get(`/queue/list/${user.id}`).then(res => {
         setQueue(res.data.map((p, i) => ({
           id: i,
           name: p.name,
           time: p.time,
           status: "Waiting"
         })));
       }).catch(err => console.error("Failed to refresh queue:", err));
    };

    const handleFinished = (data) => {
       console.log("[Socket] Doctor received finished:", data);
       setCurrent(prev => (prev && prev.name === data.patient_name ? null : prev));
    };

    socket.on("queueUpdated", handleUpdate);
    socket.on("appointmentFinished", handleFinished);
    
    // Join room
    socket.emit("joinQueue", { doctor_id: user.id });

    return () => {
      socket.off("queueUpdated", handleUpdate);
      socket.off("appointmentFinished", handleFinished);
    };
  }, [user?.id]);

  const callNext = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await API.post(`/queue/next/${user.id}`);
      if (res.data.nowServing) {
        setCurrent({ 
          name: res.data.nowServing, 
          time: res.data.time, 
          status: "In Progress", 
          reason: "Current Patient" 
        });
        setCalled(c => c + 1);
        
        // MANUALLY REFRESH QUEUE LIST
        const qRes = await API.get(`/queue/list/${user.id}`);
        setQueue(qRes.data.map((p, i) => ({
          id: i,
          name: p.name,
          time: p.time,
          status: "Waiting"
        })));
        
      } else {
        alert("Queue is empty!");
      }
    } catch { 
      alert("Failed to call next patient");
    }
    setLoading(false);
  };

  const completeConsult = async () => {
    if (!current || !user?.id) return;
    try {
      await API.post("/appointments/complete", {
        patient_name: current.name,
        doctor_id: user.id
      });
      setCurrent(null);
      
      // Refresh queue
      const qRes = await API.get(`/queue/list/${user.id}`);
      setQueue(qRes.data.map((p, i) => ({
        id: i,
        name: p.name,
        time: p.time,
        status: "Waiting",
        reason: "Consultation"
      })));
    } catch {
      alert("Failed to complete consultation");
    }
  };

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.7; transform:scale(0.95); } }
        @keyframes slideIn { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:translateX(0); } }
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

        <div style={styles.doctorProfile}>
          <div style={styles.doctorProfileLeft}>
            <div style={styles.doctorAvatar}>{user?.name?.substring(0,2).toUpperCase() || "DS"}</div>
            <div>
              <p style={styles.doctorName}>{user?.name || "Doctor"}</p>
              <p style={styles.doctorSpec}>Medical Specialist</p>
            </div>
            <div style={styles.onlineDot} />
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
            <h1 style={styles.pageTitle}>Doctor Dashboard</h1>
            <p style={styles.pageSub}>Wednesday, April 15 · Shift: 9:00 AM – 2:00 PM</p>
          </div>
          <button
            onClick={callNext}
            disabled={loading || queue.length === 0}
            style={{
              ...styles.callBtn,
              ...(loading || queue.length === 0 ? styles.callBtnDisabled : {}),
            }}
            onMouseEnter={(e) => { if (queue.length > 0) e.currentTarget.style.background = "#00b899"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = queue.length > 0 ? "#00C9A7" : "rgba(255,255,255,0.07)"; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
            {loading ? "Calling..." : "Call Next Patient"}
          </button>
        </div>

        {/* Dashboard Content */}
        <div style={styles.statsGrid}>
          {[
            { label: "In Queue", value: queue.length, color: "#00C9A7" },
            { label: "Consulted", value: called, color: "#7F77DD" },
            { label: "Avg. Duration", value: "14 min", color: "#378ADD" },
            { label: "Remaining", value: `${queue.length + (current ? 1 : 0)}`, color: "#EF9F27" },
          ].map(({ label, value, color }) => (
            <div key={label} style={styles.statCard}>
              <span style={styles.statLabel}>{label}</span>
              <span style={{ ...styles.statValue, color }}>{value}</span>
            </div>
          ))}
        </div>

        <div style={styles.contentGrid}>
          {/* Current patient */}
          <div style={styles.currentCard}>
            <div style={styles.currentHeader}>
              <h2 style={styles.sectionTitle}>Current Patient</h2>
              {current && (
                <span style={styles.consultingTag}>● Consulting</span>
              )}
            </div>

            {current ? (
              <div style={{ animation: "slideIn 0.4s ease" }}>
                <div style={styles.patientHero}>
                  <div style={styles.patientAvatar}>
                    {current.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <h3 style={styles.patientName}>{current.name}</h3>
                    <p style={styles.patientMeta}>Age {current.age} · {current.time}</p>
                  </div>
                </div>

                <div style={styles.reasonBox}>
                  <span style={styles.reasonLabel}>Chief Complaint</span>
                  <span style={styles.reasonValue}>{current.reason}</span>
                </div>

                <div style={styles.actionRow}>
                  <button onClick={completeConsult} style={styles.completeBtn}>
                    Mark as Complete
                  </button>
                  <button style={styles.referBtn}>Refer</button>
                </div>
              </div>
            ) : (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>🩺</div>
                <p style={styles.emptyText}>No active patient</p>
                <p style={styles.emptyHint}>Press "Call Next Patient" to begin</p>
              </div>
            )}
          </div>

          {/* Queue list */}
          <div style={styles.queueCard}>
            <div style={styles.currentHeader}>
              <h2 style={styles.sectionTitle}>Waiting Queue</h2>
              <span style={styles.queueCount}>{queue.length} remaining</span>
            </div>

            <div style={styles.queueList}>
              {queue.length === 0 ? (
                <div style={styles.emptyState}>
                  <p style={styles.emptyText}>Queue is empty</p>
                </div>
              ) : (
                queue.map((patient, idx) => (
                  <div key={patient.id} style={styles.queueRow}>
                    <div style={styles.queuePos}>{idx + 1}</div>
                    <div style={styles.queueInfo}>
                      <span style={styles.queueName}>{patient.name}</span>
                      <span style={styles.queueReason}>{patient.reason}</span>
                    </div>
                    <div style={styles.queueTime}>{patient.time}</div>
                  </div>
                ))
              )}
            </div>
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
  doctorProfile: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "16px 20px 0",
    borderTop: "1px solid rgba(255,255,255,0.07)",
    marginTop: 8,
    position: "relative",
  },
  doctorProfileLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
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
  doctorAvatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "rgba(127,119,221,0.15)",
    color: "#AFA9EC",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 600,
    flexShrink: 0,
  },
  doctorName: { fontSize: 13, fontWeight: 500, margin: 0 },
  doctorSpec: { fontSize: 11, color: "rgba(255,255,255,0.35)", margin: 0 },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#00C9A7",
    position: "absolute",
    bottom: 16,
    right: 20,
  },
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
  callBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 22px",
    background: "#00C9A7",
    border: "none",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    color: "#0B0F1A",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    transition: "background 0.2s",
  },
  callBtnDisabled: {
    background: "rgba(255,255,255,0.07)",
    color: "rgba(255,255,255,0.2)",
    cursor: "not-allowed",
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
    gap: 6,
  },
  statLabel: { fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" },
  statValue: { fontSize: 22, fontFamily: "'Sora', sans-serif", fontWeight: 700 },
  contentGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },
  currentCard: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 28,
  },
  queueCard: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 28,
    display: "flex",
    flexDirection: "column",
  },
  currentHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: "'Sora', sans-serif",
    fontSize: 18,
    fontWeight: 600,
    margin: 0,
    letterSpacing: "-0.3px",
  },
  consultingTag: {
    fontSize: 11,
    color: "#00C9A7",
    background: "rgba(0,201,167,0.1)",
    border: "1px solid rgba(0,201,167,0.2)",
    padding: "4px 10px",
    borderRadius: 20,
    fontWeight: 600,
    animation: "pulse 2s infinite",
  },
  queueCount: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    background: "rgba(255,255,255,0.06)",
    padding: "4px 10px",
    borderRadius: 20,
  },
  patientHero: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
  },
  patientAvatar: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "rgba(0,201,167,0.1)",
    border: "2px solid rgba(0,201,167,0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Sora', sans-serif",
    fontSize: 16,
    fontWeight: 700,
    color: "#00C9A7",
    flexShrink: 0,
  },
  patientName: {
    fontFamily: "'Sora', sans-serif",
    fontSize: 20,
    fontWeight: 600,
    margin: "0 0 4px",
  },
  patientMeta: { fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0 },
  reasonBox: {
    background: "rgba(239,159,39,0.08)",
    border: "1px solid rgba(239,159,39,0.2)",
    borderRadius: 12,
    padding: "14px 16px",
    marginBottom: 20,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  reasonLabel: { fontSize: 11, color: "rgba(239,159,39,0.6)", textTransform: "uppercase", letterSpacing: "0.6px" },
  reasonValue: { fontSize: 15, fontWeight: 500, color: "#FAC775" },
  actionRow: { display: "flex", gap: 10 },
  completeBtn: {
    flex: 1,
    padding: "12px",
    background: "#00C9A7",
    border: "none",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    color: "#0B0F1A",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  referBtn: {
    padding: "12px 20px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
    color: "rgba(255,255,255,0.6)",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 0",
    gap: 8,
  },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyText: { fontSize: 15, color: "rgba(255,255,255,0.5)", margin: 0, fontWeight: 500 },
  emptyHint: { fontSize: 13, color: "rgba(255,255,255,0.25)", margin: 0 },
  queueList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    overflowY: "auto",
    maxHeight: 340,
  },
  queueRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "12px 14px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12,
    transition: "background 0.2s",
  },
  queuePos: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.07)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 600,
    color: "rgba(255,255,255,0.4)",
    flexShrink: 0,
  },
  queueInfo: { flex: 1, display: "flex", flexDirection: "column", gap: 2 },
  queueName: { fontSize: 14, fontWeight: 500 },
  queueReason: { fontSize: 12, color: "rgba(255,255,255,0.35)" },
  queueTime: { fontSize: 12, color: "rgba(255,255,255,0.3)", flexShrink: 0 },
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

export default DoctorDashboard;