import React, { useContext } from 'react';
import { Context } from '../pages/EditorPage';

const Analytics = () => {
  const clients = useContext(Context);

  return (
    <div className="analytics bg-lightGray p-4">
      <h4 className="mb-4">Room Analytics</h4>
      <div className="info mb-4">
        <p><strong>Active Users: </strong>{clients.length}</p>
      </div>
      <div className="stats">
        <p><strong>Avg Time Spent: </strong>15 mins</p>
        <p><strong>Messages Sent: </strong>45</p>
      </div>
    </div>
  );
};

export default Analytics;
