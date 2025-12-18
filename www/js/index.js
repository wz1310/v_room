document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    console.log('Running cordova-' + cordova.platformId + '@' + cordova.version);

    // Ambil elemen form berdasarkan ID yang kita buat tadi
    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            // Mencegah halaman refresh otomatis
            e.preventDefault();

            console.log('Proses Login...');

            // Navigasi ke dashboard.html
            // Karena index.html dan dashboard.html berada di level yang sama (folder www),
            // cukup panggil nama filenya saja.
            window.location.href = 'dashboard.html';
        });
    }
}