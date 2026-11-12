import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { wpCreate, wpUpdate, wpUnpublish, readLedger, isOwned } from "../cli/lib/wordpress.mjs";

const creds = { user: "u", appPassword: "abcd efgh ijkl mnop" };
let calls = [];
globalThis.fetch = async (url, init) => { calls.push({ url, init }); const body = init.body ? JSON.parse(init.body) : {}; return { ok: true, status: 201, json: async () => ({ id: 42, link: "https://wp.example/x", status: body.status || "draft" }) }; };

test("wp: create defaults to draft, sends basic auth, records ownership", async () => {
  const root = await mkdtemp(join(tmpdir(), "st-"));
  const r = await wpCreate("https://wp.example/", { title: "T", content: "<p>c</p>" }, { ...creds, root });
  assert.equal(r.status, "draft");
  assert.equal(JSON.parse(calls.at(-1).init.body).status, "draft");
  assert.match(calls.at(-1).init.headers.authorization, /^Basic /);
  assert.equal(calls.at(-1).url, "https://wp.example/wp-json/wp/v2/posts");
  assert.ok(isOwned(await readLedger(root), "https://wp.example", "posts", 42));
});
test("wp: update of an owned post is allowed and limited to safe fields", async () => {
  const root = await mkdtemp(join(tmpdir(), "st-"));
  await wpCreate("https://wp.example", { title: "T", content: "c" }, { ...creds, root });
  const r = await wpUpdate("https://wp.example", { id: 42, title: "New", author: 1 }, { ...creds, root });
  assert.deepEqual(r.updated, ["title"]);
  assert.deepEqual(JSON.parse(calls.at(-1).init.body), { title: "New" });
});
test("wp: refuses to edit a post it did not create", async () => {
  const root = await mkdtemp(join(tmpdir(), "st-"));
  await assert.rejects(wpUpdate("https://wp.example", { id: 7, title: "x" }, { ...creds, root }), /Refusing to edit/);
});
test("wp: refuses an owned id on another site or type", async () => {
  const root = await mkdtemp(join(tmpdir(), "st-"));
  await wpCreate("https://wp.example", { title: "T", content: "c" }, { ...creds, root });
  await assert.rejects(wpUpdate("https://other.example", { id: 42, title: "x" }, { ...creds, root }), /Refusing/);
  await assert.rejects(wpUpdate("https://wp.example", { type: "pages", id: 42, title: "x" }, { ...creds, root }), /Refusing/);
});
test("wp: unpublish sets draft on owned post", async () => {
  const root = await mkdtemp(join(tmpdir(), "st-"));
  await wpCreate("https://wp.example", { title: "T", content: "c", status: "publish" }, { ...creds, root });
  await wpUnpublish("https://wp.example", { id: 42 }, { ...creds, root });
  assert.equal(JSON.parse(calls.at(-1).init.body).status, "draft");
});
test("wp: http sites and missing credentials rejected", async () => {
  await assert.rejects(wpCreate("http://wp.example", { title: "T", content: "c" }, creds), /https/);
  await assert.rejects(wpCreate("https://wp.example", { title: "T", content: "c" }, { user: "", appPassword: "" }), /WP_USER/);
});
