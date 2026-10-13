const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const crypto = require("node:crypto");
const express = require("express");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");
const { hashPassword, verifyPassword, normalizeIdentifier } = require("./auth-utils");

const app = express();
const PORT = process.env.PORT || 5000;
const SESSION_COOKIE = "yogen_session";
const SESSION_DURATION = 12 * 60 * 60 * 1000;
const REMEMBERED_SESSION_DURATION = 30 * 24 * 60 * 60 * 1000;

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

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["admin", "member"], required: true },
  },
  { timestamps: true },
);

UserSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: "string" } } },
);
UserSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: "string" } } },
);
UserSchema.index(
  { role: 1 },
  {
    unique: true,
    partialFilterExpression: { role: "admin" },
    name: "only_one_workspace_admin",
  },
);

const SessionSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true },
);

const OfficeData = mongoose.model("OfficeData", OfficeDataSchema);
const User = mongoose.model("User", UserSchema);
const Session = mongoose.model("Session", SessionSchema);

function databaseUnavailable(res) {
  return res.status(503).json({ error: "MongoDB is not connected. Check server/.env and try again." });
}

function publicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email || null,
    phone: user.phone || null,
    role: user.role,
  };
}

function readSessionToken(req) {
  const cookies = req.headers.cookie || "";
  const cookie = cookies
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));

  if (!cookie) return null;
  try {
    return decodeURIComponent(cookie.slice(SESSION_COOKIE.length + 1));
  } catch {
    return null;
  }
}

function sessionCookieOptions(maxAge) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api",
    maxAge,
  };
}

async function getSessionUser(req) {
  const token = readSessionToken(req);
  if (!token) return null;

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const session = await Session.findOne({
    tokenHash,
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!session) return null;

  return User.findById(session.userId).lean();
}

async function requireAuth(req, res, next) {
  if (mongoose.connection.readyState !== 1) return databaseUnavailable(res);

  try {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Please sign in to continue." });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication check failed:", error.message);
    res.status(500).json({ error: "Could not verify your sign-in." });
  }
}

async function createSession(user, res, rememberMe = false) {
  const duration = rememberMe ? REMEMBERED_SESSION_DURATION : SESSION_DURATION;
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + duration);
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  await Session.create({ tokenHash, userId: user._id, expiresAt });
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions(duration));
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait 15 minutes and try again." },
});

app.get("/", (req, res) => {
  res.json({
    message: "Yogen Office OS API is running",
    database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
  });
});

app.get("/api/auth/status", async (req, res) => {
  if (mongoose.connection.readyState !== 1) return databaseUnavailable(res);

  try {
    const [userCount, user] = await Promise.all([
      User.countDocuments(),
      getSessionUser(req),
    ]);
    const setupRequired = userCount === 0;
    res.json({
      authenticated: Boolean(user),
      user: user ? publicUser(user) : null,
      setupRequired,
      bootstrapCodeRequired: setupRequired && Boolean(process.env.AUTH_SETUP_CODE),
      setupBlocked: setupRequired && process.env.NODE_ENV === "production" && !process.env.AUTH_SETUP_CODE,
      inviteRequired: !setupRequired,
      registrationAvailable: setupRequired
        ? process.env.NODE_ENV !== "production" || Boolean(process.env.AUTH_SETUP_CODE)
        : Boolean(process.env.AUTH_INVITE_CODE),
    });
  } catch (error) {
    console.error("Authentication status failed:", error.message);
    res.status(500).json({ error: "Could not check authentication status." });
  }
});

app.post("/api/auth/register", authLimiter, async (req, res) => {
  if (mongoose.connection.readyState !== 1) return databaseUnavailable(res);

  try {
    const { name, method, identifier, password, inviteCode } = req.body;
    const trimmedName = typeof name === "string" ? name.trim() : "";
    if (!trimmedName || trimmedName.length > 100) {
      return res.status(400).json({ error: "Enter your name (up to 100 characters)." });
    }
    if (typeof password !== "string" || password.length < 8 || password.length > 128) {
      return res.status(400).json({ error: "Password must be between 8 and 128 characters." });
    }

    let normalized;
    try {
      normalized = normalizeIdentifier(method, identifier);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    const userCount = await User.countDocuments();
    const isFirstUser = userCount === 0;
    if (isFirstUser) {
      const setupCode = process.env.AUTH_SETUP_CODE;
      if (process.env.NODE_ENV === "production" && !setupCode) {
        return res.status(503).json({ error: "Initial admin signup is not configured. Set AUTH_SETUP_CODE on the server." });
      }
      if (setupCode) {
        if (typeof req.body.setupCode !== "string") {
          return res.status(403).json({ error: "The administrator setup code is required." });
        }
        const expected = crypto.createHash("sha256").update(setupCode).digest();
        const provided = crypto.createHash("sha256").update(req.body.setupCode).digest();
        if (!crypto.timingSafeEqual(expected, provided)) {
          return res.status(403).json({ error: "The administrator setup code is invalid." });
        }
      }
    } else {
      const configuredInvite = process.env.AUTH_INVITE_CODE;
      if (!configuredInvite || typeof inviteCode !== "string") {
        return res.status(403).json({ error: "An administrator invite code is required to join this workspace." });
      }
      const expected = crypto.createHash("sha256").update(configuredInvite).digest();
      const provided = crypto.createHash("sha256").update(inviteCode).digest();
      if (!crypto.timingSafeEqual(expected, provided)) {
        return res.status(403).json({ error: "The invite code is invalid." });
      }
    }

    const user = await User.create({
      name: trimmedName,
      [method]: normalized,
      passwordHash: await hashPassword(password),
      role: isFirstUser ? "admin" : "member",
    });

    await createSession(user, res);
    res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "That email or phone number is already registered. If this was the first account, please try signing in." });
    }
    console.error("Account registration failed:", error.message);
    res.status(500).json({ error: "Could not create your account." });
  }
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
  if (mongoose.connection.readyState !== 1) return databaseUnavailable(res);

  try {
    const { method, identifier, password, rememberMe } = req.body;
    if (typeof password !== "string" || password.length > 128) {
      return res.status(400).json({ error: "Enter a valid password." });
    }

    let normalized;
    try {
      normalized = normalizeIdentifier(method, identifier);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    const user = await User.findOne({ [method]: normalized }).select("+passwordHash");
    const validPassword = user
      ? await verifyPassword(password, user.passwordHash)
      : await verifyPassword(password, await hashPassword("invalid-login-placeholder"));

    if (!user || !validPassword) {
      return res.status(401).json({ error: "Email/phone or password is incorrect." });
    }

    await createSession(user, res, rememberMe === true);
    res.json({ user: publicUser(user) });
  } catch (error) {
    console.error("Sign-in failed:", error.message);
    res.status(500).json({ error: "Could not sign you in." });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  try {
    const token = readSessionToken(req);
    if (token && mongoose.connection.readyState === 1) {
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      await Session.deleteOne({ tokenHash });
    }
    res.clearCookie(SESSION_COOKIE, sessionCookieOptions(0));
    res.json({ message: "Signed out." });
  } catch (error) {
    console.error("Sign-out failed:", error.message);
    res.status(500).json({ error: "Could not sign you out." });
  }
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.get("/api/data", requireAuth, async (req, res) => {
  try {
    const record = await OfficeData.findOne({ key: "office" }).lean();
    res.json({ data: record?.data || {} });
  } catch (error) {
    console.error("Read error:", error.message);
    res.status(500).json({ error: "Could not read office data." });
  }
});

app.put("/api/data/:key", requireAuth, async (req, res) => {
  try {
    const { key } = req.params;

    if (!ALLOWED_KEYS.includes(key)) {
      return res.status(400).json({ error: "Invalid data key." });
    }

    if (!Object.prototype.hasOwnProperty.call(req.body, "data")) {
      return res.status(400).json({ error: "Data is required." });
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
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI missing. Add it to server/.env before starting the authenticated API.");
  } else {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log("MongoDB connected successfully!");
    } catch (error) {
      if (/bad auth|authentication failed/i.test(error.message)) {
        console.error("MongoDB authentication failed. Check the Atlas database credentials and URL-encode special characters in the password.");
      } else {
        console.error("MongoDB connection failed:", error.message);
      }
    }
  }

  app.listen(PORT, "127.0.0.1", () => {
    console.log(`Yogen Office OS API running on port ${PORT}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
