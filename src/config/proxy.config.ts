import { isIP } from "node:net";

export function getTrustedProxies(): false | string[] {
    const value = process.env.TRUSTED_PROXIES;

    if (!value?.trim()) {
        return false;
    }

    const proxies = value.split(",").map((proxy) => proxy.trim());

    for (const proxy of proxies) {
        const parts = proxy.split("/");
        const address = parts[0] ?? "";
        const version = isIP(address);
        const prefix = parts[1];

        if (
            version === 0 ||
            parts.length > 2 ||
            (prefix !== undefined &&
                (!/^\d+$/.test(prefix) ||
                    Number(prefix) < 1 ||
                    Number(prefix) > (version === 4 ? 32 : 128)))
        ) {
            throw new Error(
                "TRUSTED_PROXIES must contain comma-separated proxy IP addresses or CIDRs; wildcard trust and hop counts are not allowed.",
            );
        }
    }

    return [...new Set(proxies)];
}
