import { areSetAndTheSameType } from "are-set";
import { useEffect, useRef, useState } from "react";

export default function CallView({ isCalling, broadcast, onBroadCast, exit }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  // Store peer connections by peerId
  const peerConnectionsRef = useRef({});
  const [selfWatch, setSelfWatch] = useState(true);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [localStream, setLocalStream] = useState(null);

  // Handle incoming signaling messages with added logs.
  useEffect(() => {
    const handleSignalingData = async (data) => {
      console.log("Received signaling data:", data);
      if (!areSetAndTheSameType(data, [["type", "string"]])) {
        console.warn("Invalid signaling data", data);
        return;
      }
      const { type, peerId, sdp, candidate } = data;
      if (!peerId) {
        console.warn("No peerId provided in signaling data", data);
        return;
      }
      let pc = peerConnectionsRef.current[peerId];

      if (type === "offer") {
        console.log("Received offer from peer:", peerId);
        // If we don’t have a connection for this peer, create one.
        if (!pc) {
          pc = createPeerConnection(peerId);
          peerConnectionsRef.current[peerId] = pc;
          console.log("Created new peer connection for", peerId);
        }
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          console.log("Set remote description for", peerId);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          console.log("Created and set local answer for", peerId);
          broadcast({
            type: "answer",
            peerId,
            sdp: pc.localDescription,
          });
          console.log("Broadcasted answer for", peerId);
        } catch (error) {
          console.error("Error handling offer from", peerId, error);
        }
      } else if (type === "answer") {
        console.log("Received answer from peer:", peerId);
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            console.log("Set remote description for answer from", peerId);
          } catch (error) {
            console.error("Error handling answer from", peerId, error);
          }
        } else {
          console.warn("No peer connection for answer from", peerId);
        }
      } else if (type === "candidate") {
        console.log("Received ICE candidate from peer:", peerId);
        if (pc && candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
            console.log("Added ICE candidate for", peerId);
          } catch (error) {
            console.error("Error adding ICE candidate from", peerId, error);
          }
        }
      }
    };

    onBroadCast(handleSignalingData);
  }, [onBroadCast, broadcast]);

  // When isCalling becomes true, get local media and start signaling.
  useEffect(() => {
    let active = true;
    const startCall = async () => {
      console.log("Starting call, requesting media...");
      try {
        // Request both audio and video.
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        if (!active) return;
        setLocalStream(stream);
        console.log("Local media stream obtained:", stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        // Notify others that we started the call.
        broadcast({ type: "call-started", peerId: "local" });
        console.log("Broadcasted call-started");
      } catch (error) {
        console.error("Error accessing media devices.", error);
      }
    };

    if (isCalling) {
      startCall();
    } else {
      console.log("Not calling. Cleaning up connections and streams.");
      cleanup();
    }

    return () => {
      active = false;
      cleanup();
    };
  }, [isCalling, broadcast]);

  // Create a new RTCPeerConnection for a given peerId.
  const createPeerConnection = (peerId) => {
    console.log("Creating RTCPeerConnection for peer:", peerId);
    const pc = new RTCPeerConnection();

    // Add local tracks to the connection.
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
      console.log("Added local tracks to peer connection for", peerId);
    } else {
      console.warn(
        "No local stream available when creating connection for",
        peerId
      );
    }

    // Send any ICE candidates to the remote peer.
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("ICE candidate generated for", peerId, event.candidate);
        broadcast({
          type: "candidate",
          peerId,
          candidate: event.candidate,
        });
      }
    };

    // When a remote track is received, attach it to the remote video element.
    pc.ontrack = (event) => {
      console.log("Remote track received from", peerId, event.streams);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("Connection state change for", peerId, pc.connectionState);
    };

    return pc;
  };

  // Cleanup all peer connections and stop the local media stream.
  const cleanup = () => {
    console.log("Cleaning up all peer connections and local stream");
    // Close all peer connections.
    Object.values(peerConnectionsRef.current).forEach((pc) => {
      console.log("Closing connection", pc);
      pc.close();
    });
    peerConnectionsRef.current = {};

    // Stop all local media tracks.
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        console.log("Stopping track:", track);
        track.stop();
      });
      setLocalStream(null);
    }
  };

  // Update the enabled state of tracks when mute or camera settings change.
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
        console.log("Audio track enabled:", track.enabled);
      });
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = cameraOn;
        console.log("Video track enabled:", track.enabled);
      });
    }
  }, [muted, cameraOn, localStream]);

  const handleMute = () => {
    console.log("Toggling mute, new state:", !muted);
    setMuted((prev) => !prev);
  };

  const handleCamera = () => {
    console.log("Toggling camera, new state:", !cameraOn);
    setCameraOn((prev) => !prev);
  };

  return (
    <div className={"call-view " + (!isCalling ? "hidden-call-view" : "")}>
      <div className="video-container">
        <video
          className={selfWatch ? "big" : "small"}
          onClick={() => {
            console.log("Switching self-watch off");
            setSelfWatch((o) => !o);
          }}
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
        />
        <video
          tabIndex={-1}
          className={!selfWatch ? "big" : "small"}
          onClick={() => {
            console.log("Switching self-watch on");
            setSelfWatch((o) => !o);
          }}
          ref={remoteVideoRef}
          autoFocus
          autoPlay
          playsInline
        />
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
