const { promisify } = require("node:util");
const crypto = require("node:crypto");

const scrypt = promisify(crypto.scrypt);
const PASSWORD_KEY_LENGTH = 64;
const PHONE_PATTERN = /^\+?[1-9]\d{7,14}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeIdentifier(method, identifier) {
  if (typeof identifier !== "string") {
    throw new Error("Enter a valid email address or phone number.");
  }

  const value = identifier.trim();
  if (method === "email") {
    const email = value.toLowerCase();
    if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
      throw new Error("Enter a valid email address.");
    }
    return email;
  }

  if (method === "phone") {
    const phone = value.replace(/[\s()-]/g, "");
    if (!PHONE_PATTERN.test(phone)) {
      throw new Error(
        "Enter a valid phone number with country code, such as +91 98765 43210.",
      );
    }
    return phone.startsWith("+") ? phone : `+${phone}`;
  }

  throw new Error("Choose email or phone sign-in.");
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, PASSWORD_KEY_LENGTH);
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  if (typeof storedHash !== "string") return false;

  const [algorithm, salt, keyHex, extra] = storedHash.split("$");
  if (
    algorithm !== "scrypt" ||
    !salt ||
    !keyHex ||
    extra !== undefined ||
    keyHex.length !== PASSWORD_KEY_LENGTH * 2
  ) {
    return false;
  }

  const expected = Buffer.from(keyHex, "hex");
  const actual = await scrypt(password, salt, PASSWORD_KEY_LENGTH);
  return (
    expected.length === actual.length &&
    crypto.timingSafeEqual(expected, actual)
  );
}

module.exports = { hashPassword, normalizeIdentifier, verifyPassword };
