const crypto = require("crypto");

function toBase64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(input) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

function signPayload(payload, secret) {
  const body = toBase64Url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", secret).update(body).digest("base64");
  const safeSignature = signature.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return `${body}.${safeSignature}`;
}

function verifyToken(token, secret) {
  if (!token || !token.includes(".")) {
    return { ok: false, reason: "missing" };
  }

  const [body, signature] = token.split(".");
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64");
  const safeExpected = expected.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

  if (signature !== safeExpected) {
    return { ok: false, reason: "invalid-signature" };
  }

  let payload;

  try {
    payload = JSON.parse(fromBase64Url(body));
  } catch (error) {
    return { ok: false, reason: "invalid-payload" };
  }

  if (!payload.exp || Date.now() > payload.exp) {
    return { ok: false, reason: "expired", payload };
  }

  return { ok: true, payload };
}

module.exports = {
  signPayload,
  verifyToken
};
