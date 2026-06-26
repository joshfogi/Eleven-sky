const socket = io('http://localhost:5000');

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const captionDiv = document.getElementById('caption');
const messagesDiv = document.getElementById('messages');
const chatInput = document.getElementById('chatInput');

let localStream = null;
let peerConnection = null;
let currentRoom = null;
let isTranscriptionOn = true;
let currentFacingMode = 'user';

const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

async function startChat() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 1280, height: 720, facingMode: currentFacingMode }, 
            audio: true 
        });
        localVideo.srcObject = localStream;
        socket.emit('findMatch');
        captionDiv.textContent = "Finding a stranger...";
    } catch (e) {
        alert("Camera/Microphone access denied");
    }
}

function createPeerConnection() {
    peerConnection = new RTCPeerConnection(config);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.ontrack = e => remoteVideo.srcObject = e.streams[0];
    peerConnection.onicecandidate = e => {
        if (e.candidate) socket.emit('signal', { room: currentRoom, candidate: e.candidate });
    };
}

socket.on('matchFound', data => {
    currentRoom = data.room;
    createPeerConnection();
    if (data.partnerId) {
        peerConnection.createOffer().then(offer => {
            peerConnection.setLocalDescription(offer);
            socket.emit('signal', { room: currentRoom, offer });
        });
    }
});

socket.on('signal', async data => {
    if (!peerConnection) createPeerConnection();
    if (data.offer) {
        await peerConnection.setRemoteDescription(data.offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('signal', { room: currentRoom, answer });
    } else if (data.answer) {
        await peerConnection.setRemoteDescription(data.answer);
    } else if (data.candidate) {
        await peerConnection.addIceCandidate(data.candidate);
    }
});

// Text Chat
chatInput.addEventListener('keypress', e => {
    if (e.key === 'Enter' && chatInput.value.trim()) {
        const msg = chatInput.value;
        socket.emit('chatMessage', { room: currentRoom, message: msg });
        addMessage("You: " + msg, 'right');
        chatInput.value = '';
    }
});

socket.on('chatMessage', data => {
    addMessage("Stranger: " + data.message, 'left');
});

function addMessage(text, side) {
    const div = document.createElement('div');
    div.textContent = text;
    div.style.textAlign = side;
    div.style.background = side === 'right' ? '#00ff9d' : '#333';
    div.style.color = side === 'right' ? '#000' : '#fff';
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Controls
function toggleMute() {
    if (localStream) localStream.getAudioTracks()[0].enabled = !localStream.getAudioTracks()[0].enabled;
}

function toggleVideo() {
    if (localStream) localStream.getVideoTracks()[0].enabled = !localStream.getVideoTracks()[0].enabled;
}

async function flipCamera() {
    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
    }
    startChat();
}

function openSettings() {
    document.getElementById('settingsModal').style.display = 'block';
}

function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
}

function toggleTheme() {
    document.body.style.background = document.body.style.background === '#0a0a14' ? '#f0f0f0' : '#0a0a14';
}

function toggleTranscription() {
    isTranscriptionOn = !isTranscriptionOn;
    alert("Transcription " + (isTranscriptionOn ? "ON" : "OFF"));
}

function startRecording() {
    alert("Recording started (demo)");
}

function logout() {
    if (peerConnection) peerConnection.close();
    location.reload();
}

// Transcription
function startTranscription() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = e => {
        if (!isTranscriptionOn) return;
        let text = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
            text += e.results[i][0].transcript + ' ';
        }
        captionDiv.textContent = text.trim() || "Listening...";
    };
    rec.start();
}

window.onload = () => {
    setTimeout(startTranscription, 1500);
};
