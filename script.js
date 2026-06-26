// Connect to backend
const socket = io('http://localhost:5000');

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const captionDiv = document.getElementById('caption');

let localStream = null;
let peerConnection = null;
let currentRoom = null;

// Configuration for WebRTC
const config = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

// Start camera and microphone
async function startChat() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 1280, height: 720 }, 
            audio: true 
        });
        localVideo.srcObject = localStream;
        socket.emit('findMatch');
        console.log("Camera started. Looking for match...");
    } catch (err) {
        console.error("Error accessing media:", err);
        alert("Cannot access camera or microphone. Please allow permission.");
    }
}

// Create WebRTC Peer Connection
function createPeerConnection() {
    peerConnection = new RTCPeerConnection(config);

    // Add local tracks
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // Handle remote stream
    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };

    // ICE candidate handling
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('signal', {
                room: currentRoom,
                candidate: event.candidate
            });
        }
    };
}

// Handle signaling
socket.on('matchFound', (data) => {
    currentRoom = data.room;
    createPeerConnection();

    if (data.partnerId) {
        peerConnection.createOffer()
            .then(offer => {
                peerConnection.setLocalDescription(offer);
                socket.emit('signal', { room: currentRoom, offer: offer });
            });
    }
});

socket.on('signal', async (data) => {
    if (!peerConnection) createPeerConnection();

    if (data.offer) {
        await peerConnection.setRemoteDescription(data.offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('signal', { room: currentRoom, answer: answer });
    } else if (data.answer) {
        await peerConnection.setRemoteDescription(data.answer);
    } else if (data.candidate) {
        await peerConnection.addIceCandidate(data.candidate);
    }
});

// Next stranger
function nextStranger() {
    if (peerConnection) {
        peerConnection.close();
    }
    remoteVideo.srcObject = null;
    socket.emit('findMatch');
    captionDiv.textContent = "Finding new stranger...";
}

// Toggle Mute
function toggleMute() {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            alert(audioTrack.enabled ? "🎤 Unmuted" : "🔇 Muted");
        }
    }
}

// Toggle Video
function toggleVideo() {
    if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            alert(videoTrack.enabled ? "📹 Video On" : "📴 Video Off");
        }
    }
}

// Open Settings (we'll improve this later)
function openSettings() {
    alert("⚙️ Settings Menu\n\nHigh Resolution, Filters, and more coming soon!");
}

// Live Transcription (Browser-based)
function startTranscription() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        captionDiv.textContent = "Transcription not supported in this browser. Try Chrome.";
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
        }
        captionDiv.textContent = transcript || "Listening...";
    };

    recognition.onerror = (e) => console.error(e);
    recognition.start();
}

// Auto-start transcription
window.onload = () => {
    setTimeout(startTranscription, 1500);
};
