import { useState, useEffect } from "react";

export default function LoadingState({ state }) {
    const [timePassed, setTimePassed] = useState(0);
    const [speed, setSpeed] = useState(1000);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setTimePassed(prev => prev + 1);
        }, speed);
        return () => clearTimeout(timeout);
    }, [speed]);

    return <div style={{ margin: "20px" }}>
        <p>
            Loading state: {state}...
        </p>
        <p>
            It can't take under a minute... ({timePassed}s)
        </p>
        <button onClick={() => setSpeed(500)}>
            Click This Button To Make It Faster
        </button>
    </div>;
}