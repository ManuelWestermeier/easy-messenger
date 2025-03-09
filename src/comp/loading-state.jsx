import { useState, useEffect } from "react";

export default function LoadingState({ state }) {
    const [timePassed, setTimePassed] = useState(0);
    const [speed, setSpeed] = useState(1000);

    useEffect(() => {
        const increaseInterval = setInterval(() => {
            setTimePassed(prev => prev + 1);
        }, speed);
        return () => clearInterval(increaseInterval);
    }, [speed]);

    return (
        <div style={{ margin: "20px" }}>
            <p>
                Loading state: {state}...
            </p>
            <p>
                It can't take under a minute... ({timePassed}s)
            </p>
            <button onClick={() => setSpeed(prev => prev / 2)}>
                Click This Button To Make It Faster
            </button>
        </div>
    );
}
