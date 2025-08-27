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
    // Fallback if username is invalid
    const safeUsername = username || "Unknown";
    const uniqueKey = `user-${safeUsername}`; // ✅ Ensure unique key per user

    // Use useMemo to compute values only when username changes
    const avatarProps = useMemo(() => {
        const avatarLetter = safeUsername.charAt(0).toUpperCase() || "U";
        const colorIndex = hashString(safeUsername) % AVATAR_COLORS.length;
        const avatarColor = AVATAR_COLORS[colorIndex];

        return { avatarLetter, avatarColor };
    }, [safeUsername]);

    return (
        <div className="client flex items-center space-x-3 py-1" key={uniqueKey}>
            <Avatar
                style={{
                    width: 50,
                    height: 50,
                    fontSize: 24,
                    backgroundColor: avatarProps.avatarColor,
                    color: 'white',
                }}
            >
                {avatarProps.avatarLetter}
            </Avatar>
            <span className="userName text-sm text-gray-300 ml-3">{safeUsername}</span>
        </div>
    );
};

export default Client;