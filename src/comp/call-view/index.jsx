import React, { useEffect, useRef, useState } from "react";
import { basicHash } from "../../utils/crypto";
import VideoStream from "./video-stream";
import { deriveKey, encryptData, decryptData } from "./encryption";

// This helper creates a random salt (hex string)
const generateSalt = () => {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export default function CallView({
  isCalling,
  broadcast, // function to send signaling data to all peers
  onBroadcast, // callback for incoming signaling data
  exit,
  password,
  localPeerId, // unique identifier for this peer (e.g. UUID)
}) {
  // Refs and state for video, connections, and chat.
  const localVideoRef = useRef(null);
  const [remoteStreams, setRemoteStreams] = useState([]); // Array of MediaStreams from remote peers
  const peerConnectionsRef = useRef({}); // { [peerId]: RTCPeerConnection }
  const localStream = useRef(null);
  const [selfWatch, setSelfWatch] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [cryptoKey, setCryptoKey] = useState(null);
  const [salt, setSalt] = useState(null);
  const [chatMessages, setChatMessages] = useState([]); // { sender, text }
  const chatInputRef = useRef(null);
  const beepAudioRef = useRef(null);
  const beepIntervalRef = useRef(null);

  // Derive cryptoKey when both password and salt are available.
  useEffect(() => {
    if (password && salt) {
      deriveKey(password, salt).then(setCryptoKey).catch(console.error);
    }
  }, [password, salt]);

  // When starting the call, get media, set up local video,
  // generate and broadcast salt (if not already set), and notify others.
  useEffect(() => {
    if (isCalling) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          localStream.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
          // If we have not yet set a salt, generate and broadcast it.
          if (!salt) {
            const newSalt = generateSalt();
            setSalt(newSalt);
            broadcast({
              sender: localPeerId,
              type: "salt",
              salt: newSalt,
            });
          }
          // Broadcast a join message so that other peers know we’re here.
          broadcast({
            sender: localPeerId,
            type: "join",
          });
          startBeepTone();
        })
        .catch(console.error);
    } else {
      cleanup();
    }
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCalling]);

  // Function to get or create an RTCPeerConnection for a given remote peer.
  const getOrCreateConnection = (remotePeerId) => {
    if (peerConnectionsRef.current[remotePeerId]) {
      return peerConnectionsRef.current[remotePeerId];
    }
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    // Add local tracks to the new connection.
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStream.current);
      });
    }
    // When remote track arrives, add its stream.
    pc.ontrack = (event) => {
      const newStream = event.streams[0];
      setRemoteStreams((prev) => {
        if (prev.find((s) => s.id === newStream.id)) return prev;
        // Play a beep when a new remote stream arrives.
        if (beepAudioRef.current) {
          beepAudioRef.current.play().catch(console.error);
        }
        return [...prev, newStream];
      });
    };
    // When ICE candidate is generated, send it.
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        secureBroadcast({
          sender: localPeerId,
          target: remotePeerId,
          type: "candidate",
          candidate: event.candidate,
        });
      }
    };
    peerConnectionsRef.current[remotePeerId] = pc;
    return pc;
  };

  // Encrypt a message and broadcast it.
  const secureBroadcast = async (msg) => {
    if (!cryptoKey) return;
    try {
      const encrypted = await encryptData(msg, cryptoKey);
      broadcast({ encrypted });
    } catch (error) {
      console.error("Encryption error:", error);
    }
  };

  // Chat message send function.
  const sendChatMessage = async () => {
    if (!cryptoKey || !chatInputRef.current.value) return;
    const text = chatInputRef.current.value;
    const msg = { type: "chat", sender: localPeerId, text };
    await secureBroadcast(msg);
    // Also add our own message locally.
    setChatMessages((prev) => [...prev, { sender: "me", text }]);
    chatInputRef.current.value = "";
  };

  // Listen for incoming broadcast messages.
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

  // Handle incoming signaling and chat messages.
  const handleMessage = async (data) => {
    // Ignore our own messages.
    if (data.sender === localPeerId) return;

    switch (data.type) {
      case "salt":
        // If we receive a salt and we haven't set one, use it.
        if (!salt && data.salt) {
          setSalt(data.salt);
        }
        break;
      case "join":
        // A new peer joined. Create a connection and, if we are the older peer,
        // initiate an offer.
        if (data.sender) {
          const pc = getOrCreateConnection(data.sender);
          // If we haven’t already started negotiation for this peer, send an offer.
          if (
            pc.signalingState === "stable" ||
            pc.signalingState === "closed"
          ) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            secureBroadcast({
              sender: localPeerId,
              target: data.sender,
              type: "offer",
              offer,
            });
          }
        }
        break;
      case "offer": {
        // Offer received from a remote peer.
        if (data.sender && data.offer) {
          const pc = getOrCreateConnection(data.sender);
          // Only process if in a state to accept an offer.
          if (
            pc.signalingState === "stable" ||
            pc.signalingState === "have-local-offer"
          ) {
            await pc.setRemoteDescription(data.offer);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            secureBroadcast({
              sender: localPeerId,
              target: data.sender,
              type: "answer",
              answer,
            });
          } else {
            console.warn("Offer received in invalid state:", pc.signalingState);
          }
        }
        break;
      }
      case "answer": {
        // Answer received for an offer we sent.
        if (data.sender && data.answer) {
          const pc = getOrCreateConnection(data.sender);
          // Only accept answer if we have sent an offer.
          if (pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(data.answer);
          } else {
            console.warn(
              "Answer received in invalid state:",
              pc.signalingState
            );
          }
        }
        break;
      }
      case "candidate": {
        // ICE candidate from a remote peer.
        if (data.sender && data.candidate) {
          const pc = getOrCreateConnection(data.sender);
          try {
            await pc.addIceCandidate(data.candidate);
          } catch (error) {
            console.error("Error adding received candidate", error);
          }
        }
        break;
      }
      case "chat": {
        // Chat message received.
        if (data.sender && data.text) {
          setChatMessages((prev) => [
            ...prev,
            { sender: data.sender, text: data.text },
          ]);
        }
        break;
      }
      default:
        console.warn("Unknown message type:", data.type);
    }
  };

  // Stop the beep tone.
  const stopBeepTone = () => {
    if (beepIntervalRef.current) {
      clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = null;
    }
  };

  // Start periodic beep if no remote streams are present.
  const startBeepTone = () => {
    stopBeepTone();
    if (remoteStreams.length === 0 && beepAudioRef.current) {
      beepIntervalRef.current = setInterval(() => {
        beepAudioRef.current.play().catch(console.error);
      }, 500);
    }
  };

  // Update beep behavior when remote streams change.
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

  // Cleanup: stop local tracks and close all peer connections.
  const cleanup = () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    setRemoteStreams([]);
    Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
    peerConnectionsRef.current = {};
    stopBeepTone();
  };

  return (
    <div className={"call-view " + (!isCalling ? "hidden-call-view" : "")}>
      <div className="video-container" style={{ position: "relative" }}>
        {/* Local video */}
        <video
          ref={localVideoRef}
          className={selfWatch ? "big" : "small"}
          onClick={() => {
            console.log("Switching self-watch");
            setSelfWatch((prev) => !prev);
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
              console.log("Switching self-watch");
              setSelfWatch((prev) => !prev);
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

      {/* Chat UI */}
      <div className="chat-container">
        <div
          className="chat-log"
          style={{ maxHeight: "200px", overflowY: "auto" }}
        >
          {chatMessages.map((msg, index) => (
            <div key={index}>
              <strong>{msg.sender === "me" ? "You" : msg.sender}:</strong>{" "}
              {msg.text}
            </div>
          ))}
        </div>
        <div className="chat-input">
          <input
            type="text"
            ref={chatInputRef}
            placeholder="Type a message..."
          />
          <button onClick={sendChatMessage}>Send</button>
        </div>
      </div>

      {/* Control buttons */}
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
        <button onClick={() => setMuted((prev) => !prev)}>
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
        <button onClick={() => setCameraOn((prev) => !prev)}>
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
