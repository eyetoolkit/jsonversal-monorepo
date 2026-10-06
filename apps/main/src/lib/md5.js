/**
 * md5.js — 纯前端 MD5 实现（RFC 1321）
 *
 * 为什么需要它：Web Crypto API（crypto.subtle.digest）只实现 SHA-1 / SHA-2 系列，
 * 不含 MD5。有些遗留系统（ETag、旧签名、下载校验）仍需要 MD5 值，
 * 所以在两个哈希工具页共用这一份实现。
 *
 * 输入是 UTF-8 字节序列；输出是小写十六进制字符串。
 * MD5 已不具备抗碰撞安全性，只应用于遗留兼容性，详见 README 的安全说明。
 */

function leftRotate(l, i) {
  return (l << i) | (l >>> (32 - i));
}

// 每轮 16 步的循环左移位数
const S = [
  [7, 12, 17, 22],
  [5, 9, 14, 20],
  [4, 11, 16, 23],
  [6, 10, 15, 21],
];

// T[i] = floor(2^32 × |sin(i + 1)|)，RFC 1321 给出常量表
const T = new Uint32Array([
  0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
  0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
  0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
  0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
  0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
  0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
  0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
  0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
]);

// 摘要 = 每个状态字的小端字节序拼接（RFC 1321 §3.4 的输出约定）。
// 直接把 a/b/c/d 当大端十六进制打印是最常见的实现错误，务必用这个函数。
const hexLE = (n) => {
  const x = n >>> 0;
  return (
    (x & 0xff).toString(16).padStart(2, '0') +
    ((x >>> 8) & 0xff).toString(16).padStart(2, '0') +
    ((x >>> 16) & 0xff).toString(16).padStart(2, '0') +
    ((x >>> 24) & 0xff).toString(16).padStart(2, '0')
  );
};

/**
 * @param {Uint8Array} bytes 原始字节
 * @returns {string} 32 位小写十六进制
 */
export function md5Bytes(bytes) {
  const msgLen = bytes.length;

  // 填充：追加 0x80，补 0 到 mod 64 == 56，再写入 64 位小端比特长度
  const paddedLen = (((msgLen + 8) >>> 6) + 1) << 6;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[msgLen] = 0x80;

  const bitLenLo = (msgLen << 3) >>> 0;
  const bitLenHi = Math.floor(msgLen / 536870912) >>> 0; // msgLen * 8 >>> 32
  const tail = paddedLen - 8;
  padded[tail] = bitLenLo & 0xff;
  padded[tail + 1] = (bitLenLo >>> 8) & 0xff;
  padded[tail + 2] = (bitLenLo >>> 16) & 0xff;
  padded[tail + 3] = (bitLenLo >>> 24) & 0xff;
  padded[tail + 4] = bitLenHi & 0xff;
  padded[tail + 5] = (bitLenHi >>> 8) & 0xff;
  padded[tail + 6] = (bitLenHi >>> 16) & 0xff;
  padded[tail + 7] = (bitLenHi >>> 24) & 0xff;

  const M = new Uint32Array(16);
  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  for (let off = 0; off < paddedLen; off += 64) {
    for (let j = 0; j < 16; j++) {
      const k = off + j * 4;
      // 小端序读 4 字节
      M[j] = (padded[k] | (padded[k + 1] << 8) | (padded[k + 2] << 16) | (padded[k + 3] << 24)) >>> 0;
    }
    let A = a;
    let B = b;
    let C = c;
    let D = d;

    for (let i = 0; i < 64; i++) {
      let F;
      let g;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }
      const tmp = D;
      D = C;
      C = B;
      const sum = (A + F + T[i] + M[g]) >>> 0;
      B = (B + leftRotate(sum, S[i >> 4][i & 3])) >>> 0;
      A = tmp;
    }

    a = (a + A) >>> 0;
    b = (b + B) >>> 0;
    c = (c + C) >>> 0;
    d = (d + D) >>> 0;
  }

  return hexLE(a) + hexLE(b) + hexLE(c) + hexLE(d);
}

/**
 * @param {string} str
 * @returns {string}
 */
export function md5(str) {
  return md5Bytes(new TextEncoder().encode(str));
}

export default md5;