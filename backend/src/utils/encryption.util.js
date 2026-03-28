const crypto = require("crypto");
const { integrationConfig } = require("../config/integrations");

const createKey = () => {
  const raw = integrationConfig.appEncryptionKey || "";
  if (!raw) {
    throw new Error("APP_ENCRYPTION_KEY is required for provider token encryption");
  }
  return crypto.createHash("sha256").update(raw).digest();
};

const encryptSecret = (plaintext = "") => {
  if (!plaintext) return "";

  const key = createKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("hex")}.${tag.toString("hex")}.${encrypted.toString("hex")}`;
};

const decryptSecret = (payload = "") => {
  if (!payload) return "";
  const [ivHex, tagHex, dataHex] = String(payload).split(".");
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Invalid encrypted payload format");
  }

  const key = createKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));

  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return decrypted.toString("utf8");
};

module.exports = { encryptSecret, decryptSecret };
