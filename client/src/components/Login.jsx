import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { FaEnvelope, FaLock } from 'react-icons/fa'; // Using react-icons for custom email and password logos

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    
    if (token) {
      localStorage.setItem("authToken", token);
      setSuccess("Login successful!");
      setTimeout(() => {
        setSuccess(null);
        navigate("/home");
      }, 2000);
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:5000/api/login", { email, password });
      localStorage.setItem("authToken", response.data.token);
      localStorage.setItem("username", response.data.username); // Store username
      setSuccess("Login successful!");
      setTimeout(() => {
        setSuccess(null);
        navigate("/home");
      }, 2000);
    } catch (err) {
      setError("Invalid email or password");
      setTimeout(() => setError(null), 2000);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:5000/api/auth/google";
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
          <h2 className="text-3xl font-bold text-greenHighlight mb-8 text-center">Login</h2>

          <form className="space-y-6" onSubmit={handleSubmit}>
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
              Login
            </button>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full mt-4 bg-white border-2 border-gray-500 text-black font-semibold py-3 rounded-xl flex items-center justify-center gap-4 hover:bg-gray-100 transition duration-300"
            >
              <img src="/googleicon.png" alt="Google Logo" className="h-6 w-6" />
              <span>Sign in with Google</span>
            </button>
          </form>

          <p className="text-sm text-center text-gray-400 mt-4">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </div>

      {error && (
        <div className="absolute top-4 right-4 bg-red-600 text-white text-sm py-2 px-4 rounded-md shadow-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="absolute top-4 right-4 bg-green-600 text-white text-sm py-2 px-4 rounded-md shadow-lg">
          {success}
        </div>
      )}
    </div>
  );
};

export default Login;
