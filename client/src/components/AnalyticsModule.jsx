import React, { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from "recharts";
import {
  Activity,
  Play,
  Square,
  Download,
  Trash2,
  BarChart2,
  Users,
  Clock,
  MousePointer,
  Code,
  FileText,
  MessageSquare,
  Edit3,
  Settings,
  Calendar,
  PieChart as PieChartIcon,
  Terminal,
  RefreshCw,
  GitBranch,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Info,
} from "lucide-react";
import { useAnalytics } from "../contexts/AnalyticsContext";

const AnalyticsModule = () => {
  const { isTracking, startTracking, stopTracking, roomId, username, socket, metrics, logAction } = useAnalytics();

  const [userActivity, setUserActivity] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [userStats, setUserStats] = useState({});
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [customReport, setCustomReport] = useState(null);
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [activeSections, setActiveSections] = useState({
    overview: true,
    realtime: true,
    userStats: true,
    activity: true,
    reports: true,
    actions: true,
  });

  useEffect(() => {
    console.log("🔍 Metrics updated in AnalyticsModule:", metrics);
  }, [metrics]);

  useEffect(() => {
    console.log("🔍 isTracking updated in AnalyticsModule:", isTracking);
  }, [isTracking]);

  useEffect(() => {
    if (!socket) {
      console.error("🚫 Socket not available in AnalyticsModule");
      toast.error("Socket connection failed");
      return;
    }

    socket.on("JOINED", ({ clients }) => {
      console.log("✅ JOINED event received:", clients);
      setUserStats((prev) => {
        const updatedStats = { ...prev };
        clients.forEach((client) => {
          if (!updatedStats[client.username]) {
            updatedStats[client.username] = {
              actions: 0,
              lastActive: null,
              sessionDuration: 0,
              linesOfCode: 0,
              compilations: 0,
            };
          }
        });
        return updatedStats;
      });
    });

    socket.on("DISCONNECTED", ({ clients }) => {
      console.log("🔴 DISCONNECTED event received:", clients);
      setUserStats((prev) => {
        const updatedStats = {};
        clients.forEach((client) => {
          updatedStats[client.username] = prev[client.username] || {
            actions: 0,
            lastActive: null,
            sessionDuration: 0,
            linesOfCode: 0,
            compilations: 0,
          };
        });
        return updatedStats;
      });
    });

    socket.on("ACTION_LOG", (action) => {
      console.log("📝 ACTION_LOG event received:", action);
      setUserActivity((prev) => [...prev, action].slice(-100));
      updateChartData(action);
      updateUserStats(action);
    });

    socket.on("WEEKLY_REPORT", (report) => {
      console.log("📅 WEEKLY_REPORT event received:", report);
      setWeeklyReport(report);
      toast.success("Weekly report generated", { icon: "📅" });
    });

    socket.on("CUSTOM_REPORT", (report) => {
      console.log("📅 CUSTOM_REPORT event received:", report);
      setCustomReport(report);
      toast.success("Custom report generated", { icon: "📅" });
    });

    socket.on("ERROR", ({ message }) => {
      console.error("❌ ERROR event received:", message);
      toast.error(message, { icon: "⚠️" });
    });

    const today = new Date();
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);
    setReportStartDate(oneWeekAgo.toISOString().slice(0, 10));
    setReportEndDate(today.toISOString().slice(0, 10));

    socket.emit("FETCH_ANALYTICS", { roomId });

    socket.on("INITIAL_ANALYTICS", ({ userActivity, userStats }) => {
      console.log("📊 INITIAL_ANALYTICS event received:", { userActivity, userStats });
      setUserActivity(userActivity || []);
      setUserStats(userStats || {});
      userActivity.forEach(updateChartData);
    });

    return () => {
      socket.off("JOINED");
      socket.off("DISCONNECTED");
      socket.off("ACTION_LOG");
      socket.off("WEEKLY_REPORT");
      socket.off("CUSTOM_REPORT");
      socket.off("ERROR");
      socket.off("INITIAL_ANALYTICS");
    };
  }, [socket, roomId]);

  const updateChartData = useCallback((action) => {
    const timestamp = new Date(action.timestamp).toLocaleTimeString();
    setChartData((prev) => {
      const lastEntry = prev[prev.length - 1];
      if (lastEntry && lastEntry.time === timestamp) {
        return prev.map((entry, idx) =>
          idx === prev.length - 1 ? { ...entry, actions: entry.actions + 1 } : entry
        );
      }
      return [...prev, { time: timestamp, actions: 1 }].slice(-30);
    });
  }, []);

  const updateUserStats = useCallback((action) => {
    setUserStats((prev) => {
      const user = action.user;
      const prevUserStats = prev[user] || {
        actions: 0,
        lastActive: null,
        sessionDuration: 0,
        linesOfCode: 0,
        compilations: 0,
      };

      return {
        ...prev,
        [user]: {
          actions: prevUserStats.actions + 1,
          lastActive: action.timestamp,
          sessionDuration: prevUserStats.sessionDuration,
          linesOfCode:
            action.actionType === "CODE_CHANGE"
              ? prevUserStats.linesOfCode + (action.details?.linesChanged || 0)
              : prevUserStats.linesOfCode,
          compilations:
            action.actionType === "COMPILER_STATUS" && action.details?.isRunning
              ? prevUserStats.compilations + 1
              : prevUserStats.compilations,
        },
      };
    });
  }, []);

  const handleStartTracking = () => {
    if (!roomId || !username) {
      toast.error("Cannot start tracking: Missing room ID or username", { icon: "⚠️" });
      return;
    }
    startTracking();
    toast.success("Tracking started", { icon: "📊" });
  };

  const handleStopTracking = () => {
    if (!roomId || !username) {
      toast.error("Cannot stop tracking: Missing room ID or username", { icon: "⚠️" });
      return;
    }
    stopTracking();
    toast.success("Tracking stopped", { icon: "🛑" });
  };

  const exportAnalytics = () => {
    if (!roomId) {
      toast.error("Cannot export: Missing room ID", { icon: "⚠️" });
      return;
    }
    const data = {
      userActivity,
      metrics,
      chartData,
      userStats,
      weeklyReport,
      customReport,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analytics_${roomId}_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported", { icon: "💾" });
  };

  const resetAnalytics = () => {
    if (!roomId) {
      toast.error("Cannot reset: Missing room ID", { icon: "⚠️" });
      return;
    }
    setUserActivity([]);
    setChartData([]);
    setUserStats({});
    socket.emit("RESET_ANALYTICS", { roomId });
    toast.success("Analytics reset", { icon: "🗑️" });
  };

  const generateWeeklyReport = () => {
    if (!roomId) {
      toast.error("Cannot generate report: Missing room ID", { icon: "⚠️" });
      return;
    }
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 7);
    socket.emit("GET_WEEKLY_REPORT", {
      roomId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    console.log("📅 Emitted GET_WEEKLY_REPORT:", { roomId, startDate, endDate });
    toast.success("Generating weekly report...", { icon: "📅" });
  };

  const generateCustomReport = () => {
    if (!roomId) {
      toast.error("Cannot generate report: Missing room ID", { icon: "⚠️" });
      return;
    }
    if (!reportStartDate || !reportEndDate) {
      toast.error("Please select both start and end dates", { icon: "⚠️" });
      return;
    }
    const start = new Date(reportStartDate);
    const end = new Date(reportEndDate);
    if (start > end) {
      toast.error("Start date must be before end date", { icon: "⚠️" });
      return;
    }
    socket.emit("GET_CUSTOM_REPORT", {
      roomId,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });
    console.log("📅 Emitted GET_CUSTOM_REPORT:", { roomId, startDate: start, endDate: end });
    toast.success("Generating custom report...", { icon: "📅" });
  };

  const handleSampleCodeChange = () => {
    console.log("📝 Emitting CODE_CHANGE action");
    logAction("CODE_CHANGE", { file: "Main.java", linesChanged: 5 });
  };
  const handleSampleTyping = () => {
    console.log("📝 Emitting TYPING action");
    logAction("TYPING", { duration: 10 });
  };
  const handleSampleFileCreate = () => {
    console.log("📝 Emitting FILE_CREATED action");
    logAction("FILE_CREATED", { fileName: "newfile.java" });
  };
  const handleSampleMessage = () => {
    console.log("📝 Emitting MESSAGE_SENT action");
    logAction("MESSAGE_SENT", { message: "Test message" });
  };
  const handleSampleDrawing = () => {
    console.log("📝 Emitting DRAWING_UPDATE action");
    logAction("DRAWING_UPDATE", { tool: "pen" });
  };
  const handleSampleCompile = () => {
    console.log("📝 Emitting COMPILER_STATUS action");
    logAction("COMPILER_STATUS", { isRunning: true });
  };

  const toggleSection = (section) => {
    setActiveSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const COLORS = ["#60A5FA", "#34D399", "#F87171", "#FBBF24", "#A78BFA", "#F472B6"];
  const pieChartData = Object.entries(userStats).map(([user, stats], index) => ({
    name: user,
    value: stats.actions || 0,
    color: COLORS[index % COLORS.length],
  }));

  const activityTypes = userActivity.reduce((acc, action) => {
    const type = action.actionType;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const activityTypeData = Object.entries(activityTypes).map(([type, count], index) => ({
    name: type,
    count,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <div className="w-full max-w-7xl mx-auto bg-gray-900 text-white rounded-xl shadow-2xl p-4 md:p-6 overflow-y-auto h-[calc(100vh-120px)]">
      <div className="mb-6 border-b border-gray-700 pb-4">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Activity className="text-blue-400" /> CodeViper Analytics Dashboard
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Room: <span className="text-blue-400">{roomId || "N/A"}</span> | 
          User: <span className="text-blue-400">{username || "N/A"}</span>
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleStartTracking}
            disabled={isTracking || !roomId || !username}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm ${
              isTracking || !roomId || !username
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            } transition-colors duration-300`}
          >
            <Play size={16} /> {isTracking ? "Tracking" : "Start Tracking"}
          </button>
          <button
            onClick={handleStopTracking}
            disabled={!isTracking || !roomId || !username}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm ${
              !isTracking || !roomId || !username
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700"
            } transition-colors duration-300`}
          >
            <Square size={16} /> Stop Tracking
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportAnalytics}
            disabled={!roomId}
            className="px-3 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-300 flex items-center gap-2 text-sm"
          >
            <Download size={16} /> Export Data
          </button>
          <button
            onClick={resetAnalytics}
            disabled={!roomId}
            className="px-3 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors duration-300 flex items-center gap-2 text-sm"
          >
            <Trash2 size={16} /> Reset Analytics
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div 
          className="flex justify-between items-center cursor-pointer" 
          onClick={() => toggleSection('overview')}
        >
          <h2 className="text-xl font-semibold flex items-center gap-2 text-blue-400 mb-3">
            <Info size={18} /> Overview Metrics
          </h2>
          {activeSections.overview ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
        
        {activeSections.overview && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 animate-fadeIn">
            <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700/30 transition-all duration-300 hover:border-blue-500/30 hover:shadow-lg">
              <p className="text-sm text-gray-400 flex items-center gap-2 mb-1">
                <Users size={14} /> Active Users
              </p>
              <p className="text-2xl font-semibold text-blue-400">
                {metrics.activeUsers || 0}
              </p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700/30 transition-all duration-300 hover:border-blue-500/30 hover:shadow-lg">
              <p className="text-sm text-gray-400 flex items-center gap-2 mb-1">
                <MousePointer size={14} /> Actions/Min
              </p>
              <p className="text-2xl font-semibold text-blue-400">
                {metrics.actionsPerMinute.toFixed(1) || "0.0"}
              </p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700/30 transition-all duration-300 hover:border-blue-500/30 hover:shadow-lg">
              <p className="text-sm text-gray-400 flex items-center gap-2 mb-1">
                <BarChart2 size={14} /> Collab Events
              </p>
              <p className="text-2xl font-semibold text-blue-400">
                {metrics.collaborationEvents || 0}
              </p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700/30 transition-all duration-300 hover:border-blue-500/30 hover:shadow-lg">
              <p className="text-sm text-gray-400 flex items-center gap-2 mb-1">
                <Clock size={14} /> Avg Session (min)
              </p>
              <p className="text-2xl font-semibold text-blue-400">
                {metrics.avgSessionTime.toFixed(1) || "0.0"}
              </p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700/30 transition-all duration-300 hover:border-blue-500/30 hover:shadow-lg">
              <p className="text-sm text-gray-400 flex items-center gap-2 mb-1">
                <Clock size={14} /> Total Hours
              </p>
              <p className="text-2xl font-semibold text-blue-400">
                {metrics.totalSessionHours.toFixed(2) || "0.00"}
              </p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700/30 transition-all duration-300 hover:border-blue-500/30 hover:shadow-lg">
              <p className="text-sm text-gray-400 flex items-center gap-2 mb-1">
                <Activity size={14} /> Peak Time
              </p>
              <p className="text-2xl font-semibold text-blue-400">
                {metrics.peakActivityTime || "N/A"}
              </p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700/30 transition-all duration-300 hover:border-blue-500/30 hover:shadow-lg">
              <p className="text-sm text-gray-400 flex items-center gap-2 mb-1">
                <Code size={14} /> Lines of Code
              </p>
              <p className="text-2xl font-semibold text-blue-400">
                {metrics.linesOfCode || 0}
              </p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700/30 transition-all duration-300 hover:border-blue-500/30 hover:shadow-lg">
              <p className="text-sm text-gray-400 flex items-center gap-2 mb-1">
                <Terminal size={14} /> Compilations
              </p>
              <p className="text-2xl font-semibold text-blue-400">
                {metrics.compilationFrequency || 0}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mb-6">
        <div 
          className="flex justify-between items-center cursor-pointer" 
          onClick={() => toggleSection('realtime')}
        >
          <h2 className="text-xl font-semibold flex items-center gap-2 text-blue-400 mb-3">
            <BarChart2 size={18} /> Real-time Analytics
          </h2>
          {activeSections.realtime ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
        
        {activeSections.realtime && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
            <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700/30">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-200">
                <Activity size={16} /> Actions Over Time
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorActions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#60A5FA" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="time" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1F2937", border: "none", borderRadius: "0.375rem", padding: "10px" }}
                      labelStyle={{ color: "#60A5FA", fontWeight: "bold" }}
                      itemStyle={{ color: "#F3F4F6" }}
                      formatter={(value) => [`${value} actions`, '']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="actions" 
                      stroke="#60A5FA" 
                      strokeWidth={2} 
                      fillOpacity={1} 
                      fill="url(#colorActions)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700/30">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-200">
                <PieChartIcon size={16} /> User Contributions
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData.length > 0 ? pieChartData : [{ name: 'No data', value: 1, color: '#6B7280' }]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      innerRadius={40}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => percent > 0.05 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''}
                    >
                      {pieChartData.length > 0 ? (
                        pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))
                      ) : (
                        <Cell fill="#6B7280" />
                      )}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#1F2937", border: "none", borderRadius: "0.375rem", padding: "10px" }}
                      formatter={(value, name) => [`${value} actions (${((value / pieChartData.reduce((sum, entry) => sum + entry.value, 0)) * 100).toFixed(1)}%)`, name]}
                      itemStyle={{ color: "#F3F4F6" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700/30 lg:col-span-2">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-200">
                <GitBranch size={16} /> Activity by Type
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={activityTypeData.length > 0 ? activityTypeData : [{ name: 'No data', count: 0 }]}
                    margin={{ top: 5, right: 30, left: 20, bottom: 70 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#9CA3AF"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1F2937", border: "none", borderRadius: "0.375rem", padding: "10px" }}
                      formatter={(value, name, props) => [`${value} events`, props.payload.name]}
                      itemStyle={{ color: "#F3F4F6" }}
                    />
                    <Bar dataKey="count" name="Count">
                      {activityTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || "#60A5FA"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mb-6">
        <div 
          className="flex justify-between items-center cursor-pointer" 
          onClick={() => toggleSection('userStats')}
        >
          <h2 className="text-xl font-semibold flex items-center gap-2 text-blue-400 mb-3">
            <Users size={18} /> User Statistics
          </h2>
          {activeSections.userStats ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
        
        {activeSections.userStats && (
          <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700/30 animate-fadeIn">
            <div className="max-h-64 overflow-y-auto custom-scrollbar">
              {Object.entries(userStats).length > 0 ? (
                <table className="w-full text-sm text-gray-300">
                  <thead className="sticky top-0">
                    <tr className="border-b border-gray-700 bg-gray-700">
                      <th className="text-left py-3 px-4">User</th>
                      <th className="text-left py-3 px-4">Actions</th>
                      <th className="text-left py-3 px-4">Session (hrs)</th>
                      <th className="text-left py-3 px-4">Lines of Code</th>
                      <th className="text-left py-3 px-4">Compilations</th>
                      <th className="text-left py-3 px-4">Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(userStats).map(([user, stats]) => (
                      <tr key={user} className="hover:bg-gray-700/50 transition-colors border-b border-gray-700/30">
                        <td className="py-3 px-4 font-medium">{user}</td>
                        <td className="py-3 px-4">{stats.actions}</td>
                        <td className="py-3 px-4">{stats.sessionDuration?.toFixed(2) || "0.00"}</td>
                        <td className="py-3 px-4">{stats.linesOfCode || 0}</td>
                        <td className="py-3 px-4">{stats.compilations || 0}</td>
                        <td className="py-3 px-4">{stats.lastActive ? new Date(stats.lastActive).toLocaleTimeString() : "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-gray-500 text-center py-8 flex flex-col items-center justify-center">
                  <Users size={24} className="mb-2 opacity-50" />
                  <p>No user statistics available yet</p>
                  <p className="text-xs mt-1">Start tracking to collect user data</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mb-6">
        <div 
          className="flex justify-between items-center cursor-pointer" 
          onClick={() => toggleSection('activity')}
        >
          <h2 className="text-xl font-semibold flex items-center gap-2 text-blue-400 mb-3">
            <Clock size={18} /> Recent Activity
          </h2>
          {activeSections.activity ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
        
        {activeSections.activity && (
          <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700/30 animate-fadeIn">
            <div className="max-h-64 overflow-y-auto custom-scrollbar">
              {userActivity.length > 0 ? (
                <div className="space-y-1">
                  {userActivity.slice(-15).reverse().map((action, index) => (
                    <div
                      key={index}
                      className="text-sm text-gray-300 p-2 hover:bg-gray-700/50 rounded transition-colors border border-transparent hover:border-gray-700/30"
                    >
                      <span className="text-blue-400 font-mono">[{new Date(action.timestamp).toLocaleTimeString()}]</span>{" "}
                      <span className="font-medium text-blue-300">{action.user}</span>:{" "}
                      <span className="text-green-400">{action.actionType}</span>{" "}
                      {action.details?.file && <span className="text-gray-400"> (File: {action.details.file})</span>}
                      {action.details?.linesChanged && <span className="text-gray-400"> (Lines: {action.details.linesChanged})</span>}
                      {action.details?.message && <span className="text-gray-400"> (Msg: {action.details.message})</span>}
                      {action.details?.tool && <span className="text-gray-400"> (Tool: {action.details.tool})</span>}
                      {action.details?.isRunning && <span className="text-gray-400"> (Compiler: {action.details.isRunning ? "Running" : "Stopped"})</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-center py-8 flex flex-col items-center justify-center">
                  <Activity size={24} className="mb-2 opacity-50" />
                  <p>No activity recorded yet</p>
                  <p className="text-xs mt-1">Actions will appear here once tracking begins</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mb-6">
        <div 
          className="flex justify-between items-center cursor-pointer" 
          onClick={() => toggleSection('reports')}
        >
          <h2 className="text-xl font-semibold flex items-center gap-2 text-blue-400 mb-3">
            <Calendar size={18} /> Reports
          </h2>
          {activeSections.reports ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
        
        {activeSections.reports && (
          <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700/30 animate-fadeIn">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <button
                onClick={generateWeeklyReport}
                disabled={!roomId}
                className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-300 flex items-center justify-center gap-2 text-sm"
              >
                <Calendar size={16} /> Generate Weekly Report
              </button>
              <div className="flex flex-1 gap-2 items-center">
                <div className="flex-1 flex flex-col md:flex-row gap-2">
                  <input
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="p-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 outline-none transition-all duration-300 flex-1"
                  />
                  <input
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="p-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 outline-none transition-all duration-300 flex-1"
                  />
                </div>
                <button
                  onClick={generateCustomReport}
                  disabled={!roomId}
                  className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-300 flex items-center justify-center gap-2 whitespace-nowrap text-sm"
                >
                  <Calendar size={16} /> Custom Report
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {weeklyReport && (
                <div className="p-4 bg-gray-700 rounded-lg border border-gray-600/30 hover:border-blue-500/30 transition-all duration-300">
                  <h4 className="text-md font-semibold mb-3 flex items-center gap-2 text-blue-300">
                    <Calendar size={16} /> Weekly Report
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p className="flex justify-between border-b border-gray-600/30 pb-1">
                      <span className="text-gray-400">Total Actions:</span> 
                      <span className="font-medium">{weeklyReport.totalActions || 0}</span>
                    </p>
                    <p className="flex justify-between border-b border-gray-600/30 pb-1">
                      <span className="text-gray-400">Total Session Hours:</span> 
                      <span className="font-medium">{weeklyReport.totalSessionHours?.toFixed(2) || "0.00"}</span>
                    </p>
                    <p className="flex justify-between border-b border-gray-600/30 pb-1">
                      <span className="text-gray-400">Peak Day:</span>
                      <span className="font-medium">{weeklyReport.peakDay || "N/A"}</span>
                    </p>
                    <p className="flex justify-between border-b border-gray-600/30 pb-1">
                      <span className="text-gray-400">Lines of Code:</span> 
                      <span className="font-medium">{weeklyReport.linesOfCode || 0}</span>
                    </p>
                    <p className="flex justify-between border-b border-gray-600/30 pb-1">
                      <span className="text-gray-400">Collaboration Events:</span>
                      <span className="font-medium">{weeklyReport.collaborationEvents || 0}</span>
                    </p>
                    <p className="flex justify-between border-b border-gray-600/30 pb-1">
                      <span className="text-gray-400">Period:</span>
                      <span className="font-medium">
                        {new Date(weeklyReport.startDate).toLocaleDateString()} - {new Date(weeklyReport.endDate).toLocaleDateString()}
                      </span>
                    </p>
                    <p className="flex justify-between text-xs text-gray-500 pt-1">
                      <span>Generated:</span>
                      <span>{new Date().toLocaleString()}</span>
                    </p>
                  </div>
                </div>
              )}
              
              {customReport && (
                <div className="p-4 bg-gray-700 rounded-lg border border-gray-600/30 hover:border-blue-500/30 transition-all duration-300">
                  <h4 className="text-md font-semibold mb-3 flex items-center gap-2 text-blue-300">
                    <Calendar size={16} /> Custom Report
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p className="flex justify-between border-b border-gray-600/30 pb-1">
                      <span className="text-gray-400">Total Actions:</span>
                      <span className="font-medium">{customReport.totalActions}</span>
                    </p>
                    <p className="flex justify-between border-b border-gray-600/30 pb-1">
                      <span className="text-gray-400">Total Session Hours:</span>
                      <span className="font-medium">{customReport.totalSessionHours?.toFixed(2)}</span>
                    </p>
                    <p className="flex justify-between border-b border-gray-600/30 pb-1">
                      <span className="text-gray-400">Lines of Code:</span>
                      <span className="font-medium">{customReport.linesOfCode || 0}</span>
                    </p>
                    <p className="flex justify-between border-b border-gray-600/30 pb-1">
                      <span className="text-gray-400">Compilations:</span>
                      <span className="font-medium">{customReport.compilationFrequency || 0}</span>
                    </p>
                    <p className="flex justify-between border-b border-gray-600/30 pb-1">
                      <span className="text-gray-400">Period:</span>
                      <span className="font-medium">
                        {new Date(customReport.startDate).toLocaleDateString()} - {new Date(customReport.endDate).toLocaleDateString()}
                      </span>
                    </p>
                    <p className="flex justify-between text-xs text-gray-500 pt-1">
                      <span>Generated:</span>
                      <span>{new Date().toLocaleString()}</span>
                    </p>
                  </div>
                </div>
              )}
              
              {!weeklyReport && !customReport && (
                <div className="p-8 bg-gray-700 rounded-lg border border-gray-600/30 col-span-full flex flex-col items-center justify-center">
                  <HelpCircle size={24} className="text-gray-500 mb-2" />
                  <p className="text-gray-400 text-center">No reports generated yet</p>
                  <p className="text-gray-500 text-sm text-center mt-1">Use the buttons above to generate reports</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mb-6">
        <div 
          className="flex justify-between items-center cursor-pointer" 
          onClick={() => toggleSection('actions')}
        >
          <h2 className="text-xl font-semibold flex items-center gap-2 text-blue-400 mb-3">
            <RefreshCw size={18} /> Sample Actions
          </h2>
          {activeSections.actions ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
        
        {activeSections.actions && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 animate-fadeIn">
            <button
              onClick={handleSampleCodeChange}
              disabled={!isTracking || !roomId}
              className={`px-3 py-2 rounded-lg transition-colors duration-300 flex flex-col items-center justify-center gap-1 text-sm ${
                !isTracking || !roomId
                  ? "bg-gray-700 cursor-not-allowed text-gray-500"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-300"
              }`}
            >
              <Code size={16} className={!isTracking || !roomId ? "text-gray-500" : "text-blue-400"} />
              <span>Code Change</span>
            </button>
            <button
              onClick={handleSampleTyping}
              disabled={!isTracking || !roomId}
              className={`px-3 py-2 rounded-lg transition-colors duration-300 flex flex-col items-center justify-center gap-1 text-sm ${
                !isTracking || !roomId
                  ? "bg-gray-700 cursor-not-allowed text-gray-500"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-300"
              }`}
            >
              <MousePointer size={16} className={!isTracking || !roomId ? "text-gray-500" : "text-green-400"} />
              <span>Typing</span>
            </button>
            <button
              onClick={handleSampleFileCreate}
              disabled={!isTracking || !roomId}
              className={`px-3 py-2 rounded-lg transition-colors duration-300 flex flex-col items-center justify-center gap-1 text-sm ${
                !isTracking || !roomId
                  ? "bg-gray-700 cursor-not-allowed text-gray-500"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-300"
              }`}
            >
              <FileText size={16} className={!isTracking || !roomId ? "text-gray-500" : "text-yellow-400"} />
              <span>Create File</span>
            </button>
            <button
              onClick={handleSampleMessage}
              disabled={!isTracking || !roomId}
              className={`px-3 py-2 rounded-lg transition-colors duration-300 flex flex-col items-center justify-center gap-1 text-sm ${
                !isTracking || !roomId
                  ? "bg-gray-700 cursor-not-allowed text-gray-500"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-300"
              }`}
            >
              <MessageSquare size={16} className={!isTracking || !roomId ? "text-gray-500" : "text-purple-400"} />
              <span>Message</span>
            </button>
            <button
              onClick={handleSampleDrawing}
              disabled={!isTracking || !roomId}
              className={`px-3 py-2 rounded-lg transition-colors duration-300 flex flex-col items-center justify-center gap-1 text-sm ${
                !isTracking || !roomId
                  ? "bg-gray-700 cursor-not-allowed text-gray-500"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-300"
              }`}
            >
              <Edit3 size={16} className={!isTracking || !roomId ? "text-gray-500" : "text-pink-400"} />
              <span>Drawing</span>
            </button>
            <button
              onClick={handleSampleCompile}
              disabled={!isTracking || !roomId}
              className={`px-3 py-2 rounded-lg transition-colors duration-300 flex flex-col items-center justify-center gap-1 text-sm ${
                !isTracking || !roomId
                  ? "bg-gray-700 cursor-not-allowed text-gray-500"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-300"
              }`}
            >
              <Settings size={16} className={!isTracking || !roomId ? "text-gray-500" : "text-orange-400"} />
              <span>Compile</span>
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1f2937;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4b5563;
          border-radius: 4px;
          transition: background-color 0.3s;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #4b5563 #1f2937;
        }
        input[type="date"] {
          border: none;
          outline: none;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default AnalyticsModule;