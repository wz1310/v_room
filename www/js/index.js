document.addEventListener("deviceready", onDeviceReady, false);

function onDeviceReady() {
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

    const username = loginForm.querySelector('input[type="text"]').value;
    const password = passwordInput.value;

    const SERVER_URL = "http://localhost:3000/api/login";

    fetch(SERVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          localStorage.setItem("user", JSON.stringify(data.user));
          window.location.href = "dashboard.html";
        } else {
          alert(data.message);
        }
      })
      .catch((error) => {
        alert("Koneksi gagal! Pastikan server aktif.");
      });
  });
}
