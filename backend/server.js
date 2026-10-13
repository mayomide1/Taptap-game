require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./user");
const bcrypt = require("bcrypt");

const app = express();

app.use(express.json());
app.use(cors());

app.get("/players", async (req, res) => {
  try {
    const players = await User.find();
    res.status(200).json(players);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/register", async (req, res) => {
  try {
    const { userName, password } = req.body;

    if (!userName) {
      return res.status(400).json({ error: "Username is required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const player = await User.create({
      userName,
      password: hashedPassword,
      totalCount: 0,
    });

    res
      .status(201)
      .json({
        _id: player._id,
        userName: player.userName,
        totalCount: player.totalCount,
      });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "Username already taken" });
    }
    res.status(500).json({ error: error.message });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { userName, password } = req.body;

    const player = await User.findOne({ userName }).select("+password");

    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    const hashedPassword = await bcrypt.compare(password, player.password);

    if (!hashedPassword) {
      return res.status(401).json({ error: "Invalid login credentials" });
    }

    res
      .status(200)
      .json({
        _id: player._id,
        userName: player.userName,
        totalCount: player.totalCount,
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/user/:id/count", async (req, res) => {
    try {
        const { id } = req.params;
        const { totalCount } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid user id" });
        }
        if (typeof totalCount !== "number" || totalCount < 0) {
            return res.status(400).json({ error: "Invalid totalCount" });
        }

        const user = await User.findByIdAndUpdate(
            id,
            { totalCount },
            { new: true }
        );

        if (!user) return res.status(404).json({ error: "User not found" });

        res.status(200).json({
            _id: user._id,
            userName: user.userName,
            totalCount: user.totalCount,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete("/player/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const player = await User.findByIdAndDelete(id);

    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    res.status(200).json({ message: "Player successfully deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;

const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`Listening on PORT ${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
