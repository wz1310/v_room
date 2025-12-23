const BASE_URL = "https://m3h048qq-3000.asse.devtunnels.ms";

// Tunggu hingga DOM selesai dimuat
document.addEventListener("DOMContentLoaded", () => {
  const backBtn = document.getElementById("back_btn");

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      // Mengarahkan pengguna kembali ke dashboard.html
      window.location.href = "dashboard.html";
    });
  }
});