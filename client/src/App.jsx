import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import "./index.css";

// Import all your components
import Login from "./components/Login";
import Signup from "./components/Signup";
import Dashboard from "./components/Dashboard";
import Home from "./pages/Home";
import EditorPage from "./pages/EditorPage";
import RoomsPage from "./pages/RoomsPage";
import { CanvasProvider } from "./contexts/CanvasContext";
import { AnalyticsProvider } from "./contexts/AnalyticsContext"; // Import AnalyticsProvider
import ErrorBoundary from "./components/ErrorBoundary";

const App = () => {
  const [notification, setNotification] = useState(null);

  // Function to show notification
  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000); // Remove notification after 3 seconds
  };

  return (
    <BrowserRouter>
      <div>
        {/* React Hot Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            success: {
              theme: {
                primary: "#4aed88",
              },
            },
          }}
        />

        {/* Custom Notification */}
        {notification && (
          <div
            className={`notification ${
              notification.type === "error" ? "bg-red-600" : "bg-green-500"
            } text-white py-2 px-4 fixed top-0 left-0 right-0 z-50`}
          >
            {notification.message}
          </div>
        )}

        {/* Wrap Routes with AnalyticsProvider, CanvasProvider, and ErrorBoundary */}
        <AnalyticsProvider>
          <CanvasProvider>
            <ErrorBoundary>
              <Routes>
                {/* Authentication Routes */}
                <Route
                  path="/"
                  element={<Login showNotification={showNotification} />}
                />
                <Route
                  path="/login"
                  element={<Login showNotification={showNotification} />}
                />
                <Route
                  path="/signup"
                  element={<Signup showNotification={showNotification} />}
                />

                {/* Main Application Routes */}
                <Route path="/home" element={<Home />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/editor/:roomId" element={<EditorPage />} />
                <Route path="/rooms" element={<RoomsPage />} />

                {/* Redirect unknown routes to login */}
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </ErrorBoundary>
          </CanvasProvider>
        </AnalyticsProvider>
      </div>
    </BrowserRouter>
  );
};

export default App;