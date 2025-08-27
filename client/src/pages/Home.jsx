import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidV4 } from 'uuid';
import toast from 'react-hot-toast';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { initSocket } from '../socket';
import ACTIONS from "../Actions";

const Home = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [roomId, setRoomId] = useState('');
    const [username, setUsername] = useState('');
    const [userRooms, setUserRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [liveUsers, setLiveUsers] = useState(0);
    const [activeUsers, setActiveUsers] = useState([]);
    const [isRoomDetailsVisible, setIsRoomDetailsVisible] = useState(false);
    const [fetchingRoom, setFetchingRoom] = useState(false);
    const socketRef = useRef(null);

    const fetchActiveUsers = async (roomId) => {
        if (!roomId) return;
        
        try {
            setFetchingRoom(true);
            const response = await fetch(`http://localhost:5000/api/rooms/${roomId}`);
            
            if (!response.ok) {
                throw new Error('Room not found');
            }
            
            // Initialize socket to get active users
            socketRef.current = await initSocket();
            
            socketRef.current.emit(ACTIONS.FETCH_USERS, { roomId });
            
            socketRef.current.on(ACTIONS.USERS_FETCHED, ({ clients }) => {
                if (Array.isArray(clients)) {
                    setLiveUsers(clients.length);
                    setActiveUsers(clients.filter(client => client.username !== username));
                }
            });
            
            setIsRoomDetailsVisible(true);
        } catch (error) {
            console.error('Error fetching room details:', error);
            setLiveUsers(0);
            setActiveUsers([]);
            // Don't show error toast here as it might be a new room ID
        } finally {
            setFetchingRoom(false);
        }
    };

    useEffect(() => {
        const storedUsername = localStorage.getItem("username") || sessionStorage.getItem("googleUsername");
        const queryParams = new URLSearchParams(location.search);
        const sharedRoomId = queryParams.get("roomId") || localStorage.getItem("roomId");
    
        if (storedUsername) {
            setUsername(storedUsername);
            fetchUserRooms(storedUsername);
        }
    
        if (sharedRoomId) {
            localStorage.setItem("roomId", sharedRoomId);
            setRoomId(sharedRoomId);
            fetchActiveUsers(sharedRoomId);
        }
        
        // Clean up socket connection
        return () => {
            if (socketRef.current) {
                socketRef.current.off(ACTIONS.USERS_FETCHED);
                socketRef.current.disconnect();
            }
        };
    }, [location.search]);

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
                    name: `Room ${id.slice(0, 8)}`
                }),
            });

            if (!response.ok) throw new Error('Failed to create room');
            
            setRoomId(id);
            toast.success('Created a new room');
            
            fetchUserRooms(username);
        } catch (error) {
            console.error('Error creating room:', error);
            toast.error('Failed to create room');
        }
    };

    const joinRoom = () => {
        if (!roomId || !username) {
            toast.error('ROOM ID & username are required');
            return;
        }
    
        const init = async () => {
            try {
                socketRef.current = await initSocket();
    
                socketRef.current.off(ACTIONS.JOINED);
                socketRef.current.off(ACTIONS.DISCONNECTED);
    
                // Check if room exists or create it if it doesn't
                try {
                    const response = await fetch(`http://localhost:5000/api/rooms/${roomId}`);
                    
                    if (!response.ok) {
                        // Room doesn't exist, create it
                        await fetch('http://localhost:5000/api/rooms', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                roomId,
                                username,
                                name: `Room ${roomId.slice(0, 8)}`
                            }),
                        });
                    }
                } catch (error) {
                    // Create room if check fails
                    await fetch('http://localhost:5000/api/rooms', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            roomId,
                            username,
                            name: `Room ${roomId.slice(0, 8)}`
                        }),
                    });
                }
    
                socketRef.current.emit(ACTIONS.JOIN, { roomId, username });
    
                socketRef.current.on(ACTIONS.JOINED, ({ clients }) => {
                    if (Array.isArray(clients)) {
                        setLiveUsers(clients.length);
                        setActiveUsers(clients.filter(client => client.username !== username));
                    }
                });
    
                socketRef.current.on(ACTIONS.DISCONNECTED, ({ clients }) => {
                    if (Array.isArray(clients)) {
                        setLiveUsers(clients.length);
                        setActiveUsers(clients.filter(client => client.username !== username));
                    }
                });
    
                localStorage.setItem('roomId', roomId);
    
                navigate(`/editor/${roomId}`, {
                    state: { username },
                });
            } catch (error) {
                console.error('Error joining room:', error);
                toast.error('Failed to join room');
            }
        };
    
        init();
    };

    const handleRoomClick = (roomId) => {
        setRoomId(roomId);
        fetchActiveUsers(roomId);
        setIsRoomDetailsVisible(true);
    };

    const navigateToRoomsPage = () => {
        navigate('/rooms');
    };

    return (
        <div className="flex min-h-screen w-full bg-bgPrimary text-gray-300 relative">
            <div className="hidden lg:block flex-1">
                <img src="/cdcollab.png" alt="Collaboration" className="w-full h-full object-cover opacity-90" />
            </div>

            <div className="flex flex-1 items-center justify-center bg-bgPrimary p-8">
                <div className="w-full max-w-lg bg-darkGray rounded-xl p-8 shadow-lg">
                    <h2 className="text-3xl font-bold text-greenHighlight mb-8 text-center">Code Collaboration</h2>

                    {username && (
                        <div className="mb-8">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold">Recent Rooms</h3>
                                <Link to="/rooms" className="text-greenHighlight hover:underline">
                                    Manage All Rooms
                                </Link>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-4 mb-8">
                                {loading ? (
                                    <div className="text-gray-400">Loading your rooms...</div>
                                ) : !userRooms.length ? (
                                    <div className="text-gray-400">No rooms found</div>
                                ) : (
                                    userRooms.slice(0, 2).map((room) => (
                                        <div
                                            key={room.roomId}
                                            onClick={() => handleRoomClick(room.roomId)}
                                            className="bg-gray-800 p-4 rounded-xl cursor-pointer hover:bg-gray-700 transition-colors"
                                        >
                                            <h3 className="text-lg font-semibold text-greenHighlight">{room.name}</h3>
                                            <p className="text-sm text-gray-400">
                                                Last active: {new Date(room.lastActive).toLocaleDateString()}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    <form className="space-y-6">
                        <div className="flex items-center border border-gray-500 rounded-xl p-2">
                            <input
                                type="text"
                                className="w-full p-3 bg-darkGray border-none text-gray-100 focus:outline-none"
                                placeholder="ROOM ID"
                                value={roomId}
                                onChange={(e) => {
                                    const newRoomId = e.target.value;
                                    setRoomId(newRoomId);
                                    if (newRoomId) {
                                        fetchActiveUsers(newRoomId);
                                    } else {
                                        setActiveUsers([]);
                                        setLiveUsers(0);
                                        setIsRoomDetailsVisible(false);
                                    }
                                }}
                            />
                        </div>

                        <div className="flex items-center border border-gray-500 rounded-xl p-2">
                            <input
                                type="text"
                                className="w-full p-3 bg-darkGray border-none text-gray-100 focus:outline-none"
                                placeholder="USERNAME"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                readOnly={!!localStorage.getItem("username") && username !== ""}
                            />
                        </div>

                        {isRoomDetailsVisible && roomId && (
                            <div className="bg-gray-800 p-4 rounded-xl text-center text-gray-400 space-y-2">
                                {fetchingRoom ? (
                                    <div>Checking room status...</div>
                                ) : (
                                    <>
                                        <div>
                                            <span>Active Users in Room: </span>
                                            <span className="font-bold text-green-500">{liveUsers}</span>
                                        </div>
                                        {activeUsers.length > 0 && (
                                            <div className="space-y-1">
                                                <div className="text-sm font-medium text-gray-300">Current Users:</div>
                                                {activeUsers.map(user => (
                                                    <div key={user.socketId} className="text-green-400">
                                                        {user.username}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={joinRoom}
                            className="w-full bg-greenHighlight text-white font-semibold py-3 rounded-xl hover:bg-green-600 transition duration-300"
                        >
                            Join
                        </button>

                        <div className="text-center mt-4">
                            <span className="text-gray-400">If you don't have an invite then create &nbsp;</span>
                            <a onClick={createNewRoom} href="#" className="text-greenHighlight hover:underline">
                                new room
                            </a>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Home;