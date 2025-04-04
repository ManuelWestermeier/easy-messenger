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
