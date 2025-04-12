import React, { useEffect, useRef } from "react";

export default function VideoStream({
  stream,
  className,
  onClick,
  autoPlay,
  playsInline,
  muted,
  tabIndex,
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      className={className}
      onClick={onClick}
      autoPlay={autoPlay}
      playsInline={playsInline}
      muted={muted}
      tabIndex={tabIndex}
    />
  );
}
