import React from 'react';
import { useRoom } from '../context/RoomContext';

const UsersList = () => {
  const { roomData } = useRoom();

  // Check if users is an array and has values
  const users = Array.isArray(roomData.users) ? roomData.users : [];

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-3">Active Users</h3>
      <ul className="space-y-2">
        {users.length === 0 ? (
          <li>No users in the room yet.</li>
        ) : (
          users.map((user, index) => (
            <li key={index} className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>{user.username}</span> {/* Assuming user has a username property */}
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default UsersList;
