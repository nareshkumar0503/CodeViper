import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { v4 as uuidV4 } from 'uuid';

const RoomsPage = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [userRooms, setUserRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newRoomName, setNewRoomName] = useState('');
    const [editingRoom, setEditingRoom] = useState(null);
    const [roomNameEdit, setRoomNameEdit] = useState('');

    useEffect(() => {
        const storedUsername = localStorage.getItem("username") || sessionStorage.getItem("googleUsername");
        
        if (storedUsername) {
            setUsername(storedUsername);
            fetchUserRooms(storedUsername);
        } else {
            navigate('/login');
        }
    }, [navigate]);

    const fetchUserRooms = async (username) => {
        try {
            const response = await fetch(`http://localhost:5000/api/rooms/user/${username}`);
            if (!response.ok) throw new Error('Failed to fetch rooms');
            const rooms = await response.json();
            setUserRooms(rooms);
        } catch (error) {
            console.error('Error fetching rooms:', error);
            toast.error('Failed to fetch your rooms');
        } finally {
            setLoading(false);
        }
    };

    const createNewRoom = async (e) => {
        e.preventDefault();
        const id = uuidV4();
        try {
            const response = await fetch('http://localhost:5000/api/rooms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    roomId: id,
                    username,
                    name: newRoomName || `Room ${id.slice(0, 8)}`
                }),
            });

            if (!response.ok) throw new Error('Failed to create room');
            
            toast.success('Created a new room');
            setNewRoomName('');
            
            fetchUserRooms(username);
        } catch (error) {
            console.error('Error creating room:', error);
            toast.error('Failed to create room');
        }
    };

    const updateRoomName = async (roomId) => {
        try {
            const response = await fetch(`http://localhost:5000/api/rooms/${roomId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: roomNameEdit
                }),
            });

            if (!response.ok) throw new Error('Failed to update room');
            
            toast.success('Room updated successfully');
            setEditingRoom(null);
            
            fetchUserRooms(username);
        } catch (error) {
            console.error('Error updating room:', error);
            toast.error('Failed to update room');
        }
    };

    const deleteRoom = async (roomId) => {
        if (!window.confirm('Are you sure you want to delete this room?')) return;
        
        try {
            const response = await fetch(`http://localhost:5000/api/rooms/${roomId}`, {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error('Failed to delete room');
            
            toast.success('Room deleted successfully');
            
            fetchUserRooms(username);
        } catch (error) {
            console.error('Error deleting room:', error);
            toast.error('Failed to delete room');
        }
    };

    const joinRoom = (roomId) => {
        navigate(`/editor/${roomId}`, {
            state: { username },
        });
    };

    const startEditing = (room) => {
        setEditingRoom(room.roomId);
        setRoomNameEdit(room.name);
    };

    const cancelEditing = () => {
        setEditingRoom(null);
        setRoomNameEdit('');
    };

    return (
        <div className="min-h-screen w-full bg-bgPrimary text-gray-300 p-8">
            <div className="max-w-6xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-center mb-10">
                    <div>
                        <h1 className="text-3xl font-bold text-greenHighlight mb-2">Your Coding Rooms</h1>
                        <p className="text-gray-400">Manage all your collaborative coding spaces</p>
                    </div>
                    <button 
                        onClick={() => navigate('/home')}
                        className="mt-4 md:mt-0 px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                    >
                        Back to Home
                    </button>
                </header>

                <div className="bg-darkGray rounded-xl p-6 mb-10">
                    <h2 className="text-xl font-semibold mb-4">Create New Room</h2>
                    <form onSubmit={createNewRoom} className="flex flex-col md:flex-row gap-4">
                        <input
                            type="text"
                            className="flex-1 p-3 bg-gray-800 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-greenHighlight"
                            placeholder="Room Name (optional)"
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                        />
                        <button
                            type="submit"
                            className="px-6 py-3 bg-greenHighlight text-white font-semibold rounded-lg hover:bg-green-600 transition"
                        >
                            Create Room
                        </button>
                    </form>
                </div>

                <div className="bg-darkGray rounded-xl p-6">
                    <h2 className="text-xl font-semibold mb-6">Your Rooms</h2>
                    
                    {loading ? (
                        <div className="text-center py-8">
                            <p className="text-gray-400">Loading your rooms...</p>
                        </div>
                    ) : !userRooms.length ? (
                        <div className="text-center py-8">
                            <p className="text-gray-400">You haven't created any rooms yet</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {userRooms.map((room) => (
                                <div key={room.roomId} className="bg-gray-800 rounded-xl p-6 flex flex-col">
                                    {editingRoom === room.roomId ? (
                                        <>
                                            <input
                                                type="text"
                                                className="p-2 mb-4 bg-gray-700 border border-gray-600 rounded text-gray-100 focus:outline-none focus:border-greenHighlight"
                                                value={roomNameEdit}
                                                onChange={(e) => setRoomNameEdit(e.target.value)}
                                            />
                                            <div className="flex space-x-2 mt-2">
                                                <button 
                                                    onClick={() => updateRoomName(room.roomId)}
                                                    className="flex-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                                >
                                                    Save
                                                </button>
                                                <button 
                                                    onClick={cancelEditing}
                                                    className="flex-1 px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <h3 className="text-lg font-semibold text-greenHighlight mb-2">{room.name}</h3>
                                            <div className="text-sm text-gray-400 mb-2">
                                                ID: <span className="font-mono">{room.roomId}</span>
                                            </div>
                                            <div className="text-sm text-gray-400 mb-2">
                                                Created: {new Date(room.createdAt).toLocaleDateString()}
                                            </div>
                                            <div className="text-sm text-gray-400 mb-4">
                                                Last active: {new Date(room.lastActive).toLocaleDateString()}
                                            </div>
                                            
                                            <div className="mt-auto flex flex-col gap-2">
                                                <button 
                                                    onClick={() => joinRoom(room.roomId)}
                                                    className="w-full py-2 bg-greenHighlight text-white font-semibold rounded hover:bg-green-600 transition"
                                                >
                                                    Join Room
                                                </button>
                                                <div className="flex space-x-2">
                                                    <button 
                                                        onClick={() => startEditing(room)}
                                                        className="flex-1 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button 
                                                        onClick={() => deleteRoom(room.roomId)}
                                                        className="flex-1 py-2 bg-red-700 text-white rounded hover:bg-red-600 transition"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RoomsPage;