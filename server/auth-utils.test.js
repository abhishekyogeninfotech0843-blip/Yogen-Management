const test = require("node:test");
const assert = require("node:assert/strict");
const { hashPassword, normalizeIdentifier, verifyPassword } = require("./auth-utils");

test("email identifiers are trimmed and case-insensitive", () => {
  assert.equal(normalizeIdentifier("email", "  HELLO@EXAMPLE.COM "), "hello@example.com");
});

test("phone identifiers are normalized and validated", () => {
  assert.equal(normalizeIdentifier("phone", "+91 (98765) 43210"), "+919876543210");
  assert.throws(() => normalizeIdentifier("phone", "abc"));
});

test("password hashes are salted and can only verify the matching password", async () => {
  const firstHash = await hashPassword("correct horse battery staple");
  const secondHash = await hashPassword("correct horse battery staple");

  assert.notEqual(firstHash, secondHash);
  assert.equal(await verifyPassword("correct horse battery staple", firstHash), true);
  assert.equal(await verifyPassword("wrong password", firstHash), false);
  assert.equal(await verifyPassword("anything", "invalid-hash"), false);
});
