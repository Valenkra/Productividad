import { describe, expect, it } from "vitest";
import { detectPlatform } from "@/features/pwa/platform";

const UA = {
  iphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  ipad: "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile/15E148 Safari/604.1",
  ipadAsMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  android:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
  windows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
};

describe("detectPlatform", () => {
  it("reconoce iPhone y iPad como ios", () => {
    expect(detectPlatform(UA.iphone, 5)).toBe("ios");
    expect(detectPlatform(UA.ipad, 5)).toBe("ios");
  });

  it("un iPad que se anuncia como Mac pero tiene pantalla táctil es ios", () => {
    expect(detectPlatform(UA.ipadAsMac, 5)).toBe("ios");
  });

  it("un Mac real (sin táctil) no es ios", () => {
    expect(detectPlatform(UA.mac, 0)).toBe("other");
  });

  it("reconoce Android", () => {
    expect(detectPlatform(UA.android, 5)).toBe("android");
  });

  it("escritorio es other", () => {
    expect(detectPlatform(UA.windows, 0)).toBe("other");
  });
});
