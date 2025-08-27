import React from 'react';

const Avatar = ({ src, alt, size = 50 }) => {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ccc',
      }}
    >
      {/* If no src is provided, a default avatar is shown */}
      {src ? (
        <img
          src={src}
          alt={alt}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover', // Makes sure the image covers the entire area without stretching
          }}
        />
      ) : (
        <span style={{ fontSize: size / 2, color: '#fff' }}>{alt?.[0]}</span> // Shows the first letter as a fallback
      )}
    </div>
  );
};

export default Avatar;
