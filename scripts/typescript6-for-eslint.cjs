const Module = require("module");
const path = require("path");

const typescript6 = require.resolve("typescript6");
const original = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain, options) {
  const parentFile = parent?.filename ?? "";
  const fromTypeScriptEslint =
    parentFile.includes(`${path.sep}typescript-eslint${path.sep}`) ||
    parentFile.includes(`${path.sep}@typescript-eslint${path.sep}`) ||
    parentFile.includes(`${path.sep}ts-api-utils${path.sep}`);
  if (request === "typescript" && fromTypeScriptEslint) return typescript6;
  return original.call(this, request, parent, isMain, options);
};
