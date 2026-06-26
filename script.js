// Get video elements
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const captionDiv = document.getElementById('caption');

let localStream = null;
let peerConnection = null;

// Start camera and mic
async function startChat() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 1280, height: 720 }, 
            audio: true 
        });
        localVideo.srcObject = localStream;
        alert("Camera started! Ready to connect.");
    } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Could not access camera or microphone");
    }
}

// Next stranger button
function nextStranger() {
    alert("Next stranger feature coming soon...");
}

// Toggle mute
function toggleMute() {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        audioTrack.enabled = !audioTrack.enabled;
        alert(audioTrack.enabled ? "Unmuted" : "Muted");
    }
}

// Toggle video
function toggleVideo() {
    if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        videoTrack.enabled = !videoTrack.enabled;
        alert(videoTrack.enabled ? "Video On" : "Video Off");
    }
}

// Settings
function openSettings() {
    alert("Settings menu - Resolution, Filters, and more coming soon...");
}

// Live Transcription (using browser's built-in speech recognition)
function startTranscription() {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
        captionDiv.textContent = "Transcription not supported in this browser";
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results [0].transcript;
        }
        captionDiv.textContent = transcript;
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error', event);
    };

    recognition.start();
}

// Auto start transcription when page loads
window.onload = () => {
    setTimeout(() => {
        startTranscription();
    }, 2000);
};
