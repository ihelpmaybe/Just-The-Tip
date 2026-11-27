import { createRequire } from "node:module"; const require = createRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server/debugSessionLog.ts
var debugSessionLog_exports = {};
__export(debugSessionLog_exports, {
  agentLog: () => agentLog
});
import { appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
function agentLog(location2, message, data = {}, hypothesisId = "", runId = "emu-session") {
  const payload = {
    sessionId: SESSION,
    location: location2,
    message,
    data,
    hypothesisId,
    runId,
    timestamp: Date.now()
  };
  try {
    appendFileSync(LOG, JSON.stringify(payload) + "\n", "utf8");
  } catch {
  }
  try {
    void fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": SESSION
      },
      body: JSON.stringify(payload)
    }).catch(() => {
    });
  } catch {
  }
}
var LOG, ENDPOINT, SESSION;
var init_debugSessionLog = __esm({
  "server/debugSessionLog.ts"() {
    LOG = resolve(
      fileURLToPath(new URL(".", import.meta.url)),
      "../debug-c3be18.log"
    );
    ENDPOINT = "http://127.0.0.1:7339/ingest/1502796b-1cc2-4fac-b379-bccddd17a74e";
    SESSION = "c3be18";
  }
});

// node_modules/viem/_esm/utils/data/isHex.js
function isHex(value, { strict = true } = {}) {
  if (!value)
    return false;
  if (typeof value !== "string")
    return false;
  return strict ? /^0x[0-9a-fA-F]*$/.test(value) : value.startsWith("0x");
}
var init_isHex = __esm({
  "node_modules/viem/_esm/utils/data/isHex.js"() {
  }
});

// node_modules/viem/_esm/utils/data/size.js
function size(value) {
  if (isHex(value, { strict: false }))
    return Math.ceil((value.length - 2) / 2);
  return value.length;
}
var init_size = __esm({
  "node_modules/viem/_esm/utils/data/size.js"() {
    init_isHex();
  }
});

// node_modules/viem/_esm/errors/version.js
var version;
var init_version = __esm({
  "node_modules/viem/_esm/errors/version.js"() {
    version = "2.55.11";
  }
});

// node_modules/viem/_esm/errors/base.js
function walk(err, fn) {
  if (fn?.(err))
    return err;
  if (err && typeof err === "object" && "cause" in err && err.cause !== void 0)
    return walk(err.cause, fn);
  return fn ? null : err;
}
var errorConfig, BaseError;
var init_base = __esm({
  "node_modules/viem/_esm/errors/base.js"() {
    init_version();
    errorConfig = {
      getDocsUrl: ({ docsBaseUrl, docsPath = "", docsSlug }) => docsPath ? `${docsBaseUrl ?? "https://viem.sh"}${docsPath}${docsSlug ? `#${docsSlug}` : ""}` : void 0,
      version: `viem@${version}`
    };
    BaseError = class _BaseError extends Error {
      constructor(shortMessage, args = {}) {
        const details = (() => {
          if (args.cause instanceof _BaseError)
            return args.cause.details;
          if (args.cause?.message)
            return args.cause.message;
          return args.details;
        })();
        const docsPath = (() => {
          if (args.cause instanceof _BaseError)
            return args.cause.docsPath || args.docsPath;
          return args.docsPath;
        })();
        const docsUrl = errorConfig.getDocsUrl?.({ ...args, docsPath });
        const message = [
          shortMessage || "An error occurred.",
          "",
          ...args.metaMessages ? [...args.metaMessages, ""] : [],
          ...docsUrl ? [`Docs: ${docsUrl}`] : [],
          ...details ? [`Details: ${details}`] : [],
          ...errorConfig.version ? [`Version: ${errorConfig.version}`] : []
        ].join("\n");
        super(message, args.cause ? { cause: args.cause } : void 0);
        Object.defineProperty(this, "details", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "docsPath", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "metaMessages", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "shortMessage", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "version", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "BaseError"
        });
        this.details = details;
        this.docsPath = docsPath;
        this.metaMessages = args.metaMessages;
        this.name = args.name ?? this.name;
        this.shortMessage = shortMessage;
        this.version = version;
      }
      walk(fn) {
        return walk(this, fn);
      }
    };
  }
});

// node_modules/viem/_esm/errors/data.js
var SizeExceedsPaddingSizeError;
var init_data = __esm({
  "node_modules/viem/_esm/errors/data.js"() {
    init_base();
    SizeExceedsPaddingSizeError = class extends BaseError {
      constructor({ size: size2, targetSize, type }) {
        super(`${type.charAt(0).toUpperCase()}${type.slice(1).toLowerCase()} size (${size2}) exceeds padding size (${targetSize}).`, { name: "SizeExceedsPaddingSizeError" });
      }
    };
  }
});

// node_modules/viem/_esm/utils/data/pad.js
function pad(hexOrBytes, { dir, size: size2 = 32 } = {}) {
  if (typeof hexOrBytes === "string")
    return padHex(hexOrBytes, { dir, size: size2 });
  return padBytes(hexOrBytes, { dir, size: size2 });
}
function padHex(hex_, { dir, size: size2 = 32 } = {}) {
  if (size2 === null)
    return hex_;
  const hex = hex_.replace("0x", "");
  if (hex.length > size2 * 2)
    throw new SizeExceedsPaddingSizeError({
      size: Math.ceil(hex.length / 2),
      targetSize: size2,
      type: "hex"
    });
  return `0x${hex[dir === "right" ? "padEnd" : "padStart"](size2 * 2, "0")}`;
}
function padBytes(bytes, { dir, size: size2 = 32 } = {}) {
  if (size2 === null)
    return bytes;
  if (bytes.length > size2)
    throw new SizeExceedsPaddingSizeError({
      size: bytes.length,
      targetSize: size2,
      type: "bytes"
    });
  const paddedBytes = new Uint8Array(size2);
  for (let i = 0; i < size2; i++) {
    const padEnd = dir === "right";
    paddedBytes[padEnd ? i : size2 - i - 1] = bytes[padEnd ? i : bytes.length - i - 1];
  }
  return paddedBytes;
}
var init_pad = __esm({
  "node_modules/viem/_esm/utils/data/pad.js"() {
    init_data();
  }
});

// node_modules/viem/_esm/errors/encoding.js
var IntegerOutOfRangeError, SizeOverflowError;
var init_encoding = __esm({
  "node_modules/viem/_esm/errors/encoding.js"() {
    init_base();
    IntegerOutOfRangeError = class extends BaseError {
      constructor({ max, min, signed, size: size2, value }) {
        super(`Number "${value}" is not in safe ${size2 ? `${size2 * 8}-bit ${signed ? "signed" : "unsigned"} ` : ""}integer range ${max ? `(${min} to ${max})` : `(above ${min})`}`, { name: "IntegerOutOfRangeError" });
      }
    };
    SizeOverflowError = class extends BaseError {
      constructor({ givenSize, maxSize }) {
        super(`Size cannot exceed ${maxSize} bytes. Given size: ${givenSize} bytes.`, { name: "SizeOverflowError" });
      }
    };
  }
});

// node_modules/viem/_esm/utils/encoding/fromHex.js
function assertSize(hexOrBytes, { size: size2 }) {
  if (size(hexOrBytes) > size2)
    throw new SizeOverflowError({
      givenSize: size(hexOrBytes),
      maxSize: size2
    });
}
var init_fromHex = __esm({
  "node_modules/viem/_esm/utils/encoding/fromHex.js"() {
    init_encoding();
    init_size();
  }
});

// node_modules/viem/_esm/utils/encoding/toHex.js
function toHex(value, opts = {}) {
  if (typeof value === "number" || typeof value === "bigint")
    return numberToHex(value, opts);
  if (typeof value === "string") {
    return stringToHex(value, opts);
  }
  if (typeof value === "boolean")
    return boolToHex(value, opts);
  return bytesToHex(value, opts);
}
function boolToHex(value, opts = {}) {
  const hex = `0x${Number(value)}`;
  if (typeof opts.size === "number") {
    assertSize(hex, { size: opts.size });
    return pad(hex, { size: opts.size });
  }
  return hex;
}
function bytesToHex(value, opts = {}) {
  let string = "";
  for (let i = 0; i < value.length; i++) {
    string += hexes[value[i]];
  }
  const hex = `0x${string}`;
  if (typeof opts.size === "number") {
    assertSize(hex, { size: opts.size });
    return pad(hex, { dir: "right", size: opts.size });
  }
  return hex;
}
function numberToHex(value_, opts = {}) {
  const { signed, size: size2 } = opts;
  const value = BigInt(value_);
  let maxValue;
  if (size2) {
    if (signed)
      maxValue = (1n << BigInt(size2) * 8n - 1n) - 1n;
    else
      maxValue = 2n ** (BigInt(size2) * 8n) - 1n;
  } else if (typeof value_ === "number") {
    maxValue = BigInt(Number.MAX_SAFE_INTEGER);
  }
  const minValue = typeof maxValue === "bigint" && signed ? -maxValue - 1n : 0;
  if (maxValue && value > maxValue || value < minValue) {
    const suffix = typeof value_ === "bigint" ? "n" : "";
    throw new IntegerOutOfRangeError({
      max: maxValue ? `${maxValue}${suffix}` : void 0,
      min: `${minValue}${suffix}`,
      signed,
      size: size2,
      value: `${value_}${suffix}`
    });
  }
  const hex = `0x${(signed && value < 0 ? (1n << BigInt(size2 * 8)) + BigInt(value) : value).toString(16)}`;
  if (size2)
    return pad(hex, { size: size2 });
  return hex;
}
function stringToHex(value_, opts = {}) {
  const value = encoder.encode(value_);
  return bytesToHex(value, opts);
}
var hexes, encoder;
var init_toHex = __esm({
  "node_modules/viem/_esm/utils/encoding/toHex.js"() {
    init_encoding();
    init_pad();
    init_fromHex();
    hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_v, i) => i.toString(16).padStart(2, "0"));
    encoder = /* @__PURE__ */ new TextEncoder();
  }
});

// node_modules/viem/_esm/utils/encoding/toBytes.js
function toBytes(value, opts = {}) {
  if (typeof value === "number" || typeof value === "bigint")
    return numberToBytes(value, opts);
  if (typeof value === "boolean")
    return boolToBytes(value, opts);
  if (isHex(value))
    return hexToBytes(value, opts);
  return stringToBytes(value, opts);
}
function boolToBytes(value, opts = {}) {
  const bytes = new Uint8Array(1);
  bytes[0] = Number(value);
  if (typeof opts.size === "number") {
    assertSize(bytes, { size: opts.size });
    return pad(bytes, { size: opts.size });
  }
  return bytes;
}
function charCodeToBase16(char) {
  if (char >= charCodeMap.zero && char <= charCodeMap.nine)
    return char - charCodeMap.zero;
  if (char >= charCodeMap.A && char <= charCodeMap.F)
    return char - (charCodeMap.A - 10);
  if (char >= charCodeMap.a && char <= charCodeMap.f)
    return char - (charCodeMap.a - 10);
  return void 0;
}
function hexToBytes(hex_, opts = {}) {
  let hex = hex_;
  if (opts.size) {
    assertSize(hex, { size: opts.size });
    hex = pad(hex, { dir: "right", size: opts.size });
  }
  let hexString = hex.slice(2);
  if (hexString.length % 2)
    hexString = `0${hexString}`;
  const length = hexString.length / 2;
  const bytes = new Uint8Array(length);
  for (let index = 0, j = 0; index < length; index++) {
    const nibbleLeft = charCodeToBase16(hexString.charCodeAt(j++));
    const nibbleRight = charCodeToBase16(hexString.charCodeAt(j++));
    if (nibbleLeft === void 0 || nibbleRight === void 0) {
      throw new BaseError(`Invalid byte sequence ("${hexString[j - 2]}${hexString[j - 1]}" in "${hexString}").`);
    }
    bytes[index] = nibbleLeft * 16 + nibbleRight;
  }
  return bytes;
}
function numberToBytes(value, opts) {
  const hex = numberToHex(value, opts);
  return hexToBytes(hex);
}
function stringToBytes(value, opts = {}) {
  const bytes = encoder2.encode(value);
  if (typeof opts.size === "number") {
    assertSize(bytes, { size: opts.size });
    return pad(bytes, { dir: "right", size: opts.size });
  }
  return bytes;
}
var encoder2, charCodeMap;
var init_toBytes = __esm({
  "node_modules/viem/_esm/utils/encoding/toBytes.js"() {
    init_base();
    init_isHex();
    init_pad();
    init_fromHex();
    init_toHex();
    encoder2 = /* @__PURE__ */ new TextEncoder();
    charCodeMap = {
      zero: 48,
      nine: 57,
      A: 65,
      F: 70,
      a: 97,
      f: 102
    };
  }
});

// node_modules/@noble/hashes/esm/_u64.js
function fromBig(n, le = false) {
  if (le)
    return { h: Number(n & U32_MASK64), l: Number(n >> _32n & U32_MASK64) };
  return { h: Number(n >> _32n & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
}
function split(lst, le = false) {
  const len = lst.length;
  let Ah = new Uint32Array(len);
  let Al = new Uint32Array(len);
  for (let i = 0; i < len; i++) {
    const { h, l } = fromBig(lst[i], le);
    [Ah[i], Al[i]] = [h, l];
  }
  return [Ah, Al];
}
var U32_MASK64, _32n, rotlSH, rotlSL, rotlBH, rotlBL;
var init_u64 = __esm({
  "node_modules/@noble/hashes/esm/_u64.js"() {
    U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
    _32n = /* @__PURE__ */ BigInt(32);
    rotlSH = (h, l, s) => h << s | l >>> 32 - s;
    rotlSL = (h, l, s) => l << s | h >>> 32 - s;
    rotlBH = (h, l, s) => l << s - 32 | h >>> 64 - s;
    rotlBL = (h, l, s) => h << s - 32 | l >>> 64 - s;
  }
});

// node_modules/@noble/hashes/esm/utils.js
function isBytes(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
}
function anumber(n) {
  if (!Number.isSafeInteger(n) || n < 0)
    throw new Error("positive integer expected, got " + n);
}
function abytes(b, ...lengths) {
  if (!isBytes(b))
    throw new Error("Uint8Array expected");
  if (lengths.length > 0 && !lengths.includes(b.length))
    throw new Error("Uint8Array expected of length " + lengths + ", got length=" + b.length);
}
function aexists(instance, checkFinished = true) {
  if (instance.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (checkFinished && instance.finished)
    throw new Error("Hash#digest() has already been called");
}
function aoutput(out, instance) {
  abytes(out);
  const min = instance.outputLen;
  if (out.length < min) {
    throw new Error("digestInto() expects output buffer of length at least " + min);
  }
}
function u32(arr) {
  return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
}
function clean(...arrays) {
  for (let i = 0; i < arrays.length; i++) {
    arrays[i].fill(0);
  }
}
function byteSwap(word) {
  return word << 24 & 4278190080 | word << 8 & 16711680 | word >>> 8 & 65280 | word >>> 24 & 255;
}
function byteSwap32(arr) {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = byteSwap(arr[i]);
  }
  return arr;
}
function utf8ToBytes(str) {
  if (typeof str !== "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(str));
}
function toBytes2(data) {
  if (typeof data === "string")
    data = utf8ToBytes(data);
  abytes(data);
  return data;
}
function createHasher(hashCons) {
  const hashC = (msg) => hashCons().update(toBytes2(msg)).digest();
  const tmp = hashCons();
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = () => hashCons();
  return hashC;
}
var isLE, swap32IfBE, Hash;
var init_utils = __esm({
  "node_modules/@noble/hashes/esm/utils.js"() {
    isLE = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68)();
    swap32IfBE = isLE ? (u) => u : byteSwap32;
    Hash = class {
    };
  }
});

// node_modules/@noble/hashes/esm/sha3.js
function keccakP(s, rounds = 24) {
  const B = new Uint32Array(5 * 2);
  for (let round = 24 - rounds; round < 24; round++) {
    for (let x = 0; x < 10; x++)
      B[x] = s[x] ^ s[x + 10] ^ s[x + 20] ^ s[x + 30] ^ s[x + 40];
    for (let x = 0; x < 10; x += 2) {
      const idx1 = (x + 8) % 10;
      const idx0 = (x + 2) % 10;
      const B0 = B[idx0];
      const B1 = B[idx0 + 1];
      const Th = rotlH(B0, B1, 1) ^ B[idx1];
      const Tl = rotlL(B0, B1, 1) ^ B[idx1 + 1];
      for (let y = 0; y < 50; y += 10) {
        s[x + y] ^= Th;
        s[x + y + 1] ^= Tl;
      }
    }
    let curH = s[2];
    let curL = s[3];
    for (let t = 0; t < 24; t++) {
      const shift = SHA3_ROTL[t];
      const Th = rotlH(curH, curL, shift);
      const Tl = rotlL(curH, curL, shift);
      const PI = SHA3_PI[t];
      curH = s[PI];
      curL = s[PI + 1];
      s[PI] = Th;
      s[PI + 1] = Tl;
    }
    for (let y = 0; y < 50; y += 10) {
      for (let x = 0; x < 10; x++)
        B[x] = s[y + x];
      for (let x = 0; x < 10; x++)
        s[y + x] ^= ~B[(x + 2) % 10] & B[(x + 4) % 10];
    }
    s[0] ^= SHA3_IOTA_H[round];
    s[1] ^= SHA3_IOTA_L[round];
  }
  clean(B);
}
var _0n, _1n, _2n, _7n, _256n, _0x71n, SHA3_PI, SHA3_ROTL, _SHA3_IOTA, IOTAS, SHA3_IOTA_H, SHA3_IOTA_L, rotlH, rotlL, Keccak, gen, keccak_256;
var init_sha3 = __esm({
  "node_modules/@noble/hashes/esm/sha3.js"() {
    init_u64();
    init_utils();
    _0n = BigInt(0);
    _1n = BigInt(1);
    _2n = BigInt(2);
    _7n = BigInt(7);
    _256n = BigInt(256);
    _0x71n = BigInt(113);
    SHA3_PI = [];
    SHA3_ROTL = [];
    _SHA3_IOTA = [];
    for (let round = 0, R = _1n, x = 1, y = 0; round < 24; round++) {
      [x, y] = [y, (2 * x + 3 * y) % 5];
      SHA3_PI.push(2 * (5 * y + x));
      SHA3_ROTL.push((round + 1) * (round + 2) / 2 % 64);
      let t = _0n;
      for (let j = 0; j < 7; j++) {
        R = (R << _1n ^ (R >> _7n) * _0x71n) % _256n;
        if (R & _2n)
          t ^= _1n << (_1n << /* @__PURE__ */ BigInt(j)) - _1n;
      }
      _SHA3_IOTA.push(t);
    }
    IOTAS = split(_SHA3_IOTA, true);
    SHA3_IOTA_H = IOTAS[0];
    SHA3_IOTA_L = IOTAS[1];
    rotlH = (h, l, s) => s > 32 ? rotlBH(h, l, s) : rotlSH(h, l, s);
    rotlL = (h, l, s) => s > 32 ? rotlBL(h, l, s) : rotlSL(h, l, s);
    Keccak = class _Keccak extends Hash {
      // NOTE: we accept arguments in bytes instead of bits here.
      constructor(blockLen, suffix, outputLen, enableXOF = false, rounds = 24) {
        super();
        this.pos = 0;
        this.posOut = 0;
        this.finished = false;
        this.destroyed = false;
        this.enableXOF = false;
        this.blockLen = blockLen;
        this.suffix = suffix;
        this.outputLen = outputLen;
        this.enableXOF = enableXOF;
        this.rounds = rounds;
        anumber(outputLen);
        if (!(0 < blockLen && blockLen < 200))
          throw new Error("only keccak-f1600 function is supported");
        this.state = new Uint8Array(200);
        this.state32 = u32(this.state);
      }
      clone() {
        return this._cloneInto();
      }
      keccak() {
        swap32IfBE(this.state32);
        keccakP(this.state32, this.rounds);
        swap32IfBE(this.state32);
        this.posOut = 0;
        this.pos = 0;
      }
      update(data) {
        aexists(this);
        data = toBytes2(data);
        abytes(data);
        const { blockLen, state } = this;
        const len = data.length;
        for (let pos = 0; pos < len; ) {
          const take = Math.min(blockLen - this.pos, len - pos);
          for (let i = 0; i < take; i++)
            state[this.pos++] ^= data[pos++];
          if (this.pos === blockLen)
            this.keccak();
        }
        return this;
      }
      finish() {
        if (this.finished)
          return;
        this.finished = true;
        const { state, suffix, pos, blockLen } = this;
        state[pos] ^= suffix;
        if ((suffix & 128) !== 0 && pos === blockLen - 1)
          this.keccak();
        state[blockLen - 1] ^= 128;
        this.keccak();
      }
      writeInto(out) {
        aexists(this, false);
        abytes(out);
        this.finish();
        const bufferOut = this.state;
        const { blockLen } = this;
        for (let pos = 0, len = out.length; pos < len; ) {
          if (this.posOut >= blockLen)
            this.keccak();
          const take = Math.min(blockLen - this.posOut, len - pos);
          out.set(bufferOut.subarray(this.posOut, this.posOut + take), pos);
          this.posOut += take;
          pos += take;
        }
        return out;
      }
      xofInto(out) {
        if (!this.enableXOF)
          throw new Error("XOF is not possible for this instance");
        return this.writeInto(out);
      }
      xof(bytes) {
        anumber(bytes);
        return this.xofInto(new Uint8Array(bytes));
      }
      digestInto(out) {
        aoutput(out, this);
        if (this.finished)
          throw new Error("digest() was already called");
        this.writeInto(out);
        this.destroy();
        return out;
      }
      digest() {
        return this.digestInto(new Uint8Array(this.outputLen));
      }
      destroy() {
        this.destroyed = true;
        clean(this.state);
      }
      _cloneInto(to) {
        const { blockLen, suffix, outputLen, rounds, enableXOF } = this;
        to || (to = new _Keccak(blockLen, suffix, outputLen, enableXOF, rounds));
        to.state32.set(this.state32);
        to.pos = this.pos;
        to.posOut = this.posOut;
        to.finished = this.finished;
        to.rounds = rounds;
        to.suffix = suffix;
        to.outputLen = outputLen;
        to.enableXOF = enableXOF;
        to.destroyed = this.destroyed;
        return to;
      }
    };
    gen = (suffix, blockLen, outputLen) => createHasher(() => new Keccak(blockLen, suffix, outputLen));
    keccak_256 = /* @__PURE__ */ (() => gen(1, 136, 256 / 8))();
  }
});

// node_modules/viem/_esm/utils/hash/keccak256.js
function keccak256(value, to_) {
  const to = to_ || "hex";
  const bytes = keccak_256(isHex(value, { strict: false }) ? toBytes(value) : value);
  if (to === "bytes")
    return bytes;
  return toHex(bytes);
}
var init_keccak256 = __esm({
  "node_modules/viem/_esm/utils/hash/keccak256.js"() {
    init_sha3();
    init_isHex();
    init_toBytes();
    init_toHex();
  }
});

// node_modules/viem/_esm/errors/address.js
var InvalidAddressError;
var init_address = __esm({
  "node_modules/viem/_esm/errors/address.js"() {
    init_base();
    InvalidAddressError = class extends BaseError {
      constructor({ address }) {
        super(`Address "${address}" is invalid.`, {
          metaMessages: [
            "- Address must be a hex value of 20 bytes (40 hex characters).",
            "- Address must match its checksum counterpart."
          ],
          name: "InvalidAddressError"
        });
      }
    };
  }
});

// node_modules/viem/_esm/utils/lru.js
var LruMap;
var init_lru = __esm({
  "node_modules/viem/_esm/utils/lru.js"() {
    LruMap = class extends Map {
      constructor(size2) {
        super();
        Object.defineProperty(this, "maxSize", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        this.maxSize = size2;
      }
      get(key) {
        const value = super.get(key);
        if (super.has(key)) {
          super.delete(key);
          super.set(key, value);
        }
        return value;
      }
      set(key, value) {
        if (super.has(key))
          super.delete(key);
        super.set(key, value);
        if (this.maxSize && this.size > this.maxSize) {
          const firstKey = super.keys().next().value;
          if (firstKey !== void 0)
            super.delete(firstKey);
        }
        return this;
      }
    };
  }
});

// node_modules/viem/_esm/utils/address/getAddress.js
function checksumAddress(address_, chainId) {
  if (checksumAddressCache.has(`${address_}.${chainId}`))
    return checksumAddressCache.get(`${address_}.${chainId}`);
  const hexAddress = chainId ? `${chainId}${address_.toLowerCase()}` : address_.substring(2).toLowerCase();
  const hash = keccak256(stringToBytes(hexAddress), "bytes");
  const address = (chainId ? hexAddress.substring(`${chainId}0x`.length) : hexAddress).split("");
  for (let i = 0; i < 40; i += 2) {
    if (hash[i >> 1] >> 4 >= 8 && address[i]) {
      address[i] = address[i].toUpperCase();
    }
    if ((hash[i >> 1] & 15) >= 8 && address[i + 1]) {
      address[i + 1] = address[i + 1].toUpperCase();
    }
  }
  const result = `0x${address.join("")}`;
  checksumAddressCache.set(`${address_}.${chainId}`, result);
  return result;
}
function getAddress(address, chainId) {
  if (!isAddress(address, { strict: false }))
    throw new InvalidAddressError({ address });
  return checksumAddress(address, chainId);
}
var checksumAddressCache;
var init_getAddress = __esm({
  "node_modules/viem/_esm/utils/address/getAddress.js"() {
    init_address();
    init_toBytes();
    init_keccak256();
    init_lru();
    init_isAddress();
    checksumAddressCache = /* @__PURE__ */ new LruMap(8192);
  }
});

// node_modules/viem/_esm/utils/address/isAddress.js
function isAddress(address, options) {
  const { strict = true } = options ?? {};
  const cacheKey = `${address}.${strict}`;
  if (isAddressCache.has(cacheKey))
    return isAddressCache.get(cacheKey);
  const result = (() => {
    if (!addressRegex.test(address))
      return false;
    if (address.toLowerCase() === address)
      return true;
    if (strict)
      return checksumAddress(address) === address;
    return true;
  })();
  isAddressCache.set(cacheKey, result);
  return result;
}
var addressRegex, isAddressCache;
var init_isAddress = __esm({
  "node_modules/viem/_esm/utils/address/isAddress.js"() {
    init_lru();
    init_getAddress();
    addressRegex = /^0x[a-fA-F0-9]{40}$/;
    isAddressCache = /* @__PURE__ */ new LruMap(8192);
  }
});

// node_modules/qrcode/lib/can-promise.js
var require_can_promise = __commonJS({
  "node_modules/qrcode/lib/can-promise.js"(exports, module) {
    module.exports = function() {
      return typeof Promise === "function" && Promise.prototype && Promise.prototype.then;
    };
  }
});

// node_modules/qrcode/lib/core/utils.js
var require_utils = __commonJS({
  "node_modules/qrcode/lib/core/utils.js"(exports) {
    var toSJISFunction;
    var CODEWORDS_COUNT = [
      0,
      // Not used
      26,
      44,
      70,
      100,
      134,
      172,
      196,
      242,
      292,
      346,
      404,
      466,
      532,
      581,
      655,
      733,
      815,
      901,
      991,
      1085,
      1156,
      1258,
      1364,
      1474,
      1588,
      1706,
      1828,
      1921,
      2051,
      2185,
      2323,
      2465,
      2611,
      2761,
      2876,
      3034,
      3196,
      3362,
      3532,
      3706
    ];
    exports.getSymbolSize = function getSymbolSize(version2) {
      if (!version2) throw new Error('"version" cannot be null or undefined');
      if (version2 < 1 || version2 > 40) throw new Error('"version" should be in range from 1 to 40');
      return version2 * 4 + 17;
    };
    exports.getSymbolTotalCodewords = function getSymbolTotalCodewords(version2) {
      return CODEWORDS_COUNT[version2];
    };
    exports.getBCHDigit = function(data) {
      let digit = 0;
      while (data !== 0) {
        digit++;
        data >>>= 1;
      }
      return digit;
    };
    exports.setToSJISFunction = function setToSJISFunction(f) {
      if (typeof f !== "function") {
        throw new Error('"toSJISFunc" is not a valid function.');
      }
      toSJISFunction = f;
    };
    exports.isKanjiModeEnabled = function() {
      return typeof toSJISFunction !== "undefined";
    };
    exports.toSJIS = function toSJIS(kanji) {
      return toSJISFunction(kanji);
    };
  }
});

// node_modules/qrcode/lib/core/error-correction-level.js
var require_error_correction_level = __commonJS({
  "node_modules/qrcode/lib/core/error-correction-level.js"(exports) {
    exports.L = { bit: 1 };
    exports.M = { bit: 0 };
    exports.Q = { bit: 3 };
    exports.H = { bit: 2 };
    function fromString(string) {
      if (typeof string !== "string") {
        throw new Error("Param is not a string");
      }
      const lcStr = string.toLowerCase();
      switch (lcStr) {
        case "l":
        case "low":
          return exports.L;
        case "m":
        case "medium":
          return exports.M;
        case "q":
        case "quartile":
          return exports.Q;
        case "h":
        case "high":
          return exports.H;
        default:
          throw new Error("Unknown EC Level: " + string);
      }
    }
    exports.isValid = function isValid(level) {
      return level && typeof level.bit !== "undefined" && level.bit >= 0 && level.bit < 4;
    };
    exports.from = function from(value, defaultValue) {
      if (exports.isValid(value)) {
        return value;
      }
      try {
        return fromString(value);
      } catch (e) {
        return defaultValue;
      }
    };
  }
});

// node_modules/qrcode/lib/core/bit-buffer.js
var require_bit_buffer = __commonJS({
  "node_modules/qrcode/lib/core/bit-buffer.js"(exports, module) {
    function BitBuffer() {
      this.buffer = [];
      this.length = 0;
    }
    BitBuffer.prototype = {
      get: function(index) {
        const bufIndex = Math.floor(index / 8);
        return (this.buffer[bufIndex] >>> 7 - index % 8 & 1) === 1;
      },
      put: function(num, length) {
        for (let i = 0; i < length; i++) {
          this.putBit((num >>> length - i - 1 & 1) === 1);
        }
      },
      getLengthInBits: function() {
        return this.length;
      },
      putBit: function(bit) {
        const bufIndex = Math.floor(this.length / 8);
        if (this.buffer.length <= bufIndex) {
          this.buffer.push(0);
        }
        if (bit) {
          this.buffer[bufIndex] |= 128 >>> this.length % 8;
        }
        this.length++;
      }
    };
    module.exports = BitBuffer;
  }
});

// node_modules/qrcode/lib/core/bit-matrix.js
var require_bit_matrix = __commonJS({
  "node_modules/qrcode/lib/core/bit-matrix.js"(exports, module) {
    function BitMatrix(size2) {
      if (!size2 || size2 < 1) {
        throw new Error("BitMatrix size must be defined and greater than 0");
      }
      this.size = size2;
      this.data = new Uint8Array(size2 * size2);
      this.reservedBit = new Uint8Array(size2 * size2);
    }
    BitMatrix.prototype.set = function(row, col, value, reserved) {
      const index = row * this.size + col;
      this.data[index] = value;
      if (reserved) this.reservedBit[index] = true;
    };
    BitMatrix.prototype.get = function(row, col) {
      return this.data[row * this.size + col];
    };
    BitMatrix.prototype.xor = function(row, col, value) {
      this.data[row * this.size + col] ^= value;
    };
    BitMatrix.prototype.isReserved = function(row, col) {
      return this.reservedBit[row * this.size + col];
    };
    module.exports = BitMatrix;
  }
});

// node_modules/qrcode/lib/core/alignment-pattern.js
var require_alignment_pattern = __commonJS({
  "node_modules/qrcode/lib/core/alignment-pattern.js"(exports) {
    var getSymbolSize = require_utils().getSymbolSize;
    exports.getRowColCoords = function getRowColCoords(version2) {
      if (version2 === 1) return [];
      const posCount = Math.floor(version2 / 7) + 2;
      const size2 = getSymbolSize(version2);
      const intervals = size2 === 145 ? 26 : Math.ceil((size2 - 13) / (2 * posCount - 2)) * 2;
      const positions = [size2 - 7];
      for (let i = 1; i < posCount - 1; i++) {
        positions[i] = positions[i - 1] - intervals;
      }
      positions.push(6);
      return positions.reverse();
    };
    exports.getPositions = function getPositions(version2) {
      const coords = [];
      const pos = exports.getRowColCoords(version2);
      const posLength = pos.length;
      for (let i = 0; i < posLength; i++) {
        for (let j = 0; j < posLength; j++) {
          if (i === 0 && j === 0 || // top-left
          i === 0 && j === posLength - 1 || // bottom-left
          i === posLength - 1 && j === 0) {
            continue;
          }
          coords.push([pos[i], pos[j]]);
        }
      }
      return coords;
    };
  }
});

// node_modules/qrcode/lib/core/finder-pattern.js
var require_finder_pattern = __commonJS({
  "node_modules/qrcode/lib/core/finder-pattern.js"(exports) {
    var getSymbolSize = require_utils().getSymbolSize;
    var FINDER_PATTERN_SIZE = 7;
    exports.getPositions = function getPositions(version2) {
      const size2 = getSymbolSize(version2);
      return [
        // top-left
        [0, 0],
        // top-right
        [size2 - FINDER_PATTERN_SIZE, 0],
        // bottom-left
        [0, size2 - FINDER_PATTERN_SIZE]
      ];
    };
  }
});

// node_modules/qrcode/lib/core/mask-pattern.js
var require_mask_pattern = __commonJS({
  "node_modules/qrcode/lib/core/mask-pattern.js"(exports) {
    exports.Patterns = {
      PATTERN000: 0,
      PATTERN001: 1,
      PATTERN010: 2,
      PATTERN011: 3,
      PATTERN100: 4,
      PATTERN101: 5,
      PATTERN110: 6,
      PATTERN111: 7
    };
    var PenaltyScores = {
      N1: 3,
      N2: 3,
      N3: 40,
      N4: 10
    };
    exports.isValid = function isValid(mask) {
      return mask != null && mask !== "" && !isNaN(mask) && mask >= 0 && mask <= 7;
    };
    exports.from = function from(value) {
      return exports.isValid(value) ? parseInt(value, 10) : void 0;
    };
    exports.getPenaltyN1 = function getPenaltyN1(data) {
      const size2 = data.size;
      let points = 0;
      let sameCountCol = 0;
      let sameCountRow = 0;
      let lastCol = null;
      let lastRow = null;
      for (let row = 0; row < size2; row++) {
        sameCountCol = sameCountRow = 0;
        lastCol = lastRow = null;
        for (let col = 0; col < size2; col++) {
          let module2 = data.get(row, col);
          if (module2 === lastCol) {
            sameCountCol++;
          } else {
            if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
            lastCol = module2;
            sameCountCol = 1;
          }
          module2 = data.get(col, row);
          if (module2 === lastRow) {
            sameCountRow++;
          } else {
            if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
            lastRow = module2;
            sameCountRow = 1;
          }
        }
        if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
        if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
      }
      return points;
    };
    exports.getPenaltyN2 = function getPenaltyN2(data) {
      const size2 = data.size;
      let points = 0;
      for (let row = 0; row < size2 - 1; row++) {
        for (let col = 0; col < size2 - 1; col++) {
          const last2 = data.get(row, col) + data.get(row, col + 1) + data.get(row + 1, col) + data.get(row + 1, col + 1);
          if (last2 === 4 || last2 === 0) points++;
        }
      }
      return points * PenaltyScores.N2;
    };
    exports.getPenaltyN3 = function getPenaltyN3(data) {
      const size2 = data.size;
      let points = 0;
      let bitsCol = 0;
      let bitsRow = 0;
      for (let row = 0; row < size2; row++) {
        bitsCol = bitsRow = 0;
        for (let col = 0; col < size2; col++) {
          bitsCol = bitsCol << 1 & 2047 | data.get(row, col);
          if (col >= 10 && (bitsCol === 1488 || bitsCol === 93)) points++;
          bitsRow = bitsRow << 1 & 2047 | data.get(col, row);
          if (col >= 10 && (bitsRow === 1488 || bitsRow === 93)) points++;
        }
      }
      return points * PenaltyScores.N3;
    };
    exports.getPenaltyN4 = function getPenaltyN4(data) {
      let darkCount = 0;
      const modulesCount = data.data.length;
      for (let i = 0; i < modulesCount; i++) darkCount += data.data[i];
      const k = Math.abs(Math.ceil(darkCount * 100 / modulesCount / 5) - 10);
      return k * PenaltyScores.N4;
    };
    function getMaskAt(maskPattern, i, j) {
      switch (maskPattern) {
        case exports.Patterns.PATTERN000:
          return (i + j) % 2 === 0;
        case exports.Patterns.PATTERN001:
          return i % 2 === 0;
        case exports.Patterns.PATTERN010:
          return j % 3 === 0;
        case exports.Patterns.PATTERN011:
          return (i + j) % 3 === 0;
        case exports.Patterns.PATTERN100:
          return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
        case exports.Patterns.PATTERN101:
          return i * j % 2 + i * j % 3 === 0;
        case exports.Patterns.PATTERN110:
          return (i * j % 2 + i * j % 3) % 2 === 0;
        case exports.Patterns.PATTERN111:
          return (i * j % 3 + (i + j) % 2) % 2 === 0;
        default:
          throw new Error("bad maskPattern:" + maskPattern);
      }
    }
    exports.applyMask = function applyMask(pattern, data) {
      const size2 = data.size;
      for (let col = 0; col < size2; col++) {
        for (let row = 0; row < size2; row++) {
          if (data.isReserved(row, col)) continue;
          data.xor(row, col, getMaskAt(pattern, row, col));
        }
      }
    };
    exports.getBestMask = function getBestMask(data, setupFormatFunc) {
      const numPatterns = Object.keys(exports.Patterns).length;
      let bestPattern = 0;
      let lowerPenalty = Infinity;
      for (let p = 0; p < numPatterns; p++) {
        setupFormatFunc(p);
        exports.applyMask(p, data);
        const penalty = exports.getPenaltyN1(data) + exports.getPenaltyN2(data) + exports.getPenaltyN3(data) + exports.getPenaltyN4(data);
        exports.applyMask(p, data);
        if (penalty < lowerPenalty) {
          lowerPenalty = penalty;
          bestPattern = p;
        }
      }
      return bestPattern;
    };
  }
});

// node_modules/qrcode/lib/core/error-correction-code.js
var require_error_correction_code = __commonJS({
  "node_modules/qrcode/lib/core/error-correction-code.js"(exports) {
    var ECLevel = require_error_correction_level();
    var EC_BLOCKS_TABLE = [
      // L  M  Q  H
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      2,
      2,
      1,
      2,
      2,
      4,
      1,
      2,
      4,
      4,
      2,
      4,
      4,
      4,
      2,
      4,
      6,
      5,
      2,
      4,
      6,
      6,
      2,
      5,
      8,
      8,
      4,
      5,
      8,
      8,
      4,
      5,
      8,
      11,
      4,
      8,
      10,
      11,
      4,
      9,
      12,
      16,
      4,
      9,
      16,
      16,
      6,
      10,
      12,
      18,
      6,
      10,
      17,
      16,
      6,
      11,
      16,
      19,
      6,
      13,
      18,
      21,
      7,
      14,
      21,
      25,
      8,
      16,
      20,
      25,
      8,
      17,
      23,
      25,
      9,
      17,
      23,
      34,
      9,
      18,
      25,
      30,
      10,
      20,
      27,
      32,
      12,
      21,
      29,
      35,
      12,
      23,
      34,
      37,
      12,
      25,
      34,
      40,
      13,
      26,
      35,
      42,
      14,
      28,
      38,
      45,
      15,
      29,
      40,
      48,
      16,
      31,
      43,
      51,
      17,
      33,
      45,
      54,
      18,
      35,
      48,
      57,
      19,
      37,
      51,
      60,
      19,
      38,
      53,
      63,
      20,
      40,
      56,
      66,
      21,
      43,
      59,
      70,
      22,
      45,
      62,
      74,
      24,
      47,
      65,
      77,
      25,
      49,
      68,
      81
    ];
    var EC_CODEWORDS_TABLE = [
      // L  M  Q  H
      7,
      10,
      13,
      17,
      10,
      16,
      22,
      28,
      15,
      26,
      36,
      44,
      20,
      36,
      52,
      64,
      26,
      48,
      72,
      88,
      36,
      64,
      96,
      112,
      40,
      72,
      108,
      130,
      48,
      88,
      132,
      156,
      60,
      110,
      160,
      192,
      72,
      130,
      192,
      224,
      80,
      150,
      224,
      264,
      96,
      176,
      260,
      308,
      104,
      198,
      288,
      352,
      120,
      216,
      320,
      384,
      132,
      240,
      360,
      432,
      144,
      280,
      408,
      480,
      168,
      308,
      448,
      532,
      180,
      338,
      504,
      588,
      196,
      364,
      546,
      650,
      224,
      416,
      600,
      700,
      224,
      442,
      644,
      750,
      252,
      476,
      690,
      816,
      270,
      504,
      750,
      900,
      300,
      560,
      810,
      960,
      312,
      588,
      870,
      1050,
      336,
      644,
      952,
      1110,
      360,
      700,
      1020,
      1200,
      390,
      728,
      1050,
      1260,
      420,
      784,
      1140,
      1350,
      450,
      812,
      1200,
      1440,
      480,
      868,
      1290,
      1530,
      510,
      924,
      1350,
      1620,
      540,
      980,
      1440,
      1710,
      570,
      1036,
      1530,
      1800,
      570,
      1064,
      1590,
      1890,
      600,
      1120,
      1680,
      1980,
      630,
      1204,
      1770,
      2100,
      660,
      1260,
      1860,
      2220,
      720,
      1316,
      1950,
      2310,
      750,
      1372,
      2040,
      2430
    ];
    exports.getBlocksCount = function getBlocksCount(version2, errorCorrectionLevel) {
      switch (errorCorrectionLevel) {
        case ECLevel.L:
          return EC_BLOCKS_TABLE[(version2 - 1) * 4 + 0];
        case ECLevel.M:
          return EC_BLOCKS_TABLE[(version2 - 1) * 4 + 1];
        case ECLevel.Q:
          return EC_BLOCKS_TABLE[(version2 - 1) * 4 + 2];
        case ECLevel.H:
          return EC_BLOCKS_TABLE[(version2 - 1) * 4 + 3];
        default:
          return void 0;
      }
    };
    exports.getTotalCodewordsCount = function getTotalCodewordsCount(version2, errorCorrectionLevel) {
      switch (errorCorrectionLevel) {
        case ECLevel.L:
          return EC_CODEWORDS_TABLE[(version2 - 1) * 4 + 0];
        case ECLevel.M:
          return EC_CODEWORDS_TABLE[(version2 - 1) * 4 + 1];
        case ECLevel.Q:
          return EC_CODEWORDS_TABLE[(version2 - 1) * 4 + 2];
        case ECLevel.H:
          return EC_CODEWORDS_TABLE[(version2 - 1) * 4 + 3];
        default:
          return void 0;
      }
    };
  }
});

// node_modules/qrcode/lib/core/galois-field.js
var require_galois_field = __commonJS({
  "node_modules/qrcode/lib/core/galois-field.js"(exports) {
    var EXP_TABLE = new Uint8Array(512);
    var LOG_TABLE = new Uint8Array(256);
    (function initTables() {
      let x = 1;
      for (let i = 0; i < 255; i++) {
        EXP_TABLE[i] = x;
        LOG_TABLE[x] = i;
        x <<= 1;
        if (x & 256) {
          x ^= 285;
        }
      }
      for (let i = 255; i < 512; i++) {
        EXP_TABLE[i] = EXP_TABLE[i - 255];
      }
    })();
    exports.log = function log(n) {
      if (n < 1) throw new Error("log(" + n + ")");
      return LOG_TABLE[n];
    };
    exports.exp = function exp(n) {
      return EXP_TABLE[n];
    };
    exports.mul = function mul(x, y) {
      if (x === 0 || y === 0) return 0;
      return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
    };
  }
});

// node_modules/qrcode/lib/core/polynomial.js
var require_polynomial = __commonJS({
  "node_modules/qrcode/lib/core/polynomial.js"(exports) {
    var GF = require_galois_field();
    exports.mul = function mul(p1, p2) {
      const coeff = new Uint8Array(p1.length + p2.length - 1);
      for (let i = 0; i < p1.length; i++) {
        for (let j = 0; j < p2.length; j++) {
          coeff[i + j] ^= GF.mul(p1[i], p2[j]);
        }
      }
      return coeff;
    };
    exports.mod = function mod(divident, divisor) {
      let result = new Uint8Array(divident);
      while (result.length - divisor.length >= 0) {
        const coeff = result[0];
        for (let i = 0; i < divisor.length; i++) {
          result[i] ^= GF.mul(divisor[i], coeff);
        }
        let offset = 0;
        while (offset < result.length && result[offset] === 0) offset++;
        result = result.slice(offset);
      }
      return result;
    };
    exports.generateECPolynomial = function generateECPolynomial(degree) {
      let poly = new Uint8Array([1]);
      for (let i = 0; i < degree; i++) {
        poly = exports.mul(poly, new Uint8Array([1, GF.exp(i)]));
      }
      return poly;
    };
  }
});

// node_modules/qrcode/lib/core/reed-solomon-encoder.js
var require_reed_solomon_encoder = __commonJS({
  "node_modules/qrcode/lib/core/reed-solomon-encoder.js"(exports, module) {
    var Polynomial = require_polynomial();
    function ReedSolomonEncoder(degree) {
      this.genPoly = void 0;
      this.degree = degree;
      if (this.degree) this.initialize(this.degree);
    }
    ReedSolomonEncoder.prototype.initialize = function initialize(degree) {
      this.degree = degree;
      this.genPoly = Polynomial.generateECPolynomial(this.degree);
    };
    ReedSolomonEncoder.prototype.encode = function encode(data) {
      if (!this.genPoly) {
        throw new Error("Encoder not initialized");
      }
      const paddedData = new Uint8Array(data.length + this.degree);
      paddedData.set(data);
      const remainder = Polynomial.mod(paddedData, this.genPoly);
      const start = this.degree - remainder.length;
      if (start > 0) {
        const buff = new Uint8Array(this.degree);
        buff.set(remainder, start);
        return buff;
      }
      return remainder;
    };
    module.exports = ReedSolomonEncoder;
  }
});

// node_modules/qrcode/lib/core/version-check.js
var require_version_check = __commonJS({
  "node_modules/qrcode/lib/core/version-check.js"(exports) {
    exports.isValid = function isValid(version2) {
      return !isNaN(version2) && version2 >= 1 && version2 <= 40;
    };
  }
});

// node_modules/qrcode/lib/core/regex.js
var require_regex = __commonJS({
  "node_modules/qrcode/lib/core/regex.js"(exports) {
    var numeric = "[0-9]+";
    var alphanumeric = "[A-Z $%*+\\-./:]+";
    var kanji = "(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";
    kanji = kanji.replace(/u/g, "\\u");
    var byte = "(?:(?![A-Z0-9 $%*+\\-./:]|" + kanji + ")(?:.|[\r\n]))+";
    exports.KANJI = new RegExp(kanji, "g");
    exports.BYTE_KANJI = new RegExp("[^A-Z0-9 $%*+\\-./:]+", "g");
    exports.BYTE = new RegExp(byte, "g");
    exports.NUMERIC = new RegExp(numeric, "g");
    exports.ALPHANUMERIC = new RegExp(alphanumeric, "g");
    var TEST_KANJI = new RegExp("^" + kanji + "$");
    var TEST_NUMERIC = new RegExp("^" + numeric + "$");
    var TEST_ALPHANUMERIC = new RegExp("^[A-Z0-9 $%*+\\-./:]+$");
    exports.testKanji = function testKanji(str) {
      return TEST_KANJI.test(str);
    };
    exports.testNumeric = function testNumeric(str) {
      return TEST_NUMERIC.test(str);
    };
    exports.testAlphanumeric = function testAlphanumeric(str) {
      return TEST_ALPHANUMERIC.test(str);
    };
  }
});

// node_modules/qrcode/lib/core/mode.js
var require_mode = __commonJS({
  "node_modules/qrcode/lib/core/mode.js"(exports) {
    var VersionCheck = require_version_check();
    var Regex = require_regex();
    exports.NUMERIC = {
      id: "Numeric",
      bit: 1 << 0,
      ccBits: [10, 12, 14]
    };
    exports.ALPHANUMERIC = {
      id: "Alphanumeric",
      bit: 1 << 1,
      ccBits: [9, 11, 13]
    };
    exports.BYTE = {
      id: "Byte",
      bit: 1 << 2,
      ccBits: [8, 16, 16]
    };
    exports.KANJI = {
      id: "Kanji",
      bit: 1 << 3,
      ccBits: [8, 10, 12]
    };
    exports.MIXED = {
      bit: -1
    };
    exports.getCharCountIndicator = function getCharCountIndicator(mode, version2) {
      if (!mode.ccBits) throw new Error("Invalid mode: " + mode);
      if (!VersionCheck.isValid(version2)) {
        throw new Error("Invalid version: " + version2);
      }
      if (version2 >= 1 && version2 < 10) return mode.ccBits[0];
      else if (version2 < 27) return mode.ccBits[1];
      return mode.ccBits[2];
    };
    exports.getBestModeForData = function getBestModeForData(dataStr) {
      if (Regex.testNumeric(dataStr)) return exports.NUMERIC;
      else if (Regex.testAlphanumeric(dataStr)) return exports.ALPHANUMERIC;
      else if (Regex.testKanji(dataStr)) return exports.KANJI;
      else return exports.BYTE;
    };
    exports.toString = function toString(mode) {
      if (mode && mode.id) return mode.id;
      throw new Error("Invalid mode");
    };
    exports.isValid = function isValid(mode) {
      return mode && mode.bit && mode.ccBits;
    };
    function fromString(string) {
      if (typeof string !== "string") {
        throw new Error("Param is not a string");
      }
      const lcStr = string.toLowerCase();
      switch (lcStr) {
        case "numeric":
          return exports.NUMERIC;
        case "alphanumeric":
          return exports.ALPHANUMERIC;
        case "kanji":
          return exports.KANJI;
        case "byte":
          return exports.BYTE;
        default:
          throw new Error("Unknown mode: " + string);
      }
    }
    exports.from = function from(value, defaultValue) {
      if (exports.isValid(value)) {
        return value;
      }
      try {
        return fromString(value);
      } catch (e) {
        return defaultValue;
      }
    };
  }
});

// node_modules/qrcode/lib/core/version.js
var require_version = __commonJS({
  "node_modules/qrcode/lib/core/version.js"(exports) {
    var Utils = require_utils();
    var ECCode = require_error_correction_code();
    var ECLevel = require_error_correction_level();
    var Mode = require_mode();
    var VersionCheck = require_version_check();
    var G18 = 1 << 12 | 1 << 11 | 1 << 10 | 1 << 9 | 1 << 8 | 1 << 5 | 1 << 2 | 1 << 0;
    var G18_BCH = Utils.getBCHDigit(G18);
    function getBestVersionForDataLength(mode, length, errorCorrectionLevel) {
      for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
        if (length <= exports.getCapacity(currentVersion, errorCorrectionLevel, mode)) {
          return currentVersion;
        }
      }
      return void 0;
    }
    function getReservedBitsCount(mode, version2) {
      return Mode.getCharCountIndicator(mode, version2) + 4;
    }
    function getTotalBitsFromDataArray(segments, version2) {
      let totalBits = 0;
      segments.forEach(function(data) {
        const reservedBits = getReservedBitsCount(data.mode, version2);
        totalBits += reservedBits + data.getBitsLength();
      });
      return totalBits;
    }
    function getBestVersionForMixedData(segments, errorCorrectionLevel) {
      for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
        const length = getTotalBitsFromDataArray(segments, currentVersion);
        if (length <= exports.getCapacity(currentVersion, errorCorrectionLevel, Mode.MIXED)) {
          return currentVersion;
        }
      }
      return void 0;
    }
    exports.from = function from(value, defaultValue) {
      if (VersionCheck.isValid(value)) {
        return parseInt(value, 10);
      }
      return defaultValue;
    };
    exports.getCapacity = function getCapacity(version2, errorCorrectionLevel, mode) {
      if (!VersionCheck.isValid(version2)) {
        throw new Error("Invalid QR Code version");
      }
      if (typeof mode === "undefined") mode = Mode.BYTE;
      const totalCodewords = Utils.getSymbolTotalCodewords(version2);
      const ecTotalCodewords = ECCode.getTotalCodewordsCount(version2, errorCorrectionLevel);
      const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;
      if (mode === Mode.MIXED) return dataTotalCodewordsBits;
      const usableBits = dataTotalCodewordsBits - getReservedBitsCount(mode, version2);
      switch (mode) {
        case Mode.NUMERIC:
          return Math.floor(usableBits / 10 * 3);
        case Mode.ALPHANUMERIC:
          return Math.floor(usableBits / 11 * 2);
        case Mode.KANJI:
          return Math.floor(usableBits / 13);
        case Mode.BYTE:
        default:
          return Math.floor(usableBits / 8);
      }
    };
    exports.getBestVersionForData = function getBestVersionForData(data, errorCorrectionLevel) {
      let seg;
      const ecl = ECLevel.from(errorCorrectionLevel, ECLevel.M);
      if (Array.isArray(data)) {
        if (data.length > 1) {
          return getBestVersionForMixedData(data, ecl);
        }
        if (data.length === 0) {
          return 1;
        }
        seg = data[0];
      } else {
        seg = data;
      }
      return getBestVersionForDataLength(seg.mode, seg.getLength(), ecl);
    };
    exports.getEncodedBits = function getEncodedBits(version2) {
      if (!VersionCheck.isValid(version2) || version2 < 7) {
        throw new Error("Invalid QR Code version");
      }
      let d = version2 << 12;
      while (Utils.getBCHDigit(d) - G18_BCH >= 0) {
        d ^= G18 << Utils.getBCHDigit(d) - G18_BCH;
      }
      return version2 << 12 | d;
    };
  }
});

// node_modules/qrcode/lib/core/format-info.js
var require_format_info = __commonJS({
  "node_modules/qrcode/lib/core/format-info.js"(exports) {
    var Utils = require_utils();
    var G15 = 1 << 10 | 1 << 8 | 1 << 5 | 1 << 4 | 1 << 2 | 1 << 1 | 1 << 0;
    var G15_MASK = 1 << 14 | 1 << 12 | 1 << 10 | 1 << 4 | 1 << 1;
    var G15_BCH = Utils.getBCHDigit(G15);
    exports.getEncodedBits = function getEncodedBits(errorCorrectionLevel, mask) {
      const data = errorCorrectionLevel.bit << 3 | mask;
      let d = data << 10;
      while (Utils.getBCHDigit(d) - G15_BCH >= 0) {
        d ^= G15 << Utils.getBCHDigit(d) - G15_BCH;
      }
      return (data << 10 | d) ^ G15_MASK;
    };
  }
});

// node_modules/qrcode/lib/core/numeric-data.js
var require_numeric_data = __commonJS({
  "node_modules/qrcode/lib/core/numeric-data.js"(exports, module) {
    var Mode = require_mode();
    function NumericData(data) {
      this.mode = Mode.NUMERIC;
      this.data = data.toString();
    }
    NumericData.getBitsLength = function getBitsLength(length) {
      return 10 * Math.floor(length / 3) + (length % 3 ? length % 3 * 3 + 1 : 0);
    };
    NumericData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    NumericData.prototype.getBitsLength = function getBitsLength() {
      return NumericData.getBitsLength(this.data.length);
    };
    NumericData.prototype.write = function write(bitBuffer) {
      let i, group, value;
      for (i = 0; i + 3 <= this.data.length; i += 3) {
        group = this.data.substr(i, 3);
        value = parseInt(group, 10);
        bitBuffer.put(value, 10);
      }
      const remainingNum = this.data.length - i;
      if (remainingNum > 0) {
        group = this.data.substr(i);
        value = parseInt(group, 10);
        bitBuffer.put(value, remainingNum * 3 + 1);
      }
    };
    module.exports = NumericData;
  }
});

// node_modules/qrcode/lib/core/alphanumeric-data.js
var require_alphanumeric_data = __commonJS({
  "node_modules/qrcode/lib/core/alphanumeric-data.js"(exports, module) {
    var Mode = require_mode();
    var ALPHA_NUM_CHARS = [
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
      "K",
      "L",
      "M",
      "N",
      "O",
      "P",
      "Q",
      "R",
      "S",
      "T",
      "U",
      "V",
      "W",
      "X",
      "Y",
      "Z",
      " ",
      "$",
      "%",
      "*",
      "+",
      "-",
      ".",
      "/",
      ":"
    ];
    function AlphanumericData(data) {
      this.mode = Mode.ALPHANUMERIC;
      this.data = data;
    }
    AlphanumericData.getBitsLength = function getBitsLength(length) {
      return 11 * Math.floor(length / 2) + 6 * (length % 2);
    };
    AlphanumericData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    AlphanumericData.prototype.getBitsLength = function getBitsLength() {
      return AlphanumericData.getBitsLength(this.data.length);
    };
    AlphanumericData.prototype.write = function write(bitBuffer) {
      let i;
      for (i = 0; i + 2 <= this.data.length; i += 2) {
        let value = ALPHA_NUM_CHARS.indexOf(this.data[i]) * 45;
        value += ALPHA_NUM_CHARS.indexOf(this.data[i + 1]);
        bitBuffer.put(value, 11);
      }
      if (this.data.length % 2) {
        bitBuffer.put(ALPHA_NUM_CHARS.indexOf(this.data[i]), 6);
      }
    };
    module.exports = AlphanumericData;
  }
});

// node_modules/qrcode/lib/core/byte-data.js
var require_byte_data = __commonJS({
  "node_modules/qrcode/lib/core/byte-data.js"(exports, module) {
    var Mode = require_mode();
    function ByteData(data) {
      this.mode = Mode.BYTE;
      if (typeof data === "string") {
        this.data = new TextEncoder().encode(data);
      } else {
        this.data = new Uint8Array(data);
      }
    }
    ByteData.getBitsLength = function getBitsLength(length) {
      return length * 8;
    };
    ByteData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    ByteData.prototype.getBitsLength = function getBitsLength() {
      return ByteData.getBitsLength(this.data.length);
    };
    ByteData.prototype.write = function(bitBuffer) {
      for (let i = 0, l = this.data.length; i < l; i++) {
        bitBuffer.put(this.data[i], 8);
      }
    };
    module.exports = ByteData;
  }
});

// node_modules/qrcode/lib/core/kanji-data.js
var require_kanji_data = __commonJS({
  "node_modules/qrcode/lib/core/kanji-data.js"(exports, module) {
    var Mode = require_mode();
    var Utils = require_utils();
    function KanjiData(data) {
      this.mode = Mode.KANJI;
      this.data = data;
    }
    KanjiData.getBitsLength = function getBitsLength(length) {
      return length * 13;
    };
    KanjiData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    KanjiData.prototype.getBitsLength = function getBitsLength() {
      return KanjiData.getBitsLength(this.data.length);
    };
    KanjiData.prototype.write = function(bitBuffer) {
      let i;
      for (i = 0; i < this.data.length; i++) {
        let value = Utils.toSJIS(this.data[i]);
        if (value >= 33088 && value <= 40956) {
          value -= 33088;
        } else if (value >= 57408 && value <= 60351) {
          value -= 49472;
        } else {
          throw new Error(
            "Invalid SJIS character: " + this.data[i] + "\nMake sure your charset is UTF-8"
          );
        }
        value = (value >>> 8 & 255) * 192 + (value & 255);
        bitBuffer.put(value, 13);
      }
    };
    module.exports = KanjiData;
  }
});

// node_modules/dijkstrajs/dijkstra.js
var require_dijkstra = __commonJS({
  "node_modules/dijkstrajs/dijkstra.js"(exports, module) {
    "use strict";
    var dijkstra = {
      single_source_shortest_paths: function(graph, s, d) {
        var predecessors = {};
        var costs = {};
        costs[s] = 0;
        var open = dijkstra.PriorityQueue.make();
        open.push(s, 0);
        var closest, u, v, cost_of_s_to_u, adjacent_nodes, cost_of_e, cost_of_s_to_u_plus_cost_of_e, cost_of_s_to_v, first_visit;
        while (!open.empty()) {
          closest = open.pop();
          u = closest.value;
          cost_of_s_to_u = closest.cost;
          adjacent_nodes = graph[u] || {};
          for (v in adjacent_nodes) {
            if (adjacent_nodes.hasOwnProperty(v)) {
              cost_of_e = adjacent_nodes[v];
              cost_of_s_to_u_plus_cost_of_e = cost_of_s_to_u + cost_of_e;
              cost_of_s_to_v = costs[v];
              first_visit = typeof costs[v] === "undefined";
              if (first_visit || cost_of_s_to_v > cost_of_s_to_u_plus_cost_of_e) {
                costs[v] = cost_of_s_to_u_plus_cost_of_e;
                open.push(v, cost_of_s_to_u_plus_cost_of_e);
                predecessors[v] = u;
              }
            }
          }
        }
        if (typeof d !== "undefined" && typeof costs[d] === "undefined") {
          var msg = ["Could not find a path from ", s, " to ", d, "."].join("");
          throw new Error(msg);
        }
        return predecessors;
      },
      extract_shortest_path_from_predecessor_list: function(predecessors, d) {
        var nodes = [];
        var u = d;
        var predecessor;
        while (u) {
          nodes.push(u);
          predecessor = predecessors[u];
          u = predecessors[u];
        }
        nodes.reverse();
        return nodes;
      },
      find_path: function(graph, s, d) {
        var predecessors = dijkstra.single_source_shortest_paths(graph, s, d);
        return dijkstra.extract_shortest_path_from_predecessor_list(
          predecessors,
          d
        );
      },
      /**
       * A very naive priority queue implementation.
       */
      PriorityQueue: {
        make: function(opts) {
          var T = dijkstra.PriorityQueue, t = {}, key;
          opts = opts || {};
          for (key in T) {
            if (T.hasOwnProperty(key)) {
              t[key] = T[key];
            }
          }
          t.queue = [];
          t.sorter = opts.sorter || T.default_sorter;
          return t;
        },
        default_sorter: function(a, b) {
          return a.cost - b.cost;
        },
        /**
         * Add a new item to the queue and ensure the highest priority element
         * is at the front of the queue.
         */
        push: function(value, cost) {
          var item = { value, cost };
          this.queue.push(item);
          this.queue.sort(this.sorter);
        },
        /**
         * Return the highest priority element in the queue.
         */
        pop: function() {
          return this.queue.shift();
        },
        empty: function() {
          return this.queue.length === 0;
        }
      }
    };
    if (typeof module !== "undefined") {
      module.exports = dijkstra;
    }
  }
});

// node_modules/qrcode/lib/core/segments.js
var require_segments = __commonJS({
  "node_modules/qrcode/lib/core/segments.js"(exports) {
    var Mode = require_mode();
    var NumericData = require_numeric_data();
    var AlphanumericData = require_alphanumeric_data();
    var ByteData = require_byte_data();
    var KanjiData = require_kanji_data();
    var Regex = require_regex();
    var Utils = require_utils();
    var dijkstra = require_dijkstra();
    function getStringByteLength(str) {
      return unescape(encodeURIComponent(str)).length;
    }
    function getSegments(regex, mode, str) {
      const segments = [];
      let result;
      while ((result = regex.exec(str)) !== null) {
        segments.push({
          data: result[0],
          index: result.index,
          mode,
          length: result[0].length
        });
      }
      return segments;
    }
    function getSegmentsFromString(dataStr) {
      const numSegs = getSegments(Regex.NUMERIC, Mode.NUMERIC, dataStr);
      const alphaNumSegs = getSegments(Regex.ALPHANUMERIC, Mode.ALPHANUMERIC, dataStr);
      let byteSegs;
      let kanjiSegs;
      if (Utils.isKanjiModeEnabled()) {
        byteSegs = getSegments(Regex.BYTE, Mode.BYTE, dataStr);
        kanjiSegs = getSegments(Regex.KANJI, Mode.KANJI, dataStr);
      } else {
        byteSegs = getSegments(Regex.BYTE_KANJI, Mode.BYTE, dataStr);
        kanjiSegs = [];
      }
      const segs = numSegs.concat(alphaNumSegs, byteSegs, kanjiSegs);
      return segs.sort(function(s1, s2) {
        return s1.index - s2.index;
      }).map(function(obj) {
        return {
          data: obj.data,
          mode: obj.mode,
          length: obj.length
        };
      });
    }
    function getSegmentBitsLength(length, mode) {
      switch (mode) {
        case Mode.NUMERIC:
          return NumericData.getBitsLength(length);
        case Mode.ALPHANUMERIC:
          return AlphanumericData.getBitsLength(length);
        case Mode.KANJI:
          return KanjiData.getBitsLength(length);
        case Mode.BYTE:
          return ByteData.getBitsLength(length);
      }
    }
    function mergeSegments(segs) {
      return segs.reduce(function(acc, curr) {
        const prevSeg = acc.length - 1 >= 0 ? acc[acc.length - 1] : null;
        if (prevSeg && prevSeg.mode === curr.mode) {
          acc[acc.length - 1].data += curr.data;
          return acc;
        }
        acc.push(curr);
        return acc;
      }, []);
    }
    function buildNodes(segs) {
      const nodes = [];
      for (let i = 0; i < segs.length; i++) {
        const seg = segs[i];
        switch (seg.mode) {
          case Mode.NUMERIC:
            nodes.push([
              seg,
              { data: seg.data, mode: Mode.ALPHANUMERIC, length: seg.length },
              { data: seg.data, mode: Mode.BYTE, length: seg.length }
            ]);
            break;
          case Mode.ALPHANUMERIC:
            nodes.push([
              seg,
              { data: seg.data, mode: Mode.BYTE, length: seg.length }
            ]);
            break;
          case Mode.KANJI:
            nodes.push([
              seg,
              { data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) }
            ]);
            break;
          case Mode.BYTE:
            nodes.push([
              { data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) }
            ]);
        }
      }
      return nodes;
    }
    function buildGraph(nodes, version2) {
      const table = {};
      const graph = { start: {} };
      let prevNodeIds = ["start"];
      for (let i = 0; i < nodes.length; i++) {
        const nodeGroup = nodes[i];
        const currentNodeIds = [];
        for (let j = 0; j < nodeGroup.length; j++) {
          const node = nodeGroup[j];
          const key = "" + i + j;
          currentNodeIds.push(key);
          table[key] = { node, lastCount: 0 };
          graph[key] = {};
          for (let n = 0; n < prevNodeIds.length; n++) {
            const prevNodeId = prevNodeIds[n];
            if (table[prevNodeId] && table[prevNodeId].node.mode === node.mode) {
              graph[prevNodeId][key] = getSegmentBitsLength(table[prevNodeId].lastCount + node.length, node.mode) - getSegmentBitsLength(table[prevNodeId].lastCount, node.mode);
              table[prevNodeId].lastCount += node.length;
            } else {
              if (table[prevNodeId]) table[prevNodeId].lastCount = node.length;
              graph[prevNodeId][key] = getSegmentBitsLength(node.length, node.mode) + 4 + Mode.getCharCountIndicator(node.mode, version2);
            }
          }
        }
        prevNodeIds = currentNodeIds;
      }
      for (let n = 0; n < prevNodeIds.length; n++) {
        graph[prevNodeIds[n]].end = 0;
      }
      return { map: graph, table };
    }
    function buildSingleSegment(data, modesHint) {
      let mode;
      const bestMode = Mode.getBestModeForData(data);
      mode = Mode.from(modesHint, bestMode);
      if (mode !== Mode.BYTE && mode.bit < bestMode.bit) {
        throw new Error('"' + data + '" cannot be encoded with mode ' + Mode.toString(mode) + ".\n Suggested mode is: " + Mode.toString(bestMode));
      }
      if (mode === Mode.KANJI && !Utils.isKanjiModeEnabled()) {
        mode = Mode.BYTE;
      }
      switch (mode) {
        case Mode.NUMERIC:
          return new NumericData(data);
        case Mode.ALPHANUMERIC:
          return new AlphanumericData(data);
        case Mode.KANJI:
          return new KanjiData(data);
        case Mode.BYTE:
          return new ByteData(data);
      }
    }
    exports.fromArray = function fromArray(array) {
      return array.reduce(function(acc, seg) {
        if (typeof seg === "string") {
          acc.push(buildSingleSegment(seg, null));
        } else if (seg.data) {
          acc.push(buildSingleSegment(seg.data, seg.mode));
        }
        return acc;
      }, []);
    };
    exports.fromString = function fromString(data, version2) {
      const segs = getSegmentsFromString(data, Utils.isKanjiModeEnabled());
      const nodes = buildNodes(segs);
      const graph = buildGraph(nodes, version2);
      const path2 = dijkstra.find_path(graph.map, "start", "end");
      const optimizedSegs = [];
      for (let i = 1; i < path2.length - 1; i++) {
        optimizedSegs.push(graph.table[path2[i]].node);
      }
      return exports.fromArray(mergeSegments(optimizedSegs));
    };
    exports.rawSplit = function rawSplit(data) {
      return exports.fromArray(
        getSegmentsFromString(data, Utils.isKanjiModeEnabled())
      );
    };
  }
});

// node_modules/qrcode/lib/core/qrcode.js
var require_qrcode = __commonJS({
  "node_modules/qrcode/lib/core/qrcode.js"(exports) {
    var Utils = require_utils();
    var ECLevel = require_error_correction_level();
    var BitBuffer = require_bit_buffer();
    var BitMatrix = require_bit_matrix();
    var AlignmentPattern = require_alignment_pattern();
    var FinderPattern = require_finder_pattern();
    var MaskPattern = require_mask_pattern();
    var ECCode = require_error_correction_code();
    var ReedSolomonEncoder = require_reed_solomon_encoder();
    var Version = require_version();
    var FormatInfo = require_format_info();
    var Mode = require_mode();
    var Segments = require_segments();
    function setupFinderPattern(matrix, version2) {
      const size2 = matrix.size;
      const pos = FinderPattern.getPositions(version2);
      for (let i = 0; i < pos.length; i++) {
        const row = pos[i][0];
        const col = pos[i][1];
        for (let r = -1; r <= 7; r++) {
          if (row + r <= -1 || size2 <= row + r) continue;
          for (let c = -1; c <= 7; c++) {
            if (col + c <= -1 || size2 <= col + c) continue;
            if (r >= 0 && r <= 6 && (c === 0 || c === 6) || c >= 0 && c <= 6 && (r === 0 || r === 6) || r >= 2 && r <= 4 && c >= 2 && c <= 4) {
              matrix.set(row + r, col + c, true, true);
            } else {
              matrix.set(row + r, col + c, false, true);
            }
          }
        }
      }
    }
    function setupTimingPattern(matrix) {
      const size2 = matrix.size;
      for (let r = 8; r < size2 - 8; r++) {
        const value = r % 2 === 0;
        matrix.set(r, 6, value, true);
        matrix.set(6, r, value, true);
      }
    }
    function setupAlignmentPattern(matrix, version2) {
      const pos = AlignmentPattern.getPositions(version2);
      for (let i = 0; i < pos.length; i++) {
        const row = pos[i][0];
        const col = pos[i][1];
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            if (r === -2 || r === 2 || c === -2 || c === 2 || r === 0 && c === 0) {
              matrix.set(row + r, col + c, true, true);
            } else {
              matrix.set(row + r, col + c, false, true);
            }
          }
        }
      }
    }
    function setupVersionInfo(matrix, version2) {
      const size2 = matrix.size;
      const bits = Version.getEncodedBits(version2);
      let row, col, mod;
      for (let i = 0; i < 18; i++) {
        row = Math.floor(i / 3);
        col = i % 3 + size2 - 8 - 3;
        mod = (bits >> i & 1) === 1;
        matrix.set(row, col, mod, true);
        matrix.set(col, row, mod, true);
      }
    }
    function setupFormatInfo(matrix, errorCorrectionLevel, maskPattern) {
      const size2 = matrix.size;
      const bits = FormatInfo.getEncodedBits(errorCorrectionLevel, maskPattern);
      let i, mod;
      for (i = 0; i < 15; i++) {
        mod = (bits >> i & 1) === 1;
        if (i < 6) {
          matrix.set(i, 8, mod, true);
        } else if (i < 8) {
          matrix.set(i + 1, 8, mod, true);
        } else {
          matrix.set(size2 - 15 + i, 8, mod, true);
        }
        if (i < 8) {
          matrix.set(8, size2 - i - 1, mod, true);
        } else if (i < 9) {
          matrix.set(8, 15 - i - 1 + 1, mod, true);
        } else {
          matrix.set(8, 15 - i - 1, mod, true);
        }
      }
      matrix.set(size2 - 8, 8, 1, true);
    }
    function setupData(matrix, data) {
      const size2 = matrix.size;
      let inc = -1;
      let row = size2 - 1;
      let bitIndex = 7;
      let byteIndex = 0;
      for (let col = size2 - 1; col > 0; col -= 2) {
        if (col === 6) col--;
        while (true) {
          for (let c = 0; c < 2; c++) {
            if (!matrix.isReserved(row, col - c)) {
              let dark = false;
              if (byteIndex < data.length) {
                dark = (data[byteIndex] >>> bitIndex & 1) === 1;
              }
              matrix.set(row, col - c, dark);
              bitIndex--;
              if (bitIndex === -1) {
                byteIndex++;
                bitIndex = 7;
              }
            }
          }
          row += inc;
          if (row < 0 || size2 <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    }
    function createData(version2, errorCorrectionLevel, segments) {
      const buffer = new BitBuffer();
      segments.forEach(function(data) {
        buffer.put(data.mode.bit, 4);
        buffer.put(data.getLength(), Mode.getCharCountIndicator(data.mode, version2));
        data.write(buffer);
      });
      const totalCodewords = Utils.getSymbolTotalCodewords(version2);
      const ecTotalCodewords = ECCode.getTotalCodewordsCount(version2, errorCorrectionLevel);
      const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;
      if (buffer.getLengthInBits() + 4 <= dataTotalCodewordsBits) {
        buffer.put(0, 4);
      }
      while (buffer.getLengthInBits() % 8 !== 0) {
        buffer.putBit(0);
      }
      const remainingByte = (dataTotalCodewordsBits - buffer.getLengthInBits()) / 8;
      for (let i = 0; i < remainingByte; i++) {
        buffer.put(i % 2 ? 17 : 236, 8);
      }
      return createCodewords(buffer, version2, errorCorrectionLevel);
    }
    function createCodewords(bitBuffer, version2, errorCorrectionLevel) {
      const totalCodewords = Utils.getSymbolTotalCodewords(version2);
      const ecTotalCodewords = ECCode.getTotalCodewordsCount(version2, errorCorrectionLevel);
      const dataTotalCodewords = totalCodewords - ecTotalCodewords;
      const ecTotalBlocks = ECCode.getBlocksCount(version2, errorCorrectionLevel);
      const blocksInGroup2 = totalCodewords % ecTotalBlocks;
      const blocksInGroup1 = ecTotalBlocks - blocksInGroup2;
      const totalCodewordsInGroup1 = Math.floor(totalCodewords / ecTotalBlocks);
      const dataCodewordsInGroup1 = Math.floor(dataTotalCodewords / ecTotalBlocks);
      const dataCodewordsInGroup2 = dataCodewordsInGroup1 + 1;
      const ecCount = totalCodewordsInGroup1 - dataCodewordsInGroup1;
      const rs = new ReedSolomonEncoder(ecCount);
      let offset = 0;
      const dcData = new Array(ecTotalBlocks);
      const ecData = new Array(ecTotalBlocks);
      let maxDataSize = 0;
      const buffer = new Uint8Array(bitBuffer.buffer);
      for (let b = 0; b < ecTotalBlocks; b++) {
        const dataSize = b < blocksInGroup1 ? dataCodewordsInGroup1 : dataCodewordsInGroup2;
        dcData[b] = buffer.slice(offset, offset + dataSize);
        ecData[b] = rs.encode(dcData[b]);
        offset += dataSize;
        maxDataSize = Math.max(maxDataSize, dataSize);
      }
      const data = new Uint8Array(totalCodewords);
      let index = 0;
      let i, r;
      for (i = 0; i < maxDataSize; i++) {
        for (r = 0; r < ecTotalBlocks; r++) {
          if (i < dcData[r].length) {
            data[index++] = dcData[r][i];
          }
        }
      }
      for (i = 0; i < ecCount; i++) {
        for (r = 0; r < ecTotalBlocks; r++) {
          data[index++] = ecData[r][i];
        }
      }
      return data;
    }
    function createSymbol(data, version2, errorCorrectionLevel, maskPattern) {
      let segments;
      if (Array.isArray(data)) {
        segments = Segments.fromArray(data);
      } else if (typeof data === "string") {
        let estimatedVersion = version2;
        if (!estimatedVersion) {
          const rawSegments = Segments.rawSplit(data);
          estimatedVersion = Version.getBestVersionForData(rawSegments, errorCorrectionLevel);
        }
        segments = Segments.fromString(data, estimatedVersion || 40);
      } else {
        throw new Error("Invalid data");
      }
      const bestVersion = Version.getBestVersionForData(segments, errorCorrectionLevel);
      if (!bestVersion) {
        throw new Error("The amount of data is too big to be stored in a QR Code");
      }
      if (!version2) {
        version2 = bestVersion;
      } else if (version2 < bestVersion) {
        throw new Error(
          "\nThe chosen QR Code version cannot contain this amount of data.\nMinimum version required to store current data is: " + bestVersion + ".\n"
        );
      }
      const dataBits = createData(version2, errorCorrectionLevel, segments);
      const moduleCount = Utils.getSymbolSize(version2);
      const modules = new BitMatrix(moduleCount);
      setupFinderPattern(modules, version2);
      setupTimingPattern(modules);
      setupAlignmentPattern(modules, version2);
      setupFormatInfo(modules, errorCorrectionLevel, 0);
      if (version2 >= 7) {
        setupVersionInfo(modules, version2);
      }
      setupData(modules, dataBits);
      if (isNaN(maskPattern)) {
        maskPattern = MaskPattern.getBestMask(
          modules,
          setupFormatInfo.bind(null, modules, errorCorrectionLevel)
        );
      }
      MaskPattern.applyMask(maskPattern, modules);
      setupFormatInfo(modules, errorCorrectionLevel, maskPattern);
      return {
        modules,
        version: version2,
        errorCorrectionLevel,
        maskPattern,
        segments
      };
    }
    exports.create = function create(data, options) {
      if (typeof data === "undefined" || data === "") {
        throw new Error("No input text");
      }
      let errorCorrectionLevel = ECLevel.M;
      let version2;
      let mask;
      if (typeof options !== "undefined") {
        errorCorrectionLevel = ECLevel.from(options.errorCorrectionLevel, ECLevel.M);
        version2 = Version.from(options.version);
        mask = MaskPattern.from(options.maskPattern);
        if (options.toSJISFunc) {
          Utils.setToSJISFunction(options.toSJISFunc);
        }
      }
      return createSymbol(data, version2, errorCorrectionLevel, mask);
    };
  }
});

// node_modules/pngjs/lib/chunkstream.js
var require_chunkstream = __commonJS({
  "node_modules/pngjs/lib/chunkstream.js"(exports, module) {
    "use strict";
    var util = __require("util");
    var Stream = __require("stream");
    var ChunkStream = module.exports = function() {
      Stream.call(this);
      this._buffers = [];
      this._buffered = 0;
      this._reads = [];
      this._paused = false;
      this._encoding = "utf8";
      this.writable = true;
    };
    util.inherits(ChunkStream, Stream);
    ChunkStream.prototype.read = function(length, callback) {
      this._reads.push({
        length: Math.abs(length),
        // if length < 0 then at most this length
        allowLess: length < 0,
        func: callback
      });
      process.nextTick(
        function() {
          this._process();
          if (this._paused && this._reads && this._reads.length > 0) {
            this._paused = false;
            this.emit("drain");
          }
        }.bind(this)
      );
    };
    ChunkStream.prototype.write = function(data, encoding) {
      if (!this.writable) {
        this.emit("error", new Error("Stream not writable"));
        return false;
      }
      let dataBuffer;
      if (Buffer.isBuffer(data)) {
        dataBuffer = data;
      } else {
        dataBuffer = Buffer.from(data, encoding || this._encoding);
      }
      this._buffers.push(dataBuffer);
      this._buffered += dataBuffer.length;
      this._process();
      if (this._reads && this._reads.length === 0) {
        this._paused = true;
      }
      return this.writable && !this._paused;
    };
    ChunkStream.prototype.end = function(data, encoding) {
      if (data) {
        this.write(data, encoding);
      }
      this.writable = false;
      if (!this._buffers) {
        return;
      }
      if (this._buffers.length === 0) {
        this._end();
      } else {
        this._buffers.push(null);
        this._process();
      }
    };
    ChunkStream.prototype.destroySoon = ChunkStream.prototype.end;
    ChunkStream.prototype._end = function() {
      if (this._reads.length > 0) {
        this.emit("error", new Error("Unexpected end of input"));
      }
      this.destroy();
    };
    ChunkStream.prototype.destroy = function() {
      if (!this._buffers) {
        return;
      }
      this.writable = false;
      this._reads = null;
      this._buffers = null;
      this.emit("close");
    };
    ChunkStream.prototype._processReadAllowingLess = function(read) {
      this._reads.shift();
      let smallerBuf = this._buffers[0];
      if (smallerBuf.length > read.length) {
        this._buffered -= read.length;
        this._buffers[0] = smallerBuf.slice(read.length);
        read.func.call(this, smallerBuf.slice(0, read.length));
      } else {
        this._buffered -= smallerBuf.length;
        this._buffers.shift();
        read.func.call(this, smallerBuf);
      }
    };
    ChunkStream.prototype._processRead = function(read) {
      this._reads.shift();
      let pos = 0;
      let count = 0;
      let data = Buffer.alloc(read.length);
      while (pos < read.length) {
        let buf = this._buffers[count++];
        let len = Math.min(buf.length, read.length - pos);
        buf.copy(data, pos, 0, len);
        pos += len;
        if (len !== buf.length) {
          this._buffers[--count] = buf.slice(len);
        }
      }
      if (count > 0) {
        this._buffers.splice(0, count);
      }
      this._buffered -= read.length;
      read.func.call(this, data);
    };
    ChunkStream.prototype._process = function() {
      try {
        while (this._buffered > 0 && this._reads && this._reads.length > 0) {
          let read = this._reads[0];
          if (read.allowLess) {
            this._processReadAllowingLess(read);
          } else if (this._buffered >= read.length) {
            this._processRead(read);
          } else {
            break;
          }
        }
        if (this._buffers && !this.writable) {
          this._end();
        }
      } catch (ex) {
        this.emit("error", ex);
      }
    };
  }
});

// node_modules/pngjs/lib/interlace.js
var require_interlace = __commonJS({
  "node_modules/pngjs/lib/interlace.js"(exports) {
    "use strict";
    var imagePasses = [
      {
        // pass 1 - 1px
        x: [0],
        y: [0]
      },
      {
        // pass 2 - 1px
        x: [4],
        y: [0]
      },
      {
        // pass 3 - 2px
        x: [0, 4],
        y: [4]
      },
      {
        // pass 4 - 4px
        x: [2, 6],
        y: [0, 4]
      },
      {
        // pass 5 - 8px
        x: [0, 2, 4, 6],
        y: [2, 6]
      },
      {
        // pass 6 - 16px
        x: [1, 3, 5, 7],
        y: [0, 2, 4, 6]
      },
      {
        // pass 7 - 32px
        x: [0, 1, 2, 3, 4, 5, 6, 7],
        y: [1, 3, 5, 7]
      }
    ];
    exports.getImagePasses = function(width, height) {
      let images = [];
      let xLeftOver = width % 8;
      let yLeftOver = height % 8;
      let xRepeats = (width - xLeftOver) / 8;
      let yRepeats = (height - yLeftOver) / 8;
      for (let i = 0; i < imagePasses.length; i++) {
        let pass = imagePasses[i];
        let passWidth = xRepeats * pass.x.length;
        let passHeight = yRepeats * pass.y.length;
        for (let j = 0; j < pass.x.length; j++) {
          if (pass.x[j] < xLeftOver) {
            passWidth++;
          } else {
            break;
          }
        }
        for (let j = 0; j < pass.y.length; j++) {
          if (pass.y[j] < yLeftOver) {
            passHeight++;
          } else {
            break;
          }
        }
        if (passWidth > 0 && passHeight > 0) {
          images.push({ width: passWidth, height: passHeight, index: i });
        }
      }
      return images;
    };
    exports.getInterlaceIterator = function(width) {
      return function(x, y, pass) {
        let outerXLeftOver = x % imagePasses[pass].x.length;
        let outerX = (x - outerXLeftOver) / imagePasses[pass].x.length * 8 + imagePasses[pass].x[outerXLeftOver];
        let outerYLeftOver = y % imagePasses[pass].y.length;
        let outerY = (y - outerYLeftOver) / imagePasses[pass].y.length * 8 + imagePasses[pass].y[outerYLeftOver];
        return outerX * 4 + outerY * width * 4;
      };
    };
  }
});

// node_modules/pngjs/lib/paeth-predictor.js
var require_paeth_predictor = __commonJS({
  "node_modules/pngjs/lib/paeth-predictor.js"(exports, module) {
    "use strict";
    module.exports = function paethPredictor(left, above, upLeft) {
      let paeth = left + above - upLeft;
      let pLeft = Math.abs(paeth - left);
      let pAbove = Math.abs(paeth - above);
      let pUpLeft = Math.abs(paeth - upLeft);
      if (pLeft <= pAbove && pLeft <= pUpLeft) {
        return left;
      }
      if (pAbove <= pUpLeft) {
        return above;
      }
      return upLeft;
    };
  }
});

// node_modules/pngjs/lib/filter-parse.js
var require_filter_parse = __commonJS({
  "node_modules/pngjs/lib/filter-parse.js"(exports, module) {
    "use strict";
    var interlaceUtils = require_interlace();
    var paethPredictor = require_paeth_predictor();
    function getByteWidth(width, bpp, depth) {
      let byteWidth = width * bpp;
      if (depth !== 8) {
        byteWidth = Math.ceil(byteWidth / (8 / depth));
      }
      return byteWidth;
    }
    var Filter = module.exports = function(bitmapInfo, dependencies) {
      let width = bitmapInfo.width;
      let height = bitmapInfo.height;
      let interlace = bitmapInfo.interlace;
      let bpp = bitmapInfo.bpp;
      let depth = bitmapInfo.depth;
      this.read = dependencies.read;
      this.write = dependencies.write;
      this.complete = dependencies.complete;
      this._imageIndex = 0;
      this._images = [];
      if (interlace) {
        let passes = interlaceUtils.getImagePasses(width, height);
        for (let i = 0; i < passes.length; i++) {
          this._images.push({
            byteWidth: getByteWidth(passes[i].width, bpp, depth),
            height: passes[i].height,
            lineIndex: 0
          });
        }
      } else {
        this._images.push({
          byteWidth: getByteWidth(width, bpp, depth),
          height,
          lineIndex: 0
        });
      }
      if (depth === 8) {
        this._xComparison = bpp;
      } else if (depth === 16) {
        this._xComparison = bpp * 2;
      } else {
        this._xComparison = 1;
      }
    };
    Filter.prototype.start = function() {
      this.read(
        this._images[this._imageIndex].byteWidth + 1,
        this._reverseFilterLine.bind(this)
      );
    };
    Filter.prototype._unFilterType1 = function(rawData, unfilteredLine, byteWidth) {
      let xComparison = this._xComparison;
      let xBiggerThan = xComparison - 1;
      for (let x = 0; x < byteWidth; x++) {
        let rawByte = rawData[1 + x];
        let f1Left = x > xBiggerThan ? unfilteredLine[x - xComparison] : 0;
        unfilteredLine[x] = rawByte + f1Left;
      }
    };
    Filter.prototype._unFilterType2 = function(rawData, unfilteredLine, byteWidth) {
      let lastLine = this._lastLine;
      for (let x = 0; x < byteWidth; x++) {
        let rawByte = rawData[1 + x];
        let f2Up = lastLine ? lastLine[x] : 0;
        unfilteredLine[x] = rawByte + f2Up;
      }
    };
    Filter.prototype._unFilterType3 = function(rawData, unfilteredLine, byteWidth) {
      let xComparison = this._xComparison;
      let xBiggerThan = xComparison - 1;
      let lastLine = this._lastLine;
      for (let x = 0; x < byteWidth; x++) {
        let rawByte = rawData[1 + x];
        let f3Up = lastLine ? lastLine[x] : 0;
        let f3Left = x > xBiggerThan ? unfilteredLine[x - xComparison] : 0;
        let f3Add = Math.floor((f3Left + f3Up) / 2);
        unfilteredLine[x] = rawByte + f3Add;
      }
    };
    Filter.prototype._unFilterType4 = function(rawData, unfilteredLine, byteWidth) {
      let xComparison = this._xComparison;
      let xBiggerThan = xComparison - 1;
      let lastLine = this._lastLine;
      for (let x = 0; x < byteWidth; x++) {
        let rawByte = rawData[1 + x];
        let f4Up = lastLine ? lastLine[x] : 0;
        let f4Left = x > xBiggerThan ? unfilteredLine[x - xComparison] : 0;
        let f4UpLeft = x > xBiggerThan && lastLine ? lastLine[x - xComparison] : 0;
        let f4Add = paethPredictor(f4Left, f4Up, f4UpLeft);
        unfilteredLine[x] = rawByte + f4Add;
      }
    };
    Filter.prototype._reverseFilterLine = function(rawData) {
      let filter = rawData[0];
      let unfilteredLine;
      let currentImage = this._images[this._imageIndex];
      let byteWidth = currentImage.byteWidth;
      if (filter === 0) {
        unfilteredLine = rawData.slice(1, byteWidth + 1);
      } else {
        unfilteredLine = Buffer.alloc(byteWidth);
        switch (filter) {
          case 1:
            this._unFilterType1(rawData, unfilteredLine, byteWidth);
            break;
          case 2:
            this._unFilterType2(rawData, unfilteredLine, byteWidth);
            break;
          case 3:
            this._unFilterType3(rawData, unfilteredLine, byteWidth);
            break;
          case 4:
            this._unFilterType4(rawData, unfilteredLine, byteWidth);
            break;
          default:
            throw new Error("Unrecognised filter type - " + filter);
        }
      }
      this.write(unfilteredLine);
      currentImage.lineIndex++;
      if (currentImage.lineIndex >= currentImage.height) {
        this._lastLine = null;
        this._imageIndex++;
        currentImage = this._images[this._imageIndex];
      } else {
        this._lastLine = unfilteredLine;
      }
      if (currentImage) {
        this.read(currentImage.byteWidth + 1, this._reverseFilterLine.bind(this));
      } else {
        this._lastLine = null;
        this.complete();
      }
    };
  }
});

// node_modules/pngjs/lib/filter-parse-async.js
var require_filter_parse_async = __commonJS({
  "node_modules/pngjs/lib/filter-parse-async.js"(exports, module) {
    "use strict";
    var util = __require("util");
    var ChunkStream = require_chunkstream();
    var Filter = require_filter_parse();
    var FilterAsync = module.exports = function(bitmapInfo) {
      ChunkStream.call(this);
      let buffers = [];
      let that = this;
      this._filter = new Filter(bitmapInfo, {
        read: this.read.bind(this),
        write: function(buffer) {
          buffers.push(buffer);
        },
        complete: function() {
          that.emit("complete", Buffer.concat(buffers));
        }
      });
      this._filter.start();
    };
    util.inherits(FilterAsync, ChunkStream);
  }
});

// node_modules/pngjs/lib/constants.js
var require_constants = __commonJS({
  "node_modules/pngjs/lib/constants.js"(exports, module) {
    "use strict";
    module.exports = {
      PNG_SIGNATURE: [137, 80, 78, 71, 13, 10, 26, 10],
      TYPE_IHDR: 1229472850,
      TYPE_IEND: 1229278788,
      TYPE_IDAT: 1229209940,
      TYPE_PLTE: 1347179589,
      TYPE_tRNS: 1951551059,
      // eslint-disable-line camelcase
      TYPE_gAMA: 1732332865,
      // eslint-disable-line camelcase
      // color-type bits
      COLORTYPE_GRAYSCALE: 0,
      COLORTYPE_PALETTE: 1,
      COLORTYPE_COLOR: 2,
      COLORTYPE_ALPHA: 4,
      // e.g. grayscale and alpha
      // color-type combinations
      COLORTYPE_PALETTE_COLOR: 3,
      COLORTYPE_COLOR_ALPHA: 6,
      COLORTYPE_TO_BPP_MAP: {
        0: 1,
        2: 3,
        3: 1,
        4: 2,
        6: 4
      },
      GAMMA_DIVISION: 1e5
    };
  }
});

// node_modules/pngjs/lib/crc.js
var require_crc = __commonJS({
  "node_modules/pngjs/lib/crc.js"(exports, module) {
    "use strict";
    var crcTable = [];
    (function() {
      for (let i = 0; i < 256; i++) {
        let currentCrc = i;
        for (let j = 0; j < 8; j++) {
          if (currentCrc & 1) {
            currentCrc = 3988292384 ^ currentCrc >>> 1;
          } else {
            currentCrc = currentCrc >>> 1;
          }
        }
        crcTable[i] = currentCrc;
      }
    })();
    var CrcCalculator = module.exports = function() {
      this._crc = -1;
    };
    CrcCalculator.prototype.write = function(data) {
      for (let i = 0; i < data.length; i++) {
        this._crc = crcTable[(this._crc ^ data[i]) & 255] ^ this._crc >>> 8;
      }
      return true;
    };
    CrcCalculator.prototype.crc32 = function() {
      return this._crc ^ -1;
    };
    CrcCalculator.crc32 = function(buf) {
      let crc = -1;
      for (let i = 0; i < buf.length; i++) {
        crc = crcTable[(crc ^ buf[i]) & 255] ^ crc >>> 8;
      }
      return crc ^ -1;
    };
  }
});

// node_modules/pngjs/lib/parser.js
var require_parser = __commonJS({
  "node_modules/pngjs/lib/parser.js"(exports, module) {
    "use strict";
    var constants = require_constants();
    var CrcCalculator = require_crc();
    var Parser = module.exports = function(options, dependencies) {
      this._options = options;
      options.checkCRC = options.checkCRC !== false;
      this._hasIHDR = false;
      this._hasIEND = false;
      this._emittedHeadersFinished = false;
      this._palette = [];
      this._colorType = 0;
      this._chunks = {};
      this._chunks[constants.TYPE_IHDR] = this._handleIHDR.bind(this);
      this._chunks[constants.TYPE_IEND] = this._handleIEND.bind(this);
      this._chunks[constants.TYPE_IDAT] = this._handleIDAT.bind(this);
      this._chunks[constants.TYPE_PLTE] = this._handlePLTE.bind(this);
      this._chunks[constants.TYPE_tRNS] = this._handleTRNS.bind(this);
      this._chunks[constants.TYPE_gAMA] = this._handleGAMA.bind(this);
      this.read = dependencies.read;
      this.error = dependencies.error;
      this.metadata = dependencies.metadata;
      this.gamma = dependencies.gamma;
      this.transColor = dependencies.transColor;
      this.palette = dependencies.palette;
      this.parsed = dependencies.parsed;
      this.inflateData = dependencies.inflateData;
      this.finished = dependencies.finished;
      this.simpleTransparency = dependencies.simpleTransparency;
      this.headersFinished = dependencies.headersFinished || function() {
      };
    };
    Parser.prototype.start = function() {
      this.read(constants.PNG_SIGNATURE.length, this._parseSignature.bind(this));
    };
    Parser.prototype._parseSignature = function(data) {
      let signature = constants.PNG_SIGNATURE;
      for (let i = 0; i < signature.length; i++) {
        if (data[i] !== signature[i]) {
          this.error(new Error("Invalid file signature"));
          return;
        }
      }
      this.read(8, this._parseChunkBegin.bind(this));
    };
    Parser.prototype._parseChunkBegin = function(data) {
      let length = data.readUInt32BE(0);
      let type = data.readUInt32BE(4);
      let name = "";
      for (let i = 4; i < 8; i++) {
        name += String.fromCharCode(data[i]);
      }
      let ancillary = Boolean(data[4] & 32);
      if (!this._hasIHDR && type !== constants.TYPE_IHDR) {
        this.error(new Error("Expected IHDR on beggining"));
        return;
      }
      this._crc = new CrcCalculator();
      this._crc.write(Buffer.from(name));
      if (this._chunks[type]) {
        return this._chunks[type](length);
      }
      if (!ancillary) {
        this.error(new Error("Unsupported critical chunk type " + name));
        return;
      }
      this.read(length + 4, this._skipChunk.bind(this));
    };
    Parser.prototype._skipChunk = function() {
      this.read(8, this._parseChunkBegin.bind(this));
    };
    Parser.prototype._handleChunkEnd = function() {
      this.read(4, this._parseChunkEnd.bind(this));
    };
    Parser.prototype._parseChunkEnd = function(data) {
      let fileCrc = data.readInt32BE(0);
      let calcCrc = this._crc.crc32();
      if (this._options.checkCRC && calcCrc !== fileCrc) {
        this.error(new Error("Crc error - " + fileCrc + " - " + calcCrc));
        return;
      }
      if (!this._hasIEND) {
        this.read(8, this._parseChunkBegin.bind(this));
      }
    };
    Parser.prototype._handleIHDR = function(length) {
      this.read(length, this._parseIHDR.bind(this));
    };
    Parser.prototype._parseIHDR = function(data) {
      this._crc.write(data);
      let width = data.readUInt32BE(0);
      let height = data.readUInt32BE(4);
      let depth = data[8];
      let colorType = data[9];
      let compr = data[10];
      let filter = data[11];
      let interlace = data[12];
      if (depth !== 8 && depth !== 4 && depth !== 2 && depth !== 1 && depth !== 16) {
        this.error(new Error("Unsupported bit depth " + depth));
        return;
      }
      if (!(colorType in constants.COLORTYPE_TO_BPP_MAP)) {
        this.error(new Error("Unsupported color type"));
        return;
      }
      if (compr !== 0) {
        this.error(new Error("Unsupported compression method"));
        return;
      }
      if (filter !== 0) {
        this.error(new Error("Unsupported filter method"));
        return;
      }
      if (interlace !== 0 && interlace !== 1) {
        this.error(new Error("Unsupported interlace method"));
        return;
      }
      this._colorType = colorType;
      let bpp = constants.COLORTYPE_TO_BPP_MAP[this._colorType];
      this._hasIHDR = true;
      this.metadata({
        width,
        height,
        depth,
        interlace: Boolean(interlace),
        palette: Boolean(colorType & constants.COLORTYPE_PALETTE),
        color: Boolean(colorType & constants.COLORTYPE_COLOR),
        alpha: Boolean(colorType & constants.COLORTYPE_ALPHA),
        bpp,
        colorType
      });
      this._handleChunkEnd();
    };
    Parser.prototype._handlePLTE = function(length) {
      this.read(length, this._parsePLTE.bind(this));
    };
    Parser.prototype._parsePLTE = function(data) {
      this._crc.write(data);
      let entries = Math.floor(data.length / 3);
      for (let i = 0; i < entries; i++) {
        this._palette.push([data[i * 3], data[i * 3 + 1], data[i * 3 + 2], 255]);
      }
      this.palette(this._palette);
      this._handleChunkEnd();
    };
    Parser.prototype._handleTRNS = function(length) {
      this.simpleTransparency();
      this.read(length, this._parseTRNS.bind(this));
    };
    Parser.prototype._parseTRNS = function(data) {
      this._crc.write(data);
      if (this._colorType === constants.COLORTYPE_PALETTE_COLOR) {
        if (this._palette.length === 0) {
          this.error(new Error("Transparency chunk must be after palette"));
          return;
        }
        if (data.length > this._palette.length) {
          this.error(new Error("More transparent colors than palette size"));
          return;
        }
        for (let i = 0; i < data.length; i++) {
          this._palette[i][3] = data[i];
        }
        this.palette(this._palette);
      }
      if (this._colorType === constants.COLORTYPE_GRAYSCALE) {
        this.transColor([data.readUInt16BE(0)]);
      }
      if (this._colorType === constants.COLORTYPE_COLOR) {
        this.transColor([
          data.readUInt16BE(0),
          data.readUInt16BE(2),
          data.readUInt16BE(4)
        ]);
      }
      this._handleChunkEnd();
    };
    Parser.prototype._handleGAMA = function(length) {
      this.read(length, this._parseGAMA.bind(this));
    };
    Parser.prototype._parseGAMA = function(data) {
      this._crc.write(data);
      this.gamma(data.readUInt32BE(0) / constants.GAMMA_DIVISION);
      this._handleChunkEnd();
    };
    Parser.prototype._handleIDAT = function(length) {
      if (!this._emittedHeadersFinished) {
        this._emittedHeadersFinished = true;
        this.headersFinished();
      }
      this.read(-length, this._parseIDAT.bind(this, length));
    };
    Parser.prototype._parseIDAT = function(length, data) {
      this._crc.write(data);
      if (this._colorType === constants.COLORTYPE_PALETTE_COLOR && this._palette.length === 0) {
        throw new Error("Expected palette not found");
      }
      this.inflateData(data);
      let leftOverLength = length - data.length;
      if (leftOverLength > 0) {
        this._handleIDAT(leftOverLength);
      } else {
        this._handleChunkEnd();
      }
    };
    Parser.prototype._handleIEND = function(length) {
      this.read(length, this._parseIEND.bind(this));
    };
    Parser.prototype._parseIEND = function(data) {
      this._crc.write(data);
      this._hasIEND = true;
      this._handleChunkEnd();
      if (this.finished) {
        this.finished();
      }
    };
  }
});

// node_modules/pngjs/lib/bitmapper.js
var require_bitmapper = __commonJS({
  "node_modules/pngjs/lib/bitmapper.js"(exports) {
    "use strict";
    var interlaceUtils = require_interlace();
    var pixelBppMapper = [
      // 0 - dummy entry
      function() {
      },
      // 1 - L
      // 0: 0, 1: 0, 2: 0, 3: 0xff
      function(pxData, data, pxPos, rawPos) {
        if (rawPos === data.length) {
          throw new Error("Ran out of data");
        }
        let pixel = data[rawPos];
        pxData[pxPos] = pixel;
        pxData[pxPos + 1] = pixel;
        pxData[pxPos + 2] = pixel;
        pxData[pxPos + 3] = 255;
      },
      // 2 - LA
      // 0: 0, 1: 0, 2: 0, 3: 1
      function(pxData, data, pxPos, rawPos) {
        if (rawPos + 1 >= data.length) {
          throw new Error("Ran out of data");
        }
        let pixel = data[rawPos];
        pxData[pxPos] = pixel;
        pxData[pxPos + 1] = pixel;
        pxData[pxPos + 2] = pixel;
        pxData[pxPos + 3] = data[rawPos + 1];
      },
      // 3 - RGB
      // 0: 0, 1: 1, 2: 2, 3: 0xff
      function(pxData, data, pxPos, rawPos) {
        if (rawPos + 2 >= data.length) {
          throw new Error("Ran out of data");
        }
        pxData[pxPos] = data[rawPos];
        pxData[pxPos + 1] = data[rawPos + 1];
        pxData[pxPos + 2] = data[rawPos + 2];
        pxData[pxPos + 3] = 255;
      },
      // 4 - RGBA
      // 0: 0, 1: 1, 2: 2, 3: 3
      function(pxData, data, pxPos, rawPos) {
        if (rawPos + 3 >= data.length) {
          throw new Error("Ran out of data");
        }
        pxData[pxPos] = data[rawPos];
        pxData[pxPos + 1] = data[rawPos + 1];
        pxData[pxPos + 2] = data[rawPos + 2];
        pxData[pxPos + 3] = data[rawPos + 3];
      }
    ];
    var pixelBppCustomMapper = [
      // 0 - dummy entry
      function() {
      },
      // 1 - L
      // 0: 0, 1: 0, 2: 0, 3: 0xff
      function(pxData, pixelData, pxPos, maxBit) {
        let pixel = pixelData[0];
        pxData[pxPos] = pixel;
        pxData[pxPos + 1] = pixel;
        pxData[pxPos + 2] = pixel;
        pxData[pxPos + 3] = maxBit;
      },
      // 2 - LA
      // 0: 0, 1: 0, 2: 0, 3: 1
      function(pxData, pixelData, pxPos) {
        let pixel = pixelData[0];
        pxData[pxPos] = pixel;
        pxData[pxPos + 1] = pixel;
        pxData[pxPos + 2] = pixel;
        pxData[pxPos + 3] = pixelData[1];
      },
      // 3 - RGB
      // 0: 0, 1: 1, 2: 2, 3: 0xff
      function(pxData, pixelData, pxPos, maxBit) {
        pxData[pxPos] = pixelData[0];
        pxData[pxPos + 1] = pixelData[1];
        pxData[pxPos + 2] = pixelData[2];
        pxData[pxPos + 3] = maxBit;
      },
      // 4 - RGBA
      // 0: 0, 1: 1, 2: 2, 3: 3
      function(pxData, pixelData, pxPos) {
        pxData[pxPos] = pixelData[0];
        pxData[pxPos + 1] = pixelData[1];
        pxData[pxPos + 2] = pixelData[2];
        pxData[pxPos + 3] = pixelData[3];
      }
    ];
    function bitRetriever(data, depth) {
      let leftOver = [];
      let i = 0;
      function split2() {
        if (i === data.length) {
          throw new Error("Ran out of data");
        }
        let byte = data[i];
        i++;
        let byte8, byte7, byte6, byte5, byte4, byte3, byte2, byte1;
        switch (depth) {
          default:
            throw new Error("unrecognised depth");
          case 16:
            byte2 = data[i];
            i++;
            leftOver.push((byte << 8) + byte2);
            break;
          case 4:
            byte2 = byte & 15;
            byte1 = byte >> 4;
            leftOver.push(byte1, byte2);
            break;
          case 2:
            byte4 = byte & 3;
            byte3 = byte >> 2 & 3;
            byte2 = byte >> 4 & 3;
            byte1 = byte >> 6 & 3;
            leftOver.push(byte1, byte2, byte3, byte4);
            break;
          case 1:
            byte8 = byte & 1;
            byte7 = byte >> 1 & 1;
            byte6 = byte >> 2 & 1;
            byte5 = byte >> 3 & 1;
            byte4 = byte >> 4 & 1;
            byte3 = byte >> 5 & 1;
            byte2 = byte >> 6 & 1;
            byte1 = byte >> 7 & 1;
            leftOver.push(byte1, byte2, byte3, byte4, byte5, byte6, byte7, byte8);
            break;
        }
      }
      return {
        get: function(count) {
          while (leftOver.length < count) {
            split2();
          }
          let returner = leftOver.slice(0, count);
          leftOver = leftOver.slice(count);
          return returner;
        },
        resetAfterLine: function() {
          leftOver.length = 0;
        },
        end: function() {
          if (i !== data.length) {
            throw new Error("extra data found");
          }
        }
      };
    }
    function mapImage8Bit(image, pxData, getPxPos, bpp, data, rawPos) {
      let imageWidth = image.width;
      let imageHeight = image.height;
      let imagePass = image.index;
      for (let y = 0; y < imageHeight; y++) {
        for (let x = 0; x < imageWidth; x++) {
          let pxPos = getPxPos(x, y, imagePass);
          pixelBppMapper[bpp](pxData, data, pxPos, rawPos);
          rawPos += bpp;
        }
      }
      return rawPos;
    }
    function mapImageCustomBit(image, pxData, getPxPos, bpp, bits, maxBit) {
      let imageWidth = image.width;
      let imageHeight = image.height;
      let imagePass = image.index;
      for (let y = 0; y < imageHeight; y++) {
        for (let x = 0; x < imageWidth; x++) {
          let pixelData = bits.get(bpp);
          let pxPos = getPxPos(x, y, imagePass);
          pixelBppCustomMapper[bpp](pxData, pixelData, pxPos, maxBit);
        }
        bits.resetAfterLine();
      }
    }
    exports.dataToBitMap = function(data, bitmapInfo) {
      let width = bitmapInfo.width;
      let height = bitmapInfo.height;
      let depth = bitmapInfo.depth;
      let bpp = bitmapInfo.bpp;
      let interlace = bitmapInfo.interlace;
      let bits;
      if (depth !== 8) {
        bits = bitRetriever(data, depth);
      }
      let pxData;
      if (depth <= 8) {
        pxData = Buffer.alloc(width * height * 4);
      } else {
        pxData = new Uint16Array(width * height * 4);
      }
      let maxBit = Math.pow(2, depth) - 1;
      let rawPos = 0;
      let images;
      let getPxPos;
      if (interlace) {
        images = interlaceUtils.getImagePasses(width, height);
        getPxPos = interlaceUtils.getInterlaceIterator(width, height);
      } else {
        let nonInterlacedPxPos = 0;
        getPxPos = function() {
          let returner = nonInterlacedPxPos;
          nonInterlacedPxPos += 4;
          return returner;
        };
        images = [{ width, height }];
      }
      for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
        if (depth === 8) {
          rawPos = mapImage8Bit(
            images[imageIndex],
            pxData,
            getPxPos,
            bpp,
            data,
            rawPos
          );
        } else {
          mapImageCustomBit(
            images[imageIndex],
            pxData,
            getPxPos,
            bpp,
            bits,
            maxBit
          );
        }
      }
      if (depth === 8) {
        if (rawPos !== data.length) {
          throw new Error("extra data found");
        }
      } else {
        bits.end();
      }
      return pxData;
    };
  }
});

// node_modules/pngjs/lib/format-normaliser.js
var require_format_normaliser = __commonJS({
  "node_modules/pngjs/lib/format-normaliser.js"(exports, module) {
    "use strict";
    function dePalette(indata, outdata, width, height, palette) {
      let pxPos = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let color = palette[indata[pxPos]];
          if (!color) {
            throw new Error("index " + indata[pxPos] + " not in palette");
          }
          for (let i = 0; i < 4; i++) {
            outdata[pxPos + i] = color[i];
          }
          pxPos += 4;
        }
      }
    }
    function replaceTransparentColor(indata, outdata, width, height, transColor) {
      let pxPos = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let makeTrans = false;
          if (transColor.length === 1) {
            if (transColor[0] === indata[pxPos]) {
              makeTrans = true;
            }
          } else if (transColor[0] === indata[pxPos] && transColor[1] === indata[pxPos + 1] && transColor[2] === indata[pxPos + 2]) {
            makeTrans = true;
          }
          if (makeTrans) {
            for (let i = 0; i < 4; i++) {
              outdata[pxPos + i] = 0;
            }
          }
          pxPos += 4;
        }
      }
    }
    function scaleDepth(indata, outdata, width, height, depth) {
      let maxOutSample = 255;
      let maxInSample = Math.pow(2, depth) - 1;
      let pxPos = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          for (let i = 0; i < 4; i++) {
            outdata[pxPos + i] = Math.floor(
              indata[pxPos + i] * maxOutSample / maxInSample + 0.5
            );
          }
          pxPos += 4;
        }
      }
    }
    module.exports = function(indata, imageData) {
      let depth = imageData.depth;
      let width = imageData.width;
      let height = imageData.height;
      let colorType = imageData.colorType;
      let transColor = imageData.transColor;
      let palette = imageData.palette;
      let outdata = indata;
      if (colorType === 3) {
        dePalette(indata, outdata, width, height, palette);
      } else {
        if (transColor) {
          replaceTransparentColor(indata, outdata, width, height, transColor);
        }
        if (depth !== 8) {
          if (depth === 16) {
            outdata = Buffer.alloc(width * height * 4);
          }
          scaleDepth(indata, outdata, width, height, depth);
        }
      }
      return outdata;
    };
  }
});

// node_modules/pngjs/lib/parser-async.js
var require_parser_async = __commonJS({
  "node_modules/pngjs/lib/parser-async.js"(exports, module) {
    "use strict";
    var util = __require("util");
    var zlib = __require("zlib");
    var ChunkStream = require_chunkstream();
    var FilterAsync = require_filter_parse_async();
    var Parser = require_parser();
    var bitmapper = require_bitmapper();
    var formatNormaliser = require_format_normaliser();
    var ParserAsync = module.exports = function(options) {
      ChunkStream.call(this);
      this._parser = new Parser(options, {
        read: this.read.bind(this),
        error: this._handleError.bind(this),
        metadata: this._handleMetaData.bind(this),
        gamma: this.emit.bind(this, "gamma"),
        palette: this._handlePalette.bind(this),
        transColor: this._handleTransColor.bind(this),
        finished: this._finished.bind(this),
        inflateData: this._inflateData.bind(this),
        simpleTransparency: this._simpleTransparency.bind(this),
        headersFinished: this._headersFinished.bind(this)
      });
      this._options = options;
      this.writable = true;
      this._parser.start();
    };
    util.inherits(ParserAsync, ChunkStream);
    ParserAsync.prototype._handleError = function(err) {
      this.emit("error", err);
      this.writable = false;
      this.destroy();
      if (this._inflate && this._inflate.destroy) {
        this._inflate.destroy();
      }
      if (this._filter) {
        this._filter.destroy();
        this._filter.on("error", function() {
        });
      }
      this.errord = true;
    };
    ParserAsync.prototype._inflateData = function(data) {
      if (!this._inflate) {
        if (this._bitmapInfo.interlace) {
          this._inflate = zlib.createInflate();
          this._inflate.on("error", this.emit.bind(this, "error"));
          this._filter.on("complete", this._complete.bind(this));
          this._inflate.pipe(this._filter);
        } else {
          let rowSize = (this._bitmapInfo.width * this._bitmapInfo.bpp * this._bitmapInfo.depth + 7 >> 3) + 1;
          let imageSize = rowSize * this._bitmapInfo.height;
          let chunkSize = Math.max(imageSize, zlib.Z_MIN_CHUNK);
          this._inflate = zlib.createInflate({ chunkSize });
          let leftToInflate = imageSize;
          let emitError = this.emit.bind(this, "error");
          this._inflate.on("error", function(err) {
            if (!leftToInflate) {
              return;
            }
            emitError(err);
          });
          this._filter.on("complete", this._complete.bind(this));
          let filterWrite = this._filter.write.bind(this._filter);
          this._inflate.on("data", function(chunk) {
            if (!leftToInflate) {
              return;
            }
            if (chunk.length > leftToInflate) {
              chunk = chunk.slice(0, leftToInflate);
            }
            leftToInflate -= chunk.length;
            filterWrite(chunk);
          });
          this._inflate.on("end", this._filter.end.bind(this._filter));
        }
      }
      this._inflate.write(data);
    };
    ParserAsync.prototype._handleMetaData = function(metaData) {
      this._metaData = metaData;
      this._bitmapInfo = Object.create(metaData);
      this._filter = new FilterAsync(this._bitmapInfo);
    };
    ParserAsync.prototype._handleTransColor = function(transColor) {
      this._bitmapInfo.transColor = transColor;
    };
    ParserAsync.prototype._handlePalette = function(palette) {
      this._bitmapInfo.palette = palette;
    };
    ParserAsync.prototype._simpleTransparency = function() {
      this._metaData.alpha = true;
    };
    ParserAsync.prototype._headersFinished = function() {
      this.emit("metadata", this._metaData);
    };
    ParserAsync.prototype._finished = function() {
      if (this.errord) {
        return;
      }
      if (!this._inflate) {
        this.emit("error", "No Inflate block");
      } else {
        this._inflate.end();
      }
    };
    ParserAsync.prototype._complete = function(filteredData) {
      if (this.errord) {
        return;
      }
      let normalisedBitmapData;
      try {
        let bitmapData = bitmapper.dataToBitMap(filteredData, this._bitmapInfo);
        normalisedBitmapData = formatNormaliser(bitmapData, this._bitmapInfo);
        bitmapData = null;
      } catch (ex) {
        this._handleError(ex);
        return;
      }
      this.emit("parsed", normalisedBitmapData);
    };
  }
});

// node_modules/pngjs/lib/bitpacker.js
var require_bitpacker = __commonJS({
  "node_modules/pngjs/lib/bitpacker.js"(exports, module) {
    "use strict";
    var constants = require_constants();
    module.exports = function(dataIn, width, height, options) {
      let outHasAlpha = [constants.COLORTYPE_COLOR_ALPHA, constants.COLORTYPE_ALPHA].indexOf(
        options.colorType
      ) !== -1;
      if (options.colorType === options.inputColorType) {
        let bigEndian = (function() {
          let buffer = new ArrayBuffer(2);
          new DataView(buffer).setInt16(
            0,
            256,
            true
            /* littleEndian */
          );
          return new Int16Array(buffer)[0] !== 256;
        })();
        if (options.bitDepth === 8 || options.bitDepth === 16 && bigEndian) {
          return dataIn;
        }
      }
      let data = options.bitDepth !== 16 ? dataIn : new Uint16Array(dataIn.buffer);
      let maxValue = 255;
      let inBpp = constants.COLORTYPE_TO_BPP_MAP[options.inputColorType];
      if (inBpp === 4 && !options.inputHasAlpha) {
        inBpp = 3;
      }
      let outBpp = constants.COLORTYPE_TO_BPP_MAP[options.colorType];
      if (options.bitDepth === 16) {
        maxValue = 65535;
        outBpp *= 2;
      }
      let outData = Buffer.alloc(width * height * outBpp);
      let inIndex = 0;
      let outIndex = 0;
      let bgColor = options.bgColor || {};
      if (bgColor.red === void 0) {
        bgColor.red = maxValue;
      }
      if (bgColor.green === void 0) {
        bgColor.green = maxValue;
      }
      if (bgColor.blue === void 0) {
        bgColor.blue = maxValue;
      }
      function getRGBA() {
        let red;
        let green;
        let blue;
        let alpha = maxValue;
        switch (options.inputColorType) {
          case constants.COLORTYPE_COLOR_ALPHA:
            alpha = data[inIndex + 3];
            red = data[inIndex];
            green = data[inIndex + 1];
            blue = data[inIndex + 2];
            break;
          case constants.COLORTYPE_COLOR:
            red = data[inIndex];
            green = data[inIndex + 1];
            blue = data[inIndex + 2];
            break;
          case constants.COLORTYPE_ALPHA:
            alpha = data[inIndex + 1];
            red = data[inIndex];
            green = red;
            blue = red;
            break;
          case constants.COLORTYPE_GRAYSCALE:
            red = data[inIndex];
            green = red;
            blue = red;
            break;
          default:
            throw new Error(
              "input color type:" + options.inputColorType + " is not supported at present"
            );
        }
        if (options.inputHasAlpha) {
          if (!outHasAlpha) {
            alpha /= maxValue;
            red = Math.min(
              Math.max(Math.round((1 - alpha) * bgColor.red + alpha * red), 0),
              maxValue
            );
            green = Math.min(
              Math.max(Math.round((1 - alpha) * bgColor.green + alpha * green), 0),
              maxValue
            );
            blue = Math.min(
              Math.max(Math.round((1 - alpha) * bgColor.blue + alpha * blue), 0),
              maxValue
            );
          }
        }
        return { red, green, blue, alpha };
      }
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let rgba = getRGBA(data, inIndex);
          switch (options.colorType) {
            case constants.COLORTYPE_COLOR_ALPHA:
            case constants.COLORTYPE_COLOR:
              if (options.bitDepth === 8) {
                outData[outIndex] = rgba.red;
                outData[outIndex + 1] = rgba.green;
                outData[outIndex + 2] = rgba.blue;
                if (outHasAlpha) {
                  outData[outIndex + 3] = rgba.alpha;
                }
              } else {
                outData.writeUInt16BE(rgba.red, outIndex);
                outData.writeUInt16BE(rgba.green, outIndex + 2);
                outData.writeUInt16BE(rgba.blue, outIndex + 4);
                if (outHasAlpha) {
                  outData.writeUInt16BE(rgba.alpha, outIndex + 6);
                }
              }
              break;
            case constants.COLORTYPE_ALPHA:
            case constants.COLORTYPE_GRAYSCALE: {
              let grayscale = (rgba.red + rgba.green + rgba.blue) / 3;
              if (options.bitDepth === 8) {
                outData[outIndex] = grayscale;
                if (outHasAlpha) {
                  outData[outIndex + 1] = rgba.alpha;
                }
              } else {
                outData.writeUInt16BE(grayscale, outIndex);
                if (outHasAlpha) {
                  outData.writeUInt16BE(rgba.alpha, outIndex + 2);
                }
              }
              break;
            }
            default:
              throw new Error("unrecognised color Type " + options.colorType);
          }
          inIndex += inBpp;
          outIndex += outBpp;
        }
      }
      return outData;
    };
  }
});

// node_modules/pngjs/lib/filter-pack.js
var require_filter_pack = __commonJS({
  "node_modules/pngjs/lib/filter-pack.js"(exports, module) {
    "use strict";
    var paethPredictor = require_paeth_predictor();
    function filterNone(pxData, pxPos, byteWidth, rawData, rawPos) {
      for (let x = 0; x < byteWidth; x++) {
        rawData[rawPos + x] = pxData[pxPos + x];
      }
    }
    function filterSumNone(pxData, pxPos, byteWidth) {
      let sum = 0;
      let length = pxPos + byteWidth;
      for (let i = pxPos; i < length; i++) {
        sum += Math.abs(pxData[i]);
      }
      return sum;
    }
    function filterSub(pxData, pxPos, byteWidth, rawData, rawPos, bpp) {
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let val = pxData[pxPos + x] - left;
        rawData[rawPos + x] = val;
      }
    }
    function filterSumSub(pxData, pxPos, byteWidth, bpp) {
      let sum = 0;
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let val = pxData[pxPos + x] - left;
        sum += Math.abs(val);
      }
      return sum;
    }
    function filterUp(pxData, pxPos, byteWidth, rawData, rawPos) {
      for (let x = 0; x < byteWidth; x++) {
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let val = pxData[pxPos + x] - up;
        rawData[rawPos + x] = val;
      }
    }
    function filterSumUp(pxData, pxPos, byteWidth) {
      let sum = 0;
      let length = pxPos + byteWidth;
      for (let x = pxPos; x < length; x++) {
        let up = pxPos > 0 ? pxData[x - byteWidth] : 0;
        let val = pxData[x] - up;
        sum += Math.abs(val);
      }
      return sum;
    }
    function filterAvg(pxData, pxPos, byteWidth, rawData, rawPos, bpp) {
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let val = pxData[pxPos + x] - (left + up >> 1);
        rawData[rawPos + x] = val;
      }
    }
    function filterSumAvg(pxData, pxPos, byteWidth, bpp) {
      let sum = 0;
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let val = pxData[pxPos + x] - (left + up >> 1);
        sum += Math.abs(val);
      }
      return sum;
    }
    function filterPaeth(pxData, pxPos, byteWidth, rawData, rawPos, bpp) {
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let upleft = pxPos > 0 && x >= bpp ? pxData[pxPos + x - (byteWidth + bpp)] : 0;
        let val = pxData[pxPos + x] - paethPredictor(left, up, upleft);
        rawData[rawPos + x] = val;
      }
    }
    function filterSumPaeth(pxData, pxPos, byteWidth, bpp) {
      let sum = 0;
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let upleft = pxPos > 0 && x >= bpp ? pxData[pxPos + x - (byteWidth + bpp)] : 0;
        let val = pxData[pxPos + x] - paethPredictor(left, up, upleft);
        sum += Math.abs(val);
      }
      return sum;
    }
    var filters = {
      0: filterNone,
      1: filterSub,
      2: filterUp,
      3: filterAvg,
      4: filterPaeth
    };
    var filterSums = {
      0: filterSumNone,
      1: filterSumSub,
      2: filterSumUp,
      3: filterSumAvg,
      4: filterSumPaeth
    };
    module.exports = function(pxData, width, height, options, bpp) {
      let filterTypes;
      if (!("filterType" in options) || options.filterType === -1) {
        filterTypes = [0, 1, 2, 3, 4];
      } else if (typeof options.filterType === "number") {
        filterTypes = [options.filterType];
      } else {
        throw new Error("unrecognised filter types");
      }
      if (options.bitDepth === 16) {
        bpp *= 2;
      }
      let byteWidth = width * bpp;
      let rawPos = 0;
      let pxPos = 0;
      let rawData = Buffer.alloc((byteWidth + 1) * height);
      let sel = filterTypes[0];
      for (let y = 0; y < height; y++) {
        if (filterTypes.length > 1) {
          let min = Infinity;
          for (let i = 0; i < filterTypes.length; i++) {
            let sum = filterSums[filterTypes[i]](pxData, pxPos, byteWidth, bpp);
            if (sum < min) {
              sel = filterTypes[i];
              min = sum;
            }
          }
        }
        rawData[rawPos] = sel;
        rawPos++;
        filters[sel](pxData, pxPos, byteWidth, rawData, rawPos, bpp);
        rawPos += byteWidth;
        pxPos += byteWidth;
      }
      return rawData;
    };
  }
});

// node_modules/pngjs/lib/packer.js
var require_packer = __commonJS({
  "node_modules/pngjs/lib/packer.js"(exports, module) {
    "use strict";
    var constants = require_constants();
    var CrcStream = require_crc();
    var bitPacker = require_bitpacker();
    var filter = require_filter_pack();
    var zlib = __require("zlib");
    var Packer = module.exports = function(options) {
      this._options = options;
      options.deflateChunkSize = options.deflateChunkSize || 32 * 1024;
      options.deflateLevel = options.deflateLevel != null ? options.deflateLevel : 9;
      options.deflateStrategy = options.deflateStrategy != null ? options.deflateStrategy : 3;
      options.inputHasAlpha = options.inputHasAlpha != null ? options.inputHasAlpha : true;
      options.deflateFactory = options.deflateFactory || zlib.createDeflate;
      options.bitDepth = options.bitDepth || 8;
      options.colorType = typeof options.colorType === "number" ? options.colorType : constants.COLORTYPE_COLOR_ALPHA;
      options.inputColorType = typeof options.inputColorType === "number" ? options.inputColorType : constants.COLORTYPE_COLOR_ALPHA;
      if ([
        constants.COLORTYPE_GRAYSCALE,
        constants.COLORTYPE_COLOR,
        constants.COLORTYPE_COLOR_ALPHA,
        constants.COLORTYPE_ALPHA
      ].indexOf(options.colorType) === -1) {
        throw new Error(
          "option color type:" + options.colorType + " is not supported at present"
        );
      }
      if ([
        constants.COLORTYPE_GRAYSCALE,
        constants.COLORTYPE_COLOR,
        constants.COLORTYPE_COLOR_ALPHA,
        constants.COLORTYPE_ALPHA
      ].indexOf(options.inputColorType) === -1) {
        throw new Error(
          "option input color type:" + options.inputColorType + " is not supported at present"
        );
      }
      if (options.bitDepth !== 8 && options.bitDepth !== 16) {
        throw new Error(
          "option bit depth:" + options.bitDepth + " is not supported at present"
        );
      }
    };
    Packer.prototype.getDeflateOptions = function() {
      return {
        chunkSize: this._options.deflateChunkSize,
        level: this._options.deflateLevel,
        strategy: this._options.deflateStrategy
      };
    };
    Packer.prototype.createDeflate = function() {
      return this._options.deflateFactory(this.getDeflateOptions());
    };
    Packer.prototype.filterData = function(data, width, height) {
      let packedData = bitPacker(data, width, height, this._options);
      let bpp = constants.COLORTYPE_TO_BPP_MAP[this._options.colorType];
      let filteredData = filter(packedData, width, height, this._options, bpp);
      return filteredData;
    };
    Packer.prototype._packChunk = function(type, data) {
      let len = data ? data.length : 0;
      let buf = Buffer.alloc(len + 12);
      buf.writeUInt32BE(len, 0);
      buf.writeUInt32BE(type, 4);
      if (data) {
        data.copy(buf, 8);
      }
      buf.writeInt32BE(
        CrcStream.crc32(buf.slice(4, buf.length - 4)),
        buf.length - 4
      );
      return buf;
    };
    Packer.prototype.packGAMA = function(gamma) {
      let buf = Buffer.alloc(4);
      buf.writeUInt32BE(Math.floor(gamma * constants.GAMMA_DIVISION), 0);
      return this._packChunk(constants.TYPE_gAMA, buf);
    };
    Packer.prototype.packIHDR = function(width, height) {
      let buf = Buffer.alloc(13);
      buf.writeUInt32BE(width, 0);
      buf.writeUInt32BE(height, 4);
      buf[8] = this._options.bitDepth;
      buf[9] = this._options.colorType;
      buf[10] = 0;
      buf[11] = 0;
      buf[12] = 0;
      return this._packChunk(constants.TYPE_IHDR, buf);
    };
    Packer.prototype.packIDAT = function(data) {
      return this._packChunk(constants.TYPE_IDAT, data);
    };
    Packer.prototype.packIEND = function() {
      return this._packChunk(constants.TYPE_IEND, null);
    };
  }
});

// node_modules/pngjs/lib/packer-async.js
var require_packer_async = __commonJS({
  "node_modules/pngjs/lib/packer-async.js"(exports, module) {
    "use strict";
    var util = __require("util");
    var Stream = __require("stream");
    var constants = require_constants();
    var Packer = require_packer();
    var PackerAsync = module.exports = function(opt) {
      Stream.call(this);
      let options = opt || {};
      this._packer = new Packer(options);
      this._deflate = this._packer.createDeflate();
      this.readable = true;
    };
    util.inherits(PackerAsync, Stream);
    PackerAsync.prototype.pack = function(data, width, height, gamma) {
      this.emit("data", Buffer.from(constants.PNG_SIGNATURE));
      this.emit("data", this._packer.packIHDR(width, height));
      if (gamma) {
        this.emit("data", this._packer.packGAMA(gamma));
      }
      let filteredData = this._packer.filterData(data, width, height);
      this._deflate.on("error", this.emit.bind(this, "error"));
      this._deflate.on(
        "data",
        function(compressedData) {
          this.emit("data", this._packer.packIDAT(compressedData));
        }.bind(this)
      );
      this._deflate.on(
        "end",
        function() {
          this.emit("data", this._packer.packIEND());
          this.emit("end");
        }.bind(this)
      );
      this._deflate.end(filteredData);
    };
  }
});

// node_modules/pngjs/lib/sync-inflate.js
var require_sync_inflate = __commonJS({
  "node_modules/pngjs/lib/sync-inflate.js"(exports, module) {
    "use strict";
    var assert = __require("assert").ok;
    var zlib = __require("zlib");
    var util = __require("util");
    var kMaxLength = __require("buffer").kMaxLength;
    function Inflate(opts) {
      if (!(this instanceof Inflate)) {
        return new Inflate(opts);
      }
      if (opts && opts.chunkSize < zlib.Z_MIN_CHUNK) {
        opts.chunkSize = zlib.Z_MIN_CHUNK;
      }
      zlib.Inflate.call(this, opts);
      this._offset = this._offset === void 0 ? this._outOffset : this._offset;
      this._buffer = this._buffer || this._outBuffer;
      if (opts && opts.maxLength != null) {
        this._maxLength = opts.maxLength;
      }
    }
    function createInflate(opts) {
      return new Inflate(opts);
    }
    function _close(engine, callback) {
      if (callback) {
        process.nextTick(callback);
      }
      if (!engine._handle) {
        return;
      }
      engine._handle.close();
      engine._handle = null;
    }
    Inflate.prototype._processChunk = function(chunk, flushFlag, asyncCb) {
      if (typeof asyncCb === "function") {
        return zlib.Inflate._processChunk.call(this, chunk, flushFlag, asyncCb);
      }
      let self = this;
      let availInBefore = chunk && chunk.length;
      let availOutBefore = this._chunkSize - this._offset;
      let leftToInflate = this._maxLength;
      let inOff = 0;
      let buffers = [];
      let nread = 0;
      let error;
      this.on("error", function(err) {
        error = err;
      });
      function handleChunk(availInAfter, availOutAfter) {
        if (self._hadError) {
          return;
        }
        let have = availOutBefore - availOutAfter;
        assert(have >= 0, "have should not go down");
        if (have > 0) {
          let out = self._buffer.slice(self._offset, self._offset + have);
          self._offset += have;
          if (out.length > leftToInflate) {
            out = out.slice(0, leftToInflate);
          }
          buffers.push(out);
          nread += out.length;
          leftToInflate -= out.length;
          if (leftToInflate === 0) {
            return false;
          }
        }
        if (availOutAfter === 0 || self._offset >= self._chunkSize) {
          availOutBefore = self._chunkSize;
          self._offset = 0;
          self._buffer = Buffer.allocUnsafe(self._chunkSize);
        }
        if (availOutAfter === 0) {
          inOff += availInBefore - availInAfter;
          availInBefore = availInAfter;
          return true;
        }
        return false;
      }
      assert(this._handle, "zlib binding closed");
      let res;
      do {
        res = this._handle.writeSync(
          flushFlag,
          chunk,
          // in
          inOff,
          // in_off
          availInBefore,
          // in_len
          this._buffer,
          // out
          this._offset,
          //out_off
          availOutBefore
        );
        res = res || this._writeState;
      } while (!this._hadError && handleChunk(res[0], res[1]));
      if (this._hadError) {
        throw error;
      }
      if (nread >= kMaxLength) {
        _close(this);
        throw new RangeError(
          "Cannot create final Buffer. It would be larger than 0x" + kMaxLength.toString(16) + " bytes"
        );
      }
      let buf = Buffer.concat(buffers, nread);
      _close(this);
      return buf;
    };
    util.inherits(Inflate, zlib.Inflate);
    function zlibBufferSync(engine, buffer) {
      if (typeof buffer === "string") {
        buffer = Buffer.from(buffer);
      }
      if (!(buffer instanceof Buffer)) {
        throw new TypeError("Not a string or buffer");
      }
      let flushFlag = engine._finishFlushFlag;
      if (flushFlag == null) {
        flushFlag = zlib.Z_FINISH;
      }
      return engine._processChunk(buffer, flushFlag);
    }
    function inflateSync(buffer, opts) {
      return zlibBufferSync(new Inflate(opts), buffer);
    }
    module.exports = exports = inflateSync;
    exports.Inflate = Inflate;
    exports.createInflate = createInflate;
    exports.inflateSync = inflateSync;
  }
});

// node_modules/pngjs/lib/sync-reader.js
var require_sync_reader = __commonJS({
  "node_modules/pngjs/lib/sync-reader.js"(exports, module) {
    "use strict";
    var SyncReader = module.exports = function(buffer) {
      this._buffer = buffer;
      this._reads = [];
    };
    SyncReader.prototype.read = function(length, callback) {
      this._reads.push({
        length: Math.abs(length),
        // if length < 0 then at most this length
        allowLess: length < 0,
        func: callback
      });
    };
    SyncReader.prototype.process = function() {
      while (this._reads.length > 0 && this._buffer.length) {
        let read = this._reads[0];
        if (this._buffer.length && (this._buffer.length >= read.length || read.allowLess)) {
          this._reads.shift();
          let buf = this._buffer;
          this._buffer = buf.slice(read.length);
          read.func.call(this, buf.slice(0, read.length));
        } else {
          break;
        }
      }
      if (this._reads.length > 0) {
        return new Error("There are some read requests waitng on finished stream");
      }
      if (this._buffer.length > 0) {
        return new Error("unrecognised content at end of stream");
      }
    };
  }
});

// node_modules/pngjs/lib/filter-parse-sync.js
var require_filter_parse_sync = __commonJS({
  "node_modules/pngjs/lib/filter-parse-sync.js"(exports) {
    "use strict";
    var SyncReader = require_sync_reader();
    var Filter = require_filter_parse();
    exports.process = function(inBuffer, bitmapInfo) {
      let outBuffers = [];
      let reader = new SyncReader(inBuffer);
      let filter = new Filter(bitmapInfo, {
        read: reader.read.bind(reader),
        write: function(bufferPart) {
          outBuffers.push(bufferPart);
        },
        complete: function() {
        }
      });
      filter.start();
      reader.process();
      return Buffer.concat(outBuffers);
    };
  }
});

// node_modules/pngjs/lib/parser-sync.js
var require_parser_sync = __commonJS({
  "node_modules/pngjs/lib/parser-sync.js"(exports, module) {
    "use strict";
    var hasSyncZlib = true;
    var zlib = __require("zlib");
    var inflateSync = require_sync_inflate();
    if (!zlib.deflateSync) {
      hasSyncZlib = false;
    }
    var SyncReader = require_sync_reader();
    var FilterSync = require_filter_parse_sync();
    var Parser = require_parser();
    var bitmapper = require_bitmapper();
    var formatNormaliser = require_format_normaliser();
    module.exports = function(buffer, options) {
      if (!hasSyncZlib) {
        throw new Error(
          "To use the sync capability of this library in old node versions, please pin pngjs to v2.3.0"
        );
      }
      let err;
      function handleError(_err_) {
        err = _err_;
      }
      let metaData;
      function handleMetaData(_metaData_) {
        metaData = _metaData_;
      }
      function handleTransColor(transColor) {
        metaData.transColor = transColor;
      }
      function handlePalette(palette) {
        metaData.palette = palette;
      }
      function handleSimpleTransparency() {
        metaData.alpha = true;
      }
      let gamma;
      function handleGamma(_gamma_) {
        gamma = _gamma_;
      }
      let inflateDataList = [];
      function handleInflateData(inflatedData2) {
        inflateDataList.push(inflatedData2);
      }
      let reader = new SyncReader(buffer);
      let parser = new Parser(options, {
        read: reader.read.bind(reader),
        error: handleError,
        metadata: handleMetaData,
        gamma: handleGamma,
        palette: handlePalette,
        transColor: handleTransColor,
        inflateData: handleInflateData,
        simpleTransparency: handleSimpleTransparency
      });
      parser.start();
      reader.process();
      if (err) {
        throw err;
      }
      let inflateData = Buffer.concat(inflateDataList);
      inflateDataList.length = 0;
      let inflatedData;
      if (metaData.interlace) {
        inflatedData = zlib.inflateSync(inflateData);
      } else {
        let rowSize = (metaData.width * metaData.bpp * metaData.depth + 7 >> 3) + 1;
        let imageSize = rowSize * metaData.height;
        inflatedData = inflateSync(inflateData, {
          chunkSize: imageSize,
          maxLength: imageSize
        });
      }
      inflateData = null;
      if (!inflatedData || !inflatedData.length) {
        throw new Error("bad png - invalid inflate data response");
      }
      let unfilteredData = FilterSync.process(inflatedData, metaData);
      inflateData = null;
      let bitmapData = bitmapper.dataToBitMap(unfilteredData, metaData);
      unfilteredData = null;
      let normalisedBitmapData = formatNormaliser(bitmapData, metaData);
      metaData.data = normalisedBitmapData;
      metaData.gamma = gamma || 0;
      return metaData;
    };
  }
});

// node_modules/pngjs/lib/packer-sync.js
var require_packer_sync = __commonJS({
  "node_modules/pngjs/lib/packer-sync.js"(exports, module) {
    "use strict";
    var hasSyncZlib = true;
    var zlib = __require("zlib");
    if (!zlib.deflateSync) {
      hasSyncZlib = false;
    }
    var constants = require_constants();
    var Packer = require_packer();
    module.exports = function(metaData, opt) {
      if (!hasSyncZlib) {
        throw new Error(
          "To use the sync capability of this library in old node versions, please pin pngjs to v2.3.0"
        );
      }
      let options = opt || {};
      let packer = new Packer(options);
      let chunks = [];
      chunks.push(Buffer.from(constants.PNG_SIGNATURE));
      chunks.push(packer.packIHDR(metaData.width, metaData.height));
      if (metaData.gamma) {
        chunks.push(packer.packGAMA(metaData.gamma));
      }
      let filteredData = packer.filterData(
        metaData.data,
        metaData.width,
        metaData.height
      );
      let compressedData = zlib.deflateSync(
        filteredData,
        packer.getDeflateOptions()
      );
      filteredData = null;
      if (!compressedData || !compressedData.length) {
        throw new Error("bad png - invalid compressed data response");
      }
      chunks.push(packer.packIDAT(compressedData));
      chunks.push(packer.packIEND());
      return Buffer.concat(chunks);
    };
  }
});

// node_modules/pngjs/lib/png-sync.js
var require_png_sync = __commonJS({
  "node_modules/pngjs/lib/png-sync.js"(exports) {
    "use strict";
    var parse = require_parser_sync();
    var pack = require_packer_sync();
    exports.read = function(buffer, options) {
      return parse(buffer, options || {});
    };
    exports.write = function(png, options) {
      return pack(png, options);
    };
  }
});

// node_modules/pngjs/lib/png.js
var require_png = __commonJS({
  "node_modules/pngjs/lib/png.js"(exports) {
    "use strict";
    var util = __require("util");
    var Stream = __require("stream");
    var Parser = require_parser_async();
    var Packer = require_packer_async();
    var PNGSync = require_png_sync();
    var PNG = exports.PNG = function(options) {
      Stream.call(this);
      options = options || {};
      this.width = options.width | 0;
      this.height = options.height | 0;
      this.data = this.width > 0 && this.height > 0 ? Buffer.alloc(4 * this.width * this.height) : null;
      if (options.fill && this.data) {
        this.data.fill(0);
      }
      this.gamma = 0;
      this.readable = this.writable = true;
      this._parser = new Parser(options);
      this._parser.on("error", this.emit.bind(this, "error"));
      this._parser.on("close", this._handleClose.bind(this));
      this._parser.on("metadata", this._metadata.bind(this));
      this._parser.on("gamma", this._gamma.bind(this));
      this._parser.on(
        "parsed",
        function(data) {
          this.data = data;
          this.emit("parsed", data);
        }.bind(this)
      );
      this._packer = new Packer(options);
      this._packer.on("data", this.emit.bind(this, "data"));
      this._packer.on("end", this.emit.bind(this, "end"));
      this._parser.on("close", this._handleClose.bind(this));
      this._packer.on("error", this.emit.bind(this, "error"));
    };
    util.inherits(PNG, Stream);
    PNG.sync = PNGSync;
    PNG.prototype.pack = function() {
      if (!this.data || !this.data.length) {
        this.emit("error", "No data provided");
        return this;
      }
      process.nextTick(
        function() {
          this._packer.pack(this.data, this.width, this.height, this.gamma);
        }.bind(this)
      );
      return this;
    };
    PNG.prototype.parse = function(data, callback) {
      if (callback) {
        let onParsed, onError;
        onParsed = function(parsedData) {
          this.removeListener("error", onError);
          this.data = parsedData;
          callback(null, this);
        }.bind(this);
        onError = function(err) {
          this.removeListener("parsed", onParsed);
          callback(err, null);
        }.bind(this);
        this.once("parsed", onParsed);
        this.once("error", onError);
      }
      this.end(data);
      return this;
    };
    PNG.prototype.write = function(data) {
      this._parser.write(data);
      return true;
    };
    PNG.prototype.end = function(data) {
      this._parser.end(data);
    };
    PNG.prototype._metadata = function(metadata) {
      this.width = metadata.width;
      this.height = metadata.height;
      this.emit("metadata", metadata);
    };
    PNG.prototype._gamma = function(gamma) {
      this.gamma = gamma;
    };
    PNG.prototype._handleClose = function() {
      if (!this._parser.writable && !this._packer.readable) {
        this.emit("close");
      }
    };
    PNG.bitblt = function(src, dst, srcX, srcY, width, height, deltaX, deltaY) {
      srcX |= 0;
      srcY |= 0;
      width |= 0;
      height |= 0;
      deltaX |= 0;
      deltaY |= 0;
      if (srcX > src.width || srcY > src.height || srcX + width > src.width || srcY + height > src.height) {
        throw new Error("bitblt reading outside image");
      }
      if (deltaX > dst.width || deltaY > dst.height || deltaX + width > dst.width || deltaY + height > dst.height) {
        throw new Error("bitblt writing outside image");
      }
      for (let y = 0; y < height; y++) {
        src.data.copy(
          dst.data,
          (deltaY + y) * dst.width + deltaX << 2,
          (srcY + y) * src.width + srcX << 2,
          (srcY + y) * src.width + srcX + width << 2
        );
      }
    };
    PNG.prototype.bitblt = function(dst, srcX, srcY, width, height, deltaX, deltaY) {
      PNG.bitblt(this, dst, srcX, srcY, width, height, deltaX, deltaY);
      return this;
    };
    PNG.adjustGamma = function(src) {
      if (src.gamma) {
        for (let y = 0; y < src.height; y++) {
          for (let x = 0; x < src.width; x++) {
            let idx = src.width * y + x << 2;
            for (let i = 0; i < 3; i++) {
              let sample = src.data[idx + i] / 255;
              sample = Math.pow(sample, 1 / 2.2 / src.gamma);
              src.data[idx + i] = Math.round(sample * 255);
            }
          }
        }
        src.gamma = 0;
      }
    };
    PNG.prototype.adjustGamma = function() {
      PNG.adjustGamma(this);
    };
  }
});

// node_modules/qrcode/lib/renderer/utils.js
var require_utils2 = __commonJS({
  "node_modules/qrcode/lib/renderer/utils.js"(exports) {
    function hex2rgba(hex) {
      if (typeof hex === "number") {
        hex = hex.toString();
      }
      if (typeof hex !== "string") {
        throw new Error("Color should be defined as hex string");
      }
      let hexCode = hex.slice().replace("#", "").split("");
      if (hexCode.length < 3 || hexCode.length === 5 || hexCode.length > 8) {
        throw new Error("Invalid hex color: " + hex);
      }
      if (hexCode.length === 3 || hexCode.length === 4) {
        hexCode = Array.prototype.concat.apply([], hexCode.map(function(c) {
          return [c, c];
        }));
      }
      if (hexCode.length === 6) hexCode.push("F", "F");
      const hexValue = parseInt(hexCode.join(""), 16);
      return {
        r: hexValue >> 24 & 255,
        g: hexValue >> 16 & 255,
        b: hexValue >> 8 & 255,
        a: hexValue & 255,
        hex: "#" + hexCode.slice(0, 6).join("")
      };
    }
    exports.getOptions = function getOptions(options) {
      if (!options) options = {};
      if (!options.color) options.color = {};
      const margin = typeof options.margin === "undefined" || options.margin === null || options.margin < 0 ? 4 : options.margin;
      const width = options.width && options.width >= 21 ? options.width : void 0;
      const scale = options.scale || 4;
      return {
        width,
        scale: width ? 4 : scale,
        margin,
        color: {
          dark: hex2rgba(options.color.dark || "#000000ff"),
          light: hex2rgba(options.color.light || "#ffffffff")
        },
        type: options.type,
        rendererOpts: options.rendererOpts || {}
      };
    };
    exports.getScale = function getScale(qrSize, opts) {
      return opts.width && opts.width >= qrSize + opts.margin * 2 ? opts.width / (qrSize + opts.margin * 2) : opts.scale;
    };
    exports.getImageWidth = function getImageWidth(qrSize, opts) {
      const scale = exports.getScale(qrSize, opts);
      return Math.floor((qrSize + opts.margin * 2) * scale);
    };
    exports.qrToImageData = function qrToImageData(imgData, qr2, opts) {
      const size2 = qr2.modules.size;
      const data = qr2.modules.data;
      const scale = exports.getScale(size2, opts);
      const symbolSize = Math.floor((size2 + opts.margin * 2) * scale);
      const scaledMargin = opts.margin * scale;
      const palette = [opts.color.light, opts.color.dark];
      for (let i = 0; i < symbolSize; i++) {
        for (let j = 0; j < symbolSize; j++) {
          let posDst = (i * symbolSize + j) * 4;
          let pxColor = opts.color.light;
          if (i >= scaledMargin && j >= scaledMargin && i < symbolSize - scaledMargin && j < symbolSize - scaledMargin) {
            const iSrc = Math.floor((i - scaledMargin) / scale);
            const jSrc = Math.floor((j - scaledMargin) / scale);
            pxColor = palette[data[iSrc * size2 + jSrc] ? 1 : 0];
          }
          imgData[posDst++] = pxColor.r;
          imgData[posDst++] = pxColor.g;
          imgData[posDst++] = pxColor.b;
          imgData[posDst] = pxColor.a;
        }
      }
    };
  }
});

// node_modules/qrcode/lib/renderer/png.js
var require_png2 = __commonJS({
  "node_modules/qrcode/lib/renderer/png.js"(exports) {
    var fs2 = __require("fs");
    var PNG = require_png().PNG;
    var Utils = require_utils2();
    exports.render = function render(qrData, options) {
      const opts = Utils.getOptions(options);
      const pngOpts = opts.rendererOpts;
      const size2 = Utils.getImageWidth(qrData.modules.size, opts);
      pngOpts.width = size2;
      pngOpts.height = size2;
      const pngImage = new PNG(pngOpts);
      Utils.qrToImageData(pngImage.data, qrData, opts);
      return pngImage;
    };
    exports.renderToDataURL = function renderToDataURL(qrData, options, cb) {
      if (typeof cb === "undefined") {
        cb = options;
        options = void 0;
      }
      exports.renderToBuffer(qrData, options, function(err, output) {
        if (err) cb(err);
        let url = "data:image/png;base64,";
        url += output.toString("base64");
        cb(null, url);
      });
    };
    exports.renderToBuffer = function renderToBuffer(qrData, options, cb) {
      if (typeof cb === "undefined") {
        cb = options;
        options = void 0;
      }
      const png = exports.render(qrData, options);
      const buffer = [];
      png.on("error", cb);
      png.on("data", function(data) {
        buffer.push(data);
      });
      png.on("end", function() {
        cb(null, Buffer.concat(buffer));
      });
      png.pack();
    };
    exports.renderToFile = function renderToFile(path2, qrData, options, cb) {
      if (typeof cb === "undefined") {
        cb = options;
        options = void 0;
      }
      let called = false;
      const done = (...args) => {
        if (called) return;
        called = true;
        cb.apply(null, args);
      };
      const stream = fs2.createWriteStream(path2);
      stream.on("error", done);
      stream.on("close", done);
      exports.renderToFileStream(stream, qrData, options);
    };
    exports.renderToFileStream = function renderToFileStream(stream, qrData, options) {
      const png = exports.render(qrData, options);
      png.pack().pipe(stream);
    };
  }
});

// node_modules/qrcode/lib/renderer/utf8.js
var require_utf8 = __commonJS({
  "node_modules/qrcode/lib/renderer/utf8.js"(exports) {
    var Utils = require_utils2();
    var BLOCK_CHAR = {
      WW: " ",
      WB: "\u2584",
      BB: "\u2588",
      BW: "\u2580"
    };
    var INVERTED_BLOCK_CHAR = {
      BB: " ",
      BW: "\u2584",
      WW: "\u2588",
      WB: "\u2580"
    };
    function getBlockChar(top, bottom, blocks) {
      if (top && bottom) return blocks.BB;
      if (top && !bottom) return blocks.BW;
      if (!top && bottom) return blocks.WB;
      return blocks.WW;
    }
    exports.render = function(qrData, options, cb) {
      const opts = Utils.getOptions(options);
      let blocks = BLOCK_CHAR;
      if (opts.color.dark.hex === "#ffffff" || opts.color.light.hex === "#000000") {
        blocks = INVERTED_BLOCK_CHAR;
      }
      const size2 = qrData.modules.size;
      const data = qrData.modules.data;
      let output = "";
      let hMargin = Array(size2 + opts.margin * 2 + 1).join(blocks.WW);
      hMargin = Array(opts.margin / 2 + 1).join(hMargin + "\n");
      const vMargin = Array(opts.margin + 1).join(blocks.WW);
      output += hMargin;
      for (let i = 0; i < size2; i += 2) {
        output += vMargin;
        for (let j = 0; j < size2; j++) {
          const topModule = data[i * size2 + j];
          const bottomModule = data[(i + 1) * size2 + j];
          output += getBlockChar(topModule, bottomModule, blocks);
        }
        output += vMargin + "\n";
      }
      output += hMargin.slice(0, -1);
      if (typeof cb === "function") {
        cb(null, output);
      }
      return output;
    };
    exports.renderToFile = function renderToFile(path2, qrData, options, cb) {
      if (typeof cb === "undefined") {
        cb = options;
        options = void 0;
      }
      const fs2 = __require("fs");
      const utf8 = exports.render(qrData, options);
      fs2.writeFile(path2, utf8, cb);
    };
  }
});

// node_modules/qrcode/lib/renderer/terminal/terminal.js
var require_terminal = __commonJS({
  "node_modules/qrcode/lib/renderer/terminal/terminal.js"(exports) {
    exports.render = function(qrData, options, cb) {
      const size2 = qrData.modules.size;
      const data = qrData.modules.data;
      const black = "\x1B[40m  \x1B[0m";
      const white = "\x1B[47m  \x1B[0m";
      let output = "";
      const hMargin = Array(size2 + 3).join(white);
      const vMargin = Array(2).join(white);
      output += hMargin + "\n";
      for (let i = 0; i < size2; ++i) {
        output += white;
        for (let j = 0; j < size2; j++) {
          output += data[i * size2 + j] ? black : white;
        }
        output += vMargin + "\n";
      }
      output += hMargin + "\n";
      if (typeof cb === "function") {
        cb(null, output);
      }
      return output;
    };
  }
});

// node_modules/qrcode/lib/renderer/terminal/terminal-small.js
var require_terminal_small = __commonJS({
  "node_modules/qrcode/lib/renderer/terminal/terminal-small.js"(exports) {
    var backgroundWhite = "\x1B[47m";
    var backgroundBlack = "\x1B[40m";
    var foregroundWhite = "\x1B[37m";
    var foregroundBlack = "\x1B[30m";
    var reset = "\x1B[0m";
    var lineSetupNormal = backgroundWhite + foregroundBlack;
    var lineSetupInverse = backgroundBlack + foregroundWhite;
    var createPalette = function(lineSetup, foregroundWhite2, foregroundBlack2) {
      return {
        // 1 ... white, 2 ... black, 0 ... transparent (default)
        "00": reset + " " + lineSetup,
        "01": reset + foregroundWhite2 + "\u2584" + lineSetup,
        "02": reset + foregroundBlack2 + "\u2584" + lineSetup,
        10: reset + foregroundWhite2 + "\u2580" + lineSetup,
        11: " ",
        12: "\u2584",
        20: reset + foregroundBlack2 + "\u2580" + lineSetup,
        21: "\u2580",
        22: "\u2588"
      };
    };
    var mkCodePixel = function(modules, size2, x, y) {
      const sizePlus = size2 + 1;
      if (x >= sizePlus || y >= sizePlus || y < -1 || x < -1) return "0";
      if (x >= size2 || y >= size2 || y < 0 || x < 0) return "1";
      const idx = y * size2 + x;
      return modules[idx] ? "2" : "1";
    };
    var mkCode = function(modules, size2, x, y) {
      return mkCodePixel(modules, size2, x, y) + mkCodePixel(modules, size2, x, y + 1);
    };
    exports.render = function(qrData, options, cb) {
      const size2 = qrData.modules.size;
      const data = qrData.modules.data;
      const inverse = !!(options && options.inverse);
      const lineSetup = options && options.inverse ? lineSetupInverse : lineSetupNormal;
      const white = inverse ? foregroundBlack : foregroundWhite;
      const black = inverse ? foregroundWhite : foregroundBlack;
      const palette = createPalette(lineSetup, white, black);
      const newLine = reset + "\n" + lineSetup;
      let output = lineSetup;
      for (let y = -1; y < size2 + 1; y += 2) {
        for (let x = -1; x < size2; x++) {
          output += palette[mkCode(data, size2, x, y)];
        }
        output += palette[mkCode(data, size2, size2, y)] + newLine;
      }
      output += reset;
      if (typeof cb === "function") {
        cb(null, output);
      }
      return output;
    };
  }
});

// node_modules/qrcode/lib/renderer/terminal.js
var require_terminal2 = __commonJS({
  "node_modules/qrcode/lib/renderer/terminal.js"(exports) {
    var big = require_terminal();
    var small = require_terminal_small();
    exports.render = function(qrData, options, cb) {
      if (options && options.small) {
        return small.render(qrData, options, cb);
      }
      return big.render(qrData, options, cb);
    };
  }
});

// node_modules/qrcode/lib/renderer/svg-tag.js
var require_svg_tag = __commonJS({
  "node_modules/qrcode/lib/renderer/svg-tag.js"(exports) {
    var Utils = require_utils2();
    function getColorAttrib(color, attrib) {
      const alpha = color.a / 255;
      const str = attrib + '="' + color.hex + '"';
      return alpha < 1 ? str + " " + attrib + '-opacity="' + alpha.toFixed(2).slice(1) + '"' : str;
    }
    function svgCmd(cmd, x, y) {
      let str = cmd + x;
      if (typeof y !== "undefined") str += " " + y;
      return str;
    }
    function qrToPath(data, size2, margin) {
      let path2 = "";
      let moveBy = 0;
      let newRow = false;
      let lineLength = 0;
      for (let i = 0; i < data.length; i++) {
        const col = Math.floor(i % size2);
        const row = Math.floor(i / size2);
        if (!col && !newRow) newRow = true;
        if (data[i]) {
          lineLength++;
          if (!(i > 0 && col > 0 && data[i - 1])) {
            path2 += newRow ? svgCmd("M", col + margin, 0.5 + row + margin) : svgCmd("m", moveBy, 0);
            moveBy = 0;
            newRow = false;
          }
          if (!(col + 1 < size2 && data[i + 1])) {
            path2 += svgCmd("h", lineLength);
            lineLength = 0;
          }
        } else {
          moveBy++;
        }
      }
      return path2;
    }
    exports.render = function render(qrData, options, cb) {
      const opts = Utils.getOptions(options);
      const size2 = qrData.modules.size;
      const data = qrData.modules.data;
      const qrcodesize = size2 + opts.margin * 2;
      const bg = !opts.color.light.a ? "" : "<path " + getColorAttrib(opts.color.light, "fill") + ' d="M0 0h' + qrcodesize + "v" + qrcodesize + 'H0z"/>';
      const path2 = "<path " + getColorAttrib(opts.color.dark, "stroke") + ' d="' + qrToPath(data, size2, opts.margin) + '"/>';
      const viewBox = 'viewBox="0 0 ' + qrcodesize + " " + qrcodesize + '"';
      const width = !opts.width ? "" : 'width="' + opts.width + '" height="' + opts.width + '" ';
      const svgTag = '<svg xmlns="http://www.w3.org/2000/svg" ' + width + viewBox + ' shape-rendering="crispEdges">' + bg + path2 + "</svg>\n";
      if (typeof cb === "function") {
        cb(null, svgTag);
      }
      return svgTag;
    };
  }
});

// node_modules/qrcode/lib/renderer/svg.js
var require_svg = __commonJS({
  "node_modules/qrcode/lib/renderer/svg.js"(exports) {
    var svgTagRenderer = require_svg_tag();
    exports.render = svgTagRenderer.render;
    exports.renderToFile = function renderToFile(path2, qrData, options, cb) {
      if (typeof cb === "undefined") {
        cb = options;
        options = void 0;
      }
      const fs2 = __require("fs");
      const svgTag = exports.render(qrData, options);
      const xmlStr = '<?xml version="1.0" encoding="utf-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' + svgTag;
      fs2.writeFile(path2, xmlStr, cb);
    };
  }
});

// node_modules/qrcode/lib/renderer/canvas.js
var require_canvas = __commonJS({
  "node_modules/qrcode/lib/renderer/canvas.js"(exports) {
    var Utils = require_utils2();
    function clearCanvas(ctx, canvas, size2) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!canvas.style) canvas.style = {};
      canvas.height = size2;
      canvas.width = size2;
      canvas.style.height = size2 + "px";
      canvas.style.width = size2 + "px";
    }
    function getCanvasElement() {
      try {
        return document.createElement("canvas");
      } catch (e) {
        throw new Error("You need to specify a canvas element");
      }
    }
    exports.render = function render(qrData, canvas, options) {
      let opts = options;
      let canvasEl = canvas;
      if (typeof opts === "undefined" && (!canvas || !canvas.getContext)) {
        opts = canvas;
        canvas = void 0;
      }
      if (!canvas) {
        canvasEl = getCanvasElement();
      }
      opts = Utils.getOptions(opts);
      const size2 = Utils.getImageWidth(qrData.modules.size, opts);
      const ctx = canvasEl.getContext("2d");
      const image = ctx.createImageData(size2, size2);
      Utils.qrToImageData(image.data, qrData, opts);
      clearCanvas(ctx, canvasEl, size2);
      ctx.putImageData(image, 0, 0);
      return canvasEl;
    };
    exports.renderToDataURL = function renderToDataURL(qrData, canvas, options) {
      let opts = options;
      if (typeof opts === "undefined" && (!canvas || !canvas.getContext)) {
        opts = canvas;
        canvas = void 0;
      }
      if (!opts) opts = {};
      const canvasEl = exports.render(qrData, canvas, opts);
      const type = opts.type || "image/png";
      const rendererOpts = opts.rendererOpts || {};
      return canvasEl.toDataURL(type, rendererOpts.quality);
    };
  }
});

// node_modules/qrcode/lib/browser.js
var require_browser = __commonJS({
  "node_modules/qrcode/lib/browser.js"(exports) {
    var canPromise = require_can_promise();
    var QRCode3 = require_qrcode();
    var CanvasRenderer = require_canvas();
    var SvgRenderer = require_svg_tag();
    function renderCanvas(renderFunc, canvas, text, opts, cb) {
      const args = [].slice.call(arguments, 1);
      const argsNum = args.length;
      const isLastArgCb = typeof args[argsNum - 1] === "function";
      if (!isLastArgCb && !canPromise()) {
        throw new Error("Callback required as last argument");
      }
      if (isLastArgCb) {
        if (argsNum < 2) {
          throw new Error("Too few arguments provided");
        }
        if (argsNum === 2) {
          cb = text;
          text = canvas;
          canvas = opts = void 0;
        } else if (argsNum === 3) {
          if (canvas.getContext && typeof cb === "undefined") {
            cb = opts;
            opts = void 0;
          } else {
            cb = opts;
            opts = text;
            text = canvas;
            canvas = void 0;
          }
        }
      } else {
        if (argsNum < 1) {
          throw new Error("Too few arguments provided");
        }
        if (argsNum === 1) {
          text = canvas;
          canvas = opts = void 0;
        } else if (argsNum === 2 && !canvas.getContext) {
          opts = text;
          text = canvas;
          canvas = void 0;
        }
        return new Promise(function(resolve3, reject) {
          try {
            const data = QRCode3.create(text, opts);
            resolve3(renderFunc(data, canvas, opts));
          } catch (e) {
            reject(e);
          }
        });
      }
      try {
        const data = QRCode3.create(text, opts);
        cb(null, renderFunc(data, canvas, opts));
      } catch (e) {
        cb(e);
      }
    }
    exports.create = QRCode3.create;
    exports.toCanvas = renderCanvas.bind(null, CanvasRenderer.render);
    exports.toDataURL = renderCanvas.bind(null, CanvasRenderer.renderToDataURL);
    exports.toString = renderCanvas.bind(null, function(data, _, opts) {
      return SvgRenderer.render(data, opts);
    });
  }
});

// node_modules/qrcode/lib/server.js
var require_server = __commonJS({
  "node_modules/qrcode/lib/server.js"(exports) {
    var canPromise = require_can_promise();
    var QRCode3 = require_qrcode();
    var PngRenderer = require_png2();
    var Utf8Renderer = require_utf8();
    var TerminalRenderer = require_terminal2();
    var SvgRenderer = require_svg();
    function checkParams(text, opts, cb) {
      if (typeof text === "undefined") {
        throw new Error("String required as first argument");
      }
      if (typeof cb === "undefined") {
        cb = opts;
        opts = {};
      }
      if (typeof cb !== "function") {
        if (!canPromise()) {
          throw new Error("Callback required as last argument");
        } else {
          opts = cb || {};
          cb = null;
        }
      }
      return {
        opts,
        cb
      };
    }
    function getTypeFromFilename(path2) {
      return path2.slice((path2.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase();
    }
    function getRendererFromType(type) {
      switch (type) {
        case "svg":
          return SvgRenderer;
        case "txt":
        case "utf8":
          return Utf8Renderer;
        case "png":
        case "image/png":
        default:
          return PngRenderer;
      }
    }
    function getStringRendererFromType(type) {
      switch (type) {
        case "svg":
          return SvgRenderer;
        case "terminal":
          return TerminalRenderer;
        case "utf8":
        default:
          return Utf8Renderer;
      }
    }
    function render(renderFunc, text, params) {
      if (!params.cb) {
        return new Promise(function(resolve3, reject) {
          try {
            const data = QRCode3.create(text, params.opts);
            return renderFunc(data, params.opts, function(err, data2) {
              return err ? reject(err) : resolve3(data2);
            });
          } catch (e) {
            reject(e);
          }
        });
      }
      try {
        const data = QRCode3.create(text, params.opts);
        return renderFunc(data, params.opts, params.cb);
      } catch (e) {
        params.cb(e);
      }
    }
    exports.create = QRCode3.create;
    exports.toCanvas = require_browser().toCanvas;
    exports.toString = function toString(text, opts, cb) {
      const params = checkParams(text, opts, cb);
      const type = params.opts ? params.opts.type : void 0;
      const renderer = getStringRendererFromType(type);
      return render(renderer.render, text, params);
    };
    exports.toDataURL = function toDataURL(text, opts, cb) {
      const params = checkParams(text, opts, cb);
      const renderer = getRendererFromType(params.opts.type);
      return render(renderer.renderToDataURL, text, params);
    };
    exports.toBuffer = function toBuffer(text, opts, cb) {
      const params = checkParams(text, opts, cb);
      const renderer = getRendererFromType(params.opts.type);
      return render(renderer.renderToBuffer, text, params);
    };
    exports.toFile = function toFile(path2, text, opts, cb) {
      if (typeof path2 !== "string" || !(typeof text === "string" || typeof text === "object")) {
        throw new Error("Invalid argument");
      }
      if (arguments.length < 3 && !canPromise()) {
        throw new Error("Too few arguments provided");
      }
      const params = checkParams(text, opts, cb);
      const type = params.opts.type || getTypeFromFilename(path2);
      const renderer = getRendererFromType(type);
      const renderToFile = renderer.renderToFile.bind(null, path2);
      return render(renderToFile, text, params);
    };
    exports.toFileStream = function toFileStream(stream, text, opts) {
      if (arguments.length < 2) {
        throw new Error("Too few arguments provided");
      }
      const params = checkParams(text, opts, stream.emit.bind(stream, "error"));
      const renderer = getRendererFromType("png");
      const renderToFileStream = renderer.renderToFileStream.bind(null, stream);
      render(renderToFileStream, text, params);
    };
  }
});

// node_modules/qrcode/lib/index.js
var require_lib = __commonJS({
  "node_modules/qrcode/lib/index.js"(exports, module) {
    module.exports = require_server();
  }
});

// server/host.ts
import http2 from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath as fileURLToPath3 } from "node:url";

// server/api-common.ts
import { appendFileSync as appendFileSync2 } from "node:fs";
import { resolve as resolve2 } from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";

// server/lovense-node.ts
import http from "node:http";
import https from "node:https";
import os from "node:os";
var DEFAULT_TIMEOUT_MS = 5e3;
var DISCOVER_TIMEOUT_MS = 450;
var DISCOVER_CONCURRENCY = 40;
function stripLocalIpLabel(raw) {
  return String(raw || "").trim().replace(/^Local\s*IP:\s*/i, "").replace(/\/GetToys\/?$/i, "").replace(/\/+$/, "");
}
function fixPort(port) {
  const p = String(port);
  if (p === "3001" || p === "3010") return 30010;
  if (p === "2001" || p === "2010") return 20010;
  const n = Number(p);
  return Number.isFinite(n) && n > 0 ? n : 20010;
}
function dashedHostToIp(hostname) {
  const m = String(hostname).match(
    /^(\d{1,3})-(\d{1,3})-(\d{1,3})-(\d{1,3})\.lovense\.club$/i
  );
  return m ? `${m[1]}.${m[2]}.${m[3]}.${m[4]}` : null;
}
function candidateEndpoints(raw) {
  let s = stripLocalIpLabel(raw);
  const ipLine = s.match(/Local\s*IP\s*:?\s*(\S+)/i);
  if (ipLine) s = stripLocalIpLabel(ipLine[1]);
  else s = stripLocalIpLabel(s.split(/\r?\n/)[0] || s);
  s = s.replace(/APPID\s*:?\s*[A-Za-z0-9_-]+/gi, "").trim();
  const out = [];
  const add = (host2, port2, useHttps) => {
    const base = `${useHttps ? "https" : "http"}://${host2}:${port2}`;
    if (!out.some((e) => e.base === base)) {
      out.push({ base, host: host2, port: port2, https: useHttps });
    }
  };
  if (!s) return out;
  let host = "";
  let port = 20010;
  let httpsFlag = false;
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      host = u.hostname;
      port = fixPort(u.port || (u.protocol === "https:" ? 30010 : 20010));
      httpsFlag = u.protocol === "https:";
    } catch {
      return out;
    }
  } else {
    const m = s.match(/^([^:/]+)(?::(\d+))?/);
    if (!m) return out;
    host = m[1];
    port = fixPort(m[2] || 20010);
    httpsFlag = port === 30010 || host.includes("lovense.club");
  }
  const ip = dashedHostToIp(host) || (/^\d+\.\d+\.\d+\.\d+$/.test(host) ? host : null);
  if (ip) {
    add(`${ip.replace(/\./g, "-")}.lovense.club`, 30010, true);
    add(ip, 20010, false);
    add(ip, 30010, false);
  }
  add(host, port, httpsFlag);
  if (port === 3001) add(host.includes("lovense") ? host : host, 30010, true);
  return out;
}
function candidateEndpointsRemote(raw) {
  let s = stripLocalIpLabel(raw);
  const ipLine = s.match(/Local\s*IP\s*:?\s*(\S+)/i);
  if (ipLine) s = stripLocalIpLabel(ipLine[1]);
  else s = stripLocalIpLabel(s.split(/\r?\n/)[0] || s);
  s = s.replace(/APPID\s*:?\s*[A-Za-z0-9_-]+/gi, "").trim();
  const out = [];
  const add = (host2, port2, useHttps) => {
    const base = `${useHttps ? "https" : "http"}://${host2}:${port2}`;
    if (!out.some((e) => e.base === base)) {
      out.push({ base, host: host2, port: port2, https: useHttps });
    }
  };
  if (!s) return out;
  let host = "";
  let port = 30010;
  let httpsFlag = true;
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      host = u.hostname;
      port = fixPort(u.port || (u.protocol === "https:" ? 30010 : 20010));
      httpsFlag = u.protocol === "https:";
    } catch {
      return out;
    }
  } else {
    const m = s.match(/^([^:/]+)(?::(\d+))?/);
    if (!m) return out;
    host = m[1];
    port = fixPort(m[2] || 30010);
    httpsFlag = port !== 20010 || host.includes("lovense.club");
  }
  const ip = dashedHostToIp(host) || (/^\d+\.\d+\.\d+\.\d+$/.test(host) ? host : null);
  if (ip) {
    add(`${ip.replace(/\./g, "-")}.lovense.club`, 30010, true);
    add(ip, 30010, true);
    add(ip, 30010, false);
    add(ip, 20010, false);
  }
  add(host, port, httpsFlag);
  return out;
}
function requestJson(base, pathWithQuery, init = {}) {
  return new Promise((resolve3, reject) => {
    const url = new URL(
      pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`,
      base.endsWith("/") ? base : `${base}/`
    );
    const lib = url.protocol === "https:" ? https : http;
    const method = init.method || "GET";
    const timeoutMs = init.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const headers = {
      Accept: "application/json, text/plain, */*",
      "User-Agent": "JustTheTip/1.0",
      "X-platform": "just-the-tip"
    };
    if (init.body) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(init.body);
    }
    let settled = false;
    let killer;
    const finish = (fn) => {
      if (settled) return;
      settled = true;
      if (killer) clearTimeout(killer);
      fn();
    };
    const req = lib.request(
      url,
      {
        method,
        headers,
        rejectUnauthorized: false,
        timeout: timeoutMs
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let data = text;
          try {
            data = JSON.parse(text);
          } catch {
          }
          finish(
            () => resolve3({ status: res.statusCode || 0, data, text })
          );
        });
      }
    );
    killer = setTimeout(() => {
      req.destroy();
      finish(() => reject(new Error(`timeout ${timeoutMs}ms ${url}`)));
    }, timeoutMs);
    req.on("timeout", () => {
      req.destroy();
      finish(() => reject(new Error(`timeout ${timeoutMs}ms ${url}`)));
    });
    req.on("error", (e) => finish(() => reject(e)));
    if (init.body) req.write(init.body);
    req.end();
  });
}
function isPrivateIpv4(ip) {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}
function looksLikeConnectPayload(data) {
  if (!data || typeof data !== "object") return false;
  const o = data;
  const code = o.code;
  if (code === 200 || code === 0 || code === "200" || code === "0") return true;
  if (typeof o.type === "string" && /^(ok|success)$/i.test(o.type.trim())) {
    return true;
  }
  if (o.data != null && typeof o.data === "object") return true;
  if (o.toys != null && typeof o.toys === "object") return true;
  return false;
}
function lanConnectScanHosts() {
  const nets = os.networkInterfaces();
  const prefixes = [];
  const own = [];
  for (const addrs of Object.values(nets)) {
    for (const a of addrs || []) {
      const family = String(a.family);
      if (family !== "IPv4" && family !== "4") continue;
      if (a.internal) continue;
      const ip = a.address;
      if (ip.startsWith("169.254.")) continue;
      if (!isPrivateIpv4(ip)) continue;
      own.push(ip);
      const parts = ip.split(".");
      const prefix = `${parts[0]}.${parts[1]}.${parts[2]}`;
      if (!prefixes.includes(prefix)) prefixes.push(prefix);
    }
  }
  const hosts = [];
  const seen = /* @__PURE__ */ new Set();
  const add = (ip) => {
    if (seen.has(ip)) return;
    seen.add(ip);
    hosts.push(ip);
  };
  for (const ip of own) add(ip);
  for (const prefix of prefixes) add(`${prefix}.1`);
  for (const prefix of prefixes.slice(0, 3)) {
    for (let i = 1; i <= 254; i++) add(`${prefix}.${i}`);
  }
  return hosts;
}
async function pingConnectHttp(host, timeoutMs) {
  const base = `http://${host}:20010`;
  try {
    const res = await requestJson(base, "/command", {
      method: "POST",
      body: JSON.stringify({ command: "GetToys", apiVer: 1 }),
      timeoutMs
    });
    if (res.status < 200 || res.status >= 300) return false;
    return looksLikeConnectPayload(res.data);
  } catch {
    return false;
  }
}
var MULTI_MOTOR_HINT = /gemini|edge|flexer|gravity|gravstar|lapis|solace|diamo|dolce|exomoon|mission|gush|ridge|tenera|hyphy|vulse|ferri|osci|amaze|domi\s*2|lush\s*2|hush\s*2|max\s*2|clamp|clamps|nipple|panty|bloom|twin|dual|n0104/i;
var KNOWN_KEYS = /* @__PURE__ */ new Set([
  "id",
  "toyId",
  "toy",
  "status",
  "connected",
  "nickName",
  "nickname",
  "name",
  "toyName",
  "toyType",
  "type",
  "battery",
  "batteryLevel",
  "f",
  "function",
  "functions",
  "features",
  "fullFunction",
  "fullFeatures",
  "supportFunction",
  "vibrationMotors",
  "vibeMotors",
  "motorCount",
  "motors",
  "vMotors"
]);
function featureBlob(t) {
  return [
    t.f,
    t.function,
    t.functions,
    t.features,
    t.fullFunction,
    t.fullFeatures,
    t.supportFunction
  ].map(
    (x) => x == null ? "" : typeof x === "string" ? x : JSON.stringify(x)
  ).join(" ");
}
function extractFunctions(t) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  const add = (s) => {
    const v = s.trim();
    if (!v || seen.has(v.toLowerCase())) return;
    seen.add(v.toLowerCase());
    out.push(v);
  };
  for (const key of [
    "f",
    "function",
    "functions",
    "features",
    "fullFunction",
    "fullFeatures",
    "supportFunction"
  ]) {
    const val = t[key];
    if (val == null) continue;
    if (typeof val === "string") {
      for (const part of val.split(/[,;|]+/)) add(part);
      continue;
    }
    if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === "string") add(item);
        else if (item && typeof item === "object") {
          const o = item;
          add(String(o.name || o.type || o.function || JSON.stringify(item)));
        }
      }
      continue;
    }
    if (typeof val === "object") {
      for (const [k, v] of Object.entries(val)) {
        if (v === true || v === 1 || v === "1") add(k);
        else if (typeof v === "string" && v) add(`${k}:${v}`);
        else if (v != null && typeof v !== "object") add(`${k}:${String(v)}`);
        else add(k);
      }
    }
  }
  return out;
}
function inferMotors(t, name, toyType) {
  for (const key of [
    "vibrationMotors",
    "vibeMotors",
    "motorCount",
    "motors",
    "vMotors"
  ]) {
    if (t[key] != null && Number(t[key]) >= 1) {
      return Math.min(3, Math.max(1, Math.round(Number(t[key]))));
    }
  }
  const blob = featureBlob(t).toLowerCase();
  if (blob) {
    if (/vibrate3|v3:/.test(blob) || (blob.match(/vibrate\d/g) || []).length >= 3) {
      return 3;
    }
    const dual = /vibrate1|v1:/.test(blob) && /vibrate2|v2:/.test(blob) || (blob.match(/vibrate\d/g) || []).length >= 2;
    if (dual) return 2;
    if (/vibrate|rotate|air|thrust|pump/.test(blob)) {
      if (/gemini|edge|dolce|lapis|magnet|clamp|twin|dual|n0104/.test(`${toyType} ${name}`.toLowerCase())) {
        return 2;
      }
      return 1;
    }
  }
  const label = `${toyType} ${name}`;
  if (MULTI_MOTOR_HINT.test(label)) {
    if (/\bmax\b/i.test(label)) return 1;
    if (/\bnora\b/i.test(label)) return 1;
    if (/\bsolace\b/i.test(label) && !/pro/i.test(label)) return 1;
    return 2;
  }
  return 1;
}
function inferSecondary(t, name, toyType) {
  const label = `${toyType} ${name} ${featureBlob(t)}`.toLowerCase();
  return {
    rotate: /rotate|\bnora\b/.test(label),
    air: /\bair\b|pump|suction|\bmax\b/.test(label),
    pump: /pump|suction/.test(label),
    // Solace-class linear thrust (and explicit "thrust" feature strings)
    thrust: /thrust|\bsolace\b/.test(label)
  };
}
function scalarExtra(t) {
  const extra = {};
  for (const [k, v] of Object.entries(t)) {
    if (KNOWN_KEYS.has(k)) continue;
    if (v == null) {
      extra[k] = null;
      continue;
    }
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      extra[k] = v;
      continue;
    }
    try {
      extra[k] = JSON.stringify(v);
    } catch {
      extra[k] = String(v);
    }
  }
  return extra;
}
function normalizeToys(raw) {
  if (!raw || typeof raw !== "object") return [];
  const root2 = raw;
  let data = root2.data != null ? root2.data : raw;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const bag = data;
    if (bag.toys != null) {
      let toys = bag.toys;
      if (typeof toys === "string") {
        try {
          toys = JSON.parse(toys);
        } catch {
          toys = null;
        }
      }
      if (toys && typeof toys === "object") data = toys;
    }
  } else if (root2.toys != null) {
    let toys = root2.toys;
    if (typeof toys === "string") {
      try {
        toys = JSON.parse(toys);
      } catch {
        toys = null;
      }
    }
    if (toys && typeof toys === "object") data = toys;
  }
  const entries = [];
  if (Array.isArray(data)) {
    for (const v of data) {
      if (v && typeof v === "object") entries.push(v);
    }
  } else if (data && typeof data === "object") {
    for (const [k, v] of Object.entries(data)) {
      if (v && typeof v === "object") {
        entries.push({ id: v.id || k, ...v });
      }
    }
  }
  return entries.map((t) => {
    const id = String(t.id || t.toyId || t.toy || "").trim();
    if (!id) return null;
    const statusRaw = t.status;
    const status = statusRaw == null ? "" : String(statusRaw);
    const connected = statusRaw === 1 || statusRaw === "1" || statusRaw === true || t.connected === true || ["on", "online"].includes(status.toLowerCase());
    const nickName = String(t.nickName || t.nickname || "").trim();
    const toyType = String(t.toyType || t.type || "").trim();
    const name = nickName || String(t.name || t.toyName || "").trim() || toyType || "toy";
    let battery = null;
    if (t.battery != null && Number.isFinite(Number(t.battery))) {
      battery = Number(t.battery);
    } else if (t.batteryLevel != null && Number.isFinite(Number(t.batteryLevel))) {
      battery = Number(t.batteryLevel);
    }
    let liveLevel = null;
    let liveAction = null;
    const emu = t._emu;
    if (emu && typeof emu === "object") {
      const e = emu;
      if (e.level != null && Number.isFinite(Number(e.level))) {
        liveLevel = Number(e.level);
      }
      if (e.action != null) liveAction = String(e.action);
    }
    return {
      id,
      name,
      nickName,
      toyType: toyType || "lovense",
      connected,
      status: status || (connected ? "online" : "offline"),
      battery,
      motors: inferMotors(t, name, toyType),
      functions: extractFunctions(t),
      secondary: inferSecondary(t, name, toyType),
      extra: scalarExtra(t),
      liveLevel,
      liveAction
    };
  }).filter((t) => t != null);
}
function motorSelection(motorCount, mask) {
  const n = Math.max(1, Math.min(3, motorCount));
  if (!mask || !mask.length) return null;
  const selected = new Set(
    mask.map((x) => Math.round(Number(x))).filter((m) => m >= 1 && m <= n)
  );
  if (!selected.size || selected.size >= n) return null;
  return selected;
}
function buildAction(level020, motorsOrToy = 1) {
  const raw = Math.max(0, Math.min(20, Math.round(level020)));
  const level = raw;
  const parts = [];
  const toy = typeof motorsOrToy === "object" && motorsOrToy ? motorsOrToy : null;
  const axis = toy?.driveAxis || "full";
  if (axis === "rotate") {
    return `Rotate:${level}`;
  }
  if (axis === "thrust") {
    return `Thrusting:${level}`;
  }
  if (axis === "air") {
    const air03 = level <= 0 ? 0 : Math.max(1, Math.min(3, Math.ceil(level / 20 * 3)));
    return level > 0 ? `Air:${air03},AbsoluteAir:${level}` : `Air:0,AbsoluteAir:0`;
  }
  let n = Math.max(
    1,
    Math.min(3, toy ? toy.motors || 1 : Number(motorsOrToy) || 1)
  );
  if (toy) {
    const label = `${toy.toyType || ""} ${toy.name || ""} ${(toy.functions || []).join(" ")}`.toLowerCase();
    if (/gemini|edge|dolce|lapis|magnet|clamp|twin|dual/.test(label)) {
      n = Math.max(n, 2);
    }
  }
  const only = motorSelection(n, toy?.motorMask);
  const lanes = toy?.motorLevels?.length ? toy.motorLevels : null;
  if (n > 1 && lanes && level > 0) {
    for (let m = 1; m <= n; m++) {
      const on = !only || only.has(m);
      const lane = Math.max(0, Math.min(20, Math.round(Number(lanes[m - 1]) || 0)));
      parts.push(`Vibrate${m}:${on ? lane : 0}`);
    }
  } else if (n > 1) {
    for (let m = 1; m <= n; m++) {
      const on = !only || only.has(m);
      parts.push(`Vibrate${m}:${on ? level : 0}`);
    }
    if (!only) parts.push(`Vibrate:${level}`);
  } else {
    parts.push(`Vibrate:${level}`);
  }
  if (toy && !only && axis !== "vibe") {
    const blob = `${toy.toyType || ""} ${toy.name || ""} ${(toy.functions || []).join(" ")}`.toLowerCase();
    const sec = toy.secondary || {
      rotate: false,
      air: false,
      pump: false,
      thrust: false
    };
    if (sec.rotate || /\brotate\b/.test(blob) || /\bnora\b/.test(blob)) {
      parts.push(`Rotate:${level}`);
    }
    if (sec.air || sec.pump || /\bair\b/.test(blob) || /\bpump\b/.test(blob) || /\bmax\b/.test(blob)) {
      const air03 = level <= 0 ? 0 : Math.max(1, Math.min(3, Math.ceil(level / 20 * 3)));
      parts.push(`Air:${air03}`);
      parts.push(`AbsoluteAir:${level}`);
    }
    if (sec.thrust || /\bthrust/.test(blob) || /\bsolace\b/.test(blob)) {
      parts.push(`Thrusting:${level}`);
    }
  }
  return [...new Set(parts)].join(",");
}
function buildStop(motorsOrToy = 1) {
  const zero = buildAction(0, motorsOrToy).split(/[,;]+/).map((p) => p.replace(/:\d+\s*$/, ":0"));
  const extras = [
    "Vibrate:0",
    "Vibrate1:0",
    "Vibrate2:0",
    "Vibrate3:0",
    "All:0",
    "Rotate:0",
    "Air:0",
    "AbsoluteAir:0",
    "Thrusting:0"
  ];
  return [.../* @__PURE__ */ new Set([...zero, ...extras])].join(",");
}
function lovenseTimeSec(durationSec) {
  const d = Number(durationSec);
  if (!Number.isFinite(d) || d <= 0) return 0;
  if (d < 1.1) return 0;
  return Math.min(600, Math.round(d * 10) / 10);
}
function buildChannelAction(channel, level020, motorCount = 2) {
  const level = Math.max(0, Math.min(20, Math.round(level020)));
  const n = Math.max(1, Math.min(3, Math.round(Number(motorCount) || 1)));
  const ch = String(channel || "vibrate").trim().toLowerCase().replace(/\s+/g, "");
  const zeroOtherVibes = (on) => {
    const parts = [];
    for (let m = 1; m <= n; m++) {
      parts.push(`Vibrate${m}:${m === on ? level : 0}`);
    }
    return parts.join(",");
  };
  if (ch === "vibrate1" || ch === "m1" || ch === "motor1") {
    return n > 1 ? zeroOtherVibes(1) : `Vibrate:${level}`;
  }
  if (ch === "vibrate2" || ch === "m2" || ch === "motor2") {
    return n > 1 ? zeroOtherVibes(2) : `Vibrate:${level}`;
  }
  if (ch === "vibrate3" || ch === "m3" || ch === "motor3") {
    return n > 2 ? zeroOtherVibes(3) : n > 1 ? zeroOtherVibes(1) : `Vibrate:${level}`;
  }
  if (ch === "rotate") return `Rotate:${level}`;
  if (ch === "thrust" || ch === "thrusting") return `Thrusting:${level}`;
  if (ch === "air" || ch === "absoluteair") {
    const air03 = level <= 0 ? 0 : Math.max(1, Math.min(3, Math.ceil(level / 20 * 3)));
    return `Air:${air03},AbsoluteAir:${level}`;
  }
  if (ch === "pump") {
    const p = level <= 0 ? 0 : Math.max(1, Math.min(3, Math.ceil(level / 20 * 3)));
    return `Pump:${p}`;
  }
  if (ch === "both" || ch === "combo") {
    const parts = [`Vibrate:${level}`, `Rotate:${level}`, `Thrusting:${level}`];
    const air03 = level <= 0 ? 0 : Math.max(1, Math.min(3, Math.ceil(level / 20 * 3)));
    parts.push(`Air:${air03}`, `AbsoluteAir:${level}`, `All:${level}`);
    return parts.join(",");
  }
  if (ch === "all") return `All:${level}`;
  if (n > 1) {
    const parts = [];
    for (let m = 1; m <= n; m++) parts.push(`Vibrate${m}:${level}`);
    parts.push(`Vibrate:${level}`);
    return parts.join(",");
  }
  return `Vibrate:${level}`;
}
async function channelTestOnBase(base, channel, intensity020, durationSec, toys = [], toyId) {
  const level = Math.max(0, Math.min(20, Math.round(intensity020)));
  const t = lovenseTimeSec(
    Number.isFinite(durationSec) ? durationSec : 3
  );
  if (level <= 0) {
    await stopOnBase(base, toys);
    return { ok: true, action: "Stop", toys: [] };
  }
  let list = toys;
  if (!list.length) {
    try {
      list = (await getToys(base)).list;
    } catch {
      list = [];
    }
  }
  if (toyId) {
    list = list.filter((x) => x.id === toyId);
    if (!list.length) {
      list = [
        {
          id: toyId,
          name: toyId,
          nickName: "",
          toyType: "",
          connected: true,
          status: "online",
          battery: null,
          motors: 2,
          functions: [],
          secondary: { rotate: false, air: false, pump: false, thrust: false },
          extra: {}
        }
      ];
    }
  }
  const online = list.filter((x) => x.connected);
  const pool = online.length ? online : list;
  if (!pool.length) {
    const action = buildChannelAction(channel, level, 2);
    await lovenseCommand(base, {
      command: "Function",
      action,
      timeSec: t,
      stopPrevious: 1
    });
    return { ok: true, action, toys: [] };
  }
  const actionsUsed = [];
  for (const toy of pool) {
    if (!toy.id) continue;
    let motors = Math.max(1, toy.motors || 1);
    const label = `${toy.toyType} ${toy.name}`.toLowerCase();
    if (/gemini|edge|dolce|lapis|magnet|clamp|twin|dual/.test(label)) {
      motors = Math.max(motors, 2);
    }
    const action = buildChannelAction(channel, level, motors);
    actionsUsed.push(action);
    await lovenseCommand(base, {
      command: "Function",
      action,
      timeSec: t,
      // Targeted channel test — don't cascade stopPrevious onto other toys
      stopPrevious: 0,
      toy: toy.id
    });
  }
  if (!actionsUsed.length) {
    throw new Error("No toy id for channel test");
  }
  return {
    ok: true,
    action: actionsUsed.join(" | "),
    toys: pool.map((x) => x.name || x.id)
  };
}
async function lovenseCommand(base, body) {
  const payload = JSON.stringify({ apiVer: 1, ...body });
  const res = await requestJson(base, "/command", {
    method: "POST",
    body: payload
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`POST /command HTTP ${res.status}: ${res.text.slice(0, 160)}`);
  }
  assertLovensePayload(res.data, "POST /command");
  return res.data;
}
function assertLovensePayload(data, where) {
  if (data == null || typeof data !== "object") return;
  const o = data;
  if (o.code == null && o.type == null && o.result == null) return;
  const code = o.code != null ? Number(o.code) : null;
  if (code != null && Number.isFinite(code) && code !== 200 && code !== 0) {
    const detail = String(o.message || o.type || o.msg || "").trim() || `code ${code}`;
    throw new Error(`Lovense ${where}: ${detail}`);
  }
  if (typeof o.type === "string") {
    const t = o.type.toUpperCase();
    if (t && t !== "OK" && t !== "SUCCESS" && !t.includes("OK")) {
      if (/ERR|ERROR|FAIL|INVALID/.test(t)) {
        throw new Error(`Lovense ${where}: ${o.type}`);
      }
    }
  }
}
async function getToys(base) {
  const raw = await lovenseCommand(base, { command: "GetToys" });
  return { raw, list: normalizeToys(raw) };
}
async function probeLocalIp(raw) {
  const tried = [];
  const errs = [];
  for (const ep of candidateEndpoints(raw)) {
    tried.push(ep.base);
    try {
      const { list } = await getToys(ep.base);
      const online = list.filter((t) => t.connected);
      const labels = (online.length ? online : list).map((t) => t.name);
      return {
        ok: true,
        base: ep.base,
        list,
        tried,
        detail: list.length === 0 ? `Connect reached @ ${ep.base} \xB7 no toys paired` : `ok @ ${ep.base} \xB7 ${online.length || list.length} toy(s): ${labels.join(", ")}`
      };
    } catch (e) {
      errs.push(`${ep.base}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return {
    ok: false,
    tried,
    error: errs.slice(0, 4).join(" | ") || "No Local IP to try \u2014 paste host like 192.168.1.20 or Connect Local IP"
  };
}
async function probeLocalIpRemote(raw) {
  const tried = [];
  const errs = [];
  let emptyHit = null;
  for (const ep of candidateEndpointsRemote(raw)) {
    tried.push(ep.base);
    try {
      const { list } = await getToys(ep.base);
      if (!list.length) {
        if (!emptyHit) emptyHit = { base: ep.base, list };
        continue;
      }
      const online = list.filter((t) => t.connected);
      const labels = (online.length ? online : list).map((t) => t.name);
      return {
        ok: true,
        base: ep.base,
        list,
        tried,
        detail: `ok @ ${ep.base} \xB7 ${online.length || list.length} toy(s): ${labels.join(", ")}`
      };
    } catch (e) {
      errs.push(`${ep.base}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (emptyHit) {
    return {
      ok: true,
      base: emptyHit.base,
      list: emptyHit.list,
      tried,
      detail: `Remote reached @ ${emptyHit.base} \xB7 no toys paired`
    };
  }
  return {
    ok: false,
    tried,
    error: errs.slice(0, 4).join(" | ") || "No Local IP to try \u2014 paste Remote Game Mode Local IP (Enable LAN)"
  };
}
async function discoverConnect() {
  const hosts = lanConnectScanHosts();
  if (!hosts.length) {
    return {
      ok: false,
      scanned: 0,
      error: "No Wi\u2011Fi/LAN on this PC \u2014 join the same network as Lovense Connect, then paste the Local IP it shows"
    };
  }
  let found = null;
  let scanned = 0;
  for (let i = 0; i < hosts.length && !found; i += DISCOVER_CONCURRENCY) {
    const batch = hosts.slice(i, i + DISCOVER_CONCURRENCY);
    scanned += batch.length;
    const hits = await Promise.all(
      batch.map(
        async (host) => await pingConnectHttp(host, DISCOVER_TIMEOUT_MS) ? host : null
      )
    );
    found = hits.find((h) => Boolean(h)) || null;
  }
  if (!found) {
    return {
      ok: false,
      scanned,
      error: "No Lovense Connect on this Wi\u2011Fi. Open Connect on the phone or PC, then paste the Local IP it shows"
    };
  }
  return {
    ok: true,
    localIp: found,
    base: `http://${found}:20010`,
    scanned
  };
}
async function vibrateOnBase(base, intensity020, durationSec, toys = []) {
  const level = Math.max(0, Math.min(20, Math.round(intensity020)));
  const t = lovenseTimeSec(
    Number.isFinite(durationSec) ? durationSec : 3
  );
  const targeted = toys.length > 0;
  if (level <= 0) {
    await stopOnBase(base, toys);
    return { ok: true, action: "Stop", toys: [] };
  }
  let list = toys;
  if (!list.length) {
    try {
      list = (await getToys(base)).list;
    } catch {
      list = [];
    }
  }
  const online = list.filter((x) => x.connected);
  const pool = online.length ? online : list;
  const errors = [];
  const actionsUsed = /* @__PURE__ */ new Set();
  async function sendFunction(action, toyId) {
    actionsUsed.add(action);
    const stopPrevious = toyId ? 0 : 1;
    try {
      const { agentLog: agentLog2 } = await Promise.resolve().then(() => (init_debugSessionLog(), debugSessionLog_exports));
      agentLog2(
        "lovense-node.ts:sendFunction",
        "bridge_function",
        {
          action: String(action).slice(0, 100),
          toyId: toyId || null,
          timeSec: t,
          stopPrevious,
          poolSize: pool.length,
          targeted
        },
        !toyId ? "H-A" : "H-C"
      );
    } catch {
    }
    await lovenseCommand(base, {
      command: "Function",
      action,
      timeSec: t,
      // With a toy id: stopPrevious:0 avoids Connect flashing/stopping OTHER toys
      // (Gemini LED blink during a Nora-only rotate tip).
      stopPrevious,
      ...toyId ? { toy: toyId } : {}
    });
  }
  const actionCandidates = (toy) => {
    const axis = toy?.driveAxis || "full";
    if (axis === "rotate") {
      return [
        buildAction(level, toy || { motors: 1, driveAxis: "rotate" }),
        `Rotate:${level}`
      ];
    }
    if (axis === "thrust") {
      return [
        buildAction(level, toy || { motors: 1, driveAxis: "thrust" }),
        `Thrusting:${level}`
      ];
    }
    if (axis === "air") {
      return [buildAction(level, toy || { motors: 1, driveAxis: "air" })];
    }
    const multi = toy ? buildAction(level, toy) : buildAction(level, 2);
    const mask = toy?.motorMask;
    const only = mask && mask.length === 1 ? Math.round(Number(mask[0])) : 0;
    const list2 = [multi];
    const lanes = toy?.motorLevels;
    if (lanes?.length && level > 0) {
      const lane = (m) => Math.max(0, Math.min(20, Math.round(Number(lanes[m - 1]) || 0)));
      list2.push(`Vibrate1:${lane(1)},Vibrate2:${lane(2)}`);
      return list2.filter((a, i, arr) => arr.indexOf(a) === i);
    }
    if (only === 1) {
      list2.push(`Vibrate1:${level},Vibrate2:0`, `Vibrate1:${level}`);
    } else if (only === 2) {
      list2.push(`Vibrate1:0,Vibrate2:${level}`, `Vibrate2:${level}`);
    } else {
      list2.push(
        `Vibrate1:${level},Vibrate2:${level}`,
        `Vibrate:${level}`,
        `All:${level}`
      );
    }
    return list2.filter((a, i, arr) => arr.indexOf(a) === i);
  };
  if (!pool.length) {
    if (targeted) {
      throw new Error("Target toy offline or missing from Connect inventory");
    }
    let ok = false;
    for (const action of actionCandidates()) {
      try {
        await sendFunction(action);
        ok = true;
        break;
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }
    if (!ok) {
      throw new Error(errors.join("; ") || "vibrate failed");
    }
    return { ok: true, action: [...actionsUsed].join(" | "), toys: [] };
  }
  for (const toy of pool) {
    let toyOk = false;
    let lastErr = "";
    if (!toy.id) {
      errors.push(`${toy.name || "toy"}: missing id \u2014 refusing all-device broadcast`);
      continue;
    }
    for (const action of actionCandidates(toy)) {
      try {
        await sendFunction(action, toy.id);
        toyOk = true;
        break;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
      }
    }
    if (!toyOk) {
      errors.push(`${toy.name || toy.id}: ${lastErr || "vibrate failed"}`);
    }
  }
  if (!targeted && errors.length >= pool.length) {
    try {
      await sendFunction(`Vibrate:${level}`);
      errors.length = 0;
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }
  if (errors.length && errors.length >= Math.max(1, pool.length || 1)) {
    throw new Error(errors.join("; ") || "vibrate failed");
  }
  return {
    ok: true,
    action: [...actionsUsed].join(" | ") || buildAction(level, 1),
    toys: pool.map((x) => x.name || x.id)
  };
}
async function stopOnBase(base, toys = []) {
  let list = toys;
  if (!list.length) {
    try {
      list = (await getToys(base)).list;
    } catch {
      list = [];
    }
  }
  const online = list.filter((x) => x.connected);
  const pool = online.length ? online : list;
  if (!pool.length) {
    try {
      await lovenseCommand(base, {
        command: "Function",
        action: "Stop",
        timeSec: 0,
        stopPrevious: 1
      });
    } catch {
    }
    return;
  }
  for (const toy of pool) {
    if (!toy.id) continue;
    try {
      await lovenseCommand(base, {
        command: "Function",
        action: "Stop",
        timeSec: 0,
        stopPrevious: 0,
        toy: toy.id
      });
    } catch {
      try {
        await lovenseCommand(base, {
          command: "Function",
          action: buildStop(toy),
          timeSec: 0,
          stopPrevious: 0,
          toy: toy.id
        });
      } catch {
      }
    }
  }
}

// server/api-common.ts
var AGENT_DEBUG_LOG = resolve2(
  fileURLToPath2(new URL(".", import.meta.url)),
  "../debug-63e21f.log"
);
function handleAgentDebugPost(body) {
  const payload = {
    sessionId: "63e21f",
    hypothesisId: body.hypothesisId || "",
    location: String(body.location || ""),
    message: String(body.message || ""),
    data: body.data && typeof body.data === "object" ? body.data : {},
    timestamp: Number(body.timestamp) || Date.now()
  };
  try {
    appendFileSync2(AGENT_DEBUG_LOG, JSON.stringify(payload) + "\n", "utf8");
  } catch {
  }
}
function readBody(req) {
  return new Promise((resolve3, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => resolve3(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}
async function handleLovensePost(body, res) {
  const op = String(body.op || "");
  if (op === "probe") {
    const localIp = String(body.localIp || body.host || "");
    const mode = String(body.mode || "").toLowerCase();
    const result = mode === "remote" ? await probeLocalIpRemote(localIp) : await probeLocalIp(localIp);
    sendJson(res, result.ok ? 200 : 502, result);
    return;
  }
  if (op === "discover") {
    const result = await discoverConnect();
    sendJson(res, 200, result);
    return;
  }
  if (op === "vibrate") {
    const base = String(body.base || "");
    if (!base) {
      sendJson(res, 400, { error: "base required (call probe first)" });
      return;
    }
    let intensity = Number(body.intensity);
    if (!Number.isFinite(intensity)) intensity = 10;
    if (intensity > 0 && intensity <= 1) intensity = intensity * 20;
    const durationSec = Number(body.durationSec) || 2;
    const toys = Array.isArray(body.toys) ? body.toys : [];
    const result = await vibrateOnBase(base, intensity, durationSec, toys);
    sendJson(res, 200, result);
    return;
  }
  if (op === "channel") {
    const base = String(body.base || "");
    if (!base) {
      sendJson(res, 400, { error: "base required (call probe first)" });
      return;
    }
    let intensity = Number(body.intensity);
    if (!Number.isFinite(intensity)) intensity = 18;
    if (intensity > 0 && intensity <= 1) intensity = intensity * 20;
    const durationSec = Number(body.durationSec) || 3;
    const channel = String(body.channel || body.feature || "vibrate");
    const toyId = body.toyId != null ? String(body.toyId) : void 0;
    const toys = Array.isArray(body.toys) ? body.toys : [];
    try {
      const result = await channelTestOnBase(
        base,
        channel,
        intensity,
        durationSec,
        toys,
        toyId
      );
      sendJson(res, 200, result);
    } catch (e) {
      sendJson(res, 502, {
        ok: false,
        error: e instanceof Error ? e.message : String(e)
      });
    }
    return;
  }
  if (op === "stop") {
    const base = String(body.base || "");
    if (!base) {
      sendJson(res, 400, { error: "base required" });
      return;
    }
    const toys = Array.isArray(body.toys) ? body.toys : [];
    await stopOnBase(base, toys);
    sendJson(res, 200, { ok: true });
    return;
  }
  if (op === "toys") {
    const base = String(body.base || "");
    if (!base) {
      sendJson(res, 400, { error: "base required" });
      return;
    }
    try {
      const { list, raw } = await getToys(base);
      sendJson(res, 200, { ok: true, list, raw });
    } catch (e) {
      sendJson(res, 502, {
        ok: false,
        error: e instanceof Error ? e.message : String(e)
      });
    }
    return;
  }
  sendJson(res, 400, {
    error: "unknown op \u2014 use probe | discover | vibrate | channel | stop | toys"
  });
}

// server/open-browser.ts
import { spawn } from "node:child_process";
var DEFAULT_APP_URL = "http://127.0.0.1:5193/";
function openExternalBrowser(url) {
  const target = (url || DEFAULT_APP_URL).trim() || DEFAULT_APP_URL;
  if (process.platform === "win32") {
    const candidates = [
      {
        via: "chrome",
        file: "cmd.exe",
        args: ["/c", "start", "", "chrome", target]
      },
      {
        via: "msedge",
        file: "cmd.exe",
        args: ["/c", "start", "", "msedge", target]
      },
      {
        via: "default",
        file: "cmd.exe",
        args: ["/c", "start", "", target]
      }
    ];
    for (const c of candidates) {
      try {
        const child = spawn(c.file, c.args, {
          detached: true,
          stdio: "ignore",
          windowsHide: true
        });
        child.unref();
        return { ok: true, via: c.via };
      } catch {
      }
    }
    return { ok: false, error: "Could not launch a browser" };
  }
  if (process.platform === "darwin") {
    try {
      const child = spawn("open", ["-a", "Google Chrome", target], {
        detached: true,
        stdio: "ignore"
      });
      child.unref();
      return { ok: true, via: "chrome" };
    } catch {
      try {
        const child = spawn("open", [target], {
          detached: true,
          stdio: "ignore"
        });
        child.unref();
        return { ok: true, via: "default" };
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : String(e)
        };
      }
    }
  }
  try {
    const child = spawn("xdg-open", [target], {
      detached: true,
      stdio: "ignore"
    });
    child.unref();
    return { ok: true, via: "xdg-open" };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e)
    };
  }
}
function sanitizeLocalAppUrl(candidate, fallback = DEFAULT_APP_URL) {
  if (typeof candidate !== "string") return fallback;
  const url = candidate.trim();
  if (/^https?:\/\/127\.0\.0\.1(?::\d+)?\/?/i.test(url)) return url;
  return fallback;
}

// src/version.ts
var APP_NAME = "Just The Tip";
var APP_VERSION = "2.0.29";
var APP_LOGO = "/brand/just-the-tip-logo.png";

// server/tip-menu-store.ts
var storedHtml = "";
var updatedAt = null;
var MAX_BYTES = 4e6;
function setTipMenuHtml(html) {
  if (typeof html !== "string" || !html.trim()) {
    return { ok: false, error: "empty html" };
  }
  if (html.length > MAX_BYTES) {
    return { ok: false, error: "html too large" };
  }
  storedHtml = html;
  updatedAt = Date.now();
  return { ok: true };
}
function getTipMenuHtml() {
  return storedHtml.trim() ? storedHtml : null;
}
function tipMenuMeta() {
  return {
    hasMenu: Boolean(storedHtml.trim()),
    updatedAt,
    bytes: storedHtml.length
  };
}
function emptyTipMenuPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${APP_NAME} \xB7 Tip menu</title>
<style>
  body { font-family: "Avenir Next", "Segoe UI", system-ui, sans-serif; background: #050d18; color: #e8f4ff; padding: 2rem; max-width: 36rem; margin: 0 auto; line-height: 1.5; }
  a { color: #00c8ff; }
  code { background: #0a1830; padding: 0.1em 0.35em; border-radius: 4px; }
  .mark { width: 4.5rem; height: 4.5rem; vertical-align: middle; margin-right: 0.5rem; object-fit: contain; }
</style>
</head>
<body>
  <p><img class="mark" src="${APP_LOGO}" alt="" width="72" height="72"/><strong>${APP_NAME}</strong> \xB7 PulseChain</p>
  <h1>No tip menu loaded</h1>
  <p>In ${APP_NAME} open <strong>Tip menu \u2192 Share card \u2192 Export HTML</strong>. Host the file on HTTPS so fans can scan EIP-681 QRs (token, amount, network) \u2014 or open this page while testing when a menu is published.</p>
  <p><a href="/">\u2190 Back to ${APP_NAME}</a></p>
</body>
</html>`;
}

// src/overlay/templates.ts
var SHELL = `.alert.theme-custom {
  padding: 0;
  border: none;
  background: transparent;
  box-shadow: none;
  max-width: min(32rem, 92vw);
}`;
var OVERLAY_TEMPLATES = [
  {
    id: "rose-window",
    name: "Rose window",
    blurb: "Pink frame \xB7 gradient bar title strip",
    size: "normal",
    html: `<div class="t-rose">
  <div class="t-rose-bar">{{brand}}</div>
  <div class="t-rose-body">
    <div class="t-rose-eye">{{eyebrow}}</div>
    <div class="t-rose-title">{{title}}</div>
    <div class="t-rose-sub">{{subtitle}}</div>
  </div>
</div>`,
    css: `${SHELL}
.t-rose {
  border: 3px solid #f0a0c0;
  border-radius: 14px;
  overflow: hidden;
  background: linear-gradient(160deg, #2a1020 0%, #120818 100%);
  box-shadow: 0 12px 40px rgba(0,0,0,.55), 0 0 0 1px rgba(255,180,210,.2);
}
.t-rose-bar {
  padding: .35rem .75rem;
  font-size: .75rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: #120818;
  background: linear-gradient(90deg, #f0a0c0, #ffd0e0);
  min-height: 1.4rem;
}
.t-rose-bar:empty { display: none; }
.t-rose-body { padding: .85rem 1.1rem 1rem; }
.t-rose-eye {
  font-size: .7rem;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: #f0a0c0;
  font-weight: 700;
  margin-bottom: .25rem;
}
.t-rose-title {
  font-size: clamp(1.5rem, 3.5vw, 2.2rem);
  font-weight: 800;
  color: #fff5fa;
  line-height: 1.1;
}
.t-rose-sub {
  margin-top: .35rem;
  font-size: .95rem;
  color: #e0b0c8;
  font-weight: 600;
}
.t-rose-sub:empty { display: none; }
`
  },
  {
    id: "neon-cyan",
    name: "Neon cyan",
    blurb: "Cyber glow \xB7 thin neon rim",
    size: "normal",
    html: `<div class="t-neon">
  <div class="t-neon-brand">{{brand}}</div>
  <div class="t-neon-eye">{{eyebrow}}</div>
  <div class="t-neon-title">{{title}}</div>
  <div class="t-neon-sub">{{subtitle}}</div>
</div>`,
    css: `${SHELL}
.t-neon {
  padding: 1rem 1.25rem 1.1rem;
  border-radius: 4px;
  border: 1px solid #3de0ff;
  background: rgba(2, 12, 22, 0.92);
  box-shadow:
    0 0 0 1px rgba(61, 224, 255, 0.25),
    0 0 28px rgba(0, 200, 255, 0.35),
    inset 0 0 40px rgba(0, 120, 180, 0.12);
  font-family: ui-monospace, "Cascadia Code", Consolas, monospace;
}
.t-neon-brand {
  font-size: .7rem;
  letter-spacing: .2em;
  text-transform: uppercase;
  color: #3de0ff;
  margin-bottom: .35rem;
  text-shadow: 0 0 12px rgba(61, 224, 255, 0.8);
}
.t-neon-brand:empty { display: none; }
.t-neon-eye {
  font-size: .65rem;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: #7a9aac;
  margin-bottom: .3rem;
}
.t-neon-title {
  font-size: clamp(1.55rem, 3.6vw, 2.3rem);
  font-weight: 700;
  color: #e8fbff;
  text-shadow: 0 0 18px rgba(61, 224, 255, 0.55);
  line-height: 1.1;
}
.t-neon-sub {
  margin-top: .4rem;
  font-size: .88rem;
  color: #7ec8d8;
}
.t-neon-sub:empty { display: none; }
`
  },
  {
    id: "gold-vip",
    name: "Gold VIP",
    blurb: "Plaque \xB7 heavy gold edge",
    size: "large",
    html: `<div class="t-vip">
  <div class="t-vip-seal">{{eyebrow}}</div>
  <div class="t-vip-brand">{{brand}}</div>
  <div class="t-vip-title">{{title}}</div>
  <div class="t-vip-sub">{{subtitle}}</div>
</div>`,
    css: `${SHELL}
.t-vip {
  padding: 1.15rem 1.5rem 1.2rem;
  border-radius: 6px;
  border: 2px solid #e8c060;
  background:
    linear-gradient(145deg, rgba(48, 36, 12, 0.95), rgba(18, 14, 6, 0.96));
  box-shadow:
    0 0 0 4px rgba(0,0,0,.35),
    0 16px 40px rgba(80, 50, 0, 0.45),
    inset 0 1px 0 rgba(255, 230, 160, 0.25);
  text-align: center;
}
.t-vip-seal {
  display: inline-block;
  padding: .2rem .65rem;
  margin-bottom: .45rem;
  font-size: .62rem;
  font-weight: 800;
  letter-spacing: .2em;
  text-transform: uppercase;
  color: #1a1204;
  background: linear-gradient(90deg, #c9a045, #f0d878, #c9a045);
  border-radius: 999px;
}
.t-vip-brand {
  font-size: .8rem;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: #f0d878;
  margin-bottom: .35rem;
}
.t-vip-brand:empty { display: none; }
.t-vip-title {
  font-size: clamp(1.75rem, 4vw, 2.6rem);
  font-weight: 800;
  color: #fff8e8;
  line-height: 1.05;
  text-shadow: 0 2px 0 rgba(0,0,0,.4);
}
.t-vip-sub {
  margin-top: .45rem;
  font-size: .95rem;
  color: #d4b878;
  font-weight: 600;
}
.t-vip-sub:empty { display: none; }
`
  },
  {
    id: "soft-glass",
    name: "Soft glass",
    blurb: "Frosted panel \xB7 quiet stream chrome",
    size: "normal",
    html: `<div class="t-glass">
  <div class="t-glass-brand">{{brand}}</div>
  <div class="t-glass-eye">{{eyebrow}}</div>
  <div class="t-glass-title">{{title}}</div>
  <div class="t-glass-sub">{{subtitle}}</div>
</div>`,
    css: `${SHELL}
.t-glass {
  padding: 1rem 1.35rem 1.05rem;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.22);
  background: rgba(18, 22, 32, 0.55);
  backdrop-filter: blur(14px);
  box-shadow: 0 12px 36px rgba(0,0,0,.35);
}
.t-glass-brand {
  font-size: .78rem;
  font-weight: 600;
  color: rgba(255,255,255,0.7);
  margin-bottom: .2rem;
}
.t-glass-brand:empty { display: none; }
.t-glass-eye {
  font-size: .68rem;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: rgba(200, 220, 240, 0.75);
  margin-bottom: .3rem;
}
.t-glass-title {
  font-size: clamp(1.5rem, 3.4vw, 2.15rem);
  font-weight: 700;
  color: #f4f7fb;
  line-height: 1.12;
}
.t-glass-sub {
  margin-top: .35rem;
  font-size: .92rem;
  color: rgba(210, 220, 230, 0.85);
}
.t-glass-sub:empty { display: none; }
`
  },
  {
    id: "lower-third",
    name: "Lower third",
    blurb: "News ticker strip \xB7 bottom of frame",
    position: "bottom",
    size: "compact",
    html: `<div class="t-lt">
  <div class="t-lt-accent"></div>
  <div class="t-lt-inner">
    <span class="t-lt-eye">{{eyebrow}}</span>
    <span class="t-lt-brand">{{brand}}</span>
    <span class="t-lt-title">{{title}}</span>
    <span class="t-lt-sub">{{subtitle}}</span>
  </div>
</div>`,
    css: `${SHELL}
.alert.theme-custom { max-width: min(48rem, 94vw); }
.t-lt {
  display: flex;
  min-height: 3.1rem;
  border-radius: 2px;
  overflow: hidden;
  box-shadow: 0 8px 28px rgba(0,0,0,.5);
}
.t-lt-accent {
  width: 8px;
  flex-shrink: 0;
  background: linear-gradient(180deg, #ff4d6d, #c9184a);
}
.t-lt-inner {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .35rem .75rem;
  padding: .55rem 1rem;
  background: linear-gradient(90deg, #0c1018 0%, #141c28 100%);
}
.t-lt-eye {
  font-size: .65rem;
  font-weight: 800;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: #ff6b88;
}
.t-lt-brand {
  font-size: .75rem;
  font-weight: 700;
  color: #9eb0c4;
}
.t-lt-brand:empty { display: none; }
.t-lt-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: #fff;
}
.t-lt-sub {
  font-size: .85rem;
  color: #8a9bb0;
  width: 100%;
}
.t-lt-sub:empty { display: none; }
`
  },
  {
    id: "pulse-coin",
    name: "Pulse coin",
    blurb: "Round badge \xB7 amount-first",
    size: "compact",
    html: `<div class="t-coin">
  <div class="t-coin-ring">
    <div class="t-coin-eye">{{eyebrow}}</div>
    <div class="t-coin-amt">{{amount}}</div>
    <div class="t-coin-sym">{{symbol}}</div>
  </div>
  <div class="t-coin-side">
    <div class="t-coin-brand">{{brand}}</div>
    <div class="t-coin-sub">{{subtitle}}</div>
  </div>
</div>`,
    css: `${SHELL}
.t-coin {
  display: flex;
  align-items: center;
  gap: .85rem;
  padding: .35rem .5rem .35rem .35rem;
  border-radius: 999px;
  background: rgba(6, 16, 28, 0.9);
  border: 1px solid rgba(0, 200, 255, 0.4);
  box-shadow: 0 10px 32px rgba(0,40,80,.45);
}
.t-coin-ring {
  width: 5.5rem;
  height: 5.5rem;
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at 35% 30%, #3a8fd0, #062038 70%);
  border: 3px solid #6ec8ff;
  box-shadow: inset 0 0 18px rgba(0,0,0,.4), 0 0 16px rgba(0,180,255,.35);
}
.t-coin-eye {
  font-size: .55rem;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: #8fd4ff;
  font-weight: 700;
}
.t-coin-amt {
  font-size: 1.15rem;
  font-weight: 800;
  color: #fff;
  line-height: 1.1;
}
.t-coin-sym {
  font-size: .65rem;
  font-weight: 700;
  color: #6ec8ff;
}
.t-coin-side { padding-right: .65rem; min-width: 0; }
.t-coin-brand {
  font-size: .8rem;
  font-weight: 700;
  color: #a8d8f0;
}
.t-coin-brand:empty { display: none; }
.t-coin-sub {
  font-size: .85rem;
  color: #7aa8c0;
  margin-top: .15rem;
}
.t-coin-sub:empty { display: none; }
`
  },
  {
    id: "chat-bubble",
    name: "Chat bubble",
    blurb: "Speech balloon \xB7 casual live chat feel",
    size: "normal",
    html: `<div class="t-bub">
  <div class="t-bub-brand">{{brand}}</div>
  <div class="t-bub-eye">{{eyebrow}}</div>
  <div class="t-bub-title">{{title}}</div>
  <div class="t-bub-sub">{{subtitle}}</div>
  <div class="t-bub-tail" aria-hidden="true"></div>
</div>`,
    css: `${SHELL}
.t-bub {
  position: relative;
  padding: 1rem 1.2rem 1.15rem;
  border-radius: 18px 18px 18px 4px;
  background: #1e2430;
  border: 2px solid #3d4a60;
  box-shadow: 0 10px 28px rgba(0,0,0,.4);
  max-width: min(26rem, 88vw);
}
.t-bub-brand {
  font-size: .78rem;
  font-weight: 700;
  color: #8eb4ff;
  margin-bottom: .15rem;
}
.t-bub-brand:empty { display: none; }
.t-bub-eye {
  font-size: .65rem;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: #8898b0;
  margin-bottom: .25rem;
}
.t-bub-title {
  font-size: clamp(1.4rem, 3.2vw, 2rem);
  font-weight: 800;
  color: #f0f4fa;
  line-height: 1.15;
}
.t-bub-sub {
  margin-top: .35rem;
  font-size: .9rem;
  color: #a0b0c8;
}
.t-bub-sub:empty { display: none; }
.t-bub-tail {
  position: absolute;
  left: 18px;
  bottom: -12px;
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 12px solid #3d4a60;
}
.t-bub-tail::after {
  content: "";
  position: absolute;
  left: -8px;
  top: -14px;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 10px solid #1e2430;
}
`
  },
  {
    id: "ticket-stub",
    name: "Ticket stub",
    blurb: "Perforated admit-one look",
    size: "normal",
    html: `<div class="t-tix">
  <div class="t-tix-main">
    <div class="t-tix-eye">{{eyebrow}}</div>
    <div class="t-tix-title">{{title}}</div>
    <div class="t-tix-sub">{{subtitle}}</div>
  </div>
  <div class="t-tix-side">
    <div class="t-tix-admit">ADMIT</div>
    <div class="t-tix-brand">{{brand}}</div>
  </div>
</div>`,
    css: `${SHELL}
.t-tix {
  display: flex;
  border-radius: 10px;
  overflow: hidden;
  background: #f4efe4;
  color: #1a1410;
  box-shadow: 0 12px 32px rgba(0,0,0,.4);
  font-family: "Segoe UI", system-ui, sans-serif;
}
.t-tix-main {
  flex: 1;
  padding: .9rem 1.1rem;
  border-right: 2px dashed #b8a890;
  min-width: 0;
}
.t-tix-eye {
  font-size: .65rem;
  font-weight: 800;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: #a06040;
  margin-bottom: .25rem;
}
.t-tix-title {
  font-size: clamp(1.35rem, 3vw, 1.9rem);
  font-weight: 800;
  line-height: 1.1;
  color: #1a1410;
}
.t-tix-sub {
  margin-top: .3rem;
  font-size: .85rem;
  color: #5a5048;
}
.t-tix-sub:empty { display: none; }
.t-tix-side {
  width: 5.5rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: .35rem;
  background: #1a1410;
  color: #f4efe4;
  padding: .5rem;
  text-align: center;
}
.t-tix-admit {
  font-size: .6rem;
  font-weight: 800;
  letter-spacing: .18em;
  color: #e8c060;
}
.t-tix-brand {
  font-size: .7rem;
  font-weight: 700;
  word-break: break-word;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  max-height: 5rem;
}
.t-tix-brand:empty::after { content: "ONE"; writing-mode: horizontal-tb; transform: none; }
`
  },
  {
    id: "matrix-term",
    name: "Matrix term",
    blurb: "Terminal green \xB7 on-chain vibe",
    size: "normal",
    html: `<div class="t-mat">
  <div class="t-mat-head">root@pulse \xB7 tip</div>
  <div class="t-mat-line"><span class="t-mat-k">brand</span> {{brand}}</div>
  <div class="t-mat-line"><span class="t-mat-k">type</span> {{eyebrow}}</div>
  <div class="t-mat-line t-mat-hi"><span class="t-mat-k">amt</span> {{title}}</div>
  <div class="t-mat-line"><span class="t-mat-k">note</span> {{subtitle}}</div>
  <div class="t-mat-line"><span class="t-mat-k">src</span> {{source}}</div>
</div>`,
    css: `${SHELL}
.t-mat {
  padding: .85rem 1rem;
  border: 1px solid #1a5c2a;
  border-radius: 2px;
  background: #040a06;
  color: #3dff7a;
  font-family: ui-monospace, "Cascadia Code", Consolas, monospace;
  font-size: .88rem;
  box-shadow: 0 0 24px rgba(20, 120, 50, 0.25), inset 0 0 40px rgba(0,40,10,.4);
  line-height: 1.45;
}
.t-mat-head {
  color: #1a8c40;
  margin-bottom: .45rem;
  padding-bottom: .35rem;
  border-bottom: 1px dashed #1a5c2a;
  font-size: .75rem;
}
.t-mat-k {
  display: inline-block;
  width: 3.2rem;
  color: #1a8c40;
  margin-right: .35rem;
}
.t-mat-hi { font-size: 1.15rem; font-weight: 700; color: #7dffb0; text-shadow: 0 0 10px rgba(61,255,122,.4); }
.t-mat-line { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`
  },
  {
    id: "arcade-cab",
    name: "Arcade cab",
    blurb: "8\u2011bit score popup energy",
    size: "normal",
    html: `<div class="t-arc">
  <div class="t-arc-score">HIGH SCORE</div>
  <div class="t-arc-brand">{{brand}}</div>
  <div class="t-arc-title">{{title}}</div>
  <div class="t-arc-sub">{{subtitle}}</div>
  <div class="t-arc-eye">{{eyebrow}}</div>
</div>`,
    css: `${SHELL}
.t-arc {
  padding: 1rem 1.15rem;
  border: 4px solid #fff;
  outline: 4px solid #ff2e63;
  background: #0d0221;
  box-shadow: 8px 8px 0 #08f7fe;
  text-align: center;
  font-family: ui-monospace, "Cascadia Code", Consolas, monospace;
  image-rendering: pixelated;
}
.t-arc-score {
  font-size: .65rem;
  letter-spacing: .25em;
  color: #ff2e63;
  margin-bottom: .35rem;
}
.t-arc-brand {
  font-size: .75rem;
  color: #08f7fe;
  margin-bottom: .25rem;
}
.t-arc-brand:empty { display: none; }
.t-arc-title {
  font-size: clamp(1.5rem, 3.5vw, 2.2rem);
  font-weight: 800;
  color: #fff;
  line-height: 1.1;
  text-shadow: 3px 3px 0 #ff2e63;
}
.t-arc-sub {
  margin-top: .4rem;
  font-size: .8rem;
  color: #b0a0d0;
}
.t-arc-sub:empty { display: none; }
.t-arc-eye {
  margin-top: .55rem;
  font-size: .6rem;
  letter-spacing: .2em;
  text-transform: uppercase;
  color: #08f7fe;
}
`
  },
  {
    id: "polaroid",
    name: "Polaroid",
    blurb: "Photo frame \xB7 caption under shot",
    size: "normal",
    html: `<div class="t-pol">
  <div class="t-pol-shot">
    <div class="t-pol-eye">{{eyebrow}}</div>
    <div class="t-pol-title">{{title}}</div>
  </div>
  <div class="t-pol-cap">
    <span class="t-pol-brand">{{brand}}</span>
    <span class="t-pol-sub">{{subtitle}}</span>
  </div>
</div>`,
    css: `${SHELL}
.t-pol {
  width: min(18rem, 78vw);
  padding: .65rem .65rem 0;
  background: #f2f0ea;
  box-shadow: 0 14px 36px rgba(0,0,0,.45), 0 0 0 1px rgba(0,0,0,.08);
  transform: rotate(-1.5deg);
}
.t-pol-shot {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, #1a2838, #0c141c);
  color: #fff;
  padding: 1rem;
  text-align: center;
}
.t-pol-eye {
  font-size: .65rem;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: #8ab4d0;
  margin-bottom: .4rem;
}
.t-pol-title {
  font-size: clamp(1.4rem, 3.2vw, 1.9rem);
  font-weight: 800;
  line-height: 1.1;
}
.t-pol-cap {
  min-height: 2.6rem;
  padding: .65rem .4rem .85rem;
  display: flex;
  flex-direction: column;
  gap: .15rem;
  text-align: center;
  color: #2a241c;
  font-family: Georgia, "Times New Roman", serif;
}
.t-pol-brand { font-size: .85rem; font-weight: 700; }
.t-pol-brand:empty { display: none; }
.t-pol-sub { font-size: .78rem; color: #5a5048; }
.t-pol-sub:empty { display: none; }
`
  },
  {
    id: "ribbon-banner",
    name: "Ribbon banner",
    blurb: "Wide streamer ribbon \xB7 top or bottom",
    position: "top",
    size: "compact",
    html: `<div class="t-rib">
  <div class="t-rib-fold" aria-hidden="true"></div>
  <div class="t-rib-main">
    <span class="t-rib-eye">{{eyebrow}}</span>
    <span class="t-rib-title">{{title}}</span>
    <span class="t-rib-sub">{{subtitle}}</span>
  </div>
  <div class="t-rib-fold t-rib-fold-r" aria-hidden="true"></div>
</div>`,
    css: `${SHELL}
.alert.theme-custom { max-width: min(40rem, 92vw); }
.t-rib {
  display: flex;
  align-items: stretch;
  filter: drop-shadow(0 8px 16px rgba(0,0,0,.4));
}
.t-rib-fold {
  width: 18px;
  background: #7a1238;
  clip-path: polygon(100% 0, 100% 100%, 0 50%);
}
.t-rib-fold-r {
  clip-path: polygon(0 0, 0 100%, 100% 50%);
  background: #7a1238;
}
.t-rib-main {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: .35rem .75rem;
  padding: .55rem 1.25rem;
  background: linear-gradient(180deg, #e83e6e, #b21e4b);
  color: #fff;
  text-align: center;
}
.t-rib-eye {
  font-size: .65rem;
  font-weight: 800;
  letter-spacing: .16em;
  text-transform: uppercase;
  opacity: .9;
}
.t-rib-title {
  font-size: 1.2rem;
  font-weight: 800;
}
.t-rib-sub {
  font-size: .8rem;
  opacity: .88;
  width: 100%;
}
.t-rib-sub:empty { display: none; }
`
  },
  {
    id: "esports-hud",
    name: "Esports HUD",
    blurb: "Angular competitive banner",
    size: "normal",
    html: `<div class="t-es">
  <div class="t-es-tag">{{eyebrow}}</div>
  <div class="t-es-body">
    <div class="t-es-brand">{{brand}}</div>
    <div class="t-es-title">{{title}}</div>
    <div class="t-es-sub">{{subtitle}}</div>
  </div>
</div>`,
    css: `${SHELL}
.t-es {
  display: flex;
  clip-path: polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 18px 100%, 0 calc(100% - 18px));
  background: linear-gradient(120deg, #0a0e16, #121a28);
  border: 1px solid #3d8bfd;
  box-shadow: 0 0 0 1px rgba(61,139,253,.2), 0 12px 32px rgba(0,0,0,.5);
}
.t-es-tag {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  padding: .5rem .35rem;
  background: #3d8bfd;
  color: #041018;
  font-size: .65rem;
  font-weight: 800;
  letter-spacing: .14em;
  text-transform: uppercase;
  text-align: center;
}
.t-es-body {
  padding: .85rem 1.25rem .9rem 1rem;
  min-width: 0;
}
.t-es-brand {
  font-size: .72rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: #3d8bfd;
  margin-bottom: .2rem;
}
.t-es-brand:empty { display: none; }
.t-es-title {
  font-size: clamp(1.45rem, 3.3vw, 2.1rem);
  font-weight: 800;
  color: #f0f6ff;
  line-height: 1.1;
}
.t-es-sub {
  margin-top: .3rem;
  font-size: .88rem;
  color: #8aa4c0;
}
.t-es-sub:empty { display: none; }
`
  },
  {
    id: "chain-receipt",
    name: "Chain receipt",
    blurb: "Mini tx receipt \xB7 explorer-ish",
    size: "normal",
    html: `<div class="t-rx">
  <div class="t-rx-top">
    <span class="t-rx-ok">CONFIRMED</span>
    <span class="t-rx-eye">{{eyebrow}}</span>
  </div>
  <div class="t-rx-title">{{title}}</div>
  <div class="t-rx-row"><span>Brand</span><span>{{brand}}</span></div>
  <div class="t-rx-row"><span>Detail</span><span>{{subtitle}}</span></div>
  <div class="t-rx-row"><span>Source</span><span>{{source}}</span></div>
  <div class="t-rx-row"><span>Asset</span><span>{{amount}} {{symbol}}</span></div>
</div>`,
    css: `${SHELL}
.t-rx {
  width: min(22rem, 90vw);
  padding: .9rem 1rem;
  border-radius: 8px;
  background: #0f1419;
  border: 1px solid #2a3544;
  box-shadow: 0 12px 32px rgba(0,0,0,.5);
  font-family: ui-monospace, "Cascadia Code", Consolas, monospace;
  font-size: .8rem;
  color: #c8d4e0;
}
.t-rx-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: .55rem;
}
.t-rx-ok {
  font-size: .65rem;
  font-weight: 800;
  letter-spacing: .1em;
  color: #0d1a12;
  background: #3dff9a;
  padding: .15rem .4rem;
  border-radius: 3px;
}
.t-rx-eye {
  font-size: .65rem;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: #6a7a8c;
}
.t-rx-title {
  font-size: 1.35rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: .65rem;
  font-family: "Segoe UI", system-ui, sans-serif;
}
.t-rx-row {
  display: flex;
  justify-content: space-between;
  gap: .75rem;
  padding: .28rem 0;
  border-top: 1px solid #1e2834;
}
.t-rx-row span:first-child { color: #6a7a8c; }
.t-rx-row span:last-child {
  text-align: right;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
`
  },
  {
    id: "heart-drop",
    name: "Heart drop",
    blurb: "Cute tip heart \xB7 soft pastel",
    size: "compact",
    html: `<div class="t-hrt">
  <div class="t-hrt-icon" aria-hidden="true">\u2665</div>
  <div class="t-hrt-body">
    <div class="t-hrt-eye">{{eyebrow}}</div>
    <div class="t-hrt-title">{{title}}</div>
    <div class="t-hrt-sub">{{subtitle}}</div>
    <div class="t-hrt-brand">{{brand}}</div>
  </div>
</div>`,
    css: `${SHELL}
.t-hrt {
  display: flex;
  align-items: center;
  gap: .75rem;
  padding: .7rem .95rem .7rem .75rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #fff0f5, #ffe4ec);
  border: 2px solid #ff9ebd;
  box-shadow: 0 10px 28px rgba(180, 40, 90, 0.25);
  color: #4a1830;
}
.t-hrt-icon {
  width: 2.6rem;
  height: 2.6rem;
  flex-shrink: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 1.25rem;
  color: #fff;
  background: linear-gradient(145deg, #ff6b9d, #e83e6e);
  box-shadow: 0 4px 12px rgba(232, 62, 110, 0.4);
}
.t-hrt-eye {
  font-size: .62rem;
  font-weight: 800;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: #c04070;
}
.t-hrt-title {
  font-size: 1.2rem;
  font-weight: 800;
  line-height: 1.15;
  color: #3a1228;
}
.t-hrt-sub {
  font-size: .8rem;
  color: #8a4060;
  margin-top: .1rem;
}
.t-hrt-sub:empty { display: none; }
.t-hrt-brand {
  font-size: .72rem;
  font-weight: 700;
  color: #b05070;
  margin-top: .1rem;
}
.t-hrt-brand:empty { display: none; }
`
  },
  {
    id: "midnight-card",
    name: "Midnight card",
    blurb: "Deep card \xB7 left accent rail",
    size: "normal",
    html: `<div class="t-mid">
  <div class="t-mid-rail"></div>
  <div class="t-mid-body">
    <div class="t-mid-brand">{{brand}}</div>
    <div class="t-mid-eye">{{eyebrow}}</div>
    <div class="t-mid-title">{{title}}</div>
    <div class="t-mid-sub">{{subtitle}}</div>
  </div>
</div>`,
    css: `${SHELL}
.t-mid {
  display: flex;
  border-radius: 12px;
  overflow: hidden;
  background: #12141c;
  border: 1px solid #2a2e3c;
  box-shadow: 0 14px 36px rgba(0,0,0,.5);
}
.t-mid-rail {
  width: 6px;
  background: linear-gradient(180deg, #7c5cff, #3d8bfd);
  flex-shrink: 0;
}
.t-mid-body { padding: .95rem 1.2rem 1rem; min-width: 0; }
.t-mid-brand {
  font-size: .78rem;
  font-weight: 700;
  color: #9b8cff;
  margin-bottom: .15rem;
}
.t-mid-brand:empty { display: none; }
.t-mid-eye {
  font-size: .65rem;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: #6a7088;
  margin-bottom: .3rem;
}
.t-mid-title {
  font-size: clamp(1.5rem, 3.4vw, 2.2rem);
  font-weight: 800;
  color: #eef0f8;
  line-height: 1.1;
}
.t-mid-sub {
  margin-top: .35rem;
  font-size: .9rem;
  color: #8a90a8;
}
.t-mid-sub:empty { display: none; }
`
  },
  {
    id: "minimal-sash",
    name: "Minimal sash",
    blurb: "Bare amount + one line \xB7 low distraction",
    size: "compact",
    html: `<div class="t-min">
  <span class="t-min-eye">{{eyebrow}}</span>
  <span class="t-min-title">{{title}}</span>
  <span class="t-min-sub">{{subtitle}}</span>
</div>`,
    css: `${SHELL}
.t-min {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: .35rem .65rem;
  padding: .45rem .9rem;
  border-radius: 999px;
  background: rgba(0,0,0,0.72);
  border: 1px solid rgba(255,255,255,0.18);
  box-shadow: 0 8px 24px rgba(0,0,0,.4);
}
.t-min-eye {
  font-size: .65rem;
  font-weight: 800;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.55);
}
.t-min-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: #fff;
}
.t-min-sub {
  font-size: .8rem;
  color: rgba(255,255,255,0.65);
}
.t-min-sub:empty { display: none; }
`
  },
  {
    id: "fire-streak",
    name: "Fire streak",
    blurb: "Warm ember edge \xB7 big tip energy",
    size: "large",
    html: `<div class="t-fire">
  <div class="t-fire-eye">{{eyebrow}}</div>
  <div class="t-fire-brand">{{brand}}</div>
  <div class="t-fire-title">{{title}}</div>
  <div class="t-fire-sub">{{subtitle}}</div>
</div>`,
    css: `${SHELL}
.t-fire {
  padding: 1.15rem 1.4rem 1.2rem;
  border-radius: 14px;
  background:
    linear-gradient(160deg, #2a0c08 0%, #120604 55%, #1a0a04 100%);
  border: 1px solid #ff6b35;
  box-shadow:
    0 0 0 1px rgba(255, 120, 40, 0.25),
    0 0 48px rgba(255, 80, 20, 0.28),
    0 16px 40px rgba(0,0,0,.5);
  text-align: center;
}
.t-fire-eye {
  font-size: .68rem;
  font-weight: 800;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: #ff9a5c;
  margin-bottom: .25rem;
}
.t-fire-brand {
  font-size: .8rem;
  font-weight: 700;
  color: #ffc090;
  margin-bottom: .3rem;
}
.t-fire-brand:empty { display: none; }
.t-fire-title {
  font-size: clamp(1.9rem, 4.5vw, 2.8rem);
  font-weight: 900;
  color: #fff5ee;
  line-height: 1.05;
  text-shadow: 0 0 24px rgba(255, 100, 40, 0.55);
}
.t-fire-sub {
  margin-top: .4rem;
  font-size: 1rem;
  color: #e0a080;
  font-weight: 600;
}
.t-fire-sub:empty { display: none; }
`
  }
];
var SAMPLE_CUSTOM_HTML = OVERLAY_TEMPLATES[0].html;
var SAMPLE_CUSTOM_CSS = OVERLAY_TEMPLATES[0].css;

// src/overlay/style.ts
var defaultOverlayStyle = {
  position: "bottom",
  theme: "cyan",
  size: "normal",
  holdSec: 7,
  eyebrow: "Tip",
  brand: "",
  showPattern: true,
  showPoolAlerts: true,
  showPoolLabel: true,
  showDryRun: true,
  minAmount: 0,
  walletMinAmount: 0,
  poolMinAmount: 0,
  showStatus: false,
  showEco: true,
  customCss: "",
  customHtml: ""
};
var POSITIONS = /* @__PURE__ */ new Set([
  "bottom",
  "top",
  "bottom-left",
  "bottom-right",
  "top-left",
  "top-right"
]);
var THEMES = /* @__PURE__ */ new Set(["cyan", "pink", "gold", "soft", "custom"]);
var SIZES = /* @__PURE__ */ new Set(["compact", "normal", "large"]);
var MAX_CSS = 24e3;
var MAX_HTML = 12e3;
function clipText(v, max) {
  return String(v ?? "").slice(0, max);
}
function normalizeOverlayStyle(raw) {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const pos = String(o.position || "");
  const theme = String(o.theme || "");
  const size2 = String(o.size || "");
  let hold = Math.round(Number(o.holdSec));
  if (!Number.isFinite(hold)) hold = defaultOverlayStyle.holdSec;
  hold = Math.min(20, Math.max(2, hold));
  let legacyMin = Number(o.minAmount);
  if (!Number.isFinite(legacyMin) || legacyMin < 0) legacyMin = 0;
  let walletMin = Number(o.walletMinAmount);
  if (!Number.isFinite(walletMin) || walletMin < 0) walletMin = legacyMin;
  let poolMin = Number(o.poolMinAmount);
  if (!Number.isFinite(poolMin) || poolMin < 0) poolMin = 0;
  const customHtml = clipText(o.customHtml, MAX_HTML);
  const customCss = clipText(o.customCss, MAX_CSS);
  const hasCustomWindow = customHtml.trim().length > 0;
  let nextTheme = THEMES.has(theme) ? theme : defaultOverlayStyle.theme;
  if (hasCustomWindow) nextTheme = "custom";
  else if (nextTheme === "custom") nextTheme = "cyan";
  return {
    position: POSITIONS.has(pos) ? pos : defaultOverlayStyle.position,
    theme: nextTheme,
    size: SIZES.has(size2) ? size2 : defaultOverlayStyle.size,
    holdSec: hold,
    eyebrow: String(o.eyebrow ?? defaultOverlayStyle.eyebrow).trim().slice(0, 32),
    brand: String(o.brand ?? "").trim().slice(0, 48),
    showPattern: o.showPattern === void 0 ? true : Boolean(o.showPattern),
    // Pool watches use the same OBS tip alert as wallet tips. Default on
    // even if an older save only toggled “show pool name”.
    showPoolAlerts: o.showPoolAlerts === void 0 ? true : Boolean(o.showPoolAlerts),
    showPoolLabel: o.showPoolLabel === void 0 ? true : Boolean(o.showPoolLabel),
    showDryRun: o.showDryRun === void 0 ? true : Boolean(o.showDryRun),
    minAmount: walletMin,
    walletMinAmount: walletMin,
    poolMinAmount: poolMin,
    showStatus: Boolean(o.showStatus),
    showEco: o.showEco === void 0 ? true : Boolean(o.showEco),
    customCss,
    customHtml
  };
}

// node_modules/viem/_esm/index.js
init_getAddress();
init_isAddress();

// shared/src/utils/eip681.ts
function eip681PayToAddress(uri) {
  const m = String(uri || "").trim().match(/^ethereum:(0x[a-fA-F0-9]{40})\b/i);
  if (!m) return null;
  try {
    return getAddress(m[1]);
  } catch {
    return null;
  }
}
function parseEip681Erc20Transfer(uri) {
  const t = String(uri || "").trim();
  const m = t.match(
    /^ethereum:(0x[a-fA-F0-9]{40})@(\d+)\/transfer\?(.+)$/i
  );
  if (!m) return null;
  const chainId = Number(m[2]);
  if (!Number.isInteger(chainId) || chainId <= 0) return null;
  let token;
  try {
    token = getAddress(m[1]);
  } catch {
    return null;
  }
  const params = new URLSearchParams(m[3]);
  const dest = String(params.get("address") || "").trim();
  const raw = String(params.get("uint256") || "").trim();
  if (!isAddress(dest) || !/^[0-9]+$/.test(raw)) return null;
  let receive;
  try {
    receive = getAddress(dest);
  } catch {
    return null;
  }
  let amountRaw;
  try {
    amountRaw = BigInt(raw);
  } catch {
    return null;
  }
  if (amountRaw <= 0n) return null;
  if (token === receive) return null;
  return { token, receive, amountRaw, chainId };
}
function eip681NativeValue(uri) {
  const m = String(uri || "").trim().match(/[?&]value=([0-9]+)(?:&|$)/i);
  if (!m) return null;
  try {
    const n = BigInt(m[1]);
    return n > 0n ? n : null;
  } catch {
    return null;
  }
}
function isFanSafeTipUri(uri, receiveAddress) {
  const t = String(uri || "").trim();
  if (!t.startsWith("ethereum:")) return false;
  try {
    const receive = getAddress(receiveAddress);
    const erc20 = parseEip681Erc20Transfer(t);
    if (erc20) return erc20.receive === receive;
    if (/\/transfer\b/i.test(t)) return false;
    const payTo = eip681PayToAddress(t);
    if (payTo !== receive) return false;
    return eip681NativeValue(t) !== null;
  } catch {
    return false;
  }
}

// shared/src/utils/fanQr.ts
var ETH_ADDR_RE = /0x[a-fA-F0-9]{40}/gi;
function extractEthAddresses(payload) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  const re = new RegExp(ETH_ADDR_RE.source, "gi");
  let m;
  while ((m = re.exec(payload)) !== null) {
    const key = m[0].toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}
function isWebsiteLinkQrPayload(payload) {
  return /^https?:\/\//i.test(String(payload || "").trim());
}
function isCreatorWalletQrPayload(payload, receiveAddress) {
  const receive = String(receiveAddress || "").trim();
  if (!isAddress(receive)) return false;
  const receiveKey = getAddress(receive).toLowerCase();
  const t = String(payload || "").trim();
  if (!t || isWebsiteLinkQrPayload(t)) return false;
  if (t.startsWith("ethereum:")) {
    return isFanSafeTipUri(t, receive);
  }
  const addrs = extractEthAddresses(t);
  return addrs.length === 1 && addrs[0] === receiveKey && t.toLowerCase() === receiveKey;
}
function sanitizeWebsiteLinkQrPayload(payload) {
  const t = String(payload || "").trim();
  if (!isWebsiteLinkQrPayload(t)) return null;
  if (extractEthAddresses(t).length > 0) return null;
  try {
    new URL(t);
    return t;
  } catch {
    return null;
  }
}
function sanitizeCreatorWalletQrPayload(payload, receiveAddress) {
  const t = String(payload || "").trim();
  if (!t) return null;
  return isCreatorWalletQrPayload(t, receiveAddress) ? t : null;
}
function fanSafeCreatorWalletUri(uri, receiveAddress) {
  return sanitizeCreatorWalletQrPayload(uri, receiveAddress) ?? void 0;
}
function overlayQrPayloadLooksUnsafe(menuOffers, receiveAddress) {
  if (!Array.isArray(menuOffers)) return false;
  return menuOffers.some((o) => {
    const uri = String(o.paymentUri || "").trim();
    if (!uri) return false;
    if (receiveAddress && isAddress(receiveAddress)) {
      return !isFanSafeTipUri(uri, receiveAddress);
    }
    if (parseEip681Erc20Transfer(uri)) return false;
    return /\/transfer\b/i.test(uri) || extractEthAddresses(uri).length > 1;
  });
}

// src/overlay/pulseBundle.ts
var BRAND_KIT_LINKS = {
  hex: {
    label: "HEX",
    blurb: "Official HEX.COM logo downloads & guidelines",
    url: "https://hex.com/downloads",
    site: "https://hex.com/"
  },
  pulsechain: {
    label: "PulseChain",
    blurb: "Chain site \u2014 branding resources download",
    url: "https://pulsechain.com/",
    site: "https://pulsechain.com/"
  },
  pulsechainMedia: {
    label: "PulseChain media kit",
    blurb: "Logos, wordmarks, banners, tickers",
    url: "https://www.gopulsechain.com/media-kit",
    site: "https://www.gopulsechain.com/media-kit"
  },
  /** Native gas PLS uses PulseChain brand marks */
  pls: {
    label: "PLS (native gas)",
    blurb: "PLS is PulseChain gas \u2014 use PulseChain brand assets",
    url: "https://pulsechain.com/",
    site: "https://pulsechain.com/"
  },
  pulsex: {
    label: "PulseX",
    blurb: "Official PulseX branding resources",
    url: "https://pulsex.com/brand",
    site: "https://pulsex.com/"
  }
};
var PULSE_PACK = [
  {
    id: "pulsechain",
    kind: "chain",
    label: "PulseChain",
    blurb: "The chain tips settle on \xB7 also PLS gas mark",
    url: "https://pulsechain.com/",
    logo: "/brand/pulsechain-mark.svg",
    eco: true,
    streamQr: true,
    streamQrDefault: false,
    slideEyebrow: "The chain",
    brandKitUrl: BRAND_KIT_LINKS.pulsechain.url,
    brandLinks: [
      { label: "Media kit", url: BRAND_KIT_LINKS.pulsechainMedia.url },
      { label: "PLS gas brand", url: BRAND_KIT_LINKS.pls.url }
    ]
  },
  {
    id: "pulsex",
    kind: "dex",
    label: "PulseX",
    blurb: "Swap tokens on PulseChain",
    url: "https://pulsex.com/",
    logo: "/brand/pulsex-mark.svg",
    eco: true,
    streamQr: true,
    streamQrDefault: false,
    slideEyebrow: "Trade",
    brandKitUrl: BRAND_KIT_LINKS.pulsex.url
  },
  {
    id: "hex",
    kind: "token",
    label: "HEX",
    blurb: "Certificate of deposit on-chain",
    url: "https://hex.com/",
    logo: "/brand/hex-mark.svg",
    eco: true,
    brandKitUrl: BRAND_KIT_LINKS.hex.url
  },
  {
    id: "plsx",
    kind: "token",
    label: "PLSX",
    blurb: "PulseX native token",
    url: "https://pulsex.com/",
    logo: "/brand/plsx-mark.png",
    eco: true,
    brandKitUrl: BRAND_KIT_LINKS.pulsex.url
  },
  {
    id: "tipWallet",
    kind: "wallet",
    label: "Tip Wallet",
    blurb: "Android EIP-681 PulseChain wallet for QR tips",
    url: "https://github.com/ihelpmaybe/Tip-wallet/releases/tag/0.1.0",
    streamQr: true,
    streamQrDefault: true,
    slideEyebrow: "Get a wallet"
  },
  {
    id: "pulsescan",
    kind: "scan",
    label: "PulseScan",
    blurb: "Explorer \u2014 txs & tip proofs",
    url: "https://scan.pulsechain.com/",
    streamQr: true,
    streamQrDefault: false,
    slideEyebrow: "Explorer"
  },
  {
    id: "bridge",
    kind: "bridge",
    label: "Bridge",
    blurb: "Move value onto PulseChain",
    url: "https://bridge.pulsechain.com/",
    streamQr: true,
    streamQrDefault: false,
    slideEyebrow: "Bridge in"
  }
];
function pulsePackItem(id) {
  return PULSE_PACK.find((it) => it.id === id);
}
function pulsePackEcoItems() {
  return PULSE_PACK.filter((it) => it.eco && it.logo);
}
function pulsePackStreamQrItems() {
  return PULSE_PACK.filter((it) => it.streamQr);
}
function defaultPulsePackQrFlags() {
  const out = {};
  for (const it of pulsePackStreamQrItems()) {
    out[it.id] = it.streamQrDefault === true;
  }
  return out;
}
function normalizePulsePackQrFlags(raw, legacyInternetMoney) {
  const base = defaultPulsePackQrFlags();
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  for (const it of pulsePackStreamQrItems()) {
    if (o[it.id] !== void 0) {
      base[it.id] = Boolean(o[it.id]);
    }
  }
  if (o.tipWallet === void 0) {
    if (o.internetMoney !== void 0) {
      base.tipWallet = Boolean(o.internetMoney);
    } else if (legacyInternetMoney !== void 0) {
      base.tipWallet = Boolean(legacyInternetMoney);
    }
  }
  return base;
}
var TIP_WALLET_URL = pulsePackItem("tipWallet")?.url ?? "https://github.com/ihelpmaybe/Tip-wallet/releases/tag/0.1.0";
function packUrlHost(url) {
  try {
    const u = new URL(url);
    return u.host + (u.pathname === "/" ? "" : u.pathname.replace(/\/$/, ""));
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}

// src/overlay/qrState.ts
var defaultOverlayQrSlides = {
  qr: true,
  brand: true,
  menu: true,
  eco: true,
  how: true,
  pack: defaultPulsePackQrFlags()
};
var defaultOverlayQr = {
  enabled: false,
  address: "",
  label: "Tip on PulseChain",
  brand: "",
  position: "bottom-right",
  size: "md",
  showAddress: true,
  theme: "pulse",
  carousel: true,
  dwellSec: 7,
  slides: {
    ...defaultOverlayQrSlides,
    pack: { ...defaultPulsePackQrFlags() }
  },
  menuOffers: [],
  menuSymbol: "PLS",
  slideHtml: {},
  customCss: ""
};
var MAX_SLIDE_HTML = 12e3;
var MAX_QR_CSS = 24e3;
var MAX_QR_SVG = 16e4;
var MAX_SLIDE_HTML_KEYS = 24;
function clipFieldText(v, max) {
  return String(v ?? "").slice(0, max);
}
function normalizeSlideHtmlMap(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw;
  const out = {};
  let n = 0;
  for (const [k, v] of Object.entries(o)) {
    if (n >= MAX_SLIDE_HTML_KEYS) break;
    let key = String(k).trim().slice(0, 48);
    if (key === "pack:internetMoney" || key === "internetMoney") {
      key = "pack:tipWallet";
    }
    if (!key) continue;
    const html = clipFieldText(v, MAX_SLIDE_HTML).trim();
    if (!html) continue;
    if (out[key] && key === "pack:tipWallet" && k !== "pack:tipWallet") continue;
    out[key] = html;
    n += 1;
  }
  return out;
}
var OVERLAY_MENU_OFFER_LIMIT = 32;
var OVERLAY_MENU_PAGE_SIZE = 1;
var POSITIONS2 = /* @__PURE__ */ new Set([
  "bottom",
  "top",
  "bottom-left",
  "bottom-right",
  "top-left",
  "top-right"
]);
var SIZES2 = /* @__PURE__ */ new Set(["sm", "md", "lg"]);
var THEMES2 = /* @__PURE__ */ new Set(["dark", "light", "pulse"]);
function normalizeMenuOffers(raw, receiveAddress) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const row of raw.slice(0, OVERLAY_MENU_OFFER_LIMIT)) {
    if (!row || typeof row !== "object") continue;
    const o = row;
    const name = String(o.name || "").trim().slice(0, 48);
    const amount = Number(o.amount);
    if (!name || !Number.isFinite(amount)) continue;
    const amountLabel = String(o.amountLabel || "").trim().slice(0, 24) || String(amount);
    const note = String(o.note || "").trim().slice(0, 40);
    const blurb = String(o.blurb || "").trim().slice(0, 80);
    const strengths = Array.isArray(o.strengths) ? o.strengths.map((n) => Math.max(0, Math.min(8, Number(n) || 0))).slice(0, 24) : void 0;
    const paymentUriRaw = String(o.paymentUri || "").trim().slice(0, 512);
    const qrSvg = String(o.qrSvg || "").trim().slice(0, MAX_QR_SVG);
    const sellPitch = String(o.sellPitch || "").trim().slice(0, 56);
    let timeSec = Math.round(Number(o.timeSec));
    if (!Number.isFinite(timeSec) || timeSec < 0) timeSec = 0;
    const paymentUri = fanSafeCreatorWalletUri(paymentUriRaw, receiveAddress);
    out.push({
      name,
      amount,
      amountLabel,
      note: note || void 0,
      blurb: blurb || void 0,
      sellPitch: sellPitch || void 0,
      timeSec: timeSec || void 0,
      featured: Boolean(o.featured),
      strengths: strengths?.length ? strengths : void 0,
      barsSvg: void 0,
      paymentUri,
      id: String(o.id || "").trim().slice(0, 96) || void 0,
      // Never keep a QR drawn from a dropped / contract-first URI.
      qrSvg: paymentUri && qrSvg.startsWith("<svg") ? qrSvg : void 0
    });
  }
  return out;
}
function normalizeSlides(raw) {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const pack = normalizePulsePackQrFlags(o.pack, o.internetMoney);
  return {
    qr: o.qr === void 0 ? true : Boolean(o.qr),
    brand: o.brand === void 0 ? true : Boolean(o.brand),
    menu: o.menu === void 0 ? true : Boolean(o.menu),
    eco: o.eco === void 0 ? true : Boolean(o.eco),
    how: o.how === void 0 ? true : Boolean(o.how),
    pack
  };
}
function overlayQrEnabled(carousel, slides) {
  if (!carousel) return false;
  if (slides.qr || slides.brand || slides.menu || slides.eco || slides.how) {
    return true;
  }
  return Object.values(slides.pack || {}).some(Boolean);
}
function normalizeOverlayQr(raw) {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const pos = String(o.position || "");
  const size2 = String(o.size || "");
  const theme = String(o.theme || "");
  const address = String(o.address ?? "").trim().slice(0, 128);
  let dwell = Math.round(Number(o.dwellSec));
  if (!Number.isFinite(dwell)) dwell = defaultOverlayQr.dwellSec;
  dwell = Math.min(20, Math.max(1, dwell));
  const slides = normalizeSlides(o.slides);
  return {
    enabled: overlayQrEnabled(
      o.carousel === void 0 ? true : Boolean(o.carousel),
      slides
    ),
    address,
    label: String(o.label ?? defaultOverlayQr.label).trim().slice(0, 48) || defaultOverlayQr.label,
    brand: String(o.brand ?? "").trim().slice(0, 48),
    position: POSITIONS2.has(pos) ? pos : defaultOverlayQr.position,
    size: SIZES2.has(size2) ? size2 : defaultOverlayQr.size,
    showAddress: o.showAddress === void 0 ? true : Boolean(o.showAddress),
    theme: THEMES2.has(theme) ? theme : defaultOverlayQr.theme,
    carousel: o.carousel === void 0 ? true : Boolean(o.carousel),
    dwellSec: dwell,
    slides,
    menuOffers: normalizeMenuOffers(o.menuOffers, address),
    menuSymbol: String(o.menuSymbol || "PLS").trim().slice(0, 12) || "PLS",
    slideHtml: normalizeSlideHtmlMap(o.slideHtml),
    customCss: clipFieldText(o.customCss, MAX_QR_CSS)
  };
}
function applyOverlayQrUpdate(current, raw) {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const next = normalizeOverlayQr(raw);
  if (!Object.prototype.hasOwnProperty.call(o, "menuOffers")) {
    next.menuOffers = current.menuOffers;
  }
  return next;
}
function shortenAddress(addr, head = 6, tail = 4) {
  const a = addr.trim();
  if (a.length <= head + tail + 2) return a;
  return `${a.slice(0, head)}\u2026${a.slice(-tail)}`;
}
var PACK_SLIDE_PREFIX = "pack:";
var MENU_SLIDE_PREFIX = "menu:";
function packSlideId(itemId) {
  return `${PACK_SLIDE_PREFIX}${itemId}`;
}
function parsePackSlideId(slideId) {
  if (!slideId.startsWith(PACK_SLIDE_PREFIX)) return null;
  return slideId.slice(PACK_SLIDE_PREFIX.length);
}
function menuSlideId(page) {
  return `${MENU_SLIDE_PREFIX}${page}`;
}
function parseMenuSlidePage(slideId) {
  if (slideId === "menu") return 0;
  if (!slideId.startsWith(MENU_SLIDE_PREFIX)) return null;
  const n = Number(slideId.slice(MENU_SLIDE_PREFIX.length));
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

// shared/src/utils/exportQr.ts
var import_qrcode = __toESM(require_lib(), 1);
var LIGHT = "#ffffff";
var DARK = "#0b1020";
var MARGIN = 2;
function squareSubpath(x, y, cell) {
  const w = cell * 0.92;
  const o = (cell - w) / 2;
  const x0 = x + o;
  const y0 = y + o;
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}h${w.toFixed(2)}v${w.toFixed(2)}h${-w.toFixed(2)}z`;
}
function compactPaymentQrSvg(payload, px = 180) {
  const text = String(payload || "").trim();
  if (!text) return "";
  const qr2 = import_qrcode.default.create(text, { errorCorrectionLevel: "H" });
  const n = qr2.modules.size;
  const dim = n + MARGIN * 2;
  const size2 = Math.max(64, Math.round(px));
  const cell = size2 / dim;
  const dParts = [];
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (!qr2.modules.get(row, col)) continue;
      const x = (MARGIN + col) * cell;
      const y = (MARGIN + row) * cell;
      dParts.push(squareSubpath(x, y, cell));
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size2}" height="${size2}" viewBox="0 0 ${size2} ${size2}" role="img" aria-hidden="true"><rect width="${size2}" height="${size2}" fill="${LIGHT}"/><g fill="${DARK}">${dParts.length ? `<path d="${dParts.join("")}"/>` : ""}</g></svg>`;
}
function paymentQrSvg(payload, px = 180) {
  return compactPaymentQrSvg(payload, px);
}

// src/overlay/qrHexSvg.ts
var import_qrcode2 = __toESM(require_lib(), 1);
var DARK2 = "#0b1020";
var LIGHT2 = "#ffffff";
var RING = "#00d4ff";
var MARGIN2 = 1;
var HEX_R = 0.54;
var svgSeq = 0;
function inFinder(row, col, n) {
  const tl = row < 7 && col < 7;
  const tr = row < 7 && col >= n - 7;
  const bl = row >= n - 7 && col < 7;
  return tl || tr || bl;
}
function hexPoints(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 3 * i - Math.PI / 6;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}
function hexSubpath(cx, cy, r) {
  let d = "";
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 3 * i - Math.PI / 6;
    const x = (cx + r * Math.cos(a)).toFixed(2);
    const y = (cy + r * Math.sin(a)).toFixed(2);
    d += `${i === 0 ? "M" : "L"}${x} ${y}`;
  }
  return `${d}z`;
}
function finderMarks(n, m) {
  const origins = [
    [0, 0],
    [n - 7, 0],
    [0, n - 7]
  ];
  return origins.map(([r, c]) => {
    const x = m + c;
    const y = m + r;
    const cx = x + 3.5;
    const cy = y + 3.5;
    return `<rect x="${x}" y="${y}" width="7" height="7" rx="0.55" fill="${DARK2}"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" rx="0.35" fill="${LIGHT2}"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.15" fill="${DARK2}"/><polygon points="${hexPoints(cx, cy, 1.12)}" fill="${DARK2}"/><rect x="${x}" y="${y}" width="7" height="7" rx="0.55" fill="none" stroke="${RING}" stroke-width="0.16"/>`;
  }).join("");
}
function hexagonQrSvg(payload, px) {
  const text = payload.trim();
  if (!text) return "";
  const qr2 = import_qrcode2.default.create(text, { errorCorrectionLevel: "H" });
  const n = qr2.modules.size;
  const m = MARGIN2;
  const dim = n + m * 2;
  const size2 = Math.max(120, Math.round(px));
  const gid = `qh${n}-${++svgSeq}`;
  const dParts = [];
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (inFinder(row, col, n)) continue;
      if (!qr2.modules.get(row, col)) continue;
      const cx = m + col + 0.5;
      const cy = m + row + 0.5;
      dParts.push(hexSubpath(cx, cy, HEX_R));
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size2}" height="${size2}" viewBox="0 0 ${dim} ${dim}" preserveAspectRatio="xMidYMid meet" shape-rendering="geometricPrecision"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#16102a"/><stop offset="100%" stop-color="#0b1020"/></linearGradient></defs><rect width="${dim}" height="${dim}" fill="${LIGHT2}"/>` + (dParts.length ? `<path fill="url(#${gid})" d="${dParts.join("")}"/>` : "") + finderMarks(n, m) + `</svg>`;
}

// src/overlay/ecosystem.ts
function toEco(it) {
  if (!it.logo) return null;
  return {
    id: it.id,
    label: it.label,
    src: it.logo,
    href: it.url
  };
}
var ECOSYSTEM_LOGOS = pulsePackEcoItems().map(toEco).filter((x) => Boolean(x));
function ecosystemLogosHtml(size2 = 22) {
  const items = ECOSYSTEM_LOGOS.map(
    (it) => `<span class="eco-item" title="${it.label}" data-eco="${it.id}"><img class="eco-img" src="${it.src}" width="${size2}" height="${size2}" alt="${it.label}" decoding="async" /><span class="eco-label">${it.label}</span></span>`
  ).join("");
  return `<div class="eco" aria-label="PulseChain ecosystem">${items}</div>`;
}

// src/overlay/qrRender.ts
async function renderWebsiteQrSvg(url, px = 280) {
  const safe = sanitizeWebsiteLinkQrPayload(url);
  if (!safe) return "";
  try {
    return hexagonQrSvg(safe, px);
  } catch {
    return "";
  }
}
async function renderCreatorWalletQrSvg(receiveAddress, payload, px = 280) {
  const trimmed = payload.trim();
  const safe = sanitizeCreatorWalletQrPayload(trimmed, receiveAddress) ?? sanitizeCreatorWalletQrPayload(receiveAddress, receiveAddress);
  if (!safe) return "";
  return paymentQrSvg(safe, px);
}
function packSlideEnabled(q, itemId) {
  return q.slides.pack?.[itemId] === true;
}
function paginateOffers(offers, pageSize = OVERLAY_MENU_PAGE_SIZE) {
  if (!offers.length) return [];
  const pages = [];
  for (let i = 0; i < offers.length; i += pageSize) {
    pages.push(offers.slice(i, i + pageSize));
  }
  return pages;
}
function menuSlideIds(q, pages) {
  if (!q.slides.menu || !pages.length) return [];
  if (pages.length === 1) return ["menu"];
  return pages.map((_, i) => menuSlideId(i));
}
function participateSlideIds(q, hasQrSlide, packIds) {
  const out = [];
  if (q.slides.qr && hasQrSlide) out.push("qr");
  if (q.slides.how) out.push("how");
  if (q.slides.brand) out.push("brand");
  out.push(...packIds);
  if (q.slides.eco) out.push("eco");
  return out;
}
function orderedSlideIds(q, hasQrSlide, packItems, menuIds) {
  if (!q.enabled) return [];
  const packIds = packItems.filter((it) => packSlideEnabled(q, it.id)).map((it) => packSlideId(it.id));
  const intro = participateSlideIds(q, hasQrSlide, packIds);
  if (!q.carousel) {
    return [];
  }
  if (!menuIds.length) return intro;
  if (!intro.length) return menuIds;
  return [...intro, ...menuIds, ...intro];
}
async function buildOverlayQrPayload(qr2) {
  const sizePx = qr2.size === "sm" ? 220 : qr2.size === "lg" ? 400 : 320;
  const offerQrPx = sizePx;
  const receive = qr2.address.trim();
  const hasAddress = Boolean(receive);
  const packItems = pulsePackStreamQrItems();
  const rawOffers = (Array.isArray(qr2.menuOffers) ? qr2.menuOffers : []).map(
    (offer) => {
      const uri = offer.paymentUri?.trim() || "";
      const paymentUri = uri && hasAddress ? fanSafeCreatorWalletUri(uri, receive) : void 0;
      return { ...offer, paymentUri, qrSvg: void 0 };
    }
  );
  const payable = rawOffers.filter((o) => o.paymentUri);
  const featuredPay = payable.filter((o) => o.featured);
  const cheapest = (featuredPay.length ? featuredPay : payable).slice().sort((a, b) => a.amount - b.amount)[0];
  const tipPayload = cheapest?.paymentUri || (hasAddress && sanitizeCreatorWalletQrPayload(receive, receive) ? receive : "");
  const tipAmountLabel = cheapest ? `Tip ${cheapest.amountLabel}` : void 0;
  const menuPagesBare = paginateOffers(rawOffers);
  const menuIds = menuSlideIds(qr2, menuPagesBare);
  const slideIds = orderedSlideIds(
    qr2,
    hasAddress && Boolean(tipPayload),
    packItems,
    menuIds
  );
  const wantMenuPages = /* @__PURE__ */ new Set();
  let wantMainQr = false;
  const wantPack = /* @__PURE__ */ new Set();
  for (const id of slideIds) {
    if (id === "qr") wantMainQr = true;
    const rawPackId = id === "internetMoney" || id === "tipWallet" ? id : parsePackSlideId(id);
    const resolvedPackId = rawPackId === "internetMoney" ? "tipWallet" : rawPackId;
    if (resolvedPackId) wantPack.add(resolvedPackId);
    const page = parseMenuSlidePage(id);
    if (page !== null) wantMenuPages.add(page);
  }
  const svgMemo = /* @__PURE__ */ new Map();
  const creatorQr = (payload, px) => {
    const key = `${px}
${payload}`;
    let pending = svgMemo.get(key);
    if (!pending) {
      pending = renderCreatorWalletQrSvg(receive, payload, px);
      svgMemo.set(key, pending);
    }
    return pending;
  };
  const menuOffers = await Promise.all(
    rawOffers.map(async (offer, i) => {
      const page = Math.floor(i / OVERLAY_MENU_PAGE_SIZE);
      if (!wantMenuPages.has(page) || !offer.paymentUri) return offer;
      const qrSvg2 = await creatorQr(offer.paymentUri, offerQrPx);
      return qrSvg2 ? { ...offer, qrSvg: qrSvg2 } : offer;
    })
  );
  const menuPages = paginateOffers(menuOffers);
  const packPromises = packItems.filter((it) => wantPack.has(it.id)).map(async (it) => {
    const svg = await renderWebsiteQrSvg(it.url, sizePx);
    return {
      id: it.id,
      label: it.label,
      blurb: it.blurb,
      url: it.url,
      host: packUrlHost(it.url),
      logo: it.logo,
      eyebrow: it.slideEyebrow || it.label,
      qrSvg: svg
    };
  });
  const [qrSvg, packList] = await Promise.all([
    wantMainQr && tipPayload ? creatorQr(tipPayload, sizePx) : Promise.resolve(""),
    Promise.all(packPromises)
  ]);
  const packQrs = {};
  for (const p of packList) packQrs[p.id] = p;
  const tw = packQrs.tipWallet;
  return {
    ...qr2,
    enabled: slideIds.length > 0,
    menuOffers,
    qrSvg,
    shortAddress: hasAddress ? shortenAddress(qr2.address) : "",
    hasAddress,
    tipAmountLabel,
    slideIds,
    ecoHtml: ecosystemLogosHtml(20),
    packQrs,
    menuPages,
    tipWalletQrSvg: tw?.qrSvg || "",
    tipWalletUrl: tw?.url || TIP_WALLET_URL
  };
}

// src/overlay/menuStyle.ts
var OVERLAY_MENU_BOARD = 2;
var OVERLAY_MENU_MAX_ROWS = 32;
var OVERLAY_MENU_DEFAULT_ROWS = 16;
var defaultOverlayMenuStyle = {
  layout: "waves",
  position: "top-left",
  size: "normal",
  opacity: 0.78,
  maxRows: OVERLAY_MENU_DEFAULT_ROWS,
  featuredFirst: false,
  showNote: false,
  showBlurb: false,
  theme: "cyan",
  headline: "Tip menu",
  brand: "",
  board: OVERLAY_MENU_BOARD,
  visibleOfferIds: null
};
var POSITIONS3 = /* @__PURE__ */ new Set([
  "bottom",
  "top",
  "bottom-left",
  "bottom-right",
  "top-left",
  "top-right"
]);
var SIZES3 = /* @__PURE__ */ new Set(["compact", "normal", "large"]);
var THEMES3 = /* @__PURE__ */ new Set(["cyan", "pink", "gold", "soft"]);
function normalizeOverlayMenuStyle(raw) {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const savedBoard = Math.round(Number(o.board));
  const boardIn = Number.isFinite(savedBoard) && savedBoard > 0 ? savedBoard : 0;
  const layout = "waves";
  const pos = String(o.position || "");
  const size2 = String(o.size || "");
  const themeRaw = String(o.theme || "");
  let opacity = Number(o.opacity);
  if (!Number.isFinite(opacity)) opacity = defaultOverlayMenuStyle.opacity;
  opacity = Math.min(0.95, Math.max(0.4, Math.round(opacity * 100) / 100));
  let maxRows = Math.round(Number(o.maxRows));
  if (!Number.isFinite(maxRows)) maxRows = defaultOverlayMenuStyle.maxRows;
  maxRows = Math.min(OVERLAY_MENU_MAX_ROWS, Math.max(1, maxRows));
  return {
    layout,
    position: POSITIONS3.has(pos) ? pos : defaultOverlayMenuStyle.position,
    size: SIZES3.has(size2) ? size2 : defaultOverlayMenuStyle.size,
    opacity,
    maxRows,
    featuredFirst: false,
    showNote: Boolean(o.showNote),
    showBlurb: Boolean(o.showBlurb),
    theme: THEMES3.has(themeRaw) ? themeRaw : defaultOverlayMenuStyle.theme,
    headline: String(o.headline ?? defaultOverlayMenuStyle.headline).trim().slice(0, 48),
    brand: String(o.brand ?? defaultOverlayMenuStyle.brand).trim().slice(0, 48),
    board: Math.max(boardIn, OVERLAY_MENU_BOARD),
    visibleOfferIds: Array.isArray(o.visibleOfferIds) ? o.visibleOfferIds.map((x) => String(x || "").trim()).filter(Boolean).slice(0, OVERLAY_MENU_MAX_ROWS) : null
  };
}

// src/overlay/stage.ts
var LADDER_LIMIT = OVERLAY_MENU_MAX_ROWS;
function clipRow(raw, featured) {
  const name = String(raw.name || "").trim().slice(0, 48);
  const amountLabel = String(raw.amountLabel || raw.amount || "").trim().slice(0, 24);
  if (!name || !amountLabel) return null;
  const note = String(raw.note || "").trim().slice(0, 40);
  const blurb = String(raw.blurb || "").trim().slice(0, 80);
  const id = String(raw.id || "").trim().slice(0, 96);
  const amountN = Number(raw.amount);
  const row = {
    name,
    amountLabel,
    featured: featured || void 0
  };
  if (id) row.id = id;
  if (note) row.note = note;
  if (blurb) row.blurb = blurb;
  if (Number.isFinite(amountN)) row.amount = amountN;
  const sellPitch = String(raw.sellPitch || "").trim().slice(0, 56);
  if (sellPitch) row.sellPitch = sellPitch;
  const timeSec = Math.round(Number(raw.timeSec));
  if (Number.isFinite(timeSec) && timeSec > 0) row.timeSec = timeSec;
  if (Array.isArray(raw.strengths) && raw.strengths.length) {
    const steps = raw.strengths.map((n) => {
      const sv = Math.round(Number(n) || 0);
      return sv < 0 ? 0 : sv > 8 ? 8 : sv;
    }).slice(0, 16);
    if (steps.length) row.strengths = steps;
  }
  return row;
}
function slimOverlayLadder(raw, opts) {
  if (!Array.isArray(raw)) return [];
  const limit = Math.min(
    LADDER_LIMIT,
    Math.max(1, Math.round(Number(opts?.limit) || LADDER_LIMIT))
  );
  const featuredFirst = opts?.featuredFirst !== false;
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  const take = (source, featured) => {
    const row = clipRow(source, featured);
    if (!row) return;
    const key = row.id || `${row.name.toLowerCase()}|${row.amountLabel.toLowerCase()}|${(row.note || "").toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(row);
  };
  const passes = featuredFirst ? [true, false] : [false];
  for (const featuredOnly of passes) {
    for (const row of raw) {
      if (!row || typeof row !== "object") continue;
      const o = row;
      if (featuredOnly && !o.featured) continue;
      if (!featuredOnly && featuredFirst && o.featured) continue;
      take(o, Boolean(o.featured));
      if (out.length >= limit) return out;
    }
  }
  return out;
}

// src/overlay/browserHtml.ts
var EXIT_MS = 480;
function overlayPageHtml() {
  const ecoSeed = ecosystemLogosHtml(20);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>${APP_NAME} \xB7 Stream tip alert</title>
  <style id="base-css">
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: transparent !important;
      font-family: "Segoe UI", system-ui, sans-serif;
    }
    html.preview, html.preview body {
      background: #0a0e14 !important;
    }
    html.preview body::before {
      content: "Preview (dark) \xB7 paste the URL without ?preview into OBS for transparency";
      position: fixed;
      top: 10px;
      left: 12px;
      right: 12px;
      z-index: 2;
      font-size: 11px;
      letter-spacing: 0.02em;
      color: rgba(180, 200, 220, 0.45);
      font-family: ui-monospace, monospace;
      pointer-events: none;
    }
    * { box-sizing: border-box; }
    #stage {
      position: fixed;
      inset: 0;
      pointer-events: none;
      display: flex;
      padding: 6vh 4vw;
    }
    #stage.pos-bottom { align-items: flex-end; justify-content: center; }
    #stage.pos-top { align-items: flex-start; justify-content: center; }
    #stage.pos-bottom-left { align-items: flex-end; justify-content: flex-start; }
    #stage.pos-bottom-right { align-items: flex-end; justify-content: flex-end; }
    #stage.pos-top-left { align-items: flex-start; justify-content: flex-start; }
    #stage.pos-top-right { align-items: flex-start; justify-content: flex-end; }

    /* \u2014\u2014 enter / exit (position-aware) \u2014\u2014 */
    @keyframes tip-enter-up {
      0% { opacity: 0; transform: translateY(2.4rem) scale(0.88); filter: blur(8px); }
      55% { opacity: 1; filter: blur(0); }
      100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
    }
    @keyframes tip-enter-down {
      0% { opacity: 0; transform: translateY(-2.4rem) scale(0.88); filter: blur(8px); }
      55% { opacity: 1; filter: blur(0); }
      100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
    }
    @keyframes tip-enter-left {
      0% { opacity: 0; transform: translateX(2.2rem) scale(0.9); filter: blur(6px); }
      100% { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); }
    }
    @keyframes tip-enter-right {
      0% { opacity: 0; transform: translateX(-2.2rem) scale(0.9); filter: blur(6px); }
      100% { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); }
    }
    @keyframes tip-exit-down {
      0% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
      100% { opacity: 0; transform: translateY(1.6rem) scale(0.9); filter: blur(6px); }
    }
    @keyframes tip-exit-up {
      0% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
      100% { opacity: 0; transform: translateY(-1.6rem) scale(0.9); filter: blur(6px); }
    }
    @keyframes tip-exit-left {
      0% { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); }
      100% { opacity: 0; transform: translateX(-1.4rem) scale(0.92); filter: blur(5px); }
    }
    @keyframes tip-exit-right {
      0% { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); }
      100% { opacity: 0; transform: translateX(1.4rem) scale(0.92); filter: blur(5px); }
    }
    @keyframes tip-pulse-glow {
      0%, 100% { box-shadow:
        0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent),
        0 18px 48px rgba(0, 30, 70, 0.55),
        0 0 40px var(--glow); }
      50% { box-shadow:
        0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent),
        0 18px 48px rgba(0, 30, 70, 0.55),
        0 0 56px color-mix(in srgb, var(--glow) 80%, transparent); }
    }
    @keyframes eco-pop {
      0% { opacity: 0; transform: translateY(6px) scale(0.7); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes eco-shine {
      0%, 100% { filter: brightness(1); }
      50% { filter: brightness(1.18); }
    }

    .alert {
      --accent: #6ec8ff;
      --border: rgba(0, 200, 255, 0.55);
      --glow: rgba(0, 180, 255, 0.22);
      --bg1: rgba(5, 20, 40, 0.92);
      --bg2: rgba(8, 40, 70, 0.88);
      max-width: min(42rem, 92vw);
      padding: 1.1rem 1.5rem 1.15rem;
      border-radius: 16px;
      border: 1px solid var(--border);
      background: linear-gradient(135deg, var(--bg1), var(--bg2));
      box-shadow:
        0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent),
        0 18px 48px rgba(0, 30, 70, 0.55),
        0 0 40px var(--glow);
      color: #eef8ff;
      opacity: 0;
      will-change: transform, opacity, filter;
    }
    .alert.show {
      animation: tip-enter-up 0.58s cubic-bezier(0.2, 0.9, 0.25, 1) both;
    }
    .alert.hide {
      animation: tip-exit-down 0.48s cubic-bezier(0.4, 0, 0.7, 0.2) both;
    }

    #stage.pos-top .alert.show { animation-name: tip-enter-down; }
    #stage.pos-top .alert.hide { animation-name: tip-exit-up; }
    #stage.pos-bottom-left .alert.show,
    #stage.pos-top-left .alert.show { animation-name: tip-enter-right; }
    #stage.pos-bottom-left .alert.hide,
    #stage.pos-top-left .alert.hide { animation-name: tip-exit-left; }
    #stage.pos-bottom-right .alert.show,
    #stage.pos-top-right .alert.show { animation-name: tip-enter-left; }
    #stage.pos-bottom-right .alert.hide,
    #stage.pos-top-right .alert.hide { animation-name: tip-exit-right; }

    .alert.show:not(.theme-custom):not(.hide) {
      animation:
        tip-enter-up 0.58s cubic-bezier(0.2, 0.9, 0.25, 1) both,
        tip-pulse-glow 2.4s ease-in-out 0.6s infinite;
    }
    #stage.pos-top .alert.show:not(.theme-custom):not(.hide) {
      animation:
        tip-enter-down 0.58s cubic-bezier(0.2, 0.9, 0.25, 1) both,
        tip-pulse-glow 2.4s ease-in-out 0.6s infinite;
    }
    #stage.pos-bottom-left .alert.show:not(.theme-custom):not(.hide),
    #stage.pos-top-left .alert.show:not(.theme-custom):not(.hide) {
      animation:
        tip-enter-right 0.58s cubic-bezier(0.2, 0.9, 0.25, 1) both,
        tip-pulse-glow 2.4s ease-in-out 0.6s infinite;
    }
    #stage.pos-bottom-right .alert.show:not(.theme-custom):not(.hide),
    #stage.pos-top-right .alert.show:not(.theme-custom):not(.hide) {
      animation:
        tip-enter-left 0.58s cubic-bezier(0.2, 0.9, 0.25, 1) both,
        tip-pulse-glow 2.4s ease-in-out 0.6s infinite;
    }

    .alert.dry { --border: rgba(255, 180, 80, 0.55); --accent: #ffc56e; }

    .theme-cyan { --accent: #6ec8ff; --border: rgba(0, 200, 255, 0.55); --glow: rgba(0, 180, 255, 0.22); }
    .theme-pink { --accent: #ff8fb8; --border: rgba(255, 100, 160, 0.55); --glow: rgba(255, 80, 140, 0.22);
      --bg1: rgba(40, 10, 28, 0.92); --bg2: rgba(60, 15, 40, 0.88); }
    .theme-gold { --accent: #ffd56e; --border: rgba(255, 200, 80, 0.55); --glow: rgba(255, 180, 40, 0.22);
      --bg1: rgba(30, 22, 8, 0.93); --bg2: rgba(55, 40, 10, 0.88); }
    .theme-soft { --accent: #c8d8e8; --border: rgba(200, 220, 240, 0.35); --glow: rgba(255, 255, 255, 0.08);
      --bg1: rgba(12, 16, 24, 0.88); --bg2: rgba(20, 26, 36, 0.86); }
    .theme-custom {
      padding: 0;
      border: none;
      background: transparent;
      box-shadow: none;
      border-radius: 0;
      color: #fff;
    }

    .size-compact { padding: 0.7rem 1rem; border-radius: 12px; max-width: min(28rem, 88vw); }
    .size-compact .title { font-size: clamp(1.15rem, 2.6vw, 1.55rem); }
    .size-compact .sub { font-size: 0.88rem; }
    .size-compact .eyebrow { font-size: 0.65rem; }
    .size-large { padding: 1.35rem 1.75rem; max-width: min(48rem, 94vw); }
    .size-large .title { font-size: clamp(2rem, 4.5vw, 3rem); }
    .size-large .sub { font-size: clamp(1.05rem, 2.2vw, 1.3rem); }
    .size-large .eyebrow { font-size: 0.8rem; }
    .size-large .brand { font-size: 0.9rem; }
    /* Templates hardcode padding/fonts \u2014 scale the whole card so Size still matters */
    .theme-custom.size-compact,
    .theme-custom.size-normal,
    .theme-custom.size-large { padding: 0; border-radius: 0; }
    .theme-custom.size-compact { zoom: 0.82; }
    .theme-custom.size-normal { zoom: 1; }
    .theme-custom.size-large { zoom: 1.28; }

    .brand {
      font-size: 0.78rem;
      font-weight: 700;
      color: color-mix(in srgb, var(--accent) 85%, #fff);
      margin-bottom: 0.2rem;
      letter-spacing: 0.04em;
    }
    .eyebrow {
      font-size: 0.72rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--accent);
      font-weight: 700;
      margin-bottom: 0.35rem;
    }
    .title {
      font-size: clamp(1.6rem, 3.8vw, 2.35rem);
      font-weight: 800;
      line-height: 1.1;
      letter-spacing: -0.02em;
      text-shadow: 0 2px 18px rgba(0, 0, 0, 0.45);
    }
    .sub {
      margin-top: 0.4rem;
      font-size: clamp(0.95rem, 2vw, 1.15rem);
      color: #b8d8f0;
      font-weight: 600;
    }

    /* \u2014\u2014 ecosystem logos \u2014\u2014 */
    .eco {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.45rem 0.65rem;
      margin-top: 0.75rem;
      padding-top: 0.65rem;
      border-top: 1px solid color-mix(in srgb, var(--accent, #6ec8ff) 28%, transparent);
    }
    .theme-custom .eco {
      margin: 0.55rem 0.2rem 0;
      padding: 0.5rem 0.35rem 0;
      border-top-color: rgba(255,255,255,0.14);
    }
    .eco-item {
      display: inline-flex;
      align-items: center;
      gap: 0.28rem;
      opacity: 0;
      animation: eco-pop 0.4s cubic-bezier(0.2, 0.9, 0.25, 1) both;
    }
    .alert.show .eco-item:nth-child(1) { animation-delay: 0.22s; }
    .alert.show .eco-item:nth-child(2) { animation-delay: 0.3s; }
    .alert.show .eco-item:nth-child(3) { animation-delay: 0.38s; }
    .alert.show .eco-item:nth-child(4) { animation-delay: 0.46s; }
    .eco-img {
      display: block;
      width: 1.35rem;
      height: 1.35rem;
      object-fit: contain;
      flex-shrink: 0;
      animation: eco-shine 3.2s ease-in-out infinite;
    }
    .eco-item:nth-child(2) .eco-img { animation-delay: 0.4s; }
    .eco-item:nth-child(3) .eco-img { animation-delay: 0.8s; }
    .eco-item:nth-child(4) .eco-img { animation-delay: 1.2s; }
    .size-compact .eco-img {
      width: 1.15rem;
      height: 1.15rem;
    }
    .eco-label {
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: color-mix(in srgb, var(--accent, #9ec8e8) 70%, #c8d8e8);
      opacity: 0.9;
    }
    .size-compact .eco-label { display: none; }
    .size-compact .eco { gap: 0.4rem; }

    .conn {
      position: fixed;
      top: 10px;
      right: 12px;
      font-size: 11px;
      color: rgba(255,255,255,0.35);
      font-family: ui-monospace, monospace;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .conn.visible { opacity: 1; }
    .conn.ok { color: rgba(100, 220, 160, 0.55); }
    .conn.bad { color: rgba(255, 120, 120, 0.55); }
  </style>
  <style id="user-css"></style>
</head>
<body>
  <div class="conn" id="conn">connecting\u2026</div>
  <div id="stage" class="pos-bottom">
    <div class="alert theme-cyan size-normal" id="alert" hidden></div>
  </div>
  <script>
    const ECO_HTML = ${JSON.stringify(ecoSeed)}
    const EXIT_MS = ${EXIT_MS}
    const conn = document.getElementById('conn')
    const stage = document.getElementById('stage')
    const alertEl = document.getElementById('alert')
    const userCss = document.getElementById('user-css')
    let hideTimer = 0
    let hideDoneTimer = 0
    let style = {
      position: 'bottom',
      theme: 'cyan',
      size: 'normal',
      holdSec: 7,
      eyebrow: 'Tip',
      brand: '',
      showPattern: true,
      showPoolAlerts: true,
      showPoolLabel: true,
      showDryRun: true,
      minAmount: 0,
      walletMinAmount: 0,
      poolMinAmount: 0,
      showStatus: false,
      showEco: true,
      customCss: '',
      customHtml: ''
    }

    function esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    }

    function ecoBlock() {
      if (style.showEco === false) return ''
      return ECO_HTML
    }

    function defaultInner(parts) {
      let h = ''
      if (parts.brand) h += '<div class="brand">' + esc(parts.brand) + '</div>'
      h += '<div class="eyebrow">' + esc(parts.eyebrow) + '</div>'
      h += '<div class="title">' + esc(parts.title) + '</div>'
      if (parts.subtitle) h += '<div class="sub">' + esc(parts.subtitle) + '</div>'
      h += ecoBlock()
      return h
    }

    function fillTemplate(tpl, parts) {
      let out = String(tpl)
        .replace(/\\{\\{title\\}\\}/g, esc(parts.title))
        .replace(/\\{\\{subtitle\\}\\}/g, esc(parts.subtitle))
        .replace(/\\{\\{eyebrow\\}\\}/g, esc(parts.eyebrow))
        .replace(/\\{\\{brand\\}\\}/g, esc(parts.brand))
        .replace(/\\{\\{amount\\}\\}/g, esc(parts.amount))
        .replace(/\\{\\{symbol\\}\\}/g, esc(parts.symbol))
        .replace(/\\{\\{source\\}\\}/g, esc(parts.source))
        .replace(/\\{\\{eco\\}\\}/g, ecoBlock())
      // Auto-append eco bar if pack has no {{eco}} token
      if (style.showEco !== false && out.indexOf('class="eco"') < 0) {
        out += ecoBlock()
      }
      return out
    }

    function applyStyle(s) {
      if (!s || typeof s !== 'object') return
      style = Object.assign(style, s)
      if (style.showEco === undefined) style.showEco = true
      stage.className = 'pos-' + (style.position || 'bottom')
      const hasCustom = String(style.customHtml || '').trim().length > 0
      const theme = hasCustom ? 'custom' : (style.theme === 'custom' ? 'cyan' : (style.theme || 'cyan'))
      const keepShow = alertEl.classList.contains('show')
      const keepHide = alertEl.classList.contains('hide')
      const keepDry = alertEl.classList.contains('dry')
      alertEl.className = 'alert theme-' + theme + ' size-' + (style.size || 'normal')
      if (keepShow) alertEl.classList.add('show')
      if (keepHide) alertEl.classList.add('hide')
      if (keepDry) alertEl.classList.add('dry')
      conn.classList.toggle('visible', Boolean(style.showStatus))
      userCss.textContent = String(style.customCss || '')
    }

    function showTip(t) {
      const forced = Boolean(t.force) || t.source === 'test'
      if (t.dryRun && !forced && !style.showDryRun) return
      if (t.source === 'pool' && !forced && !style.showPoolAlerts) return
      const minimum = t.source === 'pool'
        ? style.poolMinAmount
        : style.walletMinAmount
      if (!forced && minimum > 0 && Number(t.amount) < minimum) return

      let typeLabel = t.source === 'pool'
        ? (t.eventKind === 'mint' ? 'LP add'
          : t.eventKind === 'burn' ? 'LP remove'
          : t.eventKind === 'bridge-in' ? 'Bridge in'
          : t.eventKind === 'bridge-out' ? 'Bridge out'
          : t.eventKind === 'custom' ? 'Chain event'
          : 'Pool swap')
        : t.source === 'test'
          ? (t.eventKind === 'pool' || t.eventKind === 'swap' ? 'Test pool swap' : 'Test tip')
          : (style.eyebrow || 'Tip')
      if (t.source === 'wallet' || !t.source) typeLabel = style.eyebrow || 'Tip'
      const eyebrowText = (t.dryRun && !forced) ? typeLabel + ' \xB7 dry-run' : typeLabel
      const titleText = t.title || ((t.amount || 0) + ' ' + (t.symbol || ''))
      let subText = t.subtitle || ''

      const parts = {
        title: titleText,
        subtitle: subText,
        eyebrow: eyebrowText,
        brand: String(style.brand || '').trim(),
        amount: t.amount != null ? t.amount : '',
        symbol: t.symbol || '',
        source: t.source || 'wallet'
      }

      const tpl = String(style.customHtml || '').trim()
      alertEl.innerHTML = tpl ? fillTemplate(tpl, parts) : defaultInner(parts)
      alertEl.hidden = false
      alertEl.classList.toggle('dry', Boolean(t.dryRun) && !forced)
      alertEl.dataset.source = parts.source

      clearTimeout(hideTimer)
      clearTimeout(hideDoneTimer)
      alertEl.classList.remove('show', 'hide')
      void alertEl.offsetWidth
      alertEl.classList.add('show')

      const hold = Math.min(20, Math.max(2, Number(style.holdSec) || 7)) * 1000
      hideTimer = setTimeout(() => {
        alertEl.classList.add('hide')
        alertEl.classList.remove('show')
        hideDoneTimer = setTimeout(() => { alertEl.hidden = true }, EXIT_MS)
      }, hold)
    }

    function connect() {
      conn.textContent = 'connecting\u2026'
      conn.className = 'conn' + (style.showStatus ? ' visible' : '')
      const es = new EventSource('/api/overlay/stream')
      es.addEventListener('open', () => {
        conn.textContent = 'live'
        conn.className = 'conn ok' + (style.showStatus ? ' visible' : '')
      })
      es.addEventListener('style', (ev) => {
        try { applyStyle(JSON.parse(ev.data)) } catch (e) {}
      })
      es.addEventListener('tip', (ev) => {
        try { showTip(JSON.parse(ev.data)) } catch (e) { console.warn(e) }
      })
      es.onerror = () => {
        conn.textContent = 'reconnecting\u2026'
        conn.className = 'conn bad' + (style.showStatus ? ' visible' : '')
        es.close()
        setTimeout(connect, 1500)
      }
    }
    fetch('/api/overlay/style').then(r => r.json()).then(j => {
      if (j && j.style) applyStyle(j.style)
    }).catch(() => {})
    if (location.search.indexOf('preview=1') >= 0) {
      document.documentElement.classList.add('preview')
    }
    function afterLoad(fn) {
      if (document.readyState === 'complete') setTimeout(fn, 0)
      else window.addEventListener('load', fn)
    }
    afterLoad(connect)
  </script>
</body>
</html>`;
}

// src/overlay/qrPageHtml.ts
function overlayQrPageHtml() {
  const brandFallback = JSON.stringify(APP_NAME);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>${APP_NAME} \xB7 Stream carousel</title>
  <style>
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: transparent !important;
      font-family: "Segoe UI", system-ui, sans-serif;
    }
    html.preview, html.preview body {
      background: #0a0e14 !important;
    }
    html.preview body::before {
      content: "Carousel preview (dark) \xB7 use URL without ?preview in OBS";
      position: fixed;
      top: 10px;
      left: 12px;
      z-index: 2;
      font-size: 11px;
      color: rgba(180, 200, 220, 0.45);
      font-family: ui-monospace, monospace;
      pointer-events: none;
    }
    * { box-sizing: border-box; }
    #stage {
      position: fixed;
      inset: 0;
      pointer-events: none;
      display: flex;
      padding: 4vh 3vw;
    }
    #stage.pos-bottom { align-items: flex-end; justify-content: center; }
    #stage.pos-top { align-items: flex-start; justify-content: center; }
    #stage.pos-bottom-left { align-items: flex-end; justify-content: flex-start; }
    #stage.pos-bottom-right { align-items: flex-end; justify-content: flex-end; }
    #stage.pos-top-left { align-items: flex-start; justify-content: flex-start; }
    #stage.pos-top-right { align-items: flex-start; justify-content: flex-end; }

    .card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.28rem;
      padding: 0.62rem 0.62rem 0.5rem;
      border-radius: 14px;
      /* Locked width so pack vs tip QR cards don\u2019t resize while cycling */
      width: min(15.25rem, 86vw);
      max-width: min(15.25rem, 86vw);
      min-width: min(12.5rem, 82vw);
      overflow: hidden;
    }
    /* Author display:flex beats bare [hidden] \u2014 force hide when off */
    .card[hidden] {
      display: none !important;
    }
    .card.theme-dark {
      --viz-hi: #9ad4ff;
      --viz-lo: #4a8ec8;
      --viz-path: #8ec8ff;
      background: rgba(8, 12, 18, 0.88);
      border: 1px solid rgba(255,255,255,0.12);
      box-shadow: 0 12px 32px rgba(0,0,0,0.45);
      color: #e8f0f8;
    }
    .card.theme-light {
      --viz-hi: #3aa0e8;
      --viz-lo: #125a9a;
      --viz-path: #0a6aad;
      background: rgba(255,255,255,0.94);
      border: 1px solid rgba(0,0,0,0.08);
      box-shadow: 0 12px 32px rgba(0,0,0,0.2);
      color: #121820;
    }
    .card.theme-pulse {
      --viz-hi: #b8fff6;
      --viz-lo: #1a7dff;
      --viz-path: #7dffef;
      background: linear-gradient(160deg, rgba(8,18,32,0.92), rgba(18,8,28,0.9));
      border: 1px solid rgba(0, 200, 255, 0.4);
      box-shadow:
        0 0 0 1px rgba(128, 0, 255, 0.15),
        0 14px 36px rgba(0, 30, 60, 0.5);
      color: #e8f8ff;
    }

    .viewport {
      width: 100%;
      position: relative;
      display: flex;
      flex-direction: column;
      /* Room for QR stack without a tall empty hole */
      min-height: 0;
    }
    .slide {
      display: none;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
      width: 100%;
      text-align: center;
      flex: 1 1 auto;
    }
    .slide.active {
      display: flex;
      animation: slide-in 0.5s cubic-bezier(0.2, 0.9, 0.25, 1) both;
    }
    .slide.leaving {
      display: flex;
      position: absolute;
      left: 0; right: 0; top: 0;
      animation: slide-out 0.4s cubic-bezier(0.4, 0, 0.7, 0.2) both;
      pointer-events: none;
    }
    @keyframes slide-in {
      from { opacity: 0; transform: translateX(1.5rem) scale(0.96); filter: blur(4px); }
      to { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); }
    }
    @keyframes slide-out {
      from { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); }
      to { opacity: 0; transform: translateX(-1.2rem) scale(0.96); filter: blur(4px); }
    }

    .label {
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .card.theme-pulse .label {
      background: linear-gradient(90deg, #00eaff, #8000ff, #ff3333);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .card.look-cyan { --look-accent: #7ad7ff; }
    .card.look-pink { --look-accent: #ff9ad4; }
    .card.look-gold { --look-accent: #f0c36a; }
    .card.look-soft { --look-accent: #c8d4e4; }
    .card.look-cyan,
    .card.look-pink,
    .card.look-gold,
    .card.look-soft {
      border-color: color-mix(in srgb, var(--look-accent) 55%, rgba(255,255,255,0.12));
      box-shadow:
        0 0 0 1px color-mix(in srgb, var(--look-accent) 22%, transparent),
        0 14px 36px rgba(0, 30, 60, 0.5);
    }
    .card.look-cyan .label,
    .card.look-pink .label,
    .card.look-gold .label,
    .card.look-soft .label {
      background: none;
      -webkit-background-clip: unset;
      background-clip: unset;
      color: var(--look-accent);
    }
    .qr-wrap {
      background: #fff;
      border-radius: 8px;
      padding: 0.22rem;
      line-height: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: fit-content;
      height: fit-content;
      max-width: 100%;
      box-sizing: border-box;
    }
    .qr-wrap svg,
    .qr-wrap .qr-img {
      display: block;
      width: var(--qr, 200px);
      height: var(--qr, 200px);
      max-width: 100%;
      max-height: 100%;
      margin: 0;
      flex: 0 0 auto;
      object-fit: contain;
    }
    .size-sm { --qr: 160px; }
    .size-md { --qr: 220px; }
    .size-lg { --qr: 280px; }

    /* Unified QR card stack (tip wallet + pack links) */
    .kq {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.26rem;
      width: 100%;
      text-align: center;
    }
    .kq-head {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      min-height: 1.5rem;
      max-width: 100%;
      padding: 0 0.15rem;
    }
    .kq-mark {
      width: 1.75rem;
      height: 1.75rem;
      object-fit: contain;
      border-radius: 0.4rem;
      flex: 0 0 auto;
    }
    .kq-mark-empty {
      display: inline-block;
      width: 1.75rem;
      height: 1.75rem;
      flex: 0 0 auto;
      border-radius: 0.4rem;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.08);
    }
    .card.theme-light .kq-mark-empty {
      background: rgba(0,0,0,0.04);
      border-color: rgba(0,0,0,0.08);
    }
    .kq-title {
      font-size: 0.95rem;
      font-weight: 800;
      line-height: 1.2;
      min-width: 0;
      word-break: break-word;
    }
    .kq-caption {
      font-size: 0.72rem;
      font-weight: 600;
      line-height: 1.25;
      opacity: 0.88;
      max-width: 13.5rem;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
    }
    .kq-caption:empty,
    .kq-meta:empty {
      display: none;
    }
    .kq-meta {
      font-family: ui-monospace, Consolas, monospace;
      font-size: 0.64rem;
      opacity: 0.72;
      word-break: break-all;
      max-width: 100%;
      line-height: 1.2;
    }
    .brand-big {
      font-size: clamp(1.2rem, 3.5vw, 1.7rem);
      font-weight: 800;
      line-height: 1.15;
      max-width: 100%;
      word-break: break-word;
    }
    .brand {
      font-size: 0.85rem;
      font-weight: 700;
    }
    .addr {
      font-family: ui-monospace, Consolas, monospace;
      font-size: 0.7rem;
      opacity: 0.75;
      word-break: break-all;
      max-width: 100%;
    }
    .how-body {
      font-size: 0.92rem;
      font-weight: 600;
      line-height: 1.4;
      opacity: 0.95;
      max-width: 13.5rem;
    }
    .how-list {
      margin: 0.35rem 0 0;
      padding: 0;
      list-style: none;
      font-size: 0.78rem;
      opacity: 0.85;
      line-height: 1.45;
    }
    /* Non-QR info slides: same width, quieter vertical rhythm */
    .slide-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
      width: 100%;
      min-height: calc(var(--qr, 176px) + 3.4rem);
      justify-content: center;
    }
    .empty {
      padding: 0.5rem;
      color: inherit;
      opacity: 0.8;
      font-size: 0.88rem;
    }
    .eco-mark {
      width: 34px;
      height: 34px;
      display: block;
      animation: pf-mark-glow 2.4s ease-in-out infinite;
    }
    .foot {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.16rem;
      padding: 0.22rem 0.62rem 0.22rem 0.32rem;
      border-radius: 999px;
      background: linear-gradient(90deg, rgba(0, 40, 72, 0.55), rgba(40, 8, 56, 0.5));
      border: 1px solid rgba(0, 234, 255, 0.42);
      box-shadow:
        0 0 0 1px rgba(128, 0, 255, 0.18),
        0 0 22px rgba(0, 180, 255, 0.28),
        inset 0 0 14px rgba(0, 234, 255, 0.1);
    }
    .foot-word {
      font-size: 1.22rem;
      font-weight: 900;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      line-height: 1;
      background: linear-gradient(90deg, #7dfff6, #00eaff, #b44dff, #ff4d9a, #00eaff, #7dfff6);
      background-size: 240% 100%;
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      animation: pf-word-shine 3s linear infinite;
      filter: drop-shadow(0 0 8px rgba(0, 234, 255, 0.45));
    }
    .card.theme-light .foot {
      background: rgba(255, 255, 255, 0.72);
      border-color: rgba(0, 120, 200, 0.35);
      box-shadow: 0 4px 16px rgba(0, 40, 80, 0.12);
    }
    .card.theme-light .foot-word {
      filter: none;
    }
    .card.theme-dark .foot {
      background: rgba(8, 14, 22, 0.72);
      border-color: rgba(255, 255, 255, 0.16);
    }
    @keyframes pf-word-shine {
      0% { background-position: 0% 50%; }
      100% { background-position: 100% 50%; }
    }
    @keyframes pf-mark-glow {
      0%, 100% { filter: drop-shadow(0 0 3px rgba(0, 234, 255, 0.45)); }
      50% { filter: drop-shadow(0 0 11px rgba(180, 70, 255, 0.85)); }
    }
    .dots {
      display: flex;
      gap: 0.35rem;
      margin-top: 0.35rem;
      min-height: 0.4rem;
    }
    .dots span {
      width: 0.35rem;
      height: 0.35rem;
      border-radius: 50%;
      background: currentColor;
      opacity: 0.28;
    }
    .dots span.on { opacity: 0.9; }
    .card:not(.is-carousel) .dots { display: none; }

    /* eco strip inside card */
    .eco {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 0.45rem 0.55rem;
      margin-top: 0.15rem;
    }
    .eco-item {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }
    .eco-img {
      width: 1.35rem;
      height: 1.35rem;
      object-fit: contain;
    }
    .eco-label {
      font-size: 0.58rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      opacity: 0.85;
    }
    .size-sm .eco-label { display: none; }
    /* legacy aliases if custom HTML still uses these */
    .im-logo { width: 1.75rem; height: 1.75rem; object-fit: contain; border-radius: 0.4rem; }
    .im-url {
      font-family: ui-monospace, Consolas, monospace;
      font-size: 0.68rem;
      opacity: 0.72;
      word-break: break-all;
    }
    .menu-list {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 0.32rem;
      margin-top: 0.2rem;
      text-align: left;
    }
    .menu-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      grid-template-rows: auto auto;
      column-gap: 0.45rem;
      row-gap: 0.2rem;
      align-items: center;
      padding: 0.32rem 0.4rem 0.35rem;
      border-radius: 8px;
      background: rgba(255,255,255,0.06);
    }
    .card.theme-light .menu-row {
      background: rgba(0,0,0,0.05);
    }
    .menu-row.is-featured {
      outline: 1px solid rgba(0, 200, 255, 0.45);
    }
    .menu-solo.is-featured .menu-solo-name {
      color: #7dffef;
    }
    .menu-name {
      grid-column: 1;
      grid-row: 1;
      font-size: 0.78rem;
      font-weight: 700;
      line-height: 1.2;
      min-width: 0;
    }
    .menu-note {
      display: block;
      font-size: 0.62rem;
      font-weight: 600;
      opacity: 0.7;
      margin-top: 0.08rem;
    }
    .menu-toy {
      font-size: 0.88rem;
      font-weight: 800;
      line-height: 1.15;
      margin: 0.1rem 0 0.05rem;
    }
    .menu-page {
      font-size: 0.62rem;
      opacity: 0.65;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .menu-sub {
      font-size: 0.72rem;
      opacity: 0.78;
      font-weight: 600;
      margin: 0 0 0.1rem;
    }
    .menu-amt {
      grid-column: 2;
      grid-row: 1;
      font-family: ui-monospace, Consolas, monospace;
      font-size: 0.78rem;
      font-weight: 800;
      white-space: nowrap;
      justify-self: end;
    }
    .menu-qr {
      grid-column: 3;
      grid-row: 1 / span 2;
      width: 3.1rem;
      height: 3.1rem;
      border-radius: 6px;
      overflow: hidden;
      background: #fff;
      align-self: center;
    }
    .menu-qr svg {
      display: block;
      width: 100%;
      height: 100%;
    }
    .card.theme-pulse .menu-amt {
      color: #7dffef;
    }
    .menu-viz {
      grid-column: 1 / -1;
      grid-row: 2;
      height: 1.35rem;
      border-radius: 5px;
      overflow: hidden;
      background: rgba(0,0,0,0.28);
      border: 1px solid rgba(255,255,255,0.08);
    }
    .card.theme-light .menu-viz {
      background: rgba(0,0,0,0.06);
      border-color: rgba(0,0,0,0.08);
    }
    .menu-viz-svg {
      display: block;
      width: 100%;
      height: 100%;
    }
    .menu-viz-svg-hd {
      overflow: visible;
    }
    .menu-viz-base {
      stroke: rgba(180, 200, 220, 0.28);
      stroke-width: 1;
    }
    .menu-viz-path {
      stroke: rgba(0, 220, 255, 0.55);
      stroke-width: 1.2;
      stroke-linejoin: round;
      stroke-linecap: round;
    }
    .menu-viz-path-hd {
      stroke-width: 2.6;
      stroke-linejoin: round;
      stroke-linecap: round;
    }
    .menu-bar-hd {
      opacity: 0.95;
    }
    .menu-viz-fill {
      fill: url(#pv-bar);
      opacity: 0.2;
    }
    .menu-bar {
      fill: rgba(0, 200, 255, 0.62);
    }
    .card.theme-light .menu-bar {
      fill: rgba(0, 120, 200, 0.55);
    }
    .card.theme-light .menu-viz-path {
      stroke: rgba(0, 100, 180, 0.5);
    }
    .menu-solo {
      width: 100%;
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.32rem;
      text-align: center;
    }
    .menu-solo-price {
      width: 100%;
      flex: 0 0 auto;
      background: rgba(0, 200, 255, 0.14);
      border-radius: 7px;
      padding: 0.38rem 0.55rem 0.34rem;
      box-sizing: border-box;
    }
    .menu-solo-amt {
      font-family: ui-monospace, Consolas, monospace;
      font-size: 1.28rem;
      font-weight: 800;
      letter-spacing: 0.02em;
      line-height: 1.05;
      flex: 0 0 auto;
    }
    .menu-solo-sym {
      margin-top: 0.38rem;
      font-size: 0.68rem;
      font-weight: 600;
      opacity: 0.76;
      letter-spacing: 0.03em;
    }
    .card.theme-pulse .menu-solo-amt {
      color: #7dffef;
    }
    .menu-solo-viz {
      width: 92%;
      height: 1.85rem;
      border-radius: 12px;
      overflow: hidden;
      background: linear-gradient(180deg, rgba(0, 48, 72, 0.5), rgba(0, 0, 0, 0.42));
      border: 1px solid rgba(0, 220, 255, 0.28);
      box-shadow: inset 0 0 12px rgba(0, 200, 255, 0.12);
      margin-top: auto;
      padding: 0.12rem 0.2rem;
      box-sizing: border-box;
      flex: 0 0 auto;
    }
    .card.theme-light .menu-solo-viz {
      background: linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.08));
      border-color: rgba(0,0,0,0.08);
      box-shadow: none;
    }
    .menu-solo .qr-wrap {
      flex: 1 1 auto;
      width: 100%;
      max-width: 11.5rem;
      height: auto;
      margin: 0.08rem auto 0.12rem;
      padding: 0.32rem;
      box-shadow: 0 8px 20px rgba(0, 8, 24, 0.35);
    }
    .menu-solo .qr-wrap svg,
    .menu-solo .qr-wrap .qr-img {
      width: 100%;
      height: auto;
      aspect-ratio: 1;
      max-width: 11.5rem;
    }

  </style>
</head>
<body>
  <div id="stage" class="pos-bottom-right">
    <div class="card theme-pulse size-md" id="card" hidden>
      <div class="viewport" id="viewport"></div>
      <div class="dots" id="dots" aria-hidden="true"></div>
      <div class="foot"><img class="eco-mark" src="/brand/pulsechain-mark.svg" alt="" width="34" height="34" /><span class="foot-word">PulseChain</span></div>
    </div>
  </div>
  <script>
    const stage = document.getElementById('stage')
    const card = document.getElementById('card')
    const viewport = document.getElementById('viewport')
    const dots = document.getElementById('dots')
    let state = null
    let idx = 0
    let timer = 0
    let leaveTimer = 0
    var lookTheme = 'cyan'

    function esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    }

    function offerVizHtml(row, tall) {
      if (row && row.barsSvg && String(row.barsSvg).indexOf('<svg') === 0) return row.barsSvg
      var steps = (row && row.strengths) || []
      var hd = !!tall
      var w = hd ? 720 : 180
      var h = hd ? 64 : 26
      var n = Math.max(1, Math.min(24, steps.length || 3))
      var padX = hd ? 18 : 3
      var padY = hd ? 10 : 3
      var gapRatio = hd ? 0.38 : 0.16
      var gap = Math.max(hd ? 6 : 1, Math.min(hd ? 14 : 2.5, ((w - padX * 2) / n) * gapRatio))
      var barW = Math.min(hd ? 32 : 10, Math.max(hd ? 8 : 2, (w - padX * 2 - gap * (n - 1)) / n))
      var groupW = n * barW + (n - 1) * gap
      var originX = (w - groupW) / 2
      var rx = hd ? barW / 2 : Math.min(1.2, barW / 2)
      var baseY = h - padY
      var path = ''
      var bars = ''
      var pts = []
      for (var i = 0; i < n; i++) {
        var raw = i < steps.length ? Number(steps[i]) : [2, 4, 3][i]
        var v = Math.max(0, Math.min(8, Number.isFinite(raw) ? raw : 2))
        var bx = originX + i * (barW + gap)
        var cx = bx + barW / 2
        var barH = ((h - padY * 2) * v) / 8
        var y = baseY - barH
        pts.push({ x: cx, y: y })
        if (v > 0) {
          var bh = Math.max(hd ? 3 : 1.4, barH)
          var by = baseY - bh
          bars += '<rect class="' + (hd ? 'menu-bar-hd' : 'menu-bar') + '" x="' + bx.toFixed(2) + '" y="' + by.toFixed(2) + '" width="' + barW.toFixed(2) + '" height="' + bh.toFixed(2) + '" rx="' + rx.toFixed(2) + '"' + (hd ? ' fill="url(#pv-bar)"' : '') + '/>'
        }
      }
      if (hd && pts.length) {
        path = 'M' + pts[0].x.toFixed(2) + ' ' + pts[0].y.toFixed(2)
        for (var pi = 0; pi < pts.length - 1; pi++) {
          var p0 = pts[pi - 1] || pts[pi]
          var p1 = pts[pi]
          var p2 = pts[pi + 1]
          var p3 = pts[pi + 2] || p2
          var c1x = p1.x + (p2.x - p0.x) / 6
          var c1y = p1.y + (p2.y - p0.y) / 6
          var c2x = p2.x - (p3.x - p1.x) / 6
          var c2y = p2.y - (p3.y - p1.y) / 6
          path += 'C' + c1x.toFixed(2) + ' ' + c1y.toFixed(2) + ' ' + c2x.toFixed(2) + ' ' + c2y.toFixed(2) + ' ' + p2.x.toFixed(2) + ' ' + p2.y.toFixed(2)
        }
      } else {
        for (var j = 0; j < pts.length; j++) {
          path += (j === 0 ? 'M' : 'L') + pts[j].x.toFixed(1) + ' ' + pts[j].y.toFixed(1) + ' '
        }
        path = path.trim()
      }
      var defs = hd
        ? '<defs><linearGradient id="pv-bar" x1="0" y1="' + padY + '" x2="0" y2="' + baseY + '" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="var(--viz-hi,#b8fff6)"/><stop offset="100%" stop-color="var(--viz-lo,#1a7dff)"/></linearGradient><linearGradient id="pv-path" x1="' + padX + '" y1="0" x2="' + (w - padX) + '" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="var(--viz-hi,#b8fff6)"/><stop offset="100%" stop-color="var(--viz-path,#7dffef)"/></linearGradient></defs>'
        : ''
      var area = ''
      if (hd && pts.length) {
        var last = pts[pts.length - 1]
        area = '<path class="menu-viz-fill" d="' + path + ' L' + last.x.toFixed(2) + ' ' + baseY.toFixed(2) + ' L' + pts[0].x.toFixed(2) + ' ' + baseY.toFixed(2) + ' Z"/>'
      }
      var pathEl = hd
        ? '<path class="menu-viz-path-hd" d="' + path + '" fill="none" stroke="url(#pv-path)"/>'
        : '<path class="menu-viz-path" d="' + path + '" fill="none"/>'
      return (
        '<svg class="menu-viz-svg' + (hd ? ' menu-viz-svg-hd' : '') + '" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="' + (hd ? 'xMidYMid meet' : 'none') + '" shape-rendering="geometricPrecision" aria-hidden="true">' +
          defs +
          '<line class="menu-viz-base" x1="' + padX + '" y1="' + baseY + '" x2="' + (w - padX) + '" y2="' + baseY + '"/>' +
          area +
          bars +
          pathEl +
        '</svg>'
      )
    }

    /* strip script closers from operator HTML (OBS inject) */
    function safeTpl(s) {
      return String(s || '').replace(/<\\/script/gi, '<\\\\/script')
    }

    function applySlideTemplate(tpl, builtin, q, pack) {
      var brandOr =
        String(q.brand || q.label || ${brandFallback}).trim() || ${brandFallback}
      var mapRaw = {
        default: builtin || '',
        qrSvg: q.qrSvg || '',
        ecoHtml: q.ecoHtml || '',
        packQrSvg: (pack && pack.qrSvg) || '',
        packLogo: pack && pack.logo
          ? '<img class="kq-mark" src="' + esc(pack.logo) + '" alt="" width="28" height="28" />'
          : '<span class="kq-mark kq-mark-empty" aria-hidden="true"></span>',
      }
      var mapEsc = {
        label: q.label || '',
        brand: q.brand || '',
        brandOrLabel: brandOr,
        address: q.address || '',
        shortAddress: q.shortAddress || '',
        menuSymbol: q.menuSymbol || 'PLS',
        packLabel: (pack && pack.label) || '',
        packBlurb: (pack && pack.blurb) || '',
        packEyebrow: (pack && pack.eyebrow) || '',
        packHost: (pack && pack.host) || '',
        packUrl: (pack && pack.url) || '',
      }
      var out = safeTpl(tpl)
      out = out.replace(/\\{\\{default\\}\\}/g, function () { return mapRaw.default })
      out = out.replace(/\\{\\{qrSvg\\}\\}/g, function () { return mapRaw.qrSvg })
      out = out.replace(/\\{\\{ecoHtml\\}\\}/g, function () { return mapRaw.ecoHtml })
      out = out.replace(/\\{\\{packQrSvg\\}\\}/g, function () { return mapRaw.packQrSvg })
      out = out.replace(/\\{\\{packLogo\\}\\}/g, function () { return mapRaw.packLogo })
      Object.keys(mapEsc).forEach(function (k) {
        out = out.replace(new RegExp('\\\\{\\\\{' + k + '\\\\}\\\\}', 'g'), esc(mapEsc[k]))
      })
      return out
    }

    function slideCustomKey(id) {
      if (id === 'qr' || id === 'brand' || id === 'eco' || id === 'how' || id === 'menu') return id
      if (typeof id === 'string' && id.indexOf('menu:') === 0) return 'menu'
      if (id === 'internetMoney' || id === 'tipWallet') return 'pack:tipWallet'
      if (typeof id === 'string' && id.indexOf('pack:') === 0) {
        return id === 'pack:internetMoney' ? 'pack:tipWallet' : id
      }
      return id
    }

    function packMeta(id, q) {
      var packId = null
      if (id === 'internetMoney' || id === 'tipWallet') packId = 'tipWallet'
      else if (typeof id === 'string' && id.indexOf('pack:') === 0) {
        packId = id.slice(5)
        if (packId === 'internetMoney') packId = 'tipWallet'
      }
      if (!packId) return null
      var meta = (q.packQrs && q.packQrs[packId]) || null
      if (!meta && packId === 'tipWallet') {
        return {
          label: 'Tip Wallet',
          blurb: 'Android EIP-681 PulseChain wallet for QR tips',
          url: q.tipWalletUrl || 'https://github.com/ihelpmaybe/Tip-wallet/releases/tag/0.1.0',
          host: (q.tipWalletUrl || 'https://github.com/ihelpmaybe/Tip-wallet/releases/tag/0.1.0').replace(/^https?:\\/\\//, '').replace(/\\/$/, ''),
          logo: '',
          eyebrow: 'Get a wallet',
          qrSvg: q.tipWalletQrSvg || '',
        }
      }
      return meta
    }

    function qrCardHtml(opts) {
      var eye = String(opts.eye || '').trim()
      var title = String(opts.title || '').trim()
      var caption = String(opts.caption || '').trim()
      var meta = String(opts.meta || '').trim()
      var logo = opts.logo
        ? '<img class="kq-mark" src="' + esc(opts.logo) + '" alt="" width="28" height="28" />'
        : '<span class="kq-mark kq-mark-empty" aria-hidden="true"></span>'
      return (
        '<div class="kq">' +
          '<div class="label">' + esc(eye || 'QR') + '</div>' +
          '<div class="kq-head">' +
            logo +
            '<div class="kq-title">' + esc(title || 'Scan') + '</div>' +
          '</div>' +
          (opts.qrSvg ? '<div class="qr-wrap">' + opts.qrSvg + '</div>' : '') +
          '<div class="kq-caption">' + esc(caption) + '</div>' +
          '<div class="kq-meta">' + esc(meta) + '</div>' +
        '</div>'
      )
    }

    function builtinSlideHtml(id, q) {
      if (id === 'qr') {
        if (!q.qrSvg) {
          return '<div class="slide-info"><div class="empty">Set a receive wallet on Home to show the tip QR.</div></div>'
        }
        return qrCardHtml({
          eye: 'Creator wallet',
          title: (q.brand || 'Tip wallet').trim(),
          logo: '/brand/pulsechain-mark.svg',
          qrSvg: q.qrSvg,
          caption: q.tipAmountLabel
            ? q.tipAmountLabel + ' \xB7 pays your receive wallet'
            : 'Scan \u2192 your receive wallet \xB7 not a token contract',
          meta: q.showAddress && q.shortAddress ? q.shortAddress : '',
        })
      }
      if (id === 'brand') {
        var name = (q.brand || q.label || ${brandFallback}).trim()
        return (
          '<div class="slide-info">' +
            '<div class="label">' + esc(q.label || 'Live tips') + '</div>' +
            '<div class="brand-big">' + esc(name) + '</div>' +
            '<div class="kq-caption">Crypto tips on PulseChain</div>' +
          '</div>'
        )
      }
      if (id === 'eco') {
        return (
          '<div class="slide-info">' +
            '<div class="label">Ecosystem</div>' +
            (q.ecoHtml || '') +
            '<div class="kq-caption">PLS \xB7 PulseX \xB7 HEX \xB7 PLSX</div>' +
          '</div>'
        )
      }
      /* Tip menu patterns \u2014 id "menu" or "menu:0", "menu:1", \u2026 */
      var menuPage = null
      if (id === 'menu') menuPage = 0
      else if (typeof id === 'string' && id.indexOf('menu:') === 0) {
        var mp = Number(id.slice(5))
        if (Number.isFinite(mp) && mp >= 0) menuPage = Math.floor(mp)
      }
      if (menuPage !== null) {
        var pages = q.menuPages || []
        var offers = pages[menuPage]
        if (!offers || !offers.length) {
          var flat = q.menuOffers || []
          if (flat.length) {
            var ps = 1
            offers = flat.slice(menuPage * ps, menuPage * ps + ps)
          }
        }
        if (!offers || !offers.length) {
          return (
            '<div class="slide-info">' +
              '<div class="label">Tip menu</div>' +
              '<div class="empty">No patterns offered yet \u2014 enable items on Tip menu.</div>' +
            '</div>'
          )
        }
        if (offers.length === 1) {
          var one = offers[0]
          var viz = '<div class="menu-solo-viz">' + offerVizHtml(one, true) + '</div>'
          var qrInner = one.qrSvg || q.qrSvg || ''
          var amtLabel = String(one.amountLabel || one.amount || '').trim()
          var amtParts = amtLabel.split(/\\s+/)
          var symTok = amtParts.length > 1 ? amtParts.pop() : (q.menuSymbol || 'PLS')
          var priceNum = amtParts.join(' ') || String(one.amount)
          var dur = one.timeSec > 0 ? Math.round(one.timeSec) + 's' : ''
          var symLine = [symTok, dur].filter(Boolean).join(' \xB7 ')
          return (
            '<div class="menu-solo' + (one.featured ? ' is-featured' : '') + '">' +
              '<div class="menu-solo-price">' +
                '<div class="menu-solo-amt">' + esc(priceNum) + '</div>' +
                (symLine ? '<div class="menu-solo-sym">' + esc(symLine) + '</div>' : '') +
              '</div>' +
              (qrInner ? '<div class="qr-wrap">' + qrInner + '</div>' : '') +
              viz +
            '</div>'
          )
        }
        var pageN = (pages.length || 1)
        /* One shared toy for the page \u2192 header only; mixed toys keep per-row notes */
        var sharedToy = ''
        var allSameToy = true
        for (var ti = 0; ti < offers.length; ti++) {
          var tn = String(offers[ti].note || '').trim()
          if (!tn) { allSameToy = false; break }
          if (!sharedToy) sharedToy = tn
          else if (tn !== sharedToy) { allSameToy = false; break }
        }
        if (!allSameToy) sharedToy = ''
        var head =
          '<div class="label">Tip menu</div>' +
          (sharedToy ? '<div class="menu-toy">' + esc(sharedToy) + '</div>' : '') +
          (pageN > 1
            ? '<div class="menu-page">Page ' + (menuPage + 1) + ' / ' + pageN + '</div>'
            : sharedToy
              ? ''
              : '<div class="menu-sub">Scan each QR \xB7 send the amount shown to this wallet</div>')
        var rows = offers.map(function (row) {
          var feat = row.featured ? ' is-featured' : ''
          var note = (!sharedToy && row.note)
            ? '<span class="menu-note">' + esc(row.note) + '</span>'
            : ''
          var viz = '<div class="menu-viz">' + offerVizHtml(row, false) + '</div>'
          var mini = row.qrSvg
            ? '<div class="menu-qr">' + row.qrSvg + '</div>'
            : ''
          var pitch = String(row.sellPitch || '').trim() || row.name
          return (
            '<div class="menu-row' + feat + '">' +
              '<div class="menu-name">' + esc(pitch) + note + '</div>' +
              '<div class="menu-amt">' + esc(row.amountLabel || row.amount) + '</div>' +
              mini +
              viz +
            '</div>'
          )
        }).join('')
        return head + '<div class="menu-list">' + rows + '</div>'
      }
      /* PulseChain pack QR: pack:<itemId> or legacy internetMoney \u2192 tipWallet */
      var packId = null
      if (id === 'internetMoney' || id === 'tipWallet') packId = 'tipWallet'
      else if (typeof id === 'string' && id.indexOf('pack:') === 0) {
        packId = id.slice(5)
        if (packId === 'internetMoney') packId = 'tipWallet'
      }
      if (packId) {
        var meta = (q.packQrs && q.packQrs[packId]) || null
        var pkSvg = meta && meta.qrSvg
          ? meta.qrSvg
          : (packId === 'tipWallet' ? (q.tipWalletQrSvg || '') : '')
        var pkUrl = meta && meta.url
          ? meta.url
          : (q.tipWalletUrl || 'https://github.com/ihelpmaybe/Tip-wallet/releases/tag/0.1.0')
        var pkLabel = meta && meta.label ? meta.label : 'Tip Wallet'
        var pkBlurb = meta && meta.blurb ? meta.blurb : 'Android EIP-681 PulseChain wallet for QR tips'
        var pkEye = meta && meta.eyebrow ? meta.eyebrow : 'Get a wallet'
        var pkHost = meta && meta.host
          ? meta.host
          : pkUrl.replace(/^https?:\\/\\//, '').replace(/\\/$/, '')
        var pkLogo = meta && meta.logo ? meta.logo : ''
        if (!pkSvg) {
          return '<div class="slide-info"><div class="empty">QR unavailable.</div></div>'
        }
        return qrCardHtml({
          eye: pkEye,
          title: pkLabel,
          logo: pkLogo || '',
          qrSvg: pkSvg,
          caption: 'Website link \xB7 ' + pkBlurb,
          meta: pkHost,
        })
      }
      // how
      return (
        '<div class="slide-info">' +
          '<div class="label">How to tip</div>' +
          '<div class="how-body">Menu shows the treats. This QR is the buy button.</div>' +
          '<ul class="how-list">' +
            '<li>Read the tip menu on stream (time \xB7 feel \xB7 price)</li>' +
            '<li>When this carousel shows a treat, scan that QR</li>' +
            '<li>Send the exact amount on PulseChain \u2014 that row buzzes</li>' +
          '</ul>' +
        '</div>'
      )
    }

    function slideHtml(id, q) {
      var builtin = builtinSlideHtml(id, q)
      var key = slideCustomKey(id)
      var map = q.slideHtml || {}
      var tpl = map[key]
      if (!tpl || !String(tpl).trim()) return builtin
      return applySlideTemplate(String(tpl).trim(), builtin, q, packMeta(id, q))
    }

    function applyCustomCss(css) {
      var el = document.getElementById('user-qr-css')
      if (!el) {
        el = document.createElement('style')
        el.id = 'user-qr-css'
        document.head.appendChild(el)
      }
      el.textContent = String(css || '').slice(0, 24000)
    }

    function stopCarousel() {
      clearTimeout(timer)
      clearTimeout(leaveTimer)
    }

    function renderDots(ids, active) {
      if (!ids || ids.length < 2) {
        dots.innerHTML = ''
        return
      }
      dots.innerHTML = ids.map(function (_, i) {
        return '<span class="' + (i === active ? 'on' : '') + '"></span>'
      }).join('')
    }

    function showSlide(i, animate) {
      if (!state || !state.slideIds || !state.slideIds.length) return
      var ids = state.slideIds
      idx = ((i % ids.length) + ids.length) % ids.length
      var id = ids[idx]
      var next = document.createElement('div')
      next.className = 'slide active'
      next.dataset.id = id
      next.innerHTML = slideHtml(id, state)

      var prev = viewport.querySelector('.slide.active')
      if (prev && animate && ids.length > 1) {
        prev.classList.remove('active')
        prev.classList.add('leaving')
        leaveTimer = setTimeout(function () {
          if (prev.parentNode) prev.parentNode.removeChild(prev)
        }, 400)
        viewport.appendChild(next)
      } else {
        viewport.innerHTML = ''
        viewport.appendChild(next)
      }
      renderDots(ids, idx)
      publishMenuFocus(id, state)
    }

    function menuOfferForSlide(id, q) {
      var menuPage = null
      if (id === 'menu') menuPage = 0
      else if (typeof id === 'string' && id.indexOf('menu:') === 0) {
        var mp = Number(id.slice(5))
        if (Number.isFinite(mp) && mp >= 0) menuPage = Math.floor(mp)
      }
      if (menuPage === null) return null
      var pages = (q && q.menuPages) || []
      var offers = pages[menuPage]
      if (!offers || !offers.length) {
        var flat = (q && q.menuOffers) || []
        offers = flat.slice(menuPage, menuPage + 1)
      }
      return offers && offers[0] ? offers[0] : null
    }

    function publishMenuFocus(id, q) {
      var offer = menuOfferForSlide(id, q)
      var body = offer
        ? { name: offer.name, amountLabel: offer.amountLabel || String(offer.amount || '') }
        : {}
      fetch('/api/overlay/focus', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(function () {})
    }

    function scheduleNext() {
      stopCarousel()
      if (!state || state.carousel === false || !state.slideIds || state.slideIds.length < 2) return
      // Use operator dwellSec directly (min/max enforced in normalizeOverlayQr).
      var dwell = Math.min(20, Math.max(1, Number(state.dwellSec) || 7)) * 1000
      timer = setTimeout(function () {
        showSlide(idx + 1, true)
        scheduleNext()
      }, dwell)
    }

    var loadTimer = 0
    var loadInFlight = false
    var esLive = null
    var esGen = 0

    function applyLookTheme(theme) {
      var t = String(theme || '')
      lookTheme = (t === 'pink' || t === 'gold' || t === 'soft' || t === 'cyan') ? t : lookTheme
      if (!card) return
      card.classList.remove('look-cyan', 'look-pink', 'look-gold', 'look-soft')
      if (lookTheme) card.classList.add('look-' + lookTheme)
    }

    function paint(q) {
      if (!q || typeof q !== 'object') return
      /* Slim SSE notice is { rev } \u2014 fetch the full payload instead. */
      if (q.rev != null && !('slideIds' in q) && !('qrSvg' in q)) return
      stopCarousel()
      var ids = (q.slideIds && q.slideIds.length) ? q.slideIds : []
      if (q.enabled === false || !ids.length) {
        card.hidden = true
        card.setAttribute('hidden', '')
        viewport.innerHTML = ''
        dots.innerHTML = ''
        publishMenuFocus('', q)
        return
      }
      state = q
      applyCustomCss(q.customCss)
      stage.className = 'pos-' + (q.position || 'bottom-right')
      card.className = 'card theme-' + (q.theme || 'pulse') + ' size-' + (q.size || 'md')
      applyLookTheme(lookTheme)
      if (q.carousel !== false && q.slideIds && q.slideIds.length > 1) {
        card.classList.add('is-carousel')
      }
      card.hidden = false
      card.removeAttribute('hidden')
      idx = 0
      showSlide(0, false)
      scheduleNext()
    }

    function retryLoad() {
      clearTimeout(loadTimer)
      loadTimer = setTimeout(loadQr, 1200)
    }

    function loadQr() {
      if (loadInFlight) return
      loadInFlight = true
      fetch('/api/overlay/qr?t=' + Date.now(), { cache: 'no-store' }).then(function (r) {
        return r.json()
      }).then(function (j) {
        loadInFlight = false
        if (j && j.qr) paint(j.qr)
        else retryLoad()
      }).catch(function () {
        loadInFlight = false
        retryLoad()
      })
    }

    function connect() {
      if (esLive) {
        try { esLive.close() } catch (e) {}
        esLive = null
      }
      var gen = ++esGen
      var es = new EventSource('/api/overlay/stream')
      esLive = es
      es.addEventListener('open', function () { loadQr() })
      es.addEventListener('qr', function (ev) {
        try {
          var d = JSON.parse(ev.data)
          if (d && (d.slideIds || d.qrSvg)) paint(d)
          else loadQr()
        } catch (e) {
          loadQr()
        }
      })
      es.addEventListener('style', function (ev) {
        try {
          var s = JSON.parse(ev.data)
          if (s && typeof s === 'object') {
            applyLookTheme(s.theme)
          }
        } catch (e) {}
      })
      es.addEventListener('menuStyle', function (ev) {
        try {
          var ms = JSON.parse(ev.data)
          if (ms && ms.theme) applyLookTheme(ms.theme)
        } catch (e) {}
      })
      // Tip pop-ups live on /overlay only \u2014 do not render tip SSE on the carousel.
      es.onerror = function () {
        if (gen !== esGen) return
        try { es.close() } catch (e) {}
        if (esLive === es) esLive = null
        setTimeout(function () {
          if (gen === esGen) connect()
        }, 1500)
      }
    }

    loadQr()
    fetch('/api/overlay/style', { cache: 'no-store' }).then(function (r) { return r.json() }).then(function (j) {
      if (j && j.style) applyLookTheme(j.style.theme)
    }).catch(function () {})
    fetch('/api/overlay/menu-style', { cache: 'no-store' }).then(function (r) { return r.json() }).then(function (j) {
      if (j && j.style && j.style.theme) applyLookTheme(j.style.theme)
    }).catch(function () {})
    if (location.search.indexOf('preview=1') >= 0) {
      document.documentElement.classList.add('preview')
    }
    function afterLoad(fn) {
      if (document.readyState === 'complete') setTimeout(fn, 0)
      else window.addEventListener('load', fn)
    }
    afterLoad(connect)
  </script>
</body>
</html>`;
}

// src/overlay/menuRender.ts
var OVERLAY_MENU_CSS = `
.menu-stage {
  position: fixed;
  inset: 0;
  pointer-events: none;
  display: flex;
  padding: 4.5vh 3.2vw;
  font-family: "Segoe UI", system-ui, sans-serif;
  color: #f4f8fc;
  --menu-accent: #7ad7ff;
  --menu-line: rgba(122, 215, 255, 0.32);
  --menu-feat: #ffe08a;
}
.menu-stage.pos-bottom { align-items: flex-end; justify-content: center; }
.menu-stage.pos-top { align-items: flex-start; justify-content: center; }
.menu-stage.pos-bottom-left { align-items: flex-end; justify-content: flex-start; }
.menu-stage.pos-bottom-right { align-items: flex-end; justify-content: flex-end; }
.menu-stage.pos-top-left { align-items: flex-start; justify-content: flex-start; }
.menu-stage.pos-top-right { align-items: flex-start; justify-content: flex-end; }

.menu-stage.theme-cyan { --menu-accent: #7ad7ff; --menu-line: rgba(122, 215, 255, 0.32); --menu-feat: #ffe08a; }
.menu-stage.theme-pink { --menu-accent: #ff9ad4; --menu-line: rgba(255, 154, 212, 0.34); --menu-feat: #ffd0ea; }
.menu-stage.theme-gold { --menu-accent: #f0c36a; --menu-line: rgba(240, 195, 106, 0.36); --menu-feat: #ffe9b0; }
.menu-stage.theme-soft { --menu-accent: #c8d4e4; --menu-line: rgba(200, 212, 228, 0.28); --menu-feat: #ffffff; }

.menu-panel {
  pointer-events: none;
  min-width: 11.5rem;
  max-width: min(28rem, 92vw);
  padding: 0.55rem 0.7rem 0.6rem;
  border-radius: 12px;
  border: 1px solid var(--menu-line);
  background: rgba(6, 14, 24, var(--menu-panel-a, 0.78));
  color: #f4f8fc;
}
.menu-stage.size-compact .menu-panel { max-width: 16.5rem; padding: 0.42rem 0.55rem 0.48rem; }
.menu-stage.size-large .menu-panel { max-width: min(36rem, 94vw); padding: 0.7rem 0.85rem 0.75rem; }
.menu-stage.layout-cols .menu-panel,
.menu-stage.layout-cards .menu-panel,
.menu-stage.layout-grouped .menu-panel { max-width: min(34rem, 94vw); }
.menu-stage.layout-waves .menu-panel { min-width: 13.2rem; max-width: 18.8rem; }

.menu-cols-head {
  display: grid;
  grid-template-columns: minmax(4.4rem, 1fr) 2.5rem 3.7rem;
  column-gap: 0.4rem;
  margin: 0 0 0.18rem;
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(220, 230, 240, 0.42);
}

.menu-head { margin: 0 0 0.4rem; }
.menu-brand {
  margin: 0 0 0.08rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--menu-accent);
  opacity: 0.92;
}
.menu-title {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 750;
  letter-spacing: 0.02em;
  color: #f7fbff;
}
.menu-stage.size-compact .menu-title { font-size: 0.8rem; }
.menu-stage.size-large .menu-title { font-size: 1.08rem; }

.menu-empty {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.35;
  color: rgba(230, 240, 250, 0.78);
  max-width: 16rem;
}

.menu-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
}
.menu-stage.layout-cols .menu-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 1.1rem;
  row-gap: 0.12rem;
}

.menu-row,
.menu-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: baseline;
  column-gap: 0.75rem;
  row-gap: 0.05rem;
  padding: 0.12rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.menu-row:last-child,
.menu-card:last-child { border-bottom: none; }
.menu-stage.layout-waves .menu-row {
  grid-template-columns: minmax(4.4rem, 1fr) 2.5rem 3.7rem;
  align-items: center;
  column-gap: 0.4rem;
}
.menu-hold {
  font-size: 0.82rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: center;
  color: #e8eef6;
}
.menu-wave {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  color: #f4f8fc;
}
.menu-wave-svg {
  display: block;
  width: 3.4rem;
  height: 1.05rem;
}
.menu-stage.layout-waves .menu-amt {
  justify-self: start;
  font-size: 0.82rem;
}
.menu-row.feat .menu-hold,
.menu-row.feat .menu-wave { color: var(--menu-feat); }
.menu-name {
  min-width: 0;
  font-size: 0.92rem;
  font-weight: 650;
  color: #f4f8fc;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.menu-amt {
  font-size: 0.88rem;
  font-weight: 750;
  font-variant-numeric: tabular-nums;
  color: var(--menu-accent);
  white-space: nowrap;
}
.menu-row.feat .menu-name,
.menu-card.feat .menu-name { color: var(--menu-feat); }
.menu-badge {
  display: inline-block;
  margin-right: 0.35rem;
  padding: 0.05rem 0.28rem;
  border-radius: 4px;
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  vertical-align: 0.08em;
  color: #1a1408;
  background: var(--menu-feat);
}
.menu-cta {
  display: none;
  margin-left: 0.35rem;
  padding: 0.04rem 0.28rem;
  border-radius: 4px;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #041018;
  background: var(--menu-accent);
}
.menu-row.is-focus,
.menu-card.is-focus {
  border-color: var(--menu-accent);
  background: rgba(122, 215, 255, 0.12);
}
.menu-row.is-focus .menu-cta,
.menu-card.is-focus .menu-cta { display: inline; }
.menu-meta {
  grid-column: 1 / -1;
  margin: 0;
  font-size: 0.68rem;
  line-height: 1.25;
  color: rgba(220, 230, 240, 0.72);
}
.menu-note { font-weight: 650; }
.menu-tag { font-weight: 500; opacity: 0.85; }

.menu-stage.size-compact .menu-name { font-size: 0.8rem; }
.menu-stage.size-compact .menu-amt { font-size: 0.76rem; }
.menu-stage.size-compact .menu-hold { font-size: 0.72rem; }
.menu-stage.size-compact .menu-wave-svg { width: 2.8rem; height: 0.9rem; }
.menu-stage.size-large .menu-name { font-size: 1.08rem; }
.menu-stage.size-large .menu-amt { font-size: 1rem; }
.menu-stage.size-large .menu-hold { font-size: 0.95rem; }
.menu-stage.size-large .menu-wave-svg { width: 4rem; height: 1.2rem; }

.menu-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.4rem;
}
.menu-stage.size-large.layout-cards .menu-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.menu-card {
  margin: 0;
  padding: 0.4rem 0.48rem 0.42rem;
  border: 1px solid var(--menu-line);
  border-radius: 8px;
  background: rgba(4, 10, 18, 0.35);
}

.menu-group { margin: 0 0 0.55rem; }
.menu-group:last-child { margin-bottom: 0; }
.menu-group-title {
  margin: 0 0 0.22rem;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--menu-accent);
}
`;

// src/overlay/menuPageHtml.ts
function overlayMenuPageHtml() {
  const seed = JSON.stringify(defaultOverlayMenuStyle);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>${APP_NAME} \xB7 Tip menu overlay</title>
  <style>
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: transparent !important;
      font-family: "Segoe UI", system-ui, sans-serif;
    }
    html.preview, html.preview body {
      background: #0a0e14 !important;
    }
    html.preview body::before {
      content: "Tip menu preview (dark) \xB7 paste the URL without ?preview into OBS for transparency";
      position: fixed;
      top: 10px;
      left: 12px;
      right: 12px;
      z-index: 2;
      font-size: 11px;
      letter-spacing: 0.02em;
      color: rgba(180, 200, 220, 0.45);
      font-family: ui-monospace, monospace;
      pointer-events: none;
    }
    * { box-sizing: border-box; }
    ${OVERLAY_MENU_CSS}
  </style>
</head>
<body>
  <div id="menu-stage" class="menu-stage layout-waves pos-top-left size-normal theme-cyan">
    <div class="menu-panel" id="menu-panel" style="--menu-panel-a:0.78"></div>
  </div>
  <script>
    (function () {
      if (/[?&]preview=1(?:&|$)/.test(location.search)) {
        document.documentElement.classList.add('preview')
      }
      var style = ${seed}
      var ladder = []
      var stage = document.getElementById('menu-stage')
      var panel = document.getElementById('menu-panel')

      var focusKey = ''
      function esc(s) {
        return String(s || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
      }
      function coinOf(row) {
        var parts = String(row.amountLabel || '').trim().split(/\\s+/)
        return parts.length > 1 ? parts[parts.length - 1] : ''
      }
      function focusId(row) {
        return String(row.name || '').toLowerCase() + '|' + String(row.amountLabel || '').toLowerCase()
      }
      function metaHtml(row) {
        var bits = []
        if (style.showNote && row.note) bits.push('<span class="menu-note">' + esc(row.note) + '</span>')
        if (style.showBlurb && row.name) bits.push('<span class="menu-tag">' + esc(row.name) + '</span>')
        return bits.length ? '<p class="menu-meta">' + bits.join(' \xB7 ') + '</p>' : ''
      }
      function holdOf(row) {
        var t = Math.round(Number(row.timeSec) || 0)
        if (t > 0) return t + 's'
        var m = String(row.sellPitch || '').match(/^(\\d+)\\s*s\\b/i)
        return m ? m[1] + 's' : '\u2014'
      }
      function waveSvg(steps) {
        var raw = Array.isArray(steps) ? steps.slice(0, 16) : []
        var seq = []
        for (var i = 0; i < raw.length; i++) {
          var v = Math.round(Number(raw[i]) || 0)
          seq.push(v < 0 ? 0 : v > 8 ? 8 : v)
        }
        if (!seq.length) seq = [1.5, 5.5, 2, 6.5, 1.5]
        var w = 54, h = 18, padX = 2, padY = 2.4
        var n = seq.length
        var spanX = w - padX * 2
        var spanY = h - padY * 2
        var pts = []
        for (var j = 0; j < n; j++) {
          var x = n === 1 ? padX + spanX / 2 : padX + (j / Math.max(1, n - 1)) * spanX
          var y = h - padY - (seq[j] / 8) * spanY
          pts.push(x.toFixed(1) + ' ' + y.toFixed(1))
        }
        if (n === 1) {
          var mx = padX + spanX / 2
          pts.unshift((mx - 4).toFixed(1) + ' ' + (h - padY).toFixed(1))
          pts.push((mx + 4).toFixed(1) + ' ' + (h - padY).toFixed(1))
        }
        var d = ''
        for (var k = 0; k < pts.length; k++) d += (k === 0 ? 'M' : 'L') + pts[k]
        return '<svg class="menu-wave-svg" viewBox="0 0 ' + w + ' ' + h +
          '" width="' + w + '" height="' + h + '" fill="none" aria-hidden="true">' +
          '<path d="' + d + '" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      }
      function waveRow(row) {
        var feat = row.featured ? ' feat' : ''
        var hot = focusKey && focusId(row) === focusKey ? ' is-focus' : ''
        return '<li class="menu-row' + feat + hot + '" data-focus="' + esc(focusId(row)) +
          '"><span class="menu-amt">' + esc(row.amountLabel) +
          '<span class="menu-cta">Scan</span></span><span class="menu-hold">' +
          esc(holdOf(row)) + '</span><span class="menu-wave">' + waveSvg(row.strengths) +
          '</span>' + metaHtml(row) + '</li>'
      }
      function colsHead() {
        return '<div class="menu-cols-head" aria-hidden="true"><span>Price</span><span>Time</span><span>Feel</span></div>'
      }
      function headHtml() {
        var brand = String(style.brand || '').trim()
        var headline = String(style.headline || '').trim()
        if (!brand && !headline) return ''
        return '<header class="menu-head">' +
          (brand ? '<p class="menu-brand">' + esc(brand) + '</p>' : '') +
          (headline ? '<h1 class="menu-title">' + esc(headline) + '</h1>' : '') +
          '</header>'
      }
      function slim(raw) {
        if (!Array.isArray(raw)) return []
        var limit = Math.min(32, Math.max(1, Math.round(Number(style.maxRows) || 16)))
        var out = []
        var seen = {}
        for (var i = 0; i < raw.length; i++) {
          var o = raw[i]
          if (!o || typeof o !== 'object') continue
          var name = String(o.name || '').trim().slice(0, 48)
          var amountLabel = String(o.amountLabel || o.amount || '').trim().slice(0, 24)
          if (!name || !amountLabel) continue
          var note = String(o.note || '').trim().slice(0, 40)
          var id = String(o.id || '').trim().slice(0, 96)
          var key = id || name.toLowerCase() + '|' + amountLabel.toLowerCase() + '|' + note.toLowerCase()
          if (seen[key]) continue
          seen[key] = 1
          var row = { name: name, amountLabel: amountLabel, featured: o.featured || undefined }
          if (id) row.id = id
          if (note) row.note = note
          var blurb = String(o.blurb || '').trim().slice(0, 80)
          if (blurb) row.blurb = blurb
          var sellPitch = String(o.sellPitch || '').trim().slice(0, 56)
          if (sellPitch) row.sellPitch = sellPitch
          var timeSec = Math.round(Number(o.timeSec))
          if (isFinite(timeSec) && timeSec > 0) row.timeSec = timeSec
          var amountN = Number(o.amount)
          if (isFinite(amountN)) row.amount = amountN
          if (Array.isArray(o.strengths) && o.strengths.length) {
            var steps = []
            for (var si = 0; si < o.strengths.length && si < 16; si++) {
              var sv = Math.round(Number(o.strengths[si]) || 0)
              steps.push(sv < 0 ? 0 : sv > 8 ? 8 : sv)
            }
            if (steps.length) row.strengths = steps
          }
          out.push(row)
          if (out.length >= limit) break
        }
        var want = style.visibleOfferIds
        if (Array.isArray(want)) {
          var set = {}
          for (var w = 0; w < want.length; w++) set[String(want[w])] = 1
          var filtered = []
          for (var f = 0; f < out.length; f++) {
            if (out[f].id && set[out[f].id]) filtered.push(out[f])
          }
          out = filtered
        }
        out.sort(function (a, b) {
          return String(a.note || '').localeCompare(String(b.note || '')) ||
            (Number(a.amount) || 0) - (Number(b.amount) || 0) ||
            String(a.name).localeCompare(String(b.name))
        })
        return out
      }
      function groupRows(rows) {
        var map = {}
        var order = []
        for (var j = 0; j < rows.length; j++) {
          var key = rows[j].note || coinOf(rows[j]) || 'Tips'
          if (!map[key]) { map[key] = []; order.push(key) }
          map[key].push(rows[j])
        }
        return order.map(function (title) { return { title: title, rows: map[title] } })
      }
      function paint() {
        stage.className = 'menu-stage layout-waves pos-' + (style.position || 'top-left') +
          ' size-' + (style.size || 'normal') +
          ' theme-' + (style.theme || 'cyan')
        var a = Number(style.opacity)
        if (!isFinite(a)) a = 0.78
        panel.style.setProperty('--menu-panel-a', String(a))
        var rows = slim(ladder)
        if (!rows.length) {
          panel.innerHTML = headHtml() +
            '<p class="menu-empty">Tick treats on Stream Alerts to show them here</p>'
          return
        }
        var html = headHtml() + colsHead()
        html += groupRows(rows).map(function (g) {
          return '<section class="menu-group">' +
            (g.title ? '<h2 class="menu-group-title">' + esc(g.title) + '</h2>' : '') +
            '<ol class="menu-list">' + g.rows.map(waveRow).join('') + '</ol></section>'
        }).join('')
        panel.innerHTML = html
      }
      function applyStyle(next) {
        if (!next || typeof next !== 'object') return
        style = Object.assign({}, style, next)
        paint()
      }
      function applyLadder(next) {
        ladder = Array.isArray(next) ? next : []
        paint()
      }
      function applyFocus(next) {
        var name = next && next.name ? String(next.name) : ''
        var amountLabel = next && next.amountLabel ? String(next.amountLabel) : ''
        focusKey = name && amountLabel
          ? name.toLowerCase() + '|' + amountLabel.toLowerCase()
          : ''
        paint()
      }
      paint()
      var es = new EventSource('/api/overlay/stream?role=menu')
      es.addEventListener('menuStyle', function (ev) {
        try { applyStyle(JSON.parse(ev.data)) } catch (e) {}
      })
      es.addEventListener('ladder', function (ev) {
        try {
          var j = JSON.parse(ev.data)
          applyLadder(j && j.ladder ? j.ladder : j)
        } catch (e) {}
      })
      es.addEventListener('focus', function (ev) {
        try { applyFocus(JSON.parse(ev.data)) } catch (e) {}
      })
      fetch('/api/overlay/menu-style', { cache: 'no-store' }).then(function (r) { return r.json() }).then(function (j) {
        if (j && j.style) applyStyle(j.style)
      }).catch(function () {})
      fetch('/api/overlay/status', { cache: 'no-store' }).then(function (r) { return r.json() }).then(function (j) {
        if (j && Array.isArray(j.ladder)) applyLadder(j.ladder)
        if (j && j.focus) applyFocus(j.focus)
      }).catch(function () {})
    })()
  </script>
</body>
</html>`;
}

// server/overlay-hub.ts
var clients = /* @__PURE__ */ new Set();
var last = null;
var style = { ...defaultOverlayStyle };
var qr = { ...defaultOverlayQr };
var qrPayload = null;
var qrBuildSeq = 0;
var stagePulse = 0;
var stageLadder = [];
var menuStyle = { ...defaultOverlayMenuStyle };
var overlayFocus = {};
function overlayClientCount() {
  return clients.size;
}
function lastOverlayTip() {
  return last;
}
function getOverlayStyle() {
  return { ...style };
}
function getOverlayHubStatus() {
  return {
    clients: overlayClientCount(),
    last: lastOverlayTip(),
    style: getOverlayStyle(),
    qr: {
      rev: qrBuildSeq,
      address: qr.address,
      enabled: qrPayload ? qrPayload.enabled : overlayQrEnabled(qr.carousel, qr.slides),
      slideCount: qrPayload?.slideIds?.length ?? 0,
      menuCount: qr.menuOffers.length
    },
    url: "/overlay",
    qrUrl: "/overlay/qr",
    menuUrl: "/overlay/menu",
    pulse: stagePulse,
    ladder: stageLadder,
    menuStyle: { ...menuStyle },
    focus: { ...overlayFocus }
  };
}
function overlayTipFromBody(body) {
  const usdN = Number(body.usd);
  const event = {
    id: String(body.id || `tip-${Date.now()}`),
    amount: Number(body.amount) || 0,
    symbol: String(body.symbol || "PLS"),
    title: String(
      body.title || `${Number(body.amount) || 0} ${body.symbol || "PLS"}`
    ),
    subtitle: body.subtitle ? String(body.subtitle) : void 0,
    source: body.source === "pool" || body.source === "test" ? body.source : "wallet",
    eventKind: body.eventKind ? String(body.eventKind).slice(0, 32) : void 0,
    dryRun: Boolean(body.dryRun),
    at: Number(body.at) || Date.now()
  };
  if (Number.isFinite(usdN) && usdN >= 0) event.usd = usdN;
  if (body.force) event.force = true;
  return event;
}
function setOverlayPulse(level) {
  const n = Number(level);
  const pulse = Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0));
  const wasOff = stagePulse < 0.02;
  const nowOff = pulse < 0.02;
  if (Math.abs(pulse - stagePulse) < 0.015 && wasOff === nowOff) {
    return stagePulse;
  }
  stagePulse = pulse;
  broadcast("pulse", { pulse: stagePulse });
  return stagePulse;
}
function setOverlayLadder(raw) {
  const next = slimOverlayLadder(raw);
  if (JSON.stringify(next) === JSON.stringify(stageLadder)) return stageLadder;
  stageLadder = next;
  broadcast("ladder", { ladder: stageLadder });
  return stageLadder;
}
function ingestOverlayPulseBody(raw) {
  const obj = raw && typeof raw === "object" ? raw : {};
  return setOverlayPulse(obj.pulse ?? obj.level ?? raw);
}
function ingestOverlayLadderBody(raw) {
  const obj = raw && typeof raw === "object" ? raw : {};
  const list = Array.isArray(obj.ladder) ? obj.ladder : raw;
  return setOverlayLadder(list);
}
function qrNotice() {
  return { rev: qrBuildSeq };
}
function writeSse(res, payload) {
  res.write(payload);
}
function broadcast(event, data) {
  const line = `event: ${event}
data: ${JSON.stringify(data)}

`;
  for (const c of [...clients]) {
    try {
      writeSse(c.res, line);
    } catch {
      clearInterval(c.heartbeat);
      clients.delete(c);
    }
  }
}
async function refreshQrPayload() {
  const seq = ++qrBuildSeq;
  const payload = await buildOverlayQrPayload(qr);
  if (seq !== qrBuildSeq) {
    return qrPayload || payload;
  }
  qrPayload = payload;
  broadcast("qr", qrNotice());
  return payload;
}
function getOverlayMenuStyle() {
  return { ...menuStyle };
}
function setOverlayMenuStyle(raw) {
  menuStyle = normalizeOverlayMenuStyle(raw);
  broadcast("menuStyle", menuStyle);
  return menuStyle;
}
function setOverlayFocus(raw) {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const name = String(o.name || "").trim().slice(0, 48);
  const amountLabel = String(o.amountLabel || o.amount || "").trim().slice(0, 24);
  overlayFocus = name && amountLabel ? { name, amountLabel } : {};
  broadcast("focus", overlayFocus);
  return overlayFocus;
}
function setOverlayStyle(raw) {
  style = normalizeOverlayStyle(raw);
  broadcast("style", style);
  return style;
}
async function setOverlayQr(raw) {
  qr = applyOverlayQrUpdate(qr, raw);
  return refreshQrPayload();
}
async function ensureOverlayQrPayload() {
  if (qrPayload && !overlayQrPayloadLooksUnsafe(qrPayload.menuOffers, qr.address)) {
    return qrPayload;
  }
  const seq = ++qrBuildSeq;
  const payload = await buildOverlayQrPayload(qr);
  if (seq !== qrBuildSeq) {
    return qrPayload || payload;
  }
  qrPayload = payload;
  return payload;
}
function publishOverlayTip(tip) {
  const event = {
    ...tip,
    id: String(tip.id || `tip-${Date.now()}`),
    title: String(tip.title || `${tip.amount} ${tip.symbol}`),
    at: Number(tip.at) || Date.now()
  };
  if (!event.force) {
    if (event.dryRun && event.source !== "test" && !style.showDryRun) {
      return null;
    }
    if (event.source === "pool" && !style.showPoolAlerts) return null;
    const minimum = event.source === "pool" ? style.poolMinAmount : style.walletMinAmount;
    if (event.source !== "test" && minimum > 0 && Number(event.amount) < minimum) {
      return null;
    }
  }
  last = event;
  broadcast("tip", event);
  return event;
}
function attachOverlaySse(res) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof res.flushHeaders === "function") {
    ;
    res.flushHeaders();
  }
  writeSse(res, ": connected\n\n");
  writeSse(res, `event: style
data: ${JSON.stringify(style)}

`);
  writeSse(res, `event: qr
data: ${JSON.stringify(qrNotice())}

`);
  writeSse(res, `event: pulse
data: ${JSON.stringify({ pulse: stagePulse })}

`);
  writeSse(
    res,
    `event: ladder
data: ${JSON.stringify({ ladder: stageLadder })}

`
  );
  writeSse(
    res,
    `event: menuStyle
data: ${JSON.stringify(menuStyle)}

`
  );
  writeSse(
    res,
    `event: focus
data: ${JSON.stringify(overlayFocus)}

`
  );
  void ensureOverlayQrPayload().then(() => {
    try {
      writeSse(res, `event: qr
data: ${JSON.stringify(qrNotice())}

`);
    } catch {
    }
  });
  if (last) {
    writeSse(res, `event: tip
data: ${JSON.stringify(last)}

`);
  }
  const heartbeat = setInterval(() => {
    try {
      writeSse(res, ": ping\n\n");
    } catch {
      clearInterval(heartbeat);
      for (const c of clients) {
        if (c.res === res) clients.delete(c);
      }
    }
  }, 12e3);
  const client = { res, heartbeat };
  clients.add(client);
  res.on("close", () => {
    clearInterval(heartbeat);
    clients.delete(client);
  });
}

// server/host.ts
var APP = APP_NAME;
var VERSION = APP_VERSION;
var __dirname = path.dirname(fileURLToPath3(import.meta.url));
var root = path.resolve(__dirname, "..");
var HOST = "127.0.0.1";
var PORT = 5193;
var APP_URL = `http://${HOST}:${PORT}/`;
var startedAt = Date.now();
var MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".map": "application/json"
};
async function serveStatic(distDir, urlPath, res) {
  let rel = decodeURIComponent(urlPath.split("?")[0] || "/");
  if (rel === "/") rel = "/index.html";
  if (rel.includes("..")) {
    sendJson(res, 400, { error: "bad path" });
    return;
  }
  const file = path.join(distDir, rel.replace(/^\//, ""));
  try {
    const st = await fsp.stat(file);
    if (st.isDirectory()) {
      await serveStatic(distDir, path.posix.join(rel, "index.html"), res);
      return;
    }
    const ext = path.extname(file).toLowerCase();
    res.statusCode = 200;
    res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.end(await fsp.readFile(file));
  } catch {
    if (!path.extname(rel)) {
      try {
        const index = path.join(distDir, "index.html");
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(await fsp.readFile(index));
        return;
      } catch {
      }
    }
    sendJson(res, 404, {
      error: "Not found \u2014 run npm run build so dist/ exists"
    });
  }
}
async function startHost(opts = {}) {
  const distDir = opts.distDir || path.join(root, "dist");
  const exitOnListenError = opts.exitOnListenError !== false;
  const url = APP_URL;
  if (!fs.existsSync(path.join(distDir, "index.html"))) {
    const msg = `[${APP}] dist/ missing. Run: npm run build   or   npm start`;
    if (exitOnListenError) {
      console.error(msg);
      process.exit(1);
    }
    throw new Error(msg);
  }
  const server = http2.createServer(async (req, res) => {
    const url2 = req.url || "/";
    const pathOnly = url2.split("?")[0] || "/";
    const method = req.method || "GET";
    if (pathOnly === "/tip-menu" || pathOnly === "/tip-menu.html") {
      if (method === "GET" || method === "HEAD") {
        const html = getTipMenuHtml() || emptyTipMenuPage();
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        if (method === "HEAD") {
          res.end();
          return;
        }
        res.end(html);
        return;
      }
    }
    if (pathOnly === "/overlay" || pathOnly === "/overlay.html") {
      if (method === "GET" || method === "HEAD") {
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        if (method === "HEAD") {
          res.end();
          return;
        }
        res.end(overlayPageHtml());
        return;
      }
    }
    if (pathOnly === "/overlay/qr" || pathOnly === "/overlay/qr.html") {
      if (method === "GET" || method === "HEAD") {
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        if (method === "HEAD") {
          res.end();
          return;
        }
        res.end(overlayQrPageHtml());
        return;
      }
    }
    if (pathOnly === "/overlay/menu" || pathOnly === "/overlay/menu.html") {
      if (method === "GET" || method === "HEAD") {
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        if (method === "HEAD") {
          res.end();
          return;
        }
        res.end(overlayMenuPageHtml());
        return;
      }
    }
    if (pathOnly.startsWith("/api/status") && method === "GET") {
      sendJson(res, 200, {
        ok: true,
        app: APP,
        version: VERSION,
        mode: "standalone",
        host: HOST,
        port: PORT,
        startedAt,
        distReady: fs.existsSync(path.join(distDir, "index.html")),
        lovenseBridge: true,
        tipMenu: tipMenuMeta(),
        overlay: {
          clients: overlayClientCount(),
          last: lastOverlayTip()
        }
      });
      return;
    }
    if (pathOnly === "/api/overlay/stream" && method === "GET") {
      attachOverlaySse(res);
      return;
    }
    if (pathOnly === "/api/overlay/tip") {
      if (method === "OPTIONS") {
        res.statusCode = 204;
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "content-type");
        res.end();
        return;
      }
      if (method === "POST") {
        try {
          const raw = await readBody(req);
          const body = raw ? JSON.parse(raw) : {};
          const event = publishOverlayTip(overlayTipFromBody(body));
          sendJson(res, 200, {
            ok: true,
            clients: overlayClientCount(),
            event,
            filtered: !event
          });
        } catch (e) {
          sendJson(res, 500, {
            error: e instanceof Error ? e.message : String(e)
          });
        }
        return;
      }
      sendJson(res, 405, { error: "POST only" });
      return;
    }
    if (pathOnly === "/api/overlay/pulse") {
      if (method === "OPTIONS") {
        res.statusCode = 204;
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "content-type");
        res.end();
        return;
      }
      if (method === "POST") {
        try {
          const raw = await readBody(req);
          const body = raw ? JSON.parse(raw) : {};
          const pulse = ingestOverlayPulseBody(body);
          sendJson(res, 200, { ok: true, pulse });
        } catch (e) {
          sendJson(res, 500, {
            error: e instanceof Error ? e.message : String(e)
          });
        }
        return;
      }
      sendJson(res, 405, { error: "POST only" });
      return;
    }
    if (pathOnly === "/api/overlay/ladder") {
      if (method === "OPTIONS") {
        res.statusCode = 204;
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "content-type");
        res.end();
        return;
      }
      if (method === "POST") {
        try {
          const raw = await readBody(req);
          const body = raw ? JSON.parse(raw) : {};
          const ladder = ingestOverlayLadderBody(body);
          sendJson(res, 200, { ok: true, ladder });
        } catch (e) {
          sendJson(res, 500, {
            error: e instanceof Error ? e.message : String(e)
          });
        }
        return;
      }
      sendJson(res, 405, { error: "POST only" });
      return;
    }
    if (pathOnly === "/api/overlay/style") {
      if (method === "OPTIONS") {
        res.statusCode = 204;
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, PUT, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "content-type");
        res.end();
        return;
      }
      if (method === "GET") {
        sendJson(res, 200, { ok: true, style: getOverlayStyle() });
        return;
      }
      if (method === "PUT" || method === "POST") {
        try {
          const raw = await readBody(req);
          const body = raw ? JSON.parse(raw) : {};
          const next = setOverlayStyle(
            body.style ?? body
          );
          sendJson(res, 200, { ok: true, style: next });
        } catch (e) {
          sendJson(res, 500, {
            error: e instanceof Error ? e.message : String(e)
          });
        }
        return;
      }
      sendJson(res, 405, { error: "GET/PUT/POST only" });
      return;
    }
    if (pathOnly === "/api/overlay/menu-style") {
      if (method === "OPTIONS") {
        res.statusCode = 204;
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, PUT, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "content-type");
        res.end();
        return;
      }
      if (method === "GET") {
        sendJson(res, 200, { ok: true, style: getOverlayMenuStyle() });
        return;
      }
      if (method === "PUT" || method === "POST") {
        try {
          const raw = await readBody(req);
          const body = raw ? JSON.parse(raw) : {};
          const next = setOverlayMenuStyle(
            body.style ?? body
          );
          sendJson(res, 200, { ok: true, style: next });
        } catch (e) {
          sendJson(res, 500, {
            error: e instanceof Error ? e.message : String(e)
          });
        }
        return;
      }
      sendJson(res, 405, { error: "GET/PUT/POST only" });
      return;
    }
    if (pathOnly === "/api/overlay/focus") {
      if (method === "OPTIONS") {
        res.statusCode = 204;
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "content-type");
        res.end();
        return;
      }
      if (method === "POST") {
        try {
          const raw = await readBody(req);
          const body = raw ? JSON.parse(raw) : {};
          const focus = setOverlayFocus(body);
          sendJson(res, 200, { ok: true, focus });
        } catch (e) {
          sendJson(res, 500, {
            error: e instanceof Error ? e.message : String(e)
          });
        }
        return;
      }
      sendJson(res, 405, { error: "POST only" });
      return;
    }
    if (pathOnly === "/api/overlay/qr") {
      if (method === "OPTIONS") {
        res.statusCode = 204;
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, PUT, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "content-type");
        res.end();
        return;
      }
      if (method === "GET") {
        const payload = await ensureOverlayQrPayload();
        sendJson(res, 200, { ok: true, qr: payload });
        return;
      }
      if (method === "PUT" || method === "POST") {
        try {
          const raw = await readBody(req);
          const body = raw ? JSON.parse(raw) : {};
          const next = await setOverlayQr(
            body.qr ?? body
          );
          sendJson(res, 200, { ok: true, qr: next });
        } catch (e) {
          sendJson(res, 500, {
            error: e instanceof Error ? e.message : String(e)
          });
        }
        return;
      }
      sendJson(res, 405, { error: "GET/PUT/POST only" });
      return;
    }
    if (pathOnly === "/api/overlay/status" && method === "GET") {
      sendJson(res, 200, { ok: true, ...getOverlayHubStatus() });
      return;
    }
    if ((pathOnly === "/api/open-chrome" || pathOnly === "/api/open-external-browser") && method === "POST") {
      let url3 = `http://${HOST}:${PORT}/`;
      try {
        const raw = await readBody(req);
        if (raw) {
          const body = JSON.parse(raw);
          url3 = sanitizeLocalAppUrl(body.url, url3);
        }
      } catch {
      }
      const result = openExternalBrowser(url3);
      sendJson(res, result.ok ? 200 : 500, { ...result, url: url3 });
      return;
    }
    if (pathOnly.startsWith("/api/tip-menu")) {
      if (method === "OPTIONS") {
        res.statusCode = 204;
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, PUT, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "content-type");
        res.end();
        return;
      }
      if (method === "GET") {
        const html = getTipMenuHtml();
        if (!html) {
          sendJson(res, 404, { error: "No tip menu published yet" });
          return;
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.end(html);
        return;
      }
      if (method === "PUT" || method === "POST") {
        try {
          const raw = await readBody(req);
          let html = raw;
          const ct = String(req.headers["content-type"] || "");
          if (ct.includes("application/json")) {
            const body = raw ? JSON.parse(raw) : {};
            html = String(body.html || "");
          }
          const result = setTipMenuHtml(html);
          if (!result.ok) {
            sendJson(res, 400, { error: result.error });
            return;
          }
          sendJson(res, 200, { ok: true, url: "/tip-menu", ...tipMenuMeta() });
        } catch (e) {
          sendJson(res, 500, {
            error: e instanceof Error ? e.message : String(e)
          });
        }
        return;
      }
      sendJson(res, 405, { error: "GET/PUT/POST only" });
      return;
    }
    if (pathOnly === "/api/debug-log") {
      if (method === "OPTIONS") {
        res.statusCode = 204;
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "content-type");
        res.end();
        return;
      }
      if (method !== "POST") {
        sendJson(res, 405, { error: "POST only" });
        return;
      }
      try {
        const raw = await readBody(req);
        const body = raw ? JSON.parse(raw) : {};
        handleAgentDebugPost(body);
        sendJson(res, 200, { ok: true });
      } catch (e) {
        sendJson(res, 500, {
          error: e instanceof Error ? e.message : String(e)
        });
      }
      return;
    }
    if (pathOnly.startsWith("/api/lovense")) {
      if (method === "OPTIONS") {
        res.statusCode = 204;
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "content-type");
        res.end();
        return;
      }
      if (method !== "POST") {
        sendJson(res, 405, { error: "POST only" });
        return;
      }
      try {
        const raw = await readBody(req);
        const body = raw ? JSON.parse(raw) : {};
        await handleLovensePost(body, res);
      } catch (e) {
        sendJson(res, 500, {
          error: e instanceof Error ? e.message : String(e)
        });
      }
      return;
    }
    if (method === "GET" || method === "HEAD") {
      await serveStatic(distDir, url2, res);
      return;
    }
    sendJson(res, 404, { error: "not found" });
  });
  const close = () => new Promise((resolve3, reject) => {
    server.close((err) => err ? reject(err) : resolve3());
  });
  return await new Promise((resolve3, reject) => {
    server.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        if (exitOnListenError) {
          console.error("");
          console.error(`[${APP}] Port ${PORT} is already in use.`);
          console.error(`  Only one ${APP} server at a time.`);
          console.error(`  Open:  ${url}`);
          console.error(`  Or free the port:  npm run stop`);
          console.error("");
          process.exit(1);
        }
        resolve3({ url, alreadyRunning: true, close: async () => {
        } });
        return;
      }
      if (exitOnListenError) {
        console.error(`[${APP}] server error:`, err);
        process.exit(1);
      }
      reject(err);
    });
    server.listen(PORT, HOST, () => {
      console.log("");
      console.log(`  ${APP} v${VERSION}`);
      console.log(`  Open this only \u2192  ${url}`);
      console.log("");
      resolve3({ url, alreadyRunning: false, close });
    });
  });
}
function launchedAsCli() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return path.normalize(path.resolve(entry)) === path.normalize(fileURLToPath3(import.meta.url));
  } catch {
    return false;
  }
}
if (launchedAsCli()) {
  void startHost();
}
export {
  APP_URL,
  HOST,
  PORT,
  startHost
};
/*! Bundled license information:

@noble/hashes/esm/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
