const test = require("node:test");
const assert = require("node:assert/strict");
const { app } = require("./server");

test("authentication and office data fail closed while MongoDB is unavailable", async (context) => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  context.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const { port } = server.address();
  const requests = [
    ["/api/auth/status", { method: "GET" }],
    ["/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }],
    ["/api/data", { method: "GET" }],
  ];
  for (const [path, options] of requests) {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, options);
    assert.equal(response.status, 503, `${path} should be unavailable without MongoDB`);
  }

  const saveResponse = await fetch(`http://127.0.0.1:${port}/api/data/yogen_employees`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: [] }),
  });
  assert.equal(saveResponse.status, 503, "office data writes should fail closed");
});
