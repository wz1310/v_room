document.addEventListener("deviceready", onDeviceReady, false);

function onDeviceReady() {
  const BASE_URL = "https://m3h048qq-3000.asse.devtunnels.ms";
  const loginForm = document.getElementById("loginForm");
  const passwordInput = loginForm.querySelector('input[type="password"]');

  // Tambahkan tombol mata di HTML kamu dengan class .toggle-password
  const toggleBtn = document.querySelector(".toggle-password");

  // --- FITUR SHOW/HIDE PASSWORD ---
  if (toggleBtn) {
    toggleBtn.addEventListener("click", function () {
      // Ubah tipe input antara 'password' dan 'text'
      const type =
        passwordInput.getAttribute("type") === "password" ? "text" : "password";
      passwordInput.setAttribute("type", type);

      // Opsional: ganti icon jika kamu menggunakan icon
      this.textContent = type === "password" ? "👁️" : "🙈";
    });
  }

  // --- FITUR LOGIN ---
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    // Ambil elemen loading
    const loadingOverlay = document.getElementById("loadingOverlay");

    // TAMPILKAN LOADING
    loadingOverlay.style.display = "flex";

    const username = loginForm.querySelector('input[type="text"]').value;
    const password = passwordInput.value;

    const SERVER_URL = `${BASE_URL}/api/login`;

    fetch(SERVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          localStorage.setItem("user", JSON.stringify(data.user));
          // Minta izin mic sebelum pindah halaman
          navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then((stream) => {
              console.log("Akses mic diberikan");
              // Hentikan stream sementara karena kita hanya butuh izinnya dulu
              stream.getTracks().forEach((track) => track.stop());
              // SEMBUNYIKAN LOADING sebelum pindah halaman
              loadingOverlay.style.display = "none";
              window.location.href = "dashboard.html";
            })
            .catch((err) => {
              alert("Aplikasi butuh akses microphone untuk fitur voice room!");
              window.location.href = "dashboard.html"; // Tetap pindah atau blokir sesuai keinginan
            });
        } else {
          // SEMBUNYIKAN LOADING jika gagal login
          loadingOverlay.style.display = "none";
          alert(data.message);
        }
      })
      .catch((error) => {
        // SEMBUNYIKAN LOADING jika koneksi server mati
        loadingOverlay.style.display = "none";
        alert("Koneksi gagal! Pastikan server aktif.");
      });
  });
}
