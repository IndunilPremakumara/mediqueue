import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";

import Login from "./pages/Login";
import Register from "./pages/Register";
import PatientDashboard from "./pages/PatientDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  const [user, setUser] = useState(null);

  const logout = () => {
    setUser(null);
    localStorage.clear();
  };

  return (
    <BrowserRouter>
      {!user ? (
        <Routes>
          <Route path="/" element={<Login setUser={setUser} />} />
          <Route path="/register" element={<Register setUser={setUser} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      ) : (
        // Private Routes (logged in)
        <Routes>
          <Route
            path="/"
            element={
              console.log("Routing user:", user),
              user.role === "patient" ? <PatientDashboard user={user} logout={logout} /> :
                user.role === "doctor" ? <DoctorDashboard user={user} logout={logout} /> :
                  user.role === "admin" ? <AdminDashboard user={user} logout={logout} /> :
                    <Navigate to="/" />
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}

export default App;