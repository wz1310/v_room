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
let currentSlotIndex = null; // Melacak slot mana yang sedang ditempati user ini

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

socket.on("room_user_count", ({ count }) => {
  const onlineEl = document.getElementById("onlineCount");
  if (onlineEl) {
    onlineEl.innerText = `${count} Online`;
  }
});
// Listener untuk menerima status mic dari server
socket.on("mic_status_updated", ({ slotIndex, isMuted }) => {
  const slots = document.querySelectorAll(".speaker-item");
  const targetSlot = slots[slotIndex];

  if (targetSlot) {
    const micBadge = targetSlot.querySelector(".mic-badge");
    const micIcon = micBadge.querySelector("span");

    if (isMuted) {
      micBadge.classList.add("muted-red");
      micIcon.innerText = "mic_off"; // Ganti icon jadi mic mati
    } else {
      micBadge.classList.remove("muted-red");
      micIcon.innerText = "mic"; // Kembali ke icon mic aktif
    }
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get("id");
  const titleElement = document.getElementById("roomDisplayTitle");
  const idElement = document.getElementById("roomDisplayId");
  // Tambahkan di dalam document.addEventListener("DOMContentLoaded", ...)
  const chatInput = document.getElementById("chatInput");
  const btnSend = document.getElementById("btnSend");
  const chatMessages = document.getElementById("chatMessages");

  // Fungsi Kirim Pesan
  function sendMessage() {
    const message = chatInput.value.trim();
    if (message && userData) {
      socket.emit("send_message", {
        roomId: roomId,
        userId: userData.id,
        username: userData.nama,
        message: message,
      });
      chatInput.value = ""; // Kosongkan input
    }
  }

  // Event Klik Tombol
  btnSend.addEventListener("click", sendMessage);

  // Event Tekan Enter
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  // Listener pesan masuk dari server
  socket.on("receive_message", (data) => {
    const isSelf = data.userId === userData.id;

    // tambah avatar <div class="chat-avatar" style="background-color: #4b5563; border: 1px solid var(--border);"></div>

    const msgHTML = `
    <div class="msg-row ${isSelf ? "self" : ""}">
      
      <div class="msg-content">
        <div class="msg-meta" style="${
          isSelf ? "justify-content: flex-end" : ""
        }">
          ${isSelf ? "" : `<span class="msg-name">${data.username}</span>`}
          <span class="msg-time">${data.time}</span>
          ${isSelf ? `<span class="msg-name">You</span>` : ""}
        </div>
        <div class="msg-bubble">
          ${data.message}
        </div>
      </div>
    </div>
  `;

    chatMessages.insertAdjacentHTML("beforeend", msgHTML);

    // Auto scroll ke bawah
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });

  // Di dalam document.addEventListener("DOMContentLoaded", ...)
  document.querySelector(".btn-leave").addEventListener("click", () => {
    // Jika user sedang di panggung (slot), kirim perintah hapus
    if (currentSlotIndex !== null) {
      socket.emit("leave_slot", { roomId, slotIndex: currentSlotIndex });
    }

    // Berikan jeda sangat singkat agar emit terkirim, lalu disconnect
    setTimeout(() => {
      socket.disconnect();
      window.location.href = "dashboard.html";
    }, 100);
  });

  // PANGGIL DI SINI agar listener klik mic aktif
  setupMicBadgeToggle();

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
        const hostNameEl = document.getElementById("hostName");
        if (hostNameEl) {
          hostNameEl.innerText = currentRoom.host;
        }

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

  // Jika Host, langsung aktifkan mic
  if (isHost) {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    setupVoiceIndicator(localStream);
  } else {
    // Jika Pendengar, panggil fungsi untuk setup klik slot
    setupSpeakerSlots();
  }
}

function setupSpeakerSlots() {
  const slots = document.querySelectorAll(".speaker-item");

  slots.forEach((slot, index) => {
    slot.addEventListener("click", async function () {
      if (isHost) return;

      // LOGIKA TURUN PANGGUNG: Jika klik slot yang sedang ditempati sendiri
      if (currentSlotIndex === index) {
        if (localStream) {
          localStream.getTracks().forEach((track) => track.stop()); // Matikan mic
          localStream = null;
        }

        socket.emit("leave_slot", { roomId, slotIndex: index });
        currentSlotIndex = null;
        console.log("Anda telah turun dari panggung.");
        return;
      }

      // LOGIKA NAIK PANGGUNG: Jika belum punya slot dan klik slot kosong
      if (localStream) return; // Mencegah pindah-pindah slot tanpa turun dulu

      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        currentSlotIndex = index;

        socket.emit("occupy_slot", {
          roomId,
          slotIndex: index,
          user: userData,
        });
      } catch (err) {
        console.error("Gagal akses mic:", err);
      }
    });
  });
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

socket.on("slot_cleared", ({ slotIndex }) => {
  const slots = document.querySelectorAll(".speaker-item");
  const targetSlot = slots[slotIndex];

  if (targetSlot) {
    // Kembalikan tampilan ke default (contoh: 'Empty Slot')
    targetSlot.querySelector(".speaker-name").innerText = "";
    targetSlot.querySelector(".mic-badge").classList.add("muted");
    targetSlot.querySelector(".mic-badge span").innerText = "mic_off";

    // Opsional: Jika Host, hapus peer connection dari user yang turun jika perlu
    // Namun biasanya WebRTC akan mendeteksi track terputus secara otomatis
  }
});

socket.on("webrtc-answer", async ({ answer, fromSocketId }) => {
  const pc = peerConnections[fromSocketId];
  if (!pc) return;

  await pc.setRemoteDescription(answer);
});

socket.on("webrtc-offer", async ({ offer, fromSocketId }) => {
  if (isHost) return;

  const pc = new RTCPeerConnection({ iceServers: iceServersGlobal });
  peerConnections[fromSocketId] = pc;

  // --- TAMBAHKAN BAGIAN INI ---
  // Jika User 2 sudah klik slot (punya localStream), masukkan ke koneksi
  if (localStream) {
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });
  }
  // ----------------------------

  pc.ontrack = (event) => {
    // Logika pendengar mendengar suara host (sudah ada di kode anda)
    const audio = document.createElement("audio");
    audio.srcObject = event.streams[0];
    audio.autoplay = true;
    audio.playsInline = true;
    document.body.appendChild(audio);
  };

  // ... (sisa kode ice candidate dan answer tetap sama)
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

  // --- TAMBAHKAN BAGIAN INI ---
  // Agar Host bisa mendengar suara dari User 2
  pc.ontrack = (event) => {
    console.log("🎤 Menerima stream suara dari pembicara...");
    let audio = document.getElementById(`audio-${peerSocketId}`);
    if (!audio) {
      audio = document.createElement("audio");
      audio.id = `audio-${peerSocketId}`;
      audio.autoplay = true;
      audio.playsInline = true;
      document.body.appendChild(audio);
    }
    audio.srcObject = event.streams[0];
  };
  // ----------------------------

  // Tetap kirim suara Host ke User 2 jika localStream ada
  if (localStream) {
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });
  }

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

// Listener untuk Host: Jika ada yang klik slot, Host buat koneksi baru untuk dengar user tsb
socket.on("request_to_speak", ({ socketId }) => {
  if (isHost) {
    createOfferForPeer(socketId);
  }
});
socket.on("slot_updated", async ({ slotIndex, user }) => {
  const slots = document.querySelectorAll(".speaker-item");
  const targetSlot = slots[slotIndex];

  if (targetSlot) {
    // 1. Update Nama di UI (berlaku untuk semua user di room)
    targetSlot.querySelector(".speaker-name").innerText = user.nama;
    targetSlot.querySelector(".mic-badge").classList.remove("muted");
    targetSlot.querySelector(".mic-badge span").innerText = "mic";

    // 2. Logika Suara: Jika saya adalah Host, saya buat koneksi ke user tersebut
    if (isHost) {
      console.log(`Menyambungkan suara ke pembicara baru: ${user.nama}`);
      createOfferForPeer(user.socketId);
    }
  }
});
function setupMicBadgeToggle() {
  const slots = document.querySelectorAll(".speaker-item");

  slots.forEach((slot, index) => {
    const micBadge = slot.querySelector(".mic-badge");

    micBadge.addEventListener("click", (e) => {
      e.stopPropagation(); // Agar tidak memicu event klik pada slot (turun panggung)

      // Hanya user yang menempati slot tersebut yang bisa mute dirinya sendiri
      if (currentSlotIndex !== index || !localStream) return;

      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        // Balikkan status enabled (jika true jadi false, dst)
        audioTrack.enabled = !audioTrack.enabled;
        const isMuted = !audioTrack.enabled;

        // Beritahu server
        socket.emit("toggle_mic", { roomId, slotIndex: index, isMuted });
      }
    });
  });
}
