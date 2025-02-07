import React, { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import ACTIONS from "../Actions";
import Client from "../components/Client";
import Editor from "../components/Editor";
import { initSocket } from "../socket";
import { useLocation, useNavigate, Navigate, useParams } from "react-router-dom";

export const Context = React.createContext();

const EditorPage = () => {
  const [clients, setClients] = useState([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const socketRef = useRef(null);
  const codeRef = useRef(null);
  const location = useLocation();
  const { roomId } = useParams();
  const reactNavigator = useNavigate();
  
  useEffect(() => {
    const username = location.state?.username || localStorage.getItem("username");

    if (!username) {
      toast.error("Username is missing. Redirecting...");
      reactNavigator("/");
      return;
    }

    const connectSocket = async () => {
      try {
        setIsConnecting(true);
        socketRef.current = await initSocket();

        // Emit JOIN event only once
        socketRef.current.emit(ACTIONS.JOIN, {
          roomId,
          username,
        });

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

      // Handle user joining
      socketRef.current.on(ACTIONS.JOINED, ({ clients: newClients, username, socketId }) => {
        if (username !== location.state?.username) {
          toast.success(`${username} joined the room.`);
        }

        // Ensure uniqueness by filtering duplicates
        setClients((prevClients) => {
          const updatedClients = [...prevClients];
          newClients.forEach((newClient) => {
            if (!updatedClients.some((client) => client.socketId === newClient.socketId)) {
              updatedClients.push(newClient);
            }
          });
          return updatedClients;
        });

        socketRef.current?.emit(ACTIONS.SYNC_CODE, {
          code: codeRef.current,
          socketId,
        });
      });

      // Handle user leaving
      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        toast.success(`${username} left the room.`);

        setClients((prevClients) => prevClients.filter(client => client.socketId !== socketId));
      });
    };

    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current.off(ACTIONS.JOINED);
        socketRef.current.off(ACTIONS.DISCONNECTED);
      }
    };
  }, [roomId, location.state?.username, reactNavigator]);

  function copyRoomId() {
    navigator.clipboard.writeText(roomId).then(() => {
      toast.success("Room ID copied to clipboard");
    }).catch(() => {
      toast.error("Could not copy Room ID");
    });
  }

  function leaveRoom() {
    if (socketRef.current) {
      socketRef.current.emit(ACTIONS.LEAVE, {
        roomId,
        username: location.state?.username,
        socketId: socketRef.current.id, // Ensure socket ID is sent
      });
    }
    
    reactNavigator("/");
  }

  if (!location.state) {
    return <Navigate to="/" />;
  }

  return (
    <Context.Provider value={clients}>
      <div className="mainWrap">
        {isConnecting ? (
          <div className="connecting">
            <p>Connecting to server...</p>
          </div>
        ) : (
          <>
            <div className="aside">
              <div className="asideInner">
                <div className="logo">
                  <img className="logoImage" src="/code viper logo.png" alt="logo" />
                </div>
                <h3>Connected</h3>
                <div className="clientsList">
                  {clients.map((client) => (
                    <Client key={client.socketId} username={client.username} />
                  ))}
                </div>
              </div>
              <button className="btn copyBtn" onClick={copyRoomId}>
                Copy ROOM ID
              </button>
              <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded" onClick={leaveRoom}>
                Leave
              </button>
            </div>
            <div className="editorWrap">
              <Editor
                socketRef={socketRef}
                roomId={roomId}
                onCodeChange={(code) => {
                  codeRef.current = code;
                }}
              />
            </div>
          </>
        )}
      </div>
    </Context.Provider>
  );
};

export default EditorPage;
