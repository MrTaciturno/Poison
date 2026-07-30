import React, { useEffect, useState } from 'react';

export default function RollToast({ socket }) {
  const [latestRoll, setLatestRoll] = useState(null);

  useEffect(() => {
    const handleRoll = (rollData) => {
      setLatestRoll(rollData);
      const timer = setTimeout(() => {
        setLatestRoll(null);
      }, 4500);
      return () => clearTimeout(timer);
    };

    socket.on('dice_rolled', handleRoll);
    return () => {
      socket.off('dice_rolled', handleRoll);
    };
  }, [socket]);

  if (!latestRoll) return null;

  return (
    <div className="roll-toast-container">
      <div className="roll-toast-box">
        <div>
          <div className="toast-user">{latestRoll.userName}</div>
          <div className="toast-label">
            {latestRoll.label} ({latestRoll.diceType}{latestRoll.bonus >= 0 ? `+${latestRoll.bonus}` : latestRoll.bonus})
          </div>
        </div>
        <div className="toast-total">
          {latestRoll.finalResult}
        </div>
      </div>
    </div>
  );
}
