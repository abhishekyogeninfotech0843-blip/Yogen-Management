const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "5mb" }));

const ALLOWED_KEYS = [
  "yogen_employees",
  "yogen_attendance",
  "yogen_office_expenses",
  "yogen_clients",
];

const OfficeDataSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "office",
      unique: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

const OfficeData = mongoose.model("OfficeData", OfficeDataSchema);

app.get("/", (req, res) => {
  res.json({
    message: "Yogen Office OS API is running",
    database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
  });
});

app.get("/api/data", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "MongoDB is not connected." });
  }

  try {
    const record = await OfficeData.findOne({ key: "office" }).lean();

    res.json({
      data: record?.data || {},
    });
  } catch (error) {
    console.error("Read error:", error.message);
    res.status(500).json({ error: "Could not read office data." });
  }
});

app.put("/api/data/:key", async (req, res) => {
  try {
    const { key } = req.params;

    if (!ALLOWED_KEYS.includes(key)) {
      return res.status(400).json({ error: "Invalid data key." });
    }

    if (!Object.prototype.hasOwnProperty.call(req.body, "data")) {
      return res.status(400).json({ error: "Data is required." });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "MongoDB is not connected." });
    }

    const result = await OfficeData.findOneAndUpdate(
      { key: "office" },
      { $set: { [`data.${key}`]: req.body.data } },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    res.json({
      message: "Data saved to MongoDB successfully.",
      savedKey: key,
      updatedAt: result.updatedAt,
    });
  } catch (error) {
    console.error("Save error:", error.message);
    res.status(500).json({ error: "Could not save office data." });
  }
});

async function startServer() {
  app.listen(PORT, "127.0.0.1", () => {
    console.log(`Yogen Office OS API running on port ${PORT}`);
  });

  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI missing. Check server/.env. API is running without database access.");
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully!");
  } catch (error) {
    if (/bad auth|authentication failed/i.test(error.message)) {
      console.error(
        "MongoDB authentication failed. Check the Atlas database username/password and URL-encode special characters in the password. API remains available; restart it after correcting server/.env.",
      );
    } else {
      console.error("MongoDB connection failed. API remains available:", error.message);
    }
  }
}

startServer();
