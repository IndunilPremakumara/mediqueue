import { Link } from "react-router-dom";

function Sidebar({ role }) {
  return (
    <div className="w-64 h-screen bg-purple-800 text-white p-5">
      <h2 className="text-xl font-bold mb-6">MediQueue</h2>

      {role === "patient" && (
        <Link to="/" className="block mb-3 hover:text-yellow-300">
          Dashboard
        </Link>
      )}

      {role === "doctor" && (
        <Link to="/doctor" className="block mb-3 hover:text-yellow-300">
          Doctor Panel
        </Link>
      )}

      {role === "admin" && (
        <Link to="/admin" className="block mb-3 hover:text-yellow-300">
          Admin Panel
        </Link>
      )}
    </div>
  );
}

export default Sidebar;