import { useState } from "react";
import axios from "axios";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

function Login({ setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const login = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await API.post("/users/login", { email, password });
      localStorage.setItem("token", res.data.token);
      setUser(res.data);
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.errors) {
        // Handle validation errors array
        setError(errorData.errors.map(e => e.msg).join(", "));
      } else {
        setError(typeof errorData === 'string' ? errorData : "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Background grid */}
      <div style={styles.gridOverlay} />

      {/* Left panel — branding */}
      <div style={styles.leftPanel}>
        <div style={styles.logoMark}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect x="0" y="0" width="13" height="13" rx="3" fill="#00C9A7" />
            <rect x="15" y="0" width="13" height="13" rx="3" fill="#00C9A7" opacity="0.5" />
            <rect x="0" y="15" width="13" height="13" rx="3" fill="#00C9A7" opacity="0.5" />
            <rect x="15" y="15" width="13" height="13" rx="3" fill="#00C9A7" />
          </svg>
          <span style={styles.logoText}>MediQueue</span>
        </div>

        <div style={styles.heroText}>
          <h1 style={styles.heroHeading}>
            Smarter<br />
            <span style={styles.heroAccent}>Healthcare</span><br />
            Management.
          </h1>
          <p style={styles.heroSub}>
            Real-time queues, seamless appointments, and instant coordination — all in one place.
          </p>
        </div>

        <div style={styles.statsRow}>
          {[["12k+", "Patients Served"], ["340+", "Doctors"], ["99.9%", "Uptime"]].map(([val, label]) => (
            <div key={label} style={styles.statItem}>
              <span style={styles.statVal}>{val}</span>
              <span style={styles.statLabel}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div style={styles.rightPanel}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Welcome back</h2>
            <p style={styles.cardSub}>Sign in to your account</p>
          </div>

          {error && (
            <div style={styles.errorBox}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e24b4a" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Email address</label>
            <div style={styles.inputWrapper}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={styles.inputIcon}>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
              </svg>
              <input
                type="email"
                placeholder="doctor@hospital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                onFocus={(e) => { e.target.style.borderColor = "#00C9A7"; e.target.style.boxShadow = "0 0 0 3px rgba(0,201,167,0.15)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
              />
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={styles.label}>Password</label>
              <span style={styles.forgotLink}>Forgot password?</span>
            </div>
            <div style={styles.inputWrapper}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={styles.inputIcon}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                onFocus={(e) => { e.target.style.borderColor = "#00C9A7"; e.target.style.boxShadow = "0 0 0 3px rgba(0,201,167,0.15)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
              />
            </div>
          </div>

          <button
            onClick={login}
            disabled={loading}
            style={{ ...styles.btn, ...(loading ? styles.btnDisabled : {}) }}
            onMouseEnter={(e) => { if (!loading) e.target.style.background = "#00b899"; }}
            onMouseLeave={(e) => { if (!loading) e.target.style.background = "#00C9A7"; }}
          >
            {loading ? (
              <span style={styles.spinnerWrap}>
                <span style={styles.spinner} />
                Signing in...
              </span>
            ) : "Sign in"}
          </button>

          <p style={styles.registerLine}>
            Don't have an account?{" "}
            <span
              style={styles.registerLink}
              onMouseEnter={(e) => (e.target.style.textDecoration = "underline")}
              onMouseLeave={(e) => (e.target.style.textDecoration = "none")}
              onClick={() => navigate("/register")}
            >
              Create account
            </span>
          </p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&family=DM+Sans:wght@400;500&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "'DM Sans', sans-serif",
    background: "#0B0F1A",
    position: "relative",
    overflow: "hidden",
  },
  gridOverlay: {
    position: "absolute",
    inset: 0,
    backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
    backgroundSize: "48px 48px",
    pointerEvents: "none",
  },
  leftPanel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "48px 56px",
    zIndex: 1,
  },
  logoMark: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  logoText: {
    fontFamily: "'Sora', sans-serif",
    fontWeight: 600,
    fontSize: 20,
    color: "#fff",
    letterSpacing: "-0.3px",
  },
  heroText: {
    animation: "fadeUp 0.7s ease forwards",
  },
  heroHeading: {
    fontFamily: "'Sora', sans-serif",
    fontWeight: 700,
    fontSize: 52,
    lineHeight: 1.1,
    color: "#fff",
    margin: "0 0 20px",
    letterSpacing: "-1.5px",
  },
  heroAccent: {
    color: "#00C9A7",
  },
  heroSub: {
    fontSize: 16,
    color: "rgba(255,255,255,0.5)",
    lineHeight: 1.7,
    maxWidth: 380,
    margin: 0,
  },
  statsRow: {
    display: "flex",
    gap: 48,
  },
  statItem: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  statVal: {
    fontFamily: "'Sora', sans-serif",
    fontSize: 24,
    fontWeight: 600,
    color: "#fff",
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  },
  rightPanel: {
    width: 480,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    zIndex: 1,
  },
  card: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: "40px 36px",
    width: "100%",
    backdropFilter: "blur(20px)",
    animation: "fadeUp 0.6s ease forwards",
  },
  cardHeader: {
    marginBottom: 32,
  },
  cardTitle: {
    fontFamily: "'Sora', sans-serif",
    fontSize: 26,
    fontWeight: 700,
    color: "#fff",
    margin: "0 0 6px",
    letterSpacing: "-0.5px",
  },
  cardSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.45)",
    margin: 0,
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(226,75,74,0.1)",
    border: "1px solid rgba(226,75,74,0.3)",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    color: "#f09595",
    marginBottom: 20,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    display: "block",
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 8,
    fontWeight: 500,
  },
  inputWrapper: {
    position: "relative",
  },
  inputIcon: {
    position: "absolute",
    left: 14,
    top: "50%",
    transform: "translateY(-50%)",
    color: "rgba(255,255,255,0.3)",
    pointerEvents: "none",
  },
  input: {
    width: "100%",
    padding: "12px 14px 12px 42px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    fontSize: 14,
    color: "#fff",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
  },
  forgotLink: {
    fontSize: 12,
    color: "#00C9A7",
    cursor: "pointer",
  },
  btn: {
    width: "100%",
    padding: "14px",
    background: "#00C9A7",
    border: "none",
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 600,
    color: "#0B0F1A",
    cursor: "pointer",
    transition: "background 0.2s",
    marginTop: 8,
    fontFamily: "'DM Sans', sans-serif",
  },
  btnDisabled: {
    background: "rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.3)",
    cursor: "not-allowed",
  },
  spinnerWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  spinner: {
    display: "inline-block",
    width: 14,
    height: 14,
    border: "2px solid rgba(255,255,255,0.2)",
    borderTopColor: "rgba(255,255,255,0.6)",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },
  registerLine: {
    textAlign: "center",
    fontSize: 13,
    color: "rgba(255,255,255,0.35)",
    marginTop: 20,
    marginBottom: 0,
  },
  registerLink: {
    color: "#00C9A7",
    cursor: "pointer",
    textDecoration: "none",
  }
};

export default Login;