import React, { useEffect, useRef, useState } from "react";
import { randomBytes } from "../utils/crypto";

// --- VideoStream Component ---
// A simple wrapper that sets the video element's srcObject using a ref.
function VideoStream({
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

// --- Encryption Helpers ---
async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function encryptData(data, key) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  const cipherBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  return {
    iv: arrayBufferToBase64(iv.buffer),
    data: arrayBufferToBase64(cipherBuffer),
  };
}

async function decryptData(payload, key) {
  const iv = new Uint8Array(base64ToArrayBuffer(payload.iv));
  const cipherBuffer = base64ToArrayBuffer(payload.data);
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    cipherBuffer
  );
  const dec = new TextDecoder();
  return JSON.parse(dec.decode(decrypted));
}

// --- CallView Component ---
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

  // Use a constant “big salt” (in production, use a secure, unique salt per session)
  const SALT = randomBytes(128).toString(CryptoJS.enc.Base64);

  // Derive encryption key when password changes.
  useEffect(() => {
    if (password) {
      deriveKey(password, SALT).then(setCryptoKey).catch(console.error);
    }
  }, [password]);

  // Set up call when isCalling becomes true.
  useEffect(() => {
    if (isCalling) {
      navigator.mediaDevices
        .getUserMedia({
          video: true,
          audio: true,
        })
        .then((stream) => {
          localStream.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
          setupPeerConnection(stream);
          startCall();
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
        // When a new remote stream arrives, play a beep immediately.
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
  };

  // Secure broadcast: encrypt message before sending.
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

  // Process signaling messages with RTCPeerConnection state checks.
  const handleMessage = async (data) => {
    if (!peerConnection.current) return;
    const signalingState = peerConnection.current.signalingState;
    if (data.type === "offer") {
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

  // Cleanup function for call end.
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
  }

  // Toggle audio and video tracks based on mute/camera state.
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

  // --- Recursive Beep Tone Logic (No Intervals) ---
  // Function to play the beep if conditions are met.
  const playContinuousBeep = () => {
    if (isCalling && remoteStreams.length === 0 && beepAudioRef.current) {
      beepAudioRef.current.play().catch(console.error);
    }
  };

  // Setup the "ended" event listener on the audio element.
  useEffect(() => {
    const audioElem = beepAudioRef.current;
    if (!audioElem) return;

    const handleEnded = () => {
      // After the beep finishes, play it again if still alone.
      playContinuousBeep();
    };

    audioElem.addEventListener("ended", handleEnded);

    // If conditions are met, start the beep.
    if (isCalling && remoteStreams.length === 0) {
      playContinuousBeep();
    }

    return () => {
      audioElem.removeEventListener("ended", handleEnded);
    };
  }, [isCalling, remoteStreams]);

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
        {/* Remote videos rendered with VideoStream */}
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
        {/* Div for the beep tone overlay */}
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
