import { useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

function Register({ setUser }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [role, setRole] = useState("patient");

  const navigate = useNavigate();

  const register = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await API.post("/auth/register", {
        name,
        email,
        password,
        role
      });

      // Store token and set user
      localStorage.setItem("token", res.data.token);
      setUser({
        id: res.data.id,
        name: res.data.name,
        email: res.data.email,
        role: res.data.role
      });

      navigate("/");
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.errors) {
        // Handle validation errors array
        setError(errorData.errors.map(e => e.msg).join(", "));
      } else if (errorData?.message) {
        setError(errorData.message);
      } else {
        setError(errorData || "Register failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.gridOverlay} />

      {/* Left panel */}
      <div style={styles.leftPanel}>
        <div style={styles.logoMark}>
          <span style={styles.logoText}>MediQueue</span>
        </div>

        <div style={styles.heroText}>
          <h1 style={styles.heroHeading}>
            Join<br />
            <span style={styles.heroAccent}>Smart</span><br />
            Healthcare.
          </h1>
          <p style={styles.heroSub}>
            Create your account to manage appointments and queues efficiently.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div style={styles.rightPanel}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Create Account</h2>

          {error && <div style={styles.errorBox}>{error}</div>}

          {/* Name */}
          <input
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
          />

          {/* Email */}
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />

          {/* Password */}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />

          {/* Role Selection */}
          <div style={styles.fieldRow}>
            <label style={styles.labelSmall}>Register as:</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={styles.select}
            >
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button
            onClick={register}
            disabled={loading}
            style={{ ...styles.btn, ...(loading && styles.btnDisabled) }}
          >
            {loading ? "Creating..." : "Sign Up"}
          </button>

          <p style={styles.bottomText}>
            Already have an account?{" "}
            <span onClick={() => navigate("/")} style={styles.link}>
              Login
            </span>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(15px); }
          to { opacity:1; transform:translateY(0); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    minHeight: "100vh",
    background: "#0B0F1A",
    fontFamily: "sans-serif",
  },
  gridOverlay: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
    backgroundSize: "40px 40px",
  },
  leftPanel: {
    flex: 1,
    padding: "60px",
    color: "#fff",
  },
  logoMark: {
    fontSize: 20,
    fontWeight: "bold",
  },
  logoText: {
    color: "#fff",
  },
  heroText: {
    marginTop: 80,
  },
  heroHeading: {
    fontSize: 48,
    lineHeight: 1.1,
  },
  heroAccent: {
    color: "#00C9A7",
  },
  heroSub: {
    marginTop: 20,
    color: "rgba(255,255,255,0.5)",
  },
  rightPanel: {
    width: 450,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "100%",
    padding: 30,
    borderRadius: 20,
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.1)",
    animation: "fadeUp 0.5s ease",
  },
  cardTitle: {
    color: "#fff",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    padding: 12,
    marginBottom: 15,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.05)",
    color: "#fff",
  },
  btn: {
    width: "100%",
    padding: 12,
    background: "#00C9A7",
    border: "none",
    borderRadius: 10,
    fontWeight: "bold",
    cursor: "pointer",
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  errorBox: {
    background: "rgba(255,0,0,0.1)",
    color: "#ff6b6b",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  bottomText: {
    marginTop: 15,
    color: "rgba(255,255,255,0.5)",
  },
  link: {
    color: "#00C9A7",
    cursor: "pointer",
  },
  fieldRow: {
    marginBottom: 15,
  },
  labelSmall: {
    display: "block",
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    marginBottom: 5,
  },
  select: {
    width: "100%",
    padding: 12,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.1)",
    color: "#fff",
    outline: "none",
    cursor: "pointer",
  },
};

export default Register;