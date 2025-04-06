import { useEffect, useRef, useState } from "react";
import { deriveKey, encryptData, decryptData } from "../comp/call-view/encryption";

export default function useVideoCall({
  isCalling,
  broadcast,
  onBroadcast,
  password,
}) {
  const localVideoRef = useRef(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const connections = useRef({});
  const localStream = useRef(null);
  const [selfWatch, setSelfWatch] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [cryptoKey, setCryptoKey] = useState(null);
  const beepAudioRef = useRef(null);
  const beepIntervalRef = useRef(null);

  useEffect(() => {
    if (password) {
      deriveKey(password).then(setCryptoKey).catch(console.error);
    }
  }, [password]);

  const createPeerConnection = (stream) => {
    const connection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    connection.id = Date.now() + Math.random().toString();
    connections.current[connection.id] = connection;

    stream.getTracks().forEach((track) => connection.addTrack(track, stream));

    connection.ontrack = (event) => {
      const newStream = event.streams[0];
      setRemoteStreams((prev) => {
        if (prev.find((s) => s.id === newStream.id)) return prev;
        if (beepAudioRef.current) {
          beepAudioRef.current.play().catch(console.error);
        }
        return [...prev, newStream];
      });
    };

    connection.onicecandidate = (event) => {
      if (event.candidate) {
        secureBroadcast({
          type: "candidate",
          candidate: event.candidate,
          connectionId: connection.id,
        });
      }
    };

    connection.onconnectionstatechange = () => {
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

  useEffect(() => {
    if (isCalling) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          localStream.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
          const connection = createPeerConnection(stream);
          startCall(connection);
          startBeepTone();
        })
        .catch(console.error);
    } else {
      cleanup();
    }
    return cleanup;
  }, [isCalling, cryptoKey]);

  const secureBroadcast = async (msg) => {
    if (!cryptoKey) return;
    try {
      const encrypted = await encryptData(msg, cryptoKey);
      broadcast({ encrypted });
    } catch (error) {
      console.error("Encryption error:", error);
    }
  };

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

  const handleMessage = async (data) => {
    let connection;
    if (data.connectionId && connections.current[data.connectionId]) {
      connection = connections.current[data.connectionId];
    } else {
      connection = Object.values(connections.current)[0];
    }
    if (!connection) return;

    const signalingState = connection.signalingState;
    if (data.type === "offer") {
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
      }
    } else if (data.type === "answer") {
      if (signalingState === "have-local-offer") {
        await connection.setRemoteDescription(data.answer);
      }
    } else if (data.type === "candidate") {
      try {
        await connection.addIceCandidate(data.candidate);
      } catch (error) {
        console.error("Error adding received candidate", error);
      }
    }
  };

  function cleanup() {
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    setRemoteStreams([]);
    Object.values(connections.current).forEach((conn) => conn.close());
    connections.current = {};
    stopBeepTone();
  }

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

  const startBeepTone = () => {
    stopBeepTone();
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

  useEffect(() => {
    if (remoteStreams.length > 0) {
      stopBeepTone();
      if (beepAudioRef.current) {
        beepAudioRef.current.play().catch(console.error);
      }
    } else if (isCalling) {
      startBeepTone();
    }
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