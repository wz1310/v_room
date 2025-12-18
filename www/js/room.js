document.addEventListener("DOMContentLoaded", () => {
  // 1. Ambil ID dari URL (contoh: room.html?id=5)
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get("id");

  const titleElement = document.getElementById("roomDisplayTitle");
  const idElement = document.getElementById("roomDisplayId");
  console.log("kkkkkkkkkkkkk");

  if (!roomId) {
    alert("ID Room tidak ditemukan!");
    window.location.href = "dashboard.html";
    return;
  }

  // Tampilkan ID di bawah judul
  idElement.innerText = `${roomId}`;

  // 2. Ambil data room dari server
  fetch(`http://localhost:3000/api/rooms`)
    .then((res) => {
      if (!res.ok) throw new Error("Gagal mengambil data");
      return res.json();
    })
    .then((rooms) => {
      // Cari data room yang ID-nya cocok
      const currentRoom = rooms.find((r) => r.id == roomId);

      if (currentRoom) {
        // GANTI judul brand-title dengan judul dari JSON
        titleElement.innerText = currentRoom.title;
        // Opsional: Ganti title browser
        document.title = `VoiceRoom - ${currentRoom.title}`;
      } else {
        titleElement.innerText = "Room Tidak Ditemukan";
      }
    })
    .catch((err) => {
      console.error("Error:", err);
      titleElement.innerText = "Error Loading Room";
    });
});
