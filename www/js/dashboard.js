document.addEventListener("DOMContentLoaded", () => {
  const burgerBtn = document.getElementById("burgerBtn");
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const logoutBtn = document.querySelector(".logout");
  const userData = JSON.parse(localStorage.getItem("user"));
  const user = localStorage.getItem("user");
  const roomGrid = document.querySelector(".room-grid");
  const BASE_URL = "https://m3h048qq-3000.asse.devtunnels.ms";
  const addBtn = document.getElementById("addBtn");
  const modal = document.getElementById("addRoomModal");
  const closeModal = document.querySelector(".close-modal");
  const addRoomForm = document.getElementById("addRoomForm");

  // Buka Modal
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      modal.style.display = "block";
    });
  }

  // Tutup Modal via tombol X
  if (closeModal) {
    closeModal.addEventListener("click", () => {
      modal.style.display = "none";
    });
  }

  // Tutup Modal jika klik di luar kotak modal
  window.addEventListener("click", (event) => {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  });

  // Handle Form Submit
  // Handle Form Submit
  if (addRoomForm) {
    addRoomForm.addEventListener("submit", (e) => {
      e.preventDefault();

      // 1. Ambil data dari input
      const roomData = {
        title: document.getElementById("roomTitle").value,
        category: document.getElementById("roomCategory").value,
        host: userData ? userData.nama : "Anonim", // Mengambil nama dari localStorage
      };

      // 2. Kirim ke Server
      fetch(`${BASE_URL}/api/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(roomData),
      })
        .then((response) => {
          if (!response.ok) throw new Error("Gagal menyimpan ke server");
          return response.json();
        })
        .then((result) => {
          if (result.success) {
            modal.style.display = "none"; // Tutup modal
            addRoomForm.reset(); // Reset input form
            loadRooms(); // Panggil fungsi refresh list room
            const newRoomId = result.room.id;
            window.location.href = `room.html?id=${newRoomId}`;
          }
        })
        .catch((error) => {
          console.error("Error:", error);
          alert("Terjadi kesalahan saat menyimpan data.");
        });
    });
  }

  function loadRooms() {
    fetch(`${BASE_URL}/api/rooms`)
      .then((res) => res.json())
      .then((rooms) => {
        const roomGrid = document.querySelector(".room-grid");
        roomGrid.innerHTML = ""; // Kosongkan list lama

        rooms.forEach((room) => {
          roomGrid.innerHTML += `
    <div class="room-card" data-room-id="${room.id}">
      <div class="room-thumb"></div>
      <div class="room-details">
        <h3>${room.title}</h3>
        <div class="room-info">
          <span>${room.host}</span>
          <span class="listeners">🎧 ${room.listeners || 0}</span>
        </div>
      </div>
    </div>`;
        });
        document.querySelectorAll(".room-card").forEach((card) => {
          card.addEventListener("click", () => {
            const roomId = card.getAttribute("data-room-id");
            window.location.href = `room.html?id=${roomId}`;
          });
        });
      })
      .catch((err) => console.error("Gagal load rooms:", err));
  }

  // Panggil saat pertama kali buka dashboard
  loadRooms();

  if (!user) {
    // Jika tidak ada data user, tendang balik ke login
    window.location.href = "index.html";
  }

  if (userData) {
    // Update nama di sidebar (sesuaikan dengan selector di HTML kamu)
    const brandTitle = document.querySelector(".brand h1");
    const brandHandle = document.querySelector(".brand p");

    if (brandTitle) brandTitle.innerText = userData.nama;
    if (brandHandle) brandHandle.innerText = userData.handle;
  }

  if (burgerBtn && sidebar && overlay) {
    const toggleSidebar = () => {
      sidebar.classList.toggle("active");
      overlay.classList.toggle("active");
    };

    burgerBtn.addEventListener("click", toggleSidebar);
    overlay.addEventListener("click", toggleSidebar);

    // Tutup jika menu diklik
    const menuLinks = document.querySelectorAll(".menu a");
    menuLinks.forEach((link) => {
      link.addEventListener("click", () => {
        sidebar.classList.remove("active");
        overlay.classList.remove("active");
      });
    });
  }
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      console.log("kkkkkkkkkkkkkkk");
      // 1. Hapus data user dari penyimpanan lokal (jika ada)
      localStorage.removeItem("user");

      // 2. Tampilkan pesan konfirmasi (opsional)
      console.log("User logged out");

      // 3. Arahkan kembali ke halaman login
      // Karena dashboard.html dan index.html sejajar di folder www
      window.location.href = "index.html";
    });
  }
});
