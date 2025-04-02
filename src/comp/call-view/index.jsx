import React, { useEffect, useRef, useState } from "react";
import { basicHash } from "../../utils/crypto";
import VideoStream from "./video-stream";
import { deriveKey, encryptData, decryptData } from './encryption'

export default function CallView({
  isCalling,
  broadcast, // function to send signaling data
  onBroadcast, // callback for incoming signaling data
  exit,
  password,
}) {
  const localVideoRef = useRef(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const [selfWatch, setSelfWatch] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [cryptoKey, setCryptoKey] = useState(null);
  const beepAudioRef = useRef(null);
  const beepIntervalRef = useRef(null);

  const SALT = basicHash(new Date().toLocaleDateString("de"));

  useEffect(() => {
    if (password) {
      deriveKey(password, SALT).then(setCryptoKey).catch(console.error);
    }
  }, [password]);

  // Set up the call when isCalling becomes true.
  useEffect(() => {
    if (isCalling) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          localStream.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
          setupPeerConnection(stream);
          startCall();
          startBeepTone();
        })
        .catch(console.error);
    } else {
      cleanup();
    }
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCalling, cryptoKey]);

  // Setup RTCPeerConnection and add tracks.
  const setupPeerConnection = (stream) => {
    peerConnection.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    stream
      .getTracks()
      .forEach((track) => peerConnection.current.addTrack(track, stream));
    peerConnection.current.ontrack = (event) => {
      const newStream = event.streams[0];
      setRemoteStreams((prev) => {
        if (prev.find((s) => s.id === newStream.id)) return prev;
        // Play beep immediately when a new remote stream arrives.
        if (beepAudioRef.current) {
          beepAudioRef.current.play().catch(console.error);
        }
        return [...prev, newStream];
      });
    };
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        secureBroadcast({ type: "candidate", candidate: event.candidate });
      }
    };
    peerConnection.current.onconnectionstatechange = (e) => {
      console.log(e);
      if (e.failed) {
        setRemoteStreams((prev) => {
          return prev.filter((s) => s.id === e.streams[0].id);
        });
      }
    };
  };

  // Secure broadcast: encrypt messages before sending.
  const secureBroadcast = async (msg) => {
    if (!cryptoKey) return;
    try {
      const encrypted = await encryptData(msg, cryptoKey);
      broadcast({ encrypted });
    } catch (error) {
      console.error("Encryption error:", error);
    }
  };

  // Start the call by creating and sending an offer.
  const startCall = async () => {
    if (!peerConnection.current) return;
    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);
    secureBroadcast({ type: "offer", offer });
  };

  // Decrypt and handle incoming broadcast messages.
  useEffect(() => {
    onBroadcast(async (data) => {
      if (!cryptoKey) return;
      try {
        if (data.encrypted) {
          const decrypted = await decryptData(data.encrypted, cryptoKey);
          await handleMessage(decrypted);
        }
      } catch (error) {
        console.error("Decryption error:", error);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cryptoKey, onBroadcast]);

  // Process signaling messages with state checks.
  const handleMessage = async (data) => {
    if (!peerConnection.current) return;
    const signalingState = peerConnection.current.signalingState;
    if (data.type === "offer") {
      // Only handle offer if connection is not already negotiating.
      if (
        signalingState === "stable" ||
        signalingState === "have-local-offer"
      ) {
        await peerConnection.current.setRemoteDescription(data.offer);
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        secureBroadcast({ type: "answer", answer });
      } else {
        console.warn("Received offer in state", signalingState, "- ignoring");
      }
    } else if (data.type === "answer") {
      // Only set answer if we have sent an offer (state must be "have-local-offer").
      if (signalingState === "have-local-offer") {
        await peerConnection.current.setRemoteDescription(data.answer);
      } else {
        console.warn("Received answer in state", signalingState, "- ignoring");
      }
    } else if (data.type === "candidate") {
      try {
        await peerConnection.current.addIceCandidate(data.candidate);
      } catch (error) {
        console.error("Error adding received candidate", error);
      }
    }
  };

  // Cleanup when the call ends.
  function cleanup() {
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    setRemoteStreams([]);
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    stopBeepTone();
  }

  // Toggle audio and video tracks.
  useEffect(() => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
      localStream.current.getVideoTracks().forEach((track) => {
        track.enabled = cameraOn;
      });
    }
  }, [muted, cameraOn]);

  // --- Beep Tone Logic ---
  // Start periodic beep if the user is alone.
  const startBeepTone = () => {
    stopBeepTone(); // clear any existing interval
    if (remoteStreams.length === 0 && beepAudioRef.current) {
      beepIntervalRef.current = setInterval(() => {
        beepAudioRef.current.play().catch(console.error);
      }, 500);
    }
  };

  const stopBeepTone = () => {
    if (beepIntervalRef.current) {
      clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = null;
    }
  };

  // Update beep behavior when remoteStreams change.
  useEffect(() => {
    if (remoteStreams.length > 0) {
      stopBeepTone();
      if (beepAudioRef.current) {
        beepAudioRef.current.play().catch(console.error);
      }
    } else if (isCalling) {
      startBeepTone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteStreams]);

  return (
    <div className={"call-view " + (!isCalling ? "hidden-call-view" : "")}>
      <div className="video-container" style={{ position: "relative" }}>
        {/* Local video */}
        <video
          ref={localVideoRef}
          className={selfWatch ? "big" : "small"}
          onClick={() => {
            console.log("Switching self-watch off");
            setSelfWatch((o) => !o);
          }}
          autoPlay
          playsInline
          muted
        />
        {/* Remote videos using the VideoStream component */}
        {remoteStreams.map((stream) => (
          <VideoStream
            key={stream.id}
            stream={stream}
            className={!selfWatch ? "big" : "small"}
            onClick={() => {
              console.log("Switching self-watch on");
              setSelfWatch((o) => !o);
            }}
            autoPlay
            playsInline
            tabIndex={-1}
          />
        ))}
        {/* Beep tone overlay */}
        <div
          className="beep-overlay"
          style={{
            position: "absolute",
            bottom: "10px",
            right: "10px",
            zIndex: 10,
          }}
        >
          <audio ref={beepAudioRef} src="/easy-messenger/sounds/beep.mp3" />
        </div>
      </div>
      <div className="content">
        <button
          className="danger"
          onClick={() => {
            console.log("Exit button clicked");
            cleanup();
            exit();
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="24px"
            viewBox="0 -960 960 960"
            width="24px"
            fill="#e8eaed"
          >
            <path d="m136-304-92-90q-12-12-12-28t12-28q88-95 203-142.5T480-640q118 0 232.5 47.5T916-450q12 12 12 28t-12 28l-92 90q-11 11-25.5 12t-26.5-8l-116-88q-8-6-12-14t-4-18v-114q-38-12-78-19t-82-7q-42 0-82 7t-78 19v114q0 10-4 18t-12 14l-116 88q-12 9-26.5 8T136-304Z" />
          </svg>
        </button>
        <button onClick={() => setMuted((o) => !o)}>
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
        <button onClick={() => setCameraOn((o) => !o)}>
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