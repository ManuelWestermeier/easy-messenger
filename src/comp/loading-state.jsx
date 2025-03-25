import { useState, useEffect } from "react";
import useLocalStorage from "use-local-storage";

export default function LoadingState({ state }) {
  const [ads, setAds] = useLocalStorage("loaded-ads", []);
  const [timePassed, setTimePassed] = useState(0);
  const [speed, setSpeed] = useState(1000);

  useEffect(() => {
    const increaseInterval = setInterval(() => {
      setTimePassed((prev) => prev + 1);
    }, speed);
    return () => clearInterval(increaseInterval);
  }, [speed]);

  useEffect(() => {
    fetch("/easy-messenger/ads.json")
      .then((res) => res.json())
      .then((data) => setAds(data))
      .catch((err) => err);
  }, []);

  return (
    <div style={{ margin: "20px" }}>
      <p>Loading state: {state}...</p>
      <p>It can't take under a minute... ({timePassed}s)</p>
      <button onClick={() => setSpeed((prev) => prev / 2)}>
        Click This Button To Make It Faster
      </button>

      <div className="ads">
        {ads.map(({ img, text, url }) => {
          return (
            <a href={url} className="ad" key={url}>
              <img alt={text} title={text} src={img}></img>
              <span>{text}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
