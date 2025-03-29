import { useEffect, useRef, useState } from "react";

export default function CallView({ setIsCalling, client, chatId, isCalling }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [selfWatch, setSelfWatch] = useState(false);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);

  useEffect(() => {
    if (!isCalling) return;
    const configuration = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };
    const pc = new RTCPeerConnection(configuration);
    peerConnectionRef.current = pc;

    async function initCall() {
      try {
        localStreamRef.current = await navigator.mediaDevices.getUserMedia({
          video: { height: 200 },
          audio: true,
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }

        localStreamRef.current
          .getTracks()
          .forEach((track) => pc.addTrack(track, localStreamRef.current));

        // Check if there's an existing offer
        const storedOffer = await client.get("offer", { chatId });
        if (storedOffer) {
          await pc.setRemoteDescription(new RTCSessionDescription(storedOffer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          client.say("answer", { answer, chatId });
        } else {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          client.say("set-offer", { offer, chatId });
        }
      } catch (error) {
        console.error("Error initializing call:", error);
      }
    }

    initCall();

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        client.say("ice-candidate", { candidate: event.candidate, chatId });
      }
    };

    client.onSay(
      "offer",
      async (data) => {
        if (data.chatId !== chatId) return;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          client.say("answer", { answer, chatId });
        } catch (error) {
          console.error("Error handling offer:", error);
        }
      },
      true
    );

    client.onSay(
      "answer",
      async (data) => {
        if (data.chatId !== chatId) return;
        try {
          if (!pc.currentRemoteDescription) {
            await pc.setRemoteDescription(
              new RTCSessionDescription(data.answer)
            );
          }
        } catch (error) {
          console.error("Error handling answer:", error);
        }
      },
      true
    );

    client.onSay(
      "ice-candidate",
      async (data) => {
        if (data.chatId !== chatId) return;
        try {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        } catch (error) {
          console.error("Error adding ICE candidate:", error);
        }
      },
      true
    );

    return () => {
      pc.close();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [client, chatId, isCalling]);

  const handleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setMuted((prev) => !prev);
  };

  const handleCamera = () => {
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setCameraOn((prev) => !prev);
  };

  const handleExit = () => {
    peerConnectionRef?.current?.close?.();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    setIsCalling(false);
  };

  return (
    <div className={"call-view " + (!isCalling ? "hidden-call-view" : "")}>
      <div className="video-container">
        <video
          className={selfWatch ? "big" : "small"}
          onClick={(e) => {
            e.preventDefault();
            setSelfWatch(false);
          }}
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
        />
        <video
          tabIndex={-1}
          className={!selfWatch ? "big" : "small"}
          onClick={(e) => {
            e.preventDefault();
            setSelfWatch(true);
          }}
          ref={remoteVideoRef}
          autoFocus
          autoPlay
          playsInline
        />
      </div>
      <div className="content">
        <button className="danger" onClick={handleExit}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="24px"
            viewBox="0 -960 960 960"
            width="24px"
            fill="#e8eaed"
          >
            <path d="m136-304-92-90q-12-12-12-28t12-28q88-95 203-142.5T480-640q118 0 232.5 47.5T916-450q12 12 12 28t-12 28l-92 90q-11 11-25.5 12t-26.5-8l-116-88q-8-6-12-14t-4-18v-114q-38-12-78-19t-82-7q-42 0-82 7t-78 19v114q0 10-4 18t-12 14l-116 88q-12 9-26.5 8T136-304Zm104-198q-29 15-56 34.5T128-424l40 40 72-56v-62Zm480 2v60l72 56 40-38q-29-26-56-45t-56-33Zm-480-2Zm480 2Z" />
          </svg>
        </button>
        <button onClick={handleMute}>
          {muted ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              fill="#e8eaed"
            >
              <path d="M480-400q-50 0-85-35t-35-85v-240q0-50 35-85t85-35q50 0 85 35t35 85v240q0 50-35 85t-85 35Zm0-240Zm-40 520v-123q-104-14-172-93t-68-184h80q0 83 58.5 141.5T480-320q83 0 141.5-58.5T680-520h80q0 105-68 184t-172 93v123h-80Zm40-360q17 0 28.5-11.5T520-520v-240q0-17-11.5-28.5T480-800q-17 0-28.5 11.5T440-760v240q0 17 11.5 28.5T480-480Z" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              fill="#e8eaed"
            >
              <path d="m710-362-58-58q14-23 21-48t7-52h80q0 44-13 83.5T710-362ZM480-594Zm112 112-72-72v-206q0-17-11.5-28.5T480-800q-17 0-28.5 11.5T440-760v126l-80-80v-46q0-50 35-85t85-35q50 0 85 35t35 85v240q0 11-2.5 20t-5.5 18ZM440-120v-123q-104-14-172-93t-68-184h80q0 83 57.5 141.5T480-320q34 0 64.5-10.5T600-360l57 57q-29 23-63.5 39T520-243v123h-80Zm352 64L56-792l56-56 736 736-56 56Z" />
            </svg>
          )}
        </button>
        <button onClick={handleCamera}>
          {cameraOn ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              fill="#e8eaed"
            >
              <path d="M880-260 720-420v67l-80-80v-287H353l-80-80h367q33 0 56.5 23.5T720-720v180l160-160v440ZM822-26 26-822l56-56L878-82l-56 56ZM498-575ZM382-464ZM160-800l80 80h-80v480h480v-80l80 80q0 33-23.5 56.5T640-160H160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800Z" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              fill="#e8eaed"
            >
              <path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h480q33 0 56.5 23.5T720-720v180l160-160v440L720-420v180q0 33-23.5 56.5T640-160H160Zm0-80h480v-480H160v480Zm0 0v-480 480Z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
