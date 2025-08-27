import React, { useState } from 'react';
import { 
  Code, Settings, Users, MessageSquare, PenTool, 
  BarChart2, Languages, Copy, Share2, LogOut
} from 'lucide-react';

const ModernSidebar = ({ 
  roomId, 
  roomOwner, 
  clients, 
  onCopyRoom, 
  onShare, 
  onLeave 
}) => {
  const [activeModule, setActiveModule] = useState('code');
  const [selectedTheme, setSelectedTheme] = useState('dark');
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [fontSize, setFontSize] = useState('14');

  const modules = [
    { id: 'code', icon: <Code className="w-5 h-5" />, label: 'Code Editor' },
    { id: 'language', icon: <Languages className="w-5 h-5" />, label: 'Language & Compiler' },
    { id: 'chat', icon: <MessageSquare className="w-5 h-5" />, label: 'Chat' },
    { id: 'draw', icon: <PenTool className="w-5 h-5" />, label: 'Drawing Tool' },
    { id: 'analytics', icon: <BarChart2 className="w-5 h-5" />, label: 'Analytics' },
    { id: 'users', icon: <Users className="w-5 h-5" />, label: 'Users' },
    { id: 'settings', icon: <Settings className="w-5 h-5" />, label: 'Settings' }
  ];

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'settings':
        return (
          <div className="p-4 bg-gray-800 rounded-lg">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Theme</label>
              <select 
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value)}
                className="w-full bg-gray-700 rounded p-2"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="system">System</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Language</label>
              <select 
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full bg-gray-700 rounded p-2"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Font Size</label>
              <select 
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                className="w-full bg-gray-700 rounded p-2"
              >
                <option value="12">12px</option>
                <option value="14">14px</option>
                <option value="16">16px</option>
                <option value="18">18px</option>
              </select>
            </div>
          </div>
        );
      
      case 'users':
        return (
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Connected Users</h3>
            <div className="space-y-2">
              {clients.map((client) => (
                <div 
                  key={client.socketId} 
                  className="flex items-center gap-2 p-2 bg-gray-800 rounded"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    {client.username[0].toUpperCase()}
                  </div>
                  <span>{client.username}</span>
                  {client.username === roomOwner && (
                    <span className="text-xs bg-yellow-500 text-black px-2 py-1 rounded ml-auto">
                      Owner
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      
      default:
        return (
          <div className="p-4 text-center text-gray-400">
            {activeModule.charAt(0).toUpperCase() + activeModule.slice(1)} module content
          </div>
        );
    }
  };

  return (
    <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col h-screen">
      {/* Logo Section */}
      <div className="p-4 border-b border-gray-800">
        <img 
          src="/code viper logo.png" 
          alt="Logo" 
          className="h-12 mx-auto"
        />
      </div>

      {/* Room Info */}
      <div className="p-4 border-b border-gray-800">
        <div className="bg-gray-800 p-3 rounded-lg">
          <h3 className="text-sm font-medium text-gray-400">Room ID</h3>
          <p className="text-white font-mono mt-1">{roomId}</p>
          <h4 className="text-sm font-medium text-gray-400 mt-2">Room Owner</h4>
          <p className="text-yellow-500 font-medium">{roomOwner || "Unknown"}</p>
        </div>
      </div>

      {/* Module Selector */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {modules.map((module) => (
            <button
              key={module.id}
              onClick={() => setActiveModule(module.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                activeModule === module.id 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              {module.icon}
              <span>{module.label}</span>
            </button>
          ))}
        </div>

        {/* Module Content */}
        <div className="px-2">
          {renderModuleContent()}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-t border-gray-800">
        <div className="grid gap-2">
          <button
            onClick={onCopyRoom}
            className="flex items-center justify-center gap-2 w-full py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            <Copy className="w-4 h-4" />
            Copy Room ID
          </button>
          
          <button
            onClick={onShare}
            className="flex items-center justify-center gap-2 w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
          
          <button
            onClick={onLeave}
            className="flex items-center justify-center gap-2 w-full py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Leave Room
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModernSidebar;