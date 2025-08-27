import React from "react";
import {
  FaCode,
  FaFile,
  FaComments,
  FaPaintBrush,
  FaChartLine,
  FaSignOutAlt,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const Sidebar = ({
  setActiveModule,
  activeModule,
  socketRef,
  roomId,
  username,
}) => {
  const navigate = useNavigate();

  const modules = [
    { name: "Files", icon: <FaFile />, module: "files" },
    { name: "Editor", icon: <FaCode />, module: "editor" },
    { name: "Compiler", icon: <FaCode />, module: "compiler" },
    { name: "Chat", icon: <FaComments />, module: "chat" },
    { name: "Draw", icon: <FaPaintBrush />, module: "draw" },
    { name: "Analytics", icon: <FaChartLine />, module: "analytics" },
  ];

  const handleLogout = () => {
    socketRef.current?.emit("leave", { roomId, username });
    localStorage.removeItem("token");
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <div className="w-48 bg-gray-800 text-white flex flex-col h-screen">
      {/* Room Info */}
      <div className="p-4 bg-gray-900 flex items-center space-x-2 border-b border-gray-700">
        <h2 className="text-lg font-semibold truncate">{roomId}</h2>
      </div>

      {/* Modules Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2 border-b border-gray-700">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Modules
          </h3>
        </div>
        <div className="space-y-1 p-2">
          {modules.map((item) => (
            <button
              key={item.module}
              onClick={() => setActiveModule(item.module)}
              className={`w-full flex items-center space-x-3 p-2 rounded text-sm ${
                activeModule === item.module
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              {item.icon}
              <span>{item.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Logout Section */}
      <div className="p-2 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 p-2 rounded text-sm text-gray-300 hover:bg-red-600 hover:text-white"
        >
          <FaSignOutAlt />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;