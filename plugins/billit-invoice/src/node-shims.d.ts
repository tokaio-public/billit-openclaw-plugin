declare module "node:crypto" {
  export function createHash(algorithm: string): {
    update(data: string): { digest(encoding: "hex"): string };
  };

  export function createHmac(algorithm: string, key: string): {
    update(data: string): { digest(encoding: "hex"): string };
  };

  export function randomUUID(): string;
  export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean;
}

declare const Buffer: {
  from(data: string, encoding?: "utf8"): Uint8Array;
};
