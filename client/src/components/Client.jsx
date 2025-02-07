import React, { useMemo } from 'react';
import Avatar from '@mui/material/Avatar';

// Define colors outside component to avoid recreation
const AVATAR_COLORS = ["#FF5733", "#33A1FF", "#28A745", "#FFC107", "#D63384"];

// Hash function to generate consistent number from string
const hashString = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
};

const Client = ({ username }) => {
    // Use useMemo to compute these values only when username changes
    const avatarProps = useMemo(() => {
        const avatarLetter = username.charAt(0).toUpperCase();
        // Use hash of username to consistently select a color
        const colorIndex = hashString(username) % AVATAR_COLORS.length;
        const avatarColor = AVATAR_COLORS[colorIndex];
        
        return { avatarLetter, avatarColor };
    }, [username]);

    return (
        <div className="client flex items-center">
            <Avatar 
                style={{ 
                    width: 50, 
                    height: 50, 
                    fontSize: 24, 
                    backgroundColor: avatarProps.avatarColor,
                    color: 'white' 
                }}
            >
                {avatarProps.avatarLetter}
            </Avatar>
            <span className="userName ml-3">{username}</span>
        </div>
    );
};

export default Client;