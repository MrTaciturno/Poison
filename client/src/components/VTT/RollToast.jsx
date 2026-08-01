import React, { useEffect, useState } from 'react';

export default function RollToast({ socket }) {
  const [latestRoll, setLatestRoll] = useState(null);

  useEffect(() => {
    if (!socket) return;
    const handleRollHistory = (history) => {
      if (Array.isArray(history) && history.length > 0) {
        const last = history[history.length - 1];
        setLatestRoll(last);
        const timer = setTimeout(() => {
          setLatestRoll(null);
        }, 4500);
        return () => clearTimeout(timer);
      }
    };

    socket.on('roll_history_updated', handleRollHistory);
    return () => {
      socket.off('roll_history_updated', handleRollHistory);
    };
  }, [socket]);

  if (!latestRoll) return null;

  return (
    <div className="roll-toast-container">
      <div className="roll-toast-box">
        <div>
          <div className="toast-user">{latestRoll.userName || 'Jogador'}</div>
          <div className="toast-label">
            {latestRoll.label || 'Rolagem'}: {latestRoll.formula || ''}
          </div>
        </div>
        <div className="toast-total">
          {latestRoll.resultText || latestRoll.total}
        </div>
      </div>
    </div>
  );
}
