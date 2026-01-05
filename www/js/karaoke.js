const BASE_URL = "https://m3h048qq-3000.asse.devtunnels.ms";

// Tunggu hingga DOM selesai dimuat
document.addEventListener("DOMContentLoaded", () => {
  const backBtn = document.getElementById("back_btn");
  const socket = io(BASE_URL);

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      // Mengarahkan pengguna kembali ke dashboard.html
      window.location.href = "dashboard.html";
    });
  }
  // Di dalam karaoke.js, cari bagian tombol pilih lagu:
  const pilihLaguBtn = document.getElementById("pilih_lagu_btn");
  if (pilihLaguBtn) {
    pilihLaguBtn.addEventListener("click", () => {
      const urlParams = new URLSearchParams(window.location.search);
      const roomId = urlParams.get("id");

      if (roomId) {
        window.location.href = `song.html?roomId=${roomId}`;
      } else {
        alert("Error: Anda tidak berada dalam Room yang valid!");
      }
    });
  }

  async function closeSong() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get("id"); // Sesuaikan dengan parameter URL Anda (id atau roomId)

    // if (!confirm("Apakah Anda ingin mengakhiri lagu ini?")) return;

    try {
      const response = await fetch(`${BASE_URL}/api/choose-song/${roomId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Refresh halaman atau kembalikan UI secara manual
        location.reload();
      }
    } catch (err) {
      console.error("Gagal menghapus lagu:", err);
    }
  }
  // karaoke.js - Tambahkan/Update fungsi ini

  function updatePlayerUI(songTitle) {
    const playerCard = document.querySelector(".player-card");

    // Ganti isi player-card sesuai gambar Anda
    playerCard.innerHTML = `
      <div class="grid-pattern"></div>
      <button class="close-btn" id="close_song_btn">
          <span class="material-icons-round">close</span>
      </button>
      <div class="player-content" style="text-align: center; color: white;">
          <h2 style="margin: 20px 0; font-size: 24px;">${songTitle}</h2>
          <div class="play-btn-container" style="display: flex; justify-content: center; align-items: center;">
              <div style="width: 80px; height: 80px; background: white; border-radius: 50%; display: flex; justify-content: center; align-items: center; cursor: pointer;">
                  <span class="material-icons-round" style="color: #2a1a5e; font-size: 50px;">play_arrow</span>
              </div>
          </div>
      </div>
  `;
    // Tambahkan event listener setelah element dibuat
    document
      .getElementById("close_song_btn")
      .addEventListener("click", closeSong);
  }
  // Tambahkan listener socket untuk sinkronisasi antar user
  socket.on("song_removed", () => {
    // Jika ada user lain yang menutup lagu, halaman user ini ikut refresh
    location.reload();
  });

  // Dengarkan event dari socket
  socket.on("song_selected", (data) => {
    updatePlayerUI(data.title);
  });

  // 1. Definisikan Fungsi
  async function checkCurrentSong() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get("id");

    if (!roomId) return;

    try {
      const res = await fetch(`${BASE_URL}/api/karaoke-list`);
      const list = await res.json();

      // Cari lagu berdasarkan roomId yang aktif di URL
      const current = list.find((s) => s.roomId == roomId);

      if (current) {
        // Panggil fungsi untuk merubah UI (Hide "Tidak ada lagu", Show "Judul Lagu")
        updatePlayerUI(current.title);
      }
    } catch (e) {
      console.error("Gagal memuat lagu:", e);
    }
  }

  // 2. JALANKAN LANGSUNG saat halaman dibuka
  checkCurrentSong();
});
