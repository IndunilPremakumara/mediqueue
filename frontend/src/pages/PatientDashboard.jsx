import { useState, useEffect } from "react";
import API from "../services/api";
import socket from "../services/socket";

function PatientDashboard({ user, logout }) {
  console.log("PatientDashboard mounted with user:", user);
  const [name, setName] = useState(user?.name || "");
  const [queue, setQueue] = useState("Waiting for updates...");
  const [queueNum, setQueueNum] = useState(null);
  const [booked, setBooked] = useState(false);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [selectedDoctorName, setSelectedDoctorName] = useState("No doctor selected");
  const [appointmentTime, setAppointmentTime] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30); // 30 minutes from now
    return now.toISOString().slice(0, 19).replace('T', ' ');
  });

  useEffect(() => {
    API.get("/users/doctors")
      .then(res => {
        setDoctors(res.data);
      })
      .catch(err => console.error("Failed to fetch doctors:", err));

    // FETCH EXISTING APPOINTMENT
    if (user?.name) {
      API.get(`/appointments/patient/${user.name}`)
        .then(res => {
          const appt = res.data;
          if (appt.status === "finished") {
            setFinished(true);
            setBooked(false);
          } else {
            setBooked(true);
          }
          setSelectedDoctorId(appt.doctor_id);
          // Fetch queue position
          API.get(`/queue/position/${appt.doctor_id}/${user.name}`)
            .then(qRes => setQueueNum(qRes.data.position))
            .catch(() => { });
        })
        .catch(() => {
          setBooked(false);
        });
    }
  }, [user.name]);

  useEffect(() => {
    if (doctors.length > 0 && !selectedDoctorId) {
      setSelectedDoctorId(doctors[0]._id);
      setSelectedDoctorName(doctors[0].name);
    } else if (selectedDoctorId) {
      const doc = doctors.find(d => d._id === selectedDoctorId);
      if (doc) setSelectedDoctorName(doc.name);
    }
  }, [doctors, selectedDoctorId]);

  const book = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await API.post("/appointments/book", {
        patient_name: name,
        doctor_id: selectedDoctorId,
        doctor_name: selectedDoctorName,
        appointment_time: appointmentTime,
      });

      setBooked(true);

    } catch (err) {
      const errorMsg = err.response?.data || "Booking failed. Please try again.";
      alert(typeof errorMsg === 'string' ? errorMsg : "Booking failed. Try a different time.");
    } finally {
      setLoading(false);
    }
  };

  const cancelAppointment = async () => {
    setLoading(true);
    try {
      await API.post("/appointments/cancel", {
        patient_name: name,
        doctor_id: selectedDoctorId,
        doctor_name: selectedDoctorName
      });
      setBooked(false);
      setQueueNum(null);
      alert("Appointment cancelled successfully");
    } catch {
      alert("Failed to cancel appointment");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedDoctorId) return;

    socket.emit("joinQueue", { doctor_id: selectedDoctorId });
    console.log(`[Socket] Joined room doctor_${selectedDoctorId}`);

    const handleUpdate = (data) => {
      console.log(`[Socket] Received queueUpdated:`, data);
      setQueue(data.message || "Queue updated");

      if (name && selectedDoctorId) {
        API.get(`/queue/position/${selectedDoctorId}/${name}`)
          .then(res => {
            setQueueNum(res.data.position);
            setBooked(true);
          })
          .catch(() => {
            // If position fetch fails, maybe not booked or not in queue yet
          });
      }
    };

    const handleFinished = (data) => {
      console.log(`[Socket] Received appointmentFinished:`, data);
      if (data.patient_name === name) {
        setFinished(true);
        setBooked(false);
        setQueueNum(null);
        setQueue("Consultation Completed");
      }
    };

    socket.on("queueUpdated", handleUpdate);
    socket.on("appointmentFinished", handleFinished);

    return () => {
      console.log(`[Socket] Cleaning up listeners for doctor_${selectedDoctorId}`);
      socket.off("queueUpdated", handleUpdate);
      socket.off("appointmentFinished", handleFinished);
    };
  }, [name, selectedDoctorId]);

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
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
            { icon: "📅", label: "Appointments" },
            { icon: "🩺", label: "My Doctor" },
            { icon: "📋", label: "Records" },
          ].map(({ icon, label }) => (
            <div
              key={label}
              onClick={() => setActiveTab(label)}
              style={{
                ...styles.navItem,
                ...(activeTab === label ? styles.navItemActive : {})
              }}
            >
              <span style={{ fontSize: 16 }}>{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </nav>

        <div style={styles.sidebarUser}>
          <div style={styles.sidebarUserLeft}>
            <div style={styles.avatar}>{user?.name?.substring(0, 2).toUpperCase() || "JD"}</div>
            <div>
              <p style={styles.userName}>{user?.name || "Patient"}</p>
              <p style={styles.userRole}>Premium Member</p>
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
            <h1 style={styles.pageTitle}>Patient Dashboard</h1>
            <p style={styles.pageSub}>Wednesday, April 15 · Good morning, {user?.name?.split(" ")[0] || "there"}</p>
          </div>
          <div style={styles.badge}>
            <span style={styles.badgeDot} />
            Live Queue Active
          </div>
        </div>

        {/* Conditional Content */}
        {activeTab === "Dashboard" ? (
          <>
            {/* Stats row */}
            <div style={styles.statsGrid}>
              {[
                { label: "Your Queue #", value: queueNum ?? "—", accent: "#00C9A7" },
                { label: "Avg. Wait Time", value: "18 min", accent: "#7F77DD" },
                { label: "Doctor", value: selectedDoctorName, accent: "#378ADD" },
                { label: "Status", value: booked ? "Booked" : "Not Booked", accent: booked ? "#639922" : "#888780" },
              ].map(({ label, value, accent }) => (
                <div key={label} style={styles.statCard}>
                  <span style={styles.statLabel}>{label}</span>
                  <span style={{ ...styles.statValue, color: accent }}>{value}</span>
                </div>
              ))}
            </div>

            <div style={styles.contentGrid}>
              {/* Booking card */}
              <div style={styles.card}>
                <div style={styles.cardHeaderRow}>
                  <h2 style={styles.cardTitle}>Book Appointment</h2>
                  <span style={styles.tag}>General Consultation</span>
                </div>

                <div style={styles.fieldRow}>
                  <label style={styles.fieldLabel}>Your Full Name</label>
                  <input
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={styles.input}
                    onFocus={(e) => { e.target.style.borderColor = "#00C9A7"; e.target.style.boxShadow = "0 0 0 3px rgba(0,201,167,0.1)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
                  />
                </div>

                <div style={styles.fieldRow}>
                  <label style={styles.fieldLabel}>Select Specialist</label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => {
                      setSelectedDoctorId(e.target.value);
                      const doc = doctors.find(d => d._id === e.target.value);
                      if (doc) setSelectedDoctorName(doc.name);
                    }}
                    style={styles.select}
                  >
                    {doctors.map(d => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                    {doctors.length === 0 && <option>No doctors available</option>}
                  </select>
                </div>

                <div style={styles.fieldRow}>
                  <label style={styles.fieldLabel}>Appointment Time</label>
                  <input
                    placeholder="YYYY-MM-DD HH:MM:SS"
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                    style={styles.input}
                    onFocus={(e) => { e.target.style.borderColor = "#00C9A7"; e.target.style.boxShadow = "0 0 0 3px rgba(0,201,167,0.1)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
                  />
                </div>

                <div style={styles.infoRow}>
                  <InfoItem icon="🗓" label="Date" value="Apr 15, 2026" />
                  <InfoItem icon="🕙" label="Time" value="10:00 AM" />
                  <InfoItem icon="🩺" label="Doctor" value={selectedDoctorName.split(" ")[0]} />
                </div>

                <button
                  onClick={book}
                  disabled={loading || booked || !name.trim()}
                  style={{
                    ...styles.bookBtn,
                    ...(booked ? styles.bookBtnSuccess : {}),
                    ...((loading || !name.trim()) && !booked ? styles.bookBtnDisabled : {}),
                  }}
                >
                  {loading ? "Booking..." : booked ? "✓ Appointment Confirmed" : "Confirm Booking"}
                </button>
              </div>

              {/* Live Queue */}
              <div style={styles.card}>
                <div style={styles.cardHeaderRow}>
                  <h2 style={styles.cardTitle}>Live Queue</h2>
                  <div style={styles.livePill}>
                    <span style={{ ...styles.badgeDot, background: "#00C9A7", animation: "pulse 1.5s infinite" }} />
                    LIVE
                  </div>
                </div>

                <div style={styles.queueDisplay}>
                  <div style={{ ...styles.queueCircle, borderColor: finished ? "#7F77DD" : "rgba(0,201,167,0.3)", background: finished ? "rgba(127,119,221,0.05)" : "rgba(0,201,167,0.05)" }}>
                    <span style={{ ...styles.queueNumber, color: finished ? "#7F77DD" : "#00C9A7" }}>{finished ? "✓" : (queueNum ?? "—")}</span>
                    <span style={styles.queueSub}>{finished ? "Finished" : "Your number"}</span>
                  </div>
                </div>

                <div style={styles.queueMessageBox}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#378ADD" strokeWidth="2" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span style={styles.queueMessage}>{queue}</span>
                </div>

                <div style={styles.queueTimeline}>
                  {["Registered", "In Queue", "Called", "Finished"].map((step, i) => (
                    <div key={step} style={styles.timelineItem}>
                      <div style={{
                        ...styles.timelineDot,
                        background: finished ? (i <= 3 ? "#7F77DD" : "rgba(255,255,255,0.1)") : (i <= (booked ? 1 : 0) ? "#00C9A7" : "rgba(255,255,255,0.1)"),
                        border: finished ? (i === 3 ? "2px solid #7F77DD" : "2px solid transparent") : (i === (booked ? 1 : 0) ? "2px solid #00C9A7" : "2px solid transparent"),
                      }} />
                      <span style={{ ...styles.timelineLabel, color: finished ? (i <= 3 ? "#fff" : "rgba(255,255,255,0.3)") : (i <= (booked ? 1 : 0) ? "#fff" : "rgba(255,255,255,0.3)") }}>{step}</span>
                    </div>
                  ))}
                </div>

                {booked && (
                  <button
                    onClick={cancelAppointment}
                    disabled={loading}
                    style={{ ...styles.cancelBtn, marginTop: 20 }}
                  >
                    {loading ? "Cancelling..." : "Cancel Appointment"}
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div style={styles.placeholderCard}>
            <div style={styles.placeholderIcon}>{activeTab === "Appointments" ? "📅" : activeTab === "My Doctor" ? "🩺" : "📋"}</div>
            <h2 style={styles.placeholderTitle}>{activeTab}</h2>
            <p style={styles.placeholderText}>This module is currently under development.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function InfoItem({ icon, label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.6px" }}>{icon} {label}</span>
      <span style={{ fontSize: 14, color: "#fff", fontWeight: 500 }}>{value}</span>
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
  sidebarUser: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "16px 20px 0",
    borderTop: "1px solid rgba(255,255,255,0.07)",
    marginTop: 8,
  },
  sidebarUserLeft: {
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
  avatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "rgba(0,201,167,0.15)",
    color: "#00C9A7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 600,
    flexShrink: 0,
  },
  userName: { fontSize: 13, fontWeight: 500, margin: 0 },
  userRole: { fontSize: 11, color: "rgba(255,255,255,0.35)", margin: 0 },
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
  badge: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(0,201,167,0.1)",
    border: "1px solid rgba(0,201,167,0.2)",
    borderRadius: 20,
    padding: "6px 14px",
    fontSize: 12,
    color: "#00C9A7",
    fontWeight: 500,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#00C9A7",
    animation: "pulse 1.5s infinite",
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
    gap: 6,
  },
  statLabel: { fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" },
  statValue: { fontSize: 22, fontFamily: "'Sora', sans-serif", fontWeight: 700 },
  contentGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },
  card: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 28,
  },
  cardHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  cardTitle: {
    fontFamily: "'Sora', sans-serif",
    fontSize: 18,
    fontWeight: 600,
    margin: 0,
    letterSpacing: "-0.3px",
  },
  tag: {
    fontSize: 11,
    background: "rgba(55,138,221,0.15)",
    color: "#85B7EB",
    padding: "4px 10px",
    borderRadius: 20,
    fontWeight: 500,
  },
  livePill: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 11,
    background: "rgba(0,201,167,0.1)",
    color: "#00C9A7",
    padding: "4px 10px",
    borderRadius: 20,
    fontWeight: 600,
    letterSpacing: "0.5px",
  },
  fieldRow: { marginBottom: 20 },
  fieldLabel: {
    display: "block",
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  input: {
    padding: "12px 16px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    fontSize: 14,
    color: "#fff",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "'DM Sans', sans-serif",
  },
  select: {
    padding: "12px 16px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    fontSize: 14,
    color: "#fff",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "'DM Sans', sans-serif",
    appearance: "none",
    backgroundImage: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23ffffff%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 14px top 50%",
    backgroundSize: "10px auto",
  },
  infoRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 16,
    padding: "18px 0",
    borderTop: "1px solid rgba(255,255,255,0.07)",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    marginBottom: 20,
  },
  bookBtn: {
    width: "100%",
    padding: "13px",
    background: "#00C9A7",
    border: "none",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    color: "#0B0F1A",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    transition: "background 0.2s",
  },
  bookBtnSuccess: {
    background: "rgba(99,153,34,0.2)",
    color: "#97C459",
    cursor: "default",
  },
  bookBtnDisabled: {
    background: "rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.2)",
    cursor: "not-allowed",
  },
  cancelBtn: {
    width: "100%",
    padding: "12px",
    background: "rgba(226, 75, 74, 0.1)",
    color: "#e24b4a",
    border: "1px solid rgba(226, 75, 74, 0.3)",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  successActions: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 20,
  },
  queueDisplay: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 20,
  },
  queueCircle: {
    width: 120,
    height: 120,
    borderRadius: "50%",
    border: "2px solid rgba(0,201,167,0.3)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0,201,167,0.05)",
  },
  queueNumber: {
    fontFamily: "'Sora', sans-serif",
    fontSize: 38,
    fontWeight: 700,
    color: "#00C9A7",
    lineHeight: 1,
  },
  queueSub: { fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 },
  queueMessageBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    background: "rgba(55,138,221,0.1)",
    border: "1px solid rgba(55,138,221,0.2)",
    borderRadius: 10,
    padding: "10px 14px",
    marginBottom: 20,
  },
  queueMessage: { fontSize: 13, color: "#85B7EB", lineHeight: 1.5 },
  queueTimeline: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    position: "relative",
  },
  timelineItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: "50%",
    transition: "background 0.3s",
  },
  timelineLabel: { fontSize: 11, transition: "color 0.3s" },
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

export default PatientDashboard;