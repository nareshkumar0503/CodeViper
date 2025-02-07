import React from 'react';
import { Link } from 'react-router-dom';

const Sidebar = () => {
  return (
    <div className="sidebar bg-darkBlue p-4 w-64 h-screen">
      <div className="logo mb-6">
        <img src="/code viper logo.png" alt="Logo" className="w-32 mx-auto" />
      </div>
      <h3 className="text-white mb-6">Tools</h3>
      <ul className="space-y-4">
        <li>
          <Link to="#" className="text-white hover:text-greenHighlight">Chat</Link>
        </li>
        <li>
          <Link to="#" className="text-white hover:text-greenHighlight">Drawing Tool</Link>
        </li>
        <li>
          <Link to="#" className="text-white hover:text-greenHighlight">Compiler</Link>
        </li>
        <li>
          <Link to="#" className="text-white hover:text-greenHighlight">Analytics</Link>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;
