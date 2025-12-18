// Variabel global baru
let audioContext;
let analyser;
let microphone;
let javascriptNode;
const peerConnections = {};
let iceServersGlobal = [];
const params = new URLSearchParams(window.location.search);
const roomId = params.get("id");
let isHost = false;
const userData = JSON.parse(localStorage.getItem("user"));

// 1. Inisialisasi awal di luar agar bisa diakses fungsi lain
const socket = io("https://c1jx4415-3000.asse.devtunnels.ms", {
  transports: ["polling", "websocket"],
});
socket.on("connect", () => {
  console.log("✅ TERHUBUNG KE SERVER!");
});

socket.on("connect_error", (err) => {
  console.log("❌ Detail Error:", err.message);
  // Jika masih error, coba paksa ke polling saja sebagai tes terakhir
  if (err.message === "websocket error") {
    socket.io.opts.transports = ["polling"];
  }
});
let localStream;

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get("id");
  const titleElement = document.getElementById("roomDisplayTitle");
  const idElement = document.getElementById("roomDisplayId");
  // ... kode yang sudah ada ...
  document.querySelector(".btn-leave").addEventListener("click", () => {
    socket.disconnect();
    window.location.href = "dashboard.html";
  });

  iceServersGlobal = await connectToTwilio();
  if (iceServersGlobal) {
    console.log("Siap memulai WebRTC dengan TURN servers.");
  }

  if (!roomId) {
    alert("ID Room tidak ditemukan!");
    window.location.href = "dashboard.html";
    return;
  }

  idElement.innerText = `#${roomId}`;

  // 2. Ambil data room dari server
  fetch(`https://c1jx4415-3000.asse.devtunnels.ms/api/rooms`)
    .then((res) => res.json())
    .then((rooms) => {
      const currentRoom = rooms.find((r) => r.id == roomId);
      if (currentRoom) {
        titleElement.innerText = currentRoom.title;
        document.title = `VoiceRoom - ${currentRoom.title}`;

        // 3. JALANKAN VOICE setelah data room siap
        startVoice(roomId);
      } else {
        titleElement.innerText = "Room Tidak Ditemukan";
      }
    })
    .catch((err) => console.error("Gagal load data room:", err));
});

// Tambahkan fungsi ini di room.js
async function connectToTwilio() {
  try {
    console.log("--- Mencoba menghubungkan ke Twilio TURN Server... ---");

    const response = await fetch(
      "https://c1jx4415-3000.asse.devtunnels.ms/turn-token"
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const token = await response.json();

    // Log detail token untuk memastikan data diterima
    console.log("✅ TWILIO TERSAMBUNG!");
    console.log("ICE Servers diterima:", token.iceServers);

    return token.iceServers;
  } catch (err) {
    console.error("❌ TWILIO GAGAL TERHUBUNG:", err.message);
    return null;
  }
}

async function fetchRoomDetail() {
  const res = await fetch("https://c1jx4415-3000.asse.devtunnels.ms/api/rooms");
  const rooms = await res.json();
  const room = rooms.find((r) => r.id == roomId);

  if (!room) return;

  const userData = JSON.parse(localStorage.getItem("user"));
  isHost = userData && userData.nama === room.host;
}

// 4. Fungsi untuk meminta izin Mic dan Join Socket
async function startVoice() {
  await fetchRoomDetail();

  socket.emit("join_voice", {
    roomId,
    user: userData,
    isHost,
  });

  if (!isHost) return;

  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  setupVoiceIndicator(localStream);
}

function setupVoiceIndicator(stream) {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  microphone = audioContext.createMediaStreamSource(stream);

  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.8;

  microphone.connect(analyser);

  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  const hostGlow = document.querySelector(".host-glow");

  function animate() {
    analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }

    const average = sum / dataArray.length;

    // DEBUG LOG (lihat di console)
    // console.log("🎚️ Volume:", average);

    if (average > 5) {
      const scale = 1 + average / 80;
      hostGlow.style.transform = `scale(${scale})`;
      hostGlow.style.opacity = Math.min(average / 50, 1);
      hostGlow.style.boxShadow = `0 0 ${average}px #6366f1`;
    } else {
      hostGlow.style.transform = "scale(1)";
      hostGlow.style.opacity = "0.25";
    }

    requestAnimationFrame(animate);
  }

  animate();
}

socket.on("webrtc-answer", async ({ answer, fromSocketId }) => {
  const pc = peerConnections[fromSocketId];
  if (!pc) return;

  await pc.setRemoteDescription(answer);
});

socket.on("webrtc-offer", async ({ offer, fromSocketId }) => {
  if (isHost) return; // host tidak perlu jawab offer

  const pc = new RTCPeerConnection({ iceServers: iceServersGlobal });
  peerConnections[fromSocketId] = pc;

  pc.ontrack = (event) => {
    const audio = document.createElement("audio");
    audio.srcObject = event.streams[0];
    audio.autoplay = true;
    audio.playsInline = true;
    document.body.appendChild(audio);
  };

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit("webrtc-ice", {
        toSocketId: fromSocketId,
        candidate: e.candidate,
      });
    }
  };

  await pc.setRemoteDescription(offer);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  socket.emit("webrtc-answer", {
    toSocketId: fromSocketId,
    answer,
  });
});

socket.on("webrtc-ice", async ({ fromSocketId, candidate }) => {
  const pc = peerConnections[fromSocketId];
  if (pc && candidate) {
    await pc.addIceCandidate(candidate);
  }
});

// 6. Listener jika ada user baru bergabung setelah kita
socket.on("user_joined_voice", (data) => {
  if (isHost && !data.isHost) {
    createOfferForPeer(data.user.socketId);
  }
});
async function createOfferForPeer(peerSocketId) {
  const pc = new RTCPeerConnection({ iceServers: iceServersGlobal });
  peerConnections[peerSocketId] = pc;

  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit("webrtc-ice", {
        toSocketId: peerSocketId,
        candidate: e.candidate,
      });
    }
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  socket.emit("webrtc-offer", {
    toSocketId: peerSocketId,
    offer,
  });
}
