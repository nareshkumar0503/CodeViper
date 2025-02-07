import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { FaUser, FaEnvelope, FaLock } from 'react-icons/fa';

const Signup = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:5000/api/signup", { username, email, password });
      setSuccess("Account created successfully!");
      setTimeout(() => {
        setSuccess(null);
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError("Email already exists or invalid data");
      setTimeout(() => setError(null), 2000);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-bgPrimary text-gray-300 relative">
      <div className="hidden lg:block flex-1">
        <img
          src="/cdcollab.png"
          alt="Collaboration"
          className="w-full h-full object-cover opacity-90"
        />
      </div>

      <div className="flex flex-1 items-center justify-center bg-bgPrimary p-8">
        <div className="w-full max-w-sm bg-darkGray rounded-xl p-8 shadow-lg">
          <h2 className="text-3xl font-bold text-greenHighlight mb-8 text-center">Sign Up</h2>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="flex items-center border border-gray-500 rounded-xl p-2">
              <FaUser className="text-gray-400 mr-3" />
              <input
                type="text"
                placeholder="Enter your username"
                className="w-full p-3 bg-darkGray border-none text-gray-100 focus:outline-none"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="flex items-center border border-gray-500 rounded-xl p-2">
              <FaEnvelope className="text-gray-400 mr-3" />
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full p-3 bg-darkGray border-none text-gray-100 focus:outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="flex items-center border border-gray-500 rounded-xl p-2">
              <FaLock className="text-gray-400 mr-3" />
              <input
                type="password"
                placeholder="Enter your password"
                className="w-full p-3 bg-darkGray border-none text-gray-100 focus:outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-greenHighlight text-white font-semibold py-3 rounded-xl hover:bg-green-600 transition duration-300"
            >
              Sign Up
            </button>
          </form>

          <p className="text-sm text-center text-gray-400 mt-4">
            Already have an account? <Link to="/login" className="text-primary hover:underline">Login</Link>
          </p>
        </div>
      </div>

      {error && <div className="absolute top-4 right-4 bg-red-600 text-white text-sm py-2 px-4 rounded-md">{error}</div>}
      {success && <div className="absolute top-4 right-4 bg-green-600 text-white text-sm py-2 px-4 rounded-md">{success}</div>}
    </div>
  );
};

export default Signup;
