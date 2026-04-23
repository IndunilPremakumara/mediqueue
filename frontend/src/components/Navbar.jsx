function Navbar({ user, logout }) {
  return (
    <div className="bg-white shadow p-4 flex justify-between">
      <h1 className="font-bold text-lg">Welcome {user?.name}</h1>
      <button
        onClick={logout}
        className="bg-red-500 text-white px-3 py-1 rounded"
      >
        Logout
      </button>
    </div>
  );
}

export default Navbar;