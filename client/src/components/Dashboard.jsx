import React from "react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();

  // Retrieve user details (Replace with actual API call if needed)
  const user = JSON.parse(localStorage.getItem("user")) || { name: "User" };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md text-center">
        <h1 className="text-3xl font-bold mb-4">Welcome, {user.name}!</h1>
        <p className="text-gray-400">You are now logged in.</p>

        <button
          onClick={handleLogout}
          className="mt-6 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-white font-semibold transition duration-300"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
