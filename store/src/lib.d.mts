/** Hand-kept declarations for the zero-dependency store helpers. */
export declare const FOUNDER_PACK_PRICE_USD_CENTS: number;
export declare const FOUNDER_PACK_PRODUCT_NAME: string;
export declare const FOUNDER_PACK_PRODUCT_DESCRIPTION: string;
export declare function formEncode(fields: Record<string, string | number>): string;
export declare function checkoutSessionFields(publicOrigin: string): Record<string, string | number>;
export declare function isValidSessionId(value: unknown): boolean;
export declare function mintGrantToken(sessionId: string, secret: string): string;
export declare function verifyGrantToken(sessionId: string, token: string, secret: string): boolean;
export declare function stripeKeyMode(secretKey: unknown): "absent" | "test" | "live" | "unknown";
export declare function createRateLimiter(
  limit: number,
  windowMs: number,
): (key: string, now: number) => boolean;
