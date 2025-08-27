import React, { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import ACTIONS from "../Actions";
import Client from "../components/Client";
import Editor from "../components/Editor";
import Chat from "../components/Chat";
import CompilerModule from "../components/CompilerModule";
import DrawingTool from "../components/DrawingTool";
import AnalyticsModule from "../components/AnalyticsModule";
import { initSocket } from "../socket";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FaCopy, FaSignOutAlt, FaUserFriends, FaShareAlt, FaCog, FaCode, FaComment, FaPencilAlt, FaChartLine, FaTerminal, FaFolderPlus, FaTrash, FaEdit, FaBars, FaTimes, FaJava, FaPython, FaFileCode, FaInfoCircle, FaFolderOpen, FaUsers } from "react-icons/fa";
import { CanvasProvider, useCanvas } from "../contexts/CanvasContext";
import { motion, AnimatePresence } from "framer-motion";
import { useAnalytics } from "../contexts/AnalyticsContext";

export const Context = React.createContext();

const EditorPage = () => {
  const [clients, setClients] = useState([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [roomOwner, setRoomOwner] = useState(null);
  const [activeModule, setActiveModule] = useState("code");
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState("Fira Code");
  const [theme, setTheme] = useState("vs-dark");
  const [showSettings, setShowSettings] = useState(false);
  const [files, setFiles] = useState([{ name: "Main.java", language: "java" }]);
  const [activeFile, setActiveFile] = useState("Main.java");
  const [roomName, setRoomName] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const socketRef = useRef(null);
  const codeRef = useRef({});
  const recentUsersRef = useRef(new Map());
  const { roomId } = useParams();
  const reactNavigator = useNavigate();
  const location = useLocation();

  const username = location.state?.username || localStorage.getItem("username");

  let canvasContext;
  try {
    canvasContext = useCanvas();
  } catch (error) {
    console.error("Canvas context error:", error);
    canvasContext = { canvasState: {}, updateCanvasState: () => {} };
  }
  const { canvasState, updateCanvasState } = canvasContext;

  const { logAction } = useAnalytics(); // Add this to access logAction

  useEffect(() => {
    if (!username) {
      toast.error("Username is missing. Redirecting...");
      reactNavigator("/");
      return;
    }

    const fetchRoomName = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/rooms/${roomId}`);
        if (!response.ok) throw new Error("Failed to fetch room name");
        const roomData = await response.json();
        setRoomName(roomData.name);
      } catch (error) {
        console.error("Error fetching room name:", error);
        toast.error("Failed to fetch room name");
      }
    };

    fetchRoomName();

    const connectSocket = async () => {
      try {
        setIsConnecting(true);
        socketRef.current = await initSocket();
        socketRef.current.emit(ACTIONS.JOIN, { roomId, username });
        setupSocketListeners();
        setIsConnecting(false);
      } catch (error) {
        console.error("Socket connection error:", error);
        toast.error("Connection failed. Please try again.");
        reactNavigator("/");
      }
    };

    const setupSocketListeners = () => {
      if (!socketRef.current) return;

      socketRef.current.on(ACTIONS.JOINED, ({ clients: newClients, username, socketId }) => {
        const now = Date.now();
        const lastAction = recentUsersRef.current.get(username);
        if (!lastAction || (now - lastAction) > 5000) {
          toast.success(`${username} joined the room.`);
          recentUsersRef.current.set(username, now);
        }
        setClients(newClients);
        if (!roomOwner && newClients.length > 0) {
          setRoomOwner(newClients[0]?.username);
        }
        socketRef.current?.emit(ACTIONS.SYNC_CODE, { code: codeRef.current, socketId });
      });

      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        if (username) {
          const now = Date.now();
          const lastAction = recentUsersRef.current.get(username);
          if (!lastAction || (now - lastAction) > 5000) {
            toast.success(`${username} left the room.`);
            recentUsersRef.current.set(username, now);
          }
        }
        setClients((prevClients) => prevClients.filter(client => client.socketId !== socketId));
      });

      socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code, fileName }) => {
        if (code !== codeRef.current[fileName]) {
          codeRef.current[fileName] = code;
          localStorage.setItem(`code_${fileName}`, code);
          setFiles(prevFiles => [...prevFiles]);
        }
      });

      socketRef.current.on(ACTIONS.TYPING, () => {
        setIsTyping(true);
      });

      socketRef.current.on(ACTIONS.STOP_TYPING, () => {
        setIsTyping(false);
      });

      socketRef.current.on("file_created", ({ file, username }) => {
        setFiles((prev) => {
          if (prev.some((f) => f.name === file.name)) return prev;
          return [...prev, file];
        });
        if (username !== location.state?.username) {
          toast.success(`${file.name} created by ${username}`);
        }
      });

      socketRef.current.on("file_deleted", ({ fileName, username }) => {
        setFiles((prev) => {
          const updatedFiles = prev.filter((f) => f.name !== fileName);
          if (activeFile === fileName) {
            setActiveFile(updatedFiles[0]?.name || "");
          }
          return updatedFiles;
        });
        delete codeRef.current[fileName];
        localStorage.removeItem(`code_${fileName}`);
        if (username !== location.state?.username) {
          toast.success(`${fileName} deleted by ${username}`);
        }
      });

      socketRef.current.on("file_renamed", ({ oldFileName, newFileName, language, username }) => {
        setFiles((prev) =>
          prev.map((file) =>
            file.name === oldFileName ? { name: newFileName, language } : file
          )
        );
        const code = codeRef.current[oldFileName];
        delete codeRef.current[oldFileName];
        codeRef.current[newFileName] = code;
        localStorage.removeItem(`code_${oldFileName}`);
        localStorage.setItem(`code_${newFileName}`, code);
        if (activeFile === oldFileName) {
          setActiveFile(newFileName);
        }
        if (username !== location.state?.username) {
          toast.success(`${oldFileName} renamed to ${newFileName} by ${username}`);
        }
      });

      socketRef.current.on("SHAPE_ADD", ({ shape, page }) => {
        updateCanvasState((prevState) => ({
          ...prevState,
          shapes: [...prevState.shapes, { ...shape, page }],
        }));
      });

      socketRef.current.on("IMAGE_ADD", ({ imageObject, page }) => {
        updateCanvasState((prevState) => ({
          ...prevState,
          images: [...prevState.images, { ...imageObject, page }],
        }));
      });

      socketRef.current.on("LAYER_UPDATE", ({ layers, activeLayer }) => {
        updateCanvasState((prevState) => ({
          ...prevState,
          layers,
          activeLayer,
        }));
      });

      socketRef.current.on("CANVAS_RESET", ({ bgColor, page }) => {
        updateCanvasState((prevState) => ({
          ...prevState,
          bgColor,
          shapes: [],
          images: [],
          layers: prevState.layers.filter((layer) => layer.id !== page),
        }));
      });

      socketRef.current.on("LOAD_CANVAS_STATE", ({ canvasState: newCanvasState }) => {
        updateCanvasState(newCanvasState);
        toast.success("Canvas state loaded from server.");
      });

      socketRef.current.on("SAVE_CANVAS_STATE", () => {
        socketRef.current.emit("SAVE_CANVAS_STATE", { roomId, canvasState });
      });

      socketRef.current.on("ERROR", ({ message }) => {
        toast.error(message);
      });
    };

    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.emit("SAVE_CANVAS_STATE", { roomId, canvasState });
        socketRef.current.disconnect();
        socketRef.current.off(ACTIONS.JOINED);
        socketRef.current.off(ACTIONS.DISCONNECTED);
        socketRef.current.off(ACTIONS.CODE_CHANGE);
        socketRef.current.off(ACTIONS.TYPING);
        socketRef.current.off(ACTIONS.STOP_TYPING);
        socketRef.current.off("file_created");
        socketRef.current.off("file_deleted");
        socketRef.current.off("file_renamed");
        socketRef.current.off("SHAPE_ADD");
        socketRef.current.off("IMAGE_ADD");
        socketRef.current.off("LAYER_UPDATE");
        socketRef.current.off("CANVAS_RESET");
        socketRef.current.off("LOAD_CANVAS_STATE");
        socketRef.current.off("SAVE_CANVAS_STATE");
        socketRef.current.off("ERROR");
      }
      recentUsersRef.current.clear();
    };
  }, [roomId, location.state?.username, reactNavigator, roomOwner, canvasState]);

  const handleCodeChange = (newCode, fileName) => {
    codeRef.current[fileName] = newCode;
    localStorage.setItem(`code_${fileName}`, newCode);
    socketRef.current.emit(ACTIONS.CODE_CHANGE, { roomId, code: newCode, fileName });

    // ✅ Log to analytics
    logAction("CODE_CHANGE", {
      file: fileName,
      linesChanged: (newCode.match(/\n/g) || []).length
    });
  };

  const copyRoomId = () => {
    const shareableLink = `${window.location.origin}/login?roomId=${roomId}`;
    navigator.clipboard.writeText(shareableLink)
      .then(() => toast.success("Room link copied to clipboard"))
      .catch(() => toast.error("Could not copy Room link"));
  };

  const shareRoomLink = () => {
    const shareableLink = `${window.location.origin}/login?roomId=${roomId}`;
    if (navigator.share) {
      navigator.share({
        title: "Join my room",
        text: "Join my room and start collaborating!",
        url: shareableLink,
      }).then(() => toast.success("Room link shared successfully"))
        .catch(() => toast.error("Error sharing room link"));
    } else {
      copyRoomId();
    }
  };

  const leaveRoom = () => {
    if (socketRef.current) {
      socketRef.current.emit(ACTIONS.LEAVE, {
        roomId,
        username: location.state?.username,
        socketId: socketRef.current.id,
      });
      socketRef.current.disconnect();
      localStorage.removeItem("username");
      reactNavigator("/");
    }
  };

  const addNewFile = () => {
    const fileName = prompt("Enter file name (must end with .java or .py):");
    if (!fileName) return;

    if (!fileName.endsWith(".java") && !fileName.endsWith(".py")) {
      toast.error("Only .java and .py files are allowed!");
      return;
    }

    if (files.some(file => file.name === fileName)) {
      toast.error("File name already exists!");
      return;
    }

    const language = fileName.endsWith(".java") ? "java" : "python";
    const newFile = { name: fileName, language };
    setFiles([...files, newFile]);
    setActiveFile(fileName);
    codeRef.current[fileName] = "";
    toast.success(`File ${fileName} created`);
    socketRef.current.emit("file_created", { roomId, file: newFile, username });
  };

  const deleteFile = (fileName) => {
    if (files.length === 1) {
      toast.error("Cannot delete the last file!");
      return;
    }
    if (window.confirm(`Are you sure you want to delete ${fileName}?`)) {
      setFiles(files.filter(file => file.name !== fileName));
      delete codeRef.current[fileName];
      localStorage.removeItem(`code_${fileName}`);
      if (activeFile === fileName) {
        setActiveFile(files[0].name);
      }
      toast.success(`File ${fileName} deleted`);
      socketRef.current.emit("file_deleted", { roomId, fileName, username });
    }
  };

  const renameFile = (oldFileName) => {
    const newFileName = prompt("Enter new file name (must end with .java or .py):", oldFileName);
    if (!newFileName || newFileName === oldFileName) return;

    if (!newFileName.endsWith(".java") && !newFileName.endsWith(".py")) {
      toast.error("Only .java and .py files are allowed!");
      return;
    }

    if (files.some(file => file.name === newFileName)) {
      toast.error("File name already exists!");
      return;
    }

    const language = newFileName.endsWith(".java") ? "java" : "python";
    setFiles(files.map(file => 
      file.name === oldFileName ? { name: newFileName, language } : file
    ));
    const code = codeRef.current[oldFileName];
    delete codeRef.current[oldFileName];
    codeRef.current[newFileName] = code;
    localStorage.removeItem(`code_${oldFileName}`);
    localStorage.setItem(`code_${newFileName}`, code);
    if (activeFile === oldFileName) {
      setActiveFile(newFileName);
    }
    toast.success(`File renamed to ${newFileName}`);
    socketRef.current.emit("file_renamed", { roomId, oldFileName, newFileName, language, username });
  };

  const moduleButtons = [
    { id: "code", icon: <FaCode />, label: "Editor" },
    { id: "compiler", icon: <FaTerminal />, label: "Run" },
    { id: "chat", icon: <FaComment />, label: "Chat" },
    { id: "draw", icon: <FaPencilAlt />, label: "Whiteboard" },
    { id: "analytics", icon: <FaChartLine />, label: "Analytics" },
  ];

  return (
    <Context.Provider value={clients}>
      <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
        {isConnecting ? (
          <div className="flex items-center justify-center w-full text-lg text-gray-400">
            Connecting to server...
          </div>
        ) : (
          <>
            {/* Sidebar Toggle Button (Visible on Small Screens) */}
            <button
              className="md:hidden fixed top-3 left-3 z-50 p-2 bg-gray-800 rounded-md shadow-md hover:bg-gray-700 transition-all duration-300"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {isSidebarOpen ? <FaTimes size={18} /> : <FaBars size={18} />}
            </button>

            {/* Enhanced Sidebar */}
            <AnimatePresence>
              {(isSidebarOpen || window.innerWidth >= 768) && (
                <motion.div
                  initial={{ x: -300 }}
                  animate={{ x: 0 }}
                  exit={{ x: -300 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className={`fixed md:static w-64 bg-gray-800 p-4 flex flex-col gap-4 shadow-xl overflow-y-auto h-full z-40 md:w-64 border-r border-gray-700/30 sidebar-scroll`}
                >
                  {/* Logo Section */}
                  <div className="text-center mb-6">
                    <img src="/code viper logo.png" alt="Code Viper Logo" className="w-32 mx-auto rounded-md shadow-sm" />
                  </div>

                  {/* Room Info */}
                  <div className="space-y-2">
                    <h3 className="flex items-center text-lg font-semibold text-gray-200 px-2">
                      <FaInfoCircle className="mr-2 text-blue-400" /> Room
                    </h3>
                    <div className="bg-gray-700/40 rounded-lg p-3">
                      <p className="text-sm text-gray-400 truncate">{roomName}</p>
                      <p className="text-sm text-blue-400 truncate">{roomOwner || "Unknown"}</p>
                      <p className="text-sm text-gray-400">Users: {clients.length}</p>
                    </div>
                  </div>

                  {/* Modules */}
                  <div className="space-y-2">
                    <h3 className="flex items-center text-lg font-semibold text-gray-200 px-2">
                      <FaCode className="mr-2 text-blue-400" /> Tools
                    </h3>
                    <div className="space-y-1">
                      {moduleButtons.map(button => (
                        <motion.button
                          key={button.id}
                          whileHover={{ scale: 1.02, backgroundColor: "rgba(55, 65, 81, 0.7)" }}
                          whileTap={{ scale: 0.98 }}
                          className={`w-full flex items-center p-2 rounded-md transition-all duration-300 ${
                            activeModule === button.id
                              ? "bg-blue-600 text-white shadow-sm"
                              : "bg-gray-700/40 text-gray-300 hover:bg-gray-600/50"
                          }`}
                          onClick={() => setActiveModule(button.id)}
                          aria-label={`Switch to ${button.label}`}
                        >
                          <span className="mr-2 text-base">{button.icon}</span>
                          <span className="text-base font-medium">{button.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Files */}
                  <div className="space-y-2">
                    <h3 className="flex items-center text-lg font-semibold text-gray-200 px-2">
                      <FaFolderOpen className="mr-2 text-blue-400" /> Files
                    </h3>
                    <div className="space-y-1">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={addNewFile}
                        className="w-full flex items-center p-2 bg-green-600 rounded-md hover:bg-green-700 transition-all duration-300 shadow-sm"
                        aria-label="Add new file"
                      >
                        <FaFolderPlus className="mr-2 text-base" />
                        <span className="text-base font-medium">New File</span>
                      </motion.button>
                      <div className="space-y-1 max-h-40 overflow-y-auto files-section">
                        {files.map(file => (
                          <motion.div
                            key={file.name}
                            whileHover={{ scale: 1.01, backgroundColor: "rgba(55, 65, 81, 0.7)" }}
                            className={`flex items-center justify-between p-2 rounded-md transition-all duration-300 ${
                              activeFile === file.name
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-gray-700/40 text-gray-300"
                            }`}
                          >
                            <div className="flex items-center flex-1 truncate">
                              {file.language === "java" ? (
                                <FaJava className="mr-2 text-base text-red-400" />
                              ) : file.language === "python" ? (
                                <FaPython className="mr-2 text-base text-yellow-400" />
                              ) : (
                                <FaFileCode className="mr-2 text-base text-gray-400" />
                              )}
                              <span
                                onClick={() => setActiveFile(file.name)}
                                className="truncate text-base font-medium"
                                aria-label={`Select file ${file.name}`}
                              >
                                {file.name}
                              </span>
                            </div>
                            <div className="flex space-x-1">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => renameFile(file.name)}
                                className="text-gray-400 hover:text-white transition-colors p-1"
                                title="Rename File"
                                aria-label={`Rename file ${file.name}`}
                              >
                                <FaEdit size={12} />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => deleteFile(file.name)}
                                className="text-gray-400 hover:text-red-400 transition-colors p-1"
                                title="Delete File"
                                aria-label={`Delete file ${file.name}`}
                              >
                                <FaTrash size={12} />
                              </motion.button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Participants */}
                  <div className="space-y-2">
                    <h3 className="flex items-center text-lg font-semibold text-gray-200 px-2">
                      <FaUsers className="mr-2 text-blue-400" /> Users
                    </h3>
                    <div className="space-y-1 max-h-32 overflow-y-auto participants-section">
                      {clients.map((client) => (
                        <Client key={client.socketId} username={client.username} />
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 mt-auto">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full flex items-center p-2 rounded-md transition-all duration-300 ${
                        showSettings
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-gray-700/40 hover:bg-gray-600/50 text-gray-300"
                      }`}
                      onClick={() => setShowSettings(!showSettings)}
                      aria-label={showSettings ? "Close settings" : "Open settings"}
                    >
                      <FaCog className="mr-2 text-base" />
                      <span className="text-base font-medium">Settings</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full flex items-center p-2 bg-green-600 rounded-md hover:bg-green-700 text-white transition-all duration-300 shadow-sm"
                      onClick={copyRoomId}
                      aria-label="Copy room link"
                    >
                      <FaCopy className="mr-2 text-base" />
                      <span className="text-base font-medium">Copy Link</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full flex items-center p-2 bg-blue-600 rounded-md hover:bg-blue-700 text-white transition-all duration-300 shadow-sm"
                      onClick={shareRoomLink}
                      aria-label="Share room link"
                    >
                      <FaShareAlt className="mr-2 text-base" />
                      <span className="text-base font-medium">Share</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full flex items-center p-2 bg-red-600 rounded-md hover:bg-red-700 text-white transition-all duration-300 shadow-sm"
                      onClick={leaveRoom}
                      aria-label="Leave room"
                    >
                      <FaSignOutAlt className="mr-2 text-base" />
                      <span className="text-base font-medium">Leave</span>
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Content Area with Header */}
            <motion.div
              className="flex-1 flex flex-col relative overflow-hidden bg-gray-800"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Header Bar */}
              <div className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/30 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-300">
                    File: <span className="text-blue-400">{activeFile}</span>
                  </span>
                  <span className="text-sm font-medium text-gray-300">
                    Room ID: <span className="text-blue-400">{roomId}</span>
                  </span>
                </div>
                <div className="text-sm text-gray-400">
                  {activeModule.charAt(0).toUpperCase() + activeModule.slice(1)} Mode
                </div>
              </div>

              {/* Main Content */}
              <AnimatePresence mode="wait">
                {activeModule === "code" && (
                  <motion.div
                    key="code"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="relative flex-1"
                  >
                    <Editor
                      socketRef={socketRef}
                      roomId={roomId}
                      onCodeChange={handleCodeChange}
                      fontSize={fontSize}
                      fontFamily={fontFamily}
                      theme={theme}
                      file={files.find(f => f.name === activeFile)}
                    />
                    <AnimatePresence>
                      {isTyping && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.3 }}
                          className="typing-indicator"
                          aria-live="polite"
                        >
                          Someone is typing...
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
                {activeModule === "chat" && (
                  <motion.div
                    key="chat"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="flex-1"
                  >
                    <Chat
                      socketRef={socketRef}
                      roomId={roomId}
                      username={location.state?.username}
                    />
                  </motion.div>
                )}
                {activeModule === "compiler" && (
                  <motion.div
                    key="compiler"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="flex-1"
                  >
                    <CompilerModule
                      socketRef={socketRef}
                      roomId={roomId}
                      codeRef={codeRef}
                      file={files.find(f => f.name === activeFile)}
                    />
                  </motion.div>
                )}
                {activeModule === "draw" && (
                  <motion.div
                    key="draw"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="flex-1"
                  >
                    <DrawingTool
                      socketRef={socketRef}
                      roomId={roomId}
                      username={location.state?.username}
                      canvasState={canvasState}
                      updateCanvasState={updateCanvasState}
                    />
                  </motion.div>
                )}
                {activeModule === "analytics" && (
                  <motion.div
                    key="analytics"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="flex-1 bg-gray-800 p-4 flex justify-center items-center"
                  >
                    <AnalyticsModule
                      roomId={roomId}
                      username={location.state?.username}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Enhanced Settings Panel */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="absolute right-0 top-0 w-72 bg-gray-800 p-4 rounded-bl-lg shadow-xl border-l border-b border-gray-700/30 z-50"
                  >
                    <h3 className="text-lg font-semibold mb-4 text-gray-200">Editor Settings</h3>
                    <div className="space-y-4">
                      {/* Font Size */}
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">Font Size</label>
                        <select
                          value={fontSize}
                          onChange={(e) => setFontSize(Number(e.target.value))}
                          className="w-full bg-gray-700 rounded-md p-2 text-white text-sm border border-gray-600/30 focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                          aria-label="Select font size"
                        >
                          {[10, 12, 14, 16, 18, 20, 22, 24].map(size => (
                            <option key={size} value={size}>{size}px</option>
                          ))}
                        </select>
                      </div>

                      {/* Font Family */}
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">Font Family</label>
                        <select
                          value={fontFamily}
                          onChange={(e) => setFontFamily(e.target.value)}
                          className="w-full bg-gray-700 rounded-md p-2 text-white text-sm border border-gray-600/30 focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                          aria-label="Select font family"
                        >
                          {[
                            "Fira Code",
                            "JetBrains Mono",
                            "Source Code Pro",
                            "Consolas",
                            "Monaco",
                            "Courier New",
                            "Roboto Mono",
                            "Inconsolata"
                          ].map(font => (
                            <option key={font} value={font}>{font}</option>
                          ))}
                        </select>
                      </div>

                      {/* Theme */}
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">Theme</label>
                        <select
                          value={theme}
                          onChange={(e) => setTheme(e.target.value)}
                          className="w-full bg-gray-700 rounded-md p-2 text-white text-sm border border-gray-600/30 focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                          aria-label="Select theme"
                        >
                          {[
                            { value: "vs-dark", label: "VS Dark" },
                            { value: "monokai", label: "Monokai" },
                            { value: "solarized-dark", label: "Solarized Dark" },
                            { value: "solarized-light", label: "Solarized Light" },
                            { value: "nord", label: "Nord" },
                            { value: "dracula", label: "Dracula" },
                            { value: "github", label: "GitHub" },
                            { value: "tomorrow", label: "Tomorrow" },
                            { value: "xcode", label: "XCode" },
                            { value: "ambiance", label: "Ambiance" }
                          ].map(themeOption => (
                            <option key={themeOption.value} value={themeOption.value}>
                              {themeOption.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </div>
      <style jsx global>{`
        .sidebar-scroll::-webkit-scrollbar,
        .files-section::-webkit-scrollbar,
        .participants-section::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .sidebar-scroll::-webkit-scrollbar-track,
        .files-section::-webkit-scrollbar-track,
        .participants-section::-webkit-scrollbar-track {
          background: #1f2937;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb,
        .files-section::-webkit-scrollbar-thumb,
        .participants-section::-webkit-scrollbar-thumb {
          background: #6b7280;
          border-radius: 4px;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover,
        .files-section::-webkit-scrollbar-thumb:hover,
        .participants-section::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
        .sidebar-scroll,
        .files-section,
        .participants-section {
          scrollbar-width: thin;
          scrollbar-color: #6b7280 #1f2937;
        }
      `}</style>
    </Context.Provider>
  );
};

export default EditorPage;