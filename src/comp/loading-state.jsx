import { useState, useEffect } from "react";

export default function LoadingState({ state }) {
  const [timePassed, setTimePassed] = useState(0);
  const [speed, setSpeed] = useState(1000);

  useEffect(() => {
    const increaseInterval = setInterval(() => {
      setTimePassed((prev) => prev + 1);
    }, speed);
    return () => clearInterval(increaseInterval);
  }, [speed]);

  return (
    <div style={{ margin: "20px" }}>
      <p>Loading state: {state}...</p>
      <p>It can't take under a minute... ({timePassed}s)</p>
      <button onClick={() => setSpeed((prev) => prev / 2)}>
        Click This Button To Make It Faster
      </button>

      {/* Fake Advertising Section */}
      <div style={{ marginTop: "20px", padding: "10px", border: "1px solid #ccc", backgroundColor: "#f9f9f9" }}>
        <h4>🚀 Boost Your Speed Instantly! 🚀</h4>
        <p>Upgrade to <b>LoadingPro+</b> and experience 10x faster loading times.</p>
        <button style={{ backgroundColor: "gold", padding: "5px 10px", border: "none", cursor: "pointer" }}>
          Upgrade Now!
        </button>
      </div>
    </div>
  );
}
