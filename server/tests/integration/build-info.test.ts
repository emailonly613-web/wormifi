import assert from "node:assert/strict";
import { test } from "node:test";

import {
  SERVER_BUILD_REVISION,
  normalizeBuildRevision,
} from "../../src/build-info.ts";

test("deployment build identity accepts only a Git revision and fails safely in development", () => {
  assert.equal(normalizeBuildRevision(" A1b2C3d4 "), "a1b2c3d4");
  assert.equal(normalizeBuildRevision(undefined), "development");
  assert.equal(normalizeBuildRevision("main"), "development");
  assert.equal(normalizeBuildRevision("${_self.COMMIT_HASH}"), "development");
  assert.match(SERVER_BUILD_REVISION, /^(development|[0-9a-f]{7,64})$/u);
});
