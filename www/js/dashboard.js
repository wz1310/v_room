document.addEventListener("DOMContentLoaded", () => {
  const burgerBtn = document.getElementById("burgerBtn");
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const logoutBtn = document.querySelector(".logout");
  const userData = JSON.parse(localStorage.getItem("user"));
  const user = localStorage.getItem("user");
  
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
