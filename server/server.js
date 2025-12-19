const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const twilio = require("twilio");
const cors = require("cors");
const fs = require("fs"); // Tambahkan ini
const path = require("path"); // Tambahkan ini
const app = express();
const server = http.createServer(app);

// Credentials Twilio dari contohmu
const TWILIO_SID = "";
const TWILIO_AUTH = "";
const twilioClient = twilio(TWILIO_SID, TWILIO_AUTH);

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

// --- TWILIO TURN TOKEN ---
app.get("/turn-token", async (req, res) => {
  try {
    const token = await twilioClient.tokens.create();
    console.log("✅ Token Twilio berhasil dibuat untuk user"); // Tambahkan ini
    res.json(token);
  } catch (err) {
    console.error("❌ Error Twilio:", err.message); // Tambahkan ini
    res.status(500).json({ error: err.message });
  }
});

// Perbaikan inisialisasi Socket.io
const io = new Server(server, {
  path: "/socket.io/",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  allowEIO3: true,
  transports: ["polling", "websocket"], // Izinkan polling sebagai 'pintu masuk'
});
const slots = {};
const activeRooms = {};

io.on("connection", (socket) => {
  socket.on("join_voice", ({ roomId, user, isHost }) => {
    socket.join(roomId);

    // Inisialisasi room jika belum ada
    if (!activeRooms[roomId]) {
      activeRooms[roomId] = {
        hostSocketId: null,
        users: new Set(),
      };
    }

    // Simpan user
    activeRooms[roomId].users.add(socket.id);

    // Jika host, simpan socket host
    if (isHost) {
      activeRooms[roomId].hostSocketId = socket.id;
    }

    // 🔴 KIRIM JUMLAH USER TERBARU
    io.to(roomId).emit("room_user_count", {
      count: activeRooms[roomId].users.size,
    });

    socket.to(roomId).emit("user_joined_voice", {
      user: { ...user, socketId: socket.id },
      isHost,
    });

    console.log(`👥 Room ${roomId} | Users: ${activeRooms[roomId].users.size}`);
  });

  socket.on("leave_slot", ({ roomId, slotIndex }) => {
    // Beritahu semua orang di room bahwa slot ini sekarang kosong
    io.to(roomId).emit("slot_cleared", { slotIndex });
  });

  // Anda perlu melacak user mana menempati slot mana di server.js (simplifikasi)
  socket.on("disconnect", () => {
    // Cari apakah socket.id ini sedang menempati slot, jika iya broadcast "slot_cleared"
    // Contoh sederhana:
    io.emit("check_and_clear_abandoned_slots", { socketId: socket.id });
  });

  socket.on("occupy_slot", ({ roomId, slotIndex, user }) => {
    // Kirim ke semua orang di room tersebut bahwa slot X sudah diisi oleh User Y
    io.to(roomId).emit("slot_updated", {
      slotIndex,
      user: {
        nama: user.nama,
        socketId: socket.id,
      },
    });
  });

  socket.on("request_to_speak", ({ roomId, socketId }) => {
    const room = activeRooms[roomId];
    if (room && room.hostSocketId) {
      // Kirim pesan ke Host bahwa user ini siap mengirim suara
      io.to(room.hostSocketId).emit("request_to_speak", { socketId });
    }
  });

  socket.on("disconnect", () => {
    for (const roomId in activeRooms) {
      const room = activeRooms[roomId];

      if (room.users.has(socket.id)) {
        room.users.delete(socket.id);

        console.log(
          `🚪 User keluar | Room ${roomId} | Sisa: ${room.users.size}`
        );

        // 🔴 UPDATE JUMLAH USER
        io.to(roomId).emit("room_user_count", {
          count: room.users.size,
        });

        // Jika host keluar & tidak ada user tersisa
        if (room.users.size === 0 && room.hostSocketId === socket.id) {
          console.log(`🔥 Room ${roomId} kosong, hapus dari room.json`);
          deleteRoomFromFile(roomId);
          delete activeRooms[roomId];
        }
      }
    }
  });

  socket.on("webrtc-offer", (data) =>
    io.to(data.toSocketId).emit("webrtc-offer", {
      ...data,
      fromSocketId: socket.id,
    })
  );

  socket.on("webrtc-answer", (data) =>
    io.to(data.toSocketId).emit("webrtc-answer", {
      ...data,
      fromSocketId: socket.id,
    })
  );

  socket.on("webrtc-ice", (data) =>
    io.to(data.toSocketId).emit("webrtc-ice", {
      ...data,
      fromSocketId: socket.id,
    })
  );
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

server.listen(3000, () => {
  console.log("🚀 Server + Socket.IO berjalan di port 3000");
});

function deleteRoomFromFile(roomId) {
  const roomFilePath = path.join(__dirname, "data", "room.json");

  fs.readFile(roomFilePath, "utf8", (err, data) => {
    if (err) return console.error("❌ Gagal baca room.json");

    let rooms = JSON.parse(data);

    const newRooms = rooms.filter((room) => room.id != roomId);

    fs.writeFile(roomFilePath, JSON.stringify(newRooms, null, 2), (err) => {
      if (err) {
        console.error("❌ Gagal hapus room");
      } else {
        console.log(`✅ Room ${roomId} berhasil dihapus`);
      }
    });
  });
}
