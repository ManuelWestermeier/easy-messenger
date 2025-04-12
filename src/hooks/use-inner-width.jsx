import { useEffect, useState } from "react";

export default function useInnerWidth() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const listener = window.addEventListener("resize", () =>
      setWidth(window.innerWidth),
    );
    return () => {
      window.removeEventListener("resize", listener);
    };
  }, []);

  return width;
}
