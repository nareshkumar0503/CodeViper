import React, { useState, useEffect } from 'react';
import { v4 as uuidV4 } from 'uuid';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const Home = () => {
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState('');
    const [username, setUsername] = useState('');

    useEffect(() => {
        // Retrieve username from localStorage only once when component mounts
        const storedUsername = localStorage.getItem("username");
        if (storedUsername) {
            setUsername(storedUsername);
        }
    }, []);

    const createNewRoom = (e) => {
        e.preventDefault();
        const id = uuidV4();
        setRoomId(id);
        toast.success('Created a new room');
    };

    const joinRoom = () => {
        if (!roomId || !username) {
            toast.error('ROOM ID & username are required');
            return;
        }

        // Redirect
        navigate(`/editor/${roomId}`, {
            state: { username },
        });
    };

    const handleInputEnter = (e) => {
        if (e.code === 'Enter') {
            joinRoom();
        }
    };

    return (
        <div className="flex min-h-screen w-full bg-bgPrimary text-gray-300 relative">
            <div className="hidden lg:block flex-1">
                <img src="/cdcollab.png" alt="Collaboration" className="w-full h-full object-cover opacity-90" />
            </div>

            <div className="flex flex-1 items-center justify-center bg-bgPrimary p-8">
                <div className="w-full max-w-sm bg-darkGray rounded-xl p-8 shadow-lg">
                    <h2 className="text-3xl font-bold text-greenHighlight mb-8 text-center">Join Room</h2>

                    <form className="space-y-6">
                        <div className="flex items-center border border-gray-500 rounded-xl p-2">
                            <input
                                type="text"
                                className="w-full p-3 bg-darkGray border-none text-gray-100 focus:outline-none"
                                placeholder="ROOM ID"
                                onChange={(e) => setRoomId(e.target.value)}
                                value={roomId}
                                onKeyUp={handleInputEnter}
                            />
                        </div>

                        <div className="flex items-center border border-gray-500 rounded-xl p-2">
                            <input
                                type="text"
                                className="w-full p-3 bg-darkGray border-none text-gray-100 focus:outline-none"
                                placeholder="USERNAME"
                                value={username} // Only retrieved from localStorage
                                disabled // Prevent user from changing username
                            />
                        </div>

                        <button
                            type="button"
                            onClick={joinRoom}
                            className="w-full bg-greenHighlight text-white font-semibold py-3 rounded-xl hover:bg-green-600 transition duration-300"
                        >
                            Join
                        </button>

                        <span className="createInfo text-center block mt-4">
                            If you don't have an invite then create &nbsp;
                            <a onClick={createNewRoom} href="#" className="text-primary hover:underline">
                                new room
                            </a>
                        </span>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Home;
