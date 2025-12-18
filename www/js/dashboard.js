document.addEventListener("DOMContentLoaded", () => {
  const burgerBtn = document.getElementById("burgerBtn");
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  console.log("ooooooooooooooooooooooooooooo");

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
});
