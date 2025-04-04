import { useEffect, useRef, useState } from "react";
import { basicHash } from "../utils/crypto";
import {
  deriveKey,
  encryptData,
  decryptData,
} from "../comp/call-view/encryption";

export default function useVideoCall({
  isCalling,
  broadcast, // function to send signaling data
  onBroadcast, // callback for incoming signaling data
  password,
}) {
  const localVideoRef = useRef(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  // Instead of a single peerConnection, we now keep an object of connections.
  const connections = useRef({});
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

  // Function to create a new RTCPeerConnection and store it in our connections object.
  const createPeerConnection = (stream) => {
    const connection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    // Create a unique id for the connection.
    connection.id = Date.now() + Math.random().toString();
    connections.current[connection.id] = connection;

    stream.getTracks().forEach((track) => connection.addTrack(track, stream));

    connection.ontrack = (event) => {
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

    connection.onicecandidate = (event) => {
      if (event.candidate) {
        // Optionally, include the connection id in your signaling data.
        secureBroadcast({
          type: "candidate",
          candidate: event.candidate,
          connectionId: connection.id,
        });
      }
    };

    connection.onconnectionstatechange = () => {
      // If the connection is closed, failed, or disconnected, remove it.
      if (
        connection.connectionState === "closed" ||
        connection.connectionState === "failed" ||
        connection.connectionState === "disconnected"
      ) {
        delete connections.current[connection.id];
      }
    };

    return connection;
  };

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
          // Create and store a new connection.
          const connection = createPeerConnection(stream);
          startCall(connection);
          startBeepTone();
        })
        .catch(console.error);
    } else {
      cleanup();
    }
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCalling, cryptoKey]);

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

  // Start the call by creating and sending an offer on the provided connection.
  const startCall = async (connection) => {
    if (!connection) return;
    try {
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      secureBroadcast({ type: "offer", offer, connectionId: connection.id });
    } catch (error) {
      console.error("Error starting call:", error);
    }
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

  // Process signaling messages.
  const handleMessage = async (data) => {
    // Use connectionId from the signaling data if provided.
    let connection;
    if (data.connectionId && connections.current[data.connectionId]) {
      connection = connections.current[data.connectionId];
    } else {
      // If no valid connectionId is provided, select the first active connection.
      connection = Object.values(connections.current)[0];
    }
    if (!connection) return;

    const signalingState = connection.signalingState;
    if (data.type === "offer") {
      // Only handle offer if connection is in a valid state.
      if (
        signalingState === "stable" ||
        signalingState === "have-local-offer"
      ) {
        await connection.setRemoteDescription(data.offer);
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);
        secureBroadcast({
          type: "answer",
          answer,
          connectionId: connection.id,
        });
      } else {
        console.warn("Received offer in state", signalingState, "- ignoring");
      }
    } else if (data.type === "answer") {
      if (signalingState === "have-local-offer") {
        await connection.setRemoteDescription(data.answer);
      } else {
        console.warn("Received answer in state", signalingState, "- ignoring");
      }
    } else if (data.type === "candidate") {
      try {
        await connection.addIceCandidate(data.candidate);
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
    // Close all connections and clear the object.
    Object.values(connections.current).forEach((conn) => conn.close());
    connections.current = {};
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

  return {
    selfWatch,
    setSelfWatch,
    localVideoRef,
    remoteStreams,
    beepAudioRef,
    setMuted,
    muted,
    setCameraOn,
    cameraOn,
    cleanup,
  };
}
