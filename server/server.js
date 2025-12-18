const express = require("express");
const cors = require("cors");
const fs = require("fs"); // Tambahkan ini
const path = require("path"); // Tambahkan ini
const app = express();

app.use(cors());
app.use(express.json());

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  // 1. Baca file data.json
  const filePath = path.join(__dirname, "data", "data.json");

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      return res
        .status(500)
        .json({ success: false, message: "Gagal membaca database" });
    }

    // 2. Ubah string JSON menjadi Array Object
    const users = JSON.parse(data);

    // 3. Cari user yang cocok
    const user = users.find(
      (u) => u.username === username && u.password === password
    );

    if (user) {
      // Jika ketemu, kirim data sukses (kecuali password)
      res.json({
        success: true,
        message: "Login Berhasil",
        user: {
          nama: user.nama,
          handle: user.handle,
          id: user.id,
        },
      });
    } else {
      // Jika tidak ketemu
      res.status(401).json({
        success: false,
        message: "Username atau password salah!",
      });
    }
  });
});

// 1. Endpoint GET untuk mengambil daftar room
app.get("/api/rooms", (req, res) => {
  const roomFilePath = path.join(__dirname, "data", "room.json");

  fs.readFile(roomFilePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error baca file:", err);
      return res
        .status(500)
        .json({ success: false, message: "Gagal membaca data room" });
    }
    res.json(JSON.parse(data));
  });
});

// 2. Endpoint POST untuk menambah room baru (ID otomatis)
app.post("/api/rooms", (req, res) => {
  const roomFilePath = path.join(__dirname, "data", "room.json");
  const newRoom = req.body;

  fs.readFile(roomFilePath, "utf8", (err, data) => {
    if (err)
      return res.status(500).json({ success: false, message: "Server error" });

    let rooms = JSON.parse(data);

    // Logika ID otomatis
    const lastId = rooms.length > 0 ? rooms[rooms.length - 1].id : 0;
    newRoom.id = lastId + 1;
    newRoom.listeners = "0"; // Default pendengar baru

    rooms.push(newRoom);

    fs.writeFile(roomFilePath, JSON.stringify(rooms, null, 2), (err) => {
      if (err)
        return res
          .status(500)
          .json({ success: false, message: "Gagal simpan" });
      res.json({ success: true, room: newRoom });
    });
  });
});

app.listen(3000, () => console.log("Server berjalan di port 3000"));
