import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

const AnalyticsContext = createContext();

export const AnalyticsProvider = ({ children }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [metrics, setMetrics] = useState({
    activeUsers: 0,
    actionsPerMinute: 0,
    collaborationEvents: 0,
    avgSessionTime: 0,
    peakActivityTime: "N/A",
    totalSessionHours: 0,
    linesOfCode: 0,
    compilationFrequency: 0,
  });
  const socketRef = useRef(null);

  useEffect(() => {
    const storedRoomId = localStorage.getItem("roomId") || "";
    const storedUsername = localStorage.getItem("username") || "";
    setRoomId(storedRoomId);
    setUsername(storedUsername);
    localStorage.setItem("roomId", storedRoomId);
    localStorage.setItem("username", storedUsername);

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    if (storedRoomId && storedUsername) {
      socketRef.current = io(SOCKET_URL, {
        query: { roomId: storedRoomId, username: storedUsername },
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        autoConnect: true,
      });

      const socket = socketRef.current;

      socket.on("connect", () => {
        console.log(`📡 Connected to ${SOCKET_URL}, room: ${storedRoomId}, user: ${storedUsername}`);
        socket.emit("JOIN", { roomId: storedRoomId, username: storedUsername }, () => {
          console.log(`✅ JOIN sent for room: ${storedRoomId}`);
        });
      });

      socket.on("connect_error", (error) => {
        console.error("❌ Connect error:", error.message);
        toast.error("Failed to connect to analytics server");
      });

      socket.on("disconnect", (reason) => {
        console.log(`🔴 Disconnected due to ${reason}`);
      });

      socket.on("reconnect", (attempt) => {
        console.log(`🔄 Reconnected on attempt ${attempt}`);
        socket.emit("JOIN", { roomId: storedRoomId, username: storedUsername }, () => {
          console.log(`✅ JOIN sent after reconnect for room: ${storedRoomId}`);
        });
      });

      socket.on("JOINED", ({ clients }) => {
        console.log(`✅ Joined room ${storedRoomId} as ${storedUsername}, clients: ${clients.length}`);
        setMetrics((prev) => ({ ...prev, activeUsers: clients.length }));
      });

      socket.on("START_TRACKING_ACK", () => {
        console.log(`🎬 Start tracking acknowledged for room: ${storedRoomId}`);
      });

      socket.on("ACTION_LOG", (action) => {
        console.log(`📝 ACTION_LOG received:`, action);
      });

      socket.on("UPDATE_METRICS", (updatedMetrics) => {
        console.log(`📊 UPDATE_METRICS received:`, updatedMetrics);
        console.log(`📊 Previous metrics:`, metrics);
        setMetrics((prev) => {
          const newMetrics = {
            ...prev,
            ...updatedMetrics,
            actionsPerMinute: parseFloat(updatedMetrics.actionsPerMinute) || 0,
            avgSessionTime: parseFloat(updatedMetrics.avgSessionTime) || 0,
            totalSessionHours: parseFloat(updatedMetrics.totalSessionHours) || 0,
            peakActivityTime: updatedMetrics.peakActivityTime || "N/A",
          };
          console.log(`📊 New metrics:`, newMetrics);
          return newMetrics;
        });
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off("connect");
        socketRef.current.off("connect_error");
        socketRef.current.off("disconnect");
        socketRef.current.off("reconnect");
        socketRef.current.off("JOINED");
        socketRef.current.off("START_TRACKING_ACK");
        socketRef.current.off("ACTION_LOG");
        socketRef.current.off("UPDATE_METRICS");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [roomId, username]);

  const startTracking = () => {
    if (!socketRef.current || !roomId || !username) {
      console.error("🚫 Cannot start tracking: Missing socket, roomId, or username");
      toast.error("Cannot start tracking: Missing socket, room ID, or username");
      return;
    }
    setIsTracking(true);
    socketRef.current.emit("START_TRACKING", { roomId, username }, () => {
      console.log(`🎬 START_TRACKING sent for room: ${roomId}`);
    });
    console.log(`🎬 Attempting to start tracking for room: ${roomId}`);
  };

  const stopTracking = () => {
    if (!socketRef.current || !roomId || !username) {
      console.error("🚫 Cannot stop tracking: Missing socket, roomId, or username");
      toast.error("Cannot stop tracking: Missing socket, room ID, or username");
      return;
    }
    setIsTracking(false);
    socketRef.current.emit("STOP_TRACKING", { roomId, username });
    console.log(`🛑 Stop tracking emitted for room: ${roomId}`);
  };

  const logAction = (actionType, details = {}) => {
    if (!isTracking || !socketRef.current || !roomId || !username) {
      console.error("🚫 Cannot log action: Tracking not active or missing socket, roomId, or username");
      return;
    }
    const action = {
      timestamp: new Date().toISOString(),
      user: username,
      roomId,
      actionType,
      details,
    };
    socketRef.current.emit("USER_ACTION", action, () => {
      console.log(`📤 USER_ACTION sent:`, action);
    });
    console.log(`📤 Attempting to log action:`, action);
  };

  return (
    <AnalyticsContext.Provider
      value={{
        isTracking,
        startTracking,
        stopTracking,
        roomId,
        setRoomId,
        username,
        setUsername,
        socket: socketRef.current,
        logAction,
        metrics,
      }}
    >
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error("useAnalytics must be used within an AnalyticsProvider");
  }
  return context;
};