// Minimal assert polyfill for React Native/Expo
function fail(msg) {
  throw new Error(msg || "Assertion failed");
}

function ok(value, msg) {
  if (!value) fail(msg);
}

function equal(actual, expected, msg) {
  if (actual != expected) fail(msg || `${actual} != ${expected}`);
}

function strictEqual(actual, expected, msg) {
  if (actual !== expected) fail(msg || `${actual} !== ${expected}`);
}

function notStrictEqual(actual, expected, msg) {
  if (actual === expected) fail(msg || `${actual} === ${expected}`);
}

function deepStrictEqual(a, b, msg) {
  try {
    const aStr = JSON.stringify(a);
    const bStr = JSON.stringify(b);
    if (aStr !== bStr) fail(msg || "Values are not deeply equal");
  } catch {
    fail(msg || "Values are not deeply equal");
  }
}

const assert = Object.assign(ok, {
  fail,
  ok,
  equal,
  strictEqual,
  notStrictEqual,
  deepStrictEqual,
  strict: {
    fail,
    ok,
    equal,
    strictEqual,
    notStrictEqual,
    deepStrictEqual,
  },
});

module.exports = assert;
