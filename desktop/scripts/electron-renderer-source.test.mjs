import assert from "node:assert/strict";
import test from "node:test";
import { colonyRendererSource } from "./electron-renderer-source.mjs";

test("Electron takes its shipped renderer from the new app", () => {
  assert.equal(
    colonyRendererSource("/checkout"),
    "/checkout/app/dist",
  );
});
