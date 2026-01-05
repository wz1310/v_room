// song.js
const BASE_URL = "https://m3h048qq-3000.asse.devtunnels.ms";

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get("roomId");

  const addButtons = document.querySelectorAll(".action-btn");
  addButtons.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const row = e.target.closest("tr");
      const title = row.querySelector(".title").innerText;
      const artist = row.querySelector(".col-artist").innerText;

      // VALIDASI: Jangan kirim jika roomId tidak ada
      if (!roomId || roomId === "null") {
        alert("Error: Room ID tidak ditemukan!");
        return;
      }

      try {
        const response = await fetch(`${BASE_URL}/api/choose-song`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, title, artist }),
        });

        if (response.ok) {
          // Balik ke karaoke dengan membawa roomId kembali
          window.location.href = `karaoke.html?id=${roomId}`;
        }
      } catch (err) {
        console.error("Fetch Error:", err);
      }
    });
  });
});
