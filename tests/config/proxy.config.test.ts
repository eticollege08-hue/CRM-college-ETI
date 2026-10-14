import { afterEach, describe, expect, it, vi } from "vitest";

import { getTrustedProxies } from "../../src/config/proxy.config.js";

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("getTrustedProxies", () => {
    it.each([undefined, "", "   "])("disables proxy trust by default: %s", (value) => {
        vi.stubEnv("TRUSTED_PROXIES", value);
        expect(getTrustedProxies()).toBe(false);
    });

    it.each([
        "192.0.2.10",
        "192.0.2.0/24",
        "192.0.2.10/32",
        "2001:db8::1",
        "2001:db8::/64",
        "2001:db8::1/128",
        "::ffff:192.0.2.10",
    ])("accepts an explicit proxy address or CIDR: %s", (value) => {
        vi.stubEnv("TRUSTED_PROXIES", value);
        expect(getTrustedProxies()).toEqual([value]);
    });

    it("trims and deduplicates the allowlist", () => {
        vi.stubEnv("TRUSTED_PROXIES", " 192.0.2.10, 2001:db8::/64,192.0.2.10 ");
        expect(getTrustedProxies()).toEqual(["192.0.2.10", "2001:db8::/64"]);
    });

    it.each([
        "true",
        "false",
        "1",
        "*",
        "loopback",
        "proxy.example.com",
        "http://192.0.2.10",
        "192.0.2.999",
        "0.0.0.0/0",
        "::/0",
        "192.0.2.0/33",
        "2001:db8::/129",
        "192.0.2.0/-1",
        "192.0.2.0/abc",
        "192.0.2.0/",
        "192.0.2.0/24/24",
        "192.0.2.10,",
        ",192.0.2.10",
        "192.0.2.10,,192.0.2.11",
    ])("rejects invalid or unrestricted trust: %s", (value) => {
        vi.stubEnv("TRUSTED_PROXIES", value);
        expect(() => getTrustedProxies()).toThrow(
            "TRUSTED_PROXIES must contain comma-separated proxy IP addresses or CIDRs; wildcard trust and hop counts are not allowed.",
        );
    });
});
