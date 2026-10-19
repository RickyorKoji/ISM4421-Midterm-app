function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickSeededIndex(seedKey: string, length: number): number {
  const rand = mulberry32(hashString(seedKey));
  return Math.floor(rand() * length);
}

export function todaySeedKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

export function pickRandomIndex(length: number, exclude?: number): number {
  if (length <= 1) return 0;
  let idx = Math.floor(Math.random() * length);
  if (exclude !== undefined) {
    while (idx === exclude) idx = Math.floor(Math.random() * length);
  }
  return idx;
}
