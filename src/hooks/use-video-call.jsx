import { useEffect, useRef, useState, useMemo } from "react";
import {
  deriveKey,
  encryptData,
  decryptData,
} from "../comp/call-view/encryption";

export default function useVideoCall({
  isCalling,
  broadcast,
  onBroadcast,
  password,
}) {
  const localVideoRef = useRef(null);
  const [participants, setParticipants] = useState({});
  const connections = useRef({});
  const localStream = useRef(null);
  const userId = useRef(null);
  const [selfWatch, setSelfWatch] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [cryptoKey, setCryptoKey] = useState(null);
  const beepAudioRef = useRef(null);
  const beepIntervalRef = useRef(null);

  const remoteStreams = useMemo(
    () => Object.values(participants).filter((stream) => stream !== null),
    [participants],
  );

  useEffect(() => {
    if (password) {
      deriveKey(password).then(setCryptoKey).catch(console.error);
    }
  }, [password]);

  const createPeerConnection = (targetUserId) => {
    const connection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    connections.current[targetUserId] = connection;

    connection.ontrack = (event) => {
      const newStream = event.streams[0];
      setParticipants((prev) => ({ ...prev, [targetUserId]: newStream }));
      if (beepAudioRef.current)
        beepAudioRef.current.play().catch(console.error);
    };

    connection.onicecandidate = (event) => {
      if (event.candidate) {
        secureBroadcast({
          type: "candidate",
          candidate: event.candidate,
          from: userId.current,
          dest: targetUserId,
        });
      }
    };

    connection.onconnectionstatechange = () => {
      if (
        ["closed", "failed", "disconnected"].includes(
          connection.connectionState,
        )
      ) {
        delete connections.current[targetUserId];
        setParticipants((prev) => {
          const updated = { ...prev };
          delete updated[targetUserId];
          return updated;
        });
      }
    };

    localStream.current?.getTracks().forEach((track) => {
      connection.addTrack(track, localStream.current);
    });

    return connection;
  };

  useEffect(() => {
    if (isCalling) {
      userId.current = crypto.randomUUID();

      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          localStream.current = stream;
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
          startBeepTone();
          secureBroadcast({ type: "join", userId: userId.current });
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

  useEffect(() => {
    onBroadcast(async (data) => {
      if (!cryptoKey) return;
      try {
        const decrypted = await decryptData(data.encrypted, cryptoKey);
        if (decrypted.dest && decrypted.dest !== userId.current) return;

        if (decrypted.type === "join") {
          handleJoin(decrypted.userId);
        } else if (decrypted.type === "offer") {
          handleOffer(decrypted);
        } else if (decrypted.type === "answer") {
          handleAnswer(decrypted);
        } else if (decrypted.type === "candidate") {
          handleCandidate(decrypted);
        }
      } catch (error) {
        console.error("Decryption error:", error);
      }
    });
  }, [cryptoKey, onBroadcast]);

  const handleJoin = (newUserId) => {
    if (newUserId === userId.current || connections.current[newUserId]) return;

    setParticipants((prev) => ({ ...prev, [newUserId]: null }));
    const connection = createPeerConnection(newUserId);
    createOffer(connection, newUserId);
  };

  const createOffer = async (connection, targetUserId) => {
    try {
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      secureBroadcast({
        type: "offer",
        offer,
        from: userId.current,
        dest: targetUserId,
      });
    } catch (error) {
      console.error("Offer error:", error);
    }
  };

  const handleOffer = async ({ offer, from }) => {
    if (connections.current[from]) return;

    const connection = createPeerConnection(from);
    try {
      await connection.setRemoteDescription(offer);
      const answer = await connection.createAnswer();
      await connection.setLocalDescription(answer);
      secureBroadcast({
        type: "answer",
        answer,
        from: userId.current,
        dest: from,
      });
    } catch (error) {
      console.error("Answer error:", error);
    }
  };

  const handleAnswer = async ({ answer, from }) => {
    const connection = connections.current[from];
    if (connection?.signalingState === "have-local-offer") {
      await connection.setRemoteDescription(answer);
    }
  };

  const handleCandidate = async ({ candidate, from }) => {
    const connection = connections.current[from];
    if (connection) {
      try {
        await connection.addIceCandidate(candidate);
      } catch (error) {
        console.error("Candidate error:", error);
      }
    }
  };

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
      if (beepAudioRef.current)
        beepAudioRef.current.play().catch(console.error);
    } else if (isCalling) startBeepTone();
  }, [remoteStreams]);

  const cleanup = () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    Object.values(connections.current).forEach((conn) => conn.close());
    connections.current = {};
    setParticipants({});
    stopBeepTone();
    userId.current = null;
  };

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
