import React, { useEffect, useRef, useState } from "react";
import VideoStream from "./video-stream";
import { deriveKey, encryptData, decryptData } from "./encryption";

export default function CallView({
  isCalling,
  broadcast,    // function to send signaling data to the server/broadcast to peers
  onBroadcast,  // callback for incoming signaling data (receives a data object)
  exit,
  password,
}) {
  // Refs and state
  const localVideoRef = useRef(null);
  const [remoteStreams, setRemoteStreams] = useState([]); // { id, stream }
  const peerConnections = useRef({}); // { peerId: RTCPeerConnection }
  const localStream = useRef(null);
  const [selfWatch, setSelfWatch] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [cryptoKey, setCryptoKey] = useState(null);
  const joinSent = useRef(false);

  // Use persistent clientId stored in localStorage so that it remains constant across sessions.
  const [clientId] = useState(() => {
    let id = localStorage.getItem("clientId");
    if (!id) {
      id = Math.random().toString(36).substring(2, 15);
      localStorage.setItem("clientId", id);
    }
    return id;
  });

  // Securely broadcast a message (with optional target field)
  const secureBroadcast = async (msg) => {
    if (!cryptoKey) return;
    try {
      const payload = { sender: clientId, ...msg };
      const encrypted = await encryptData(payload, cryptoKey);
      broadcast({ encrypted });
    } catch (error) {
      console.error("Encryption error:", error);
    }
  };

  // Derive the crypto key using a constant salt when a password is provided.
  useEffect(() => {
    if (password) {
      deriveKey(password, "default-salt")
        .then(setCryptoKey)
        .catch(console.error);
    }
  }, [password]);

  // Get local media stream and set it on the video element.
  useEffect(() => {
    if (isCalling) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          localStream.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        })
        .catch(console.error);
    } else {
      cleanup();
    }
    return cleanup;
  }, [isCalling]);

  // Auto-send join message once cryptoKey is available and call is active.
  useEffect(() => {
    if (isCalling && cryptoKey && !joinSent.current) {
      secureBroadcast({ type: "join" });
      joinSent.current = true;
    }
  }, [isCalling, cryptoKey]);

  // Add remote stream for a specific peer.
  const addRemoteStream = (peerId, stream) => {
    setRemoteStreams((prev) => {
      if (prev.find((r) => r.id === peerId)) return prev;
      return [...prev, { id: peerId, stream }];
    });
  };

  // Create or get an RTCPeerConnection for a given peer.
  const getOrCreatePeerConnection = (peerId) => {
    // If a connection exists, use it.
    if (peerConnections.current[peerId]) return peerConnections.current[peerId];

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // Add local tracks.
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) =>
        pc.addTrack(track, localStream.current)
      );
    }

    // When a remote track is received, add the stream.
    pc.ontrack = (event) => {
      const newStream = event.streams[0];
      console.log("Received remote stream from", peerId, newStream);
      addRemoteStream(peerId, newStream);
    };

    // ICE candidate exchange.
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        secureBroadcast({
          type: "candidate",
          candidate: event.candidate,
          target: peerId,
        });
      }
    };

    // If connection fails or closes, remove it.
    pc.onconnectionstatechange = () => {
      if (["failed", "closed"].includes(pc.connectionState)) {
        if (peerConnections.current[peerId]) {
          peerConnections.current[peerId].close();
          delete peerConnections.current[peerId];
          setRemoteStreams((prev) => prev.filter((r) => r.id !== peerId));
        }
      }
    };

    peerConnections.current[peerId] = pc;
    return pc;
  };

  // Create and send an offer for a new peer.
  const createAndSendOffer = async (peerId) => {
    // If a connection already exists, close it to use the latest one.
    if (peerConnections.current[peerId]) {
      peerConnections.current[peerId].close();
      delete peerConnections.current[peerId];
    }
    const pc = getOrCreatePeerConnection(peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    secureBroadcast({ type: "offer", offer, target: peerId });
  };

  // Handle incoming decrypted signaling messages.
  const handleMessage = async (data) => {
    // Ignore our own messages.
    if (data.sender === clientId) return;
    // If a message is targeted to another client, ignore it.
    if (data.target && data.target !== clientId) return;

    if (data.type === "join") {
      // On join, always close any existing connection for that peer and create a new one.
      if (peerConnections.current[data.sender]) {
        peerConnections.current[data.sender].close();
        delete peerConnections.current[data.sender];
      }
      createAndSendOffer(data.sender);
    } else if (data.type === "offer") {
      // On receiving an offer, always close any existing connection to use the latest offer.
      if (peerConnections.current[data.sender]) {
        peerConnections.current[data.sender].close();
        delete peerConnections.current[data.sender];
      }
      const pc = getOrCreatePeerConnection(data.sender);
      await pc.setRemoteDescription(data.offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      secureBroadcast({ type: "answer", answer, target: data.sender });
    } else if (data.type === "answer") {
      const pc = peerConnections.current[data.sender];
      if (pc && pc.signalingState === "have-local-offer") {
        await pc.setRemoteDescription(data.answer);
      } else {
        console.warn("Received answer in state", pc ? pc.signalingState : "N/A");
      }
    } else if (data.type === "candidate") {
      const pc = peerConnections.current[data.sender];
      if (pc) {
        try {
          await pc.addIceCandidate(data.candidate);
        } catch (error) {
          console.error("Error adding candidate from", data.sender, error);
        }
      }
    } else if (data.type === "exit") {
      if (peerConnections.current[data.sender]) {
        peerConnections.current[data.sender].close();
        delete peerConnections.current[data.sender];
        setRemoteStreams((prev) => prev.filter((r) => r.id !== data.sender));
      }
    }
  };

  // Listen for incoming signaling messages.
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
  }, [cryptoKey, onBroadcast]);

  // Cleanup: stop local stream and close connections.
  function cleanup() {
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    Object.values(peerConnections.current).forEach((pc) => pc.close());
    peerConnections.current = {};
    setRemoteStreams([]);
    joinSent.current = false;
  }

  // Toggle audio/video tracks.
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

  return (
    <div className={"call-view " + (!isCalling ? "hidden-call-view" : "")}>
      <div className="video-container" style={{ position: "relative" }}>
        {/* Local video */}
        <video
          ref={localVideoRef}
          className={selfWatch ? "big" : "small"}
          onClick={() => setSelfWatch((o) => !o)}
          autoPlay
          playsInline
          muted
        />
        {/* Remote videos */}
        {remoteStreams.map(({ id, stream }) => (
          <VideoStream
            key={id}
            stream={stream}
            className={!selfWatch ? "big" : "small"}
            onClick={() => setSelfWatch((o) => !o)}
            autoPlay
            playsInline
            tabIndex={-1}
          />
        ))}
      </div>
      <div className="content">
        <button
          className="danger"
          onClick={() => {
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
