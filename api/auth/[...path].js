import mongoose from "mongoose";
import backend from "../../server/server.js";

let connectionPromise;

export default async function handler(req, res) {
  try {
    if (!process.env.MONGO_URI) {
      return res.status(500).json({
        error: "MONGO_URI is not configured in Vercel."
      });
    }

    if (mongoose.connection.readyState !== 1) {
      if (!connectionPromise) {
        connectionPromise = mongoose.connect(process.env.MONGO_URI).catch((error) => {
          connectionPromise = null;
          throw error;
        });
      }

      await connectionPromise;
    }

    return backend.app(req, res);
  } catch (error) {
    console.error("Authentication API error:", error.message);
    return res.status(503).json({
      error: "Backend or database connection failed."
    });
  }
}
