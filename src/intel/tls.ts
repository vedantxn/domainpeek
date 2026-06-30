import { connect } from "node:tls";
import type { TlsCert } from "../types.js";

/** Live TLS handshake to read the served certificate. Keyless; null on failure. */
export function tlsCert(
  domain: string,
  now: number = Date.now()
): Promise<TlsCert | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (val: TlsCert | null) => {
      if (settled) return;
      settled = true;
      try {
        socket.destroy();
      } catch {
        // ignore
      }
      resolve(val);
    };

    const socket = connect(
      { host: domain, port: 443, servername: domain, timeout: 8000 },
      () => {
        const cert = socket.getPeerCertificate(true);
        if (!cert || Object.keys(cert).length === 0) return finish(null);

        const issuerRaw = cert.issuer?.O ?? cert.issuer?.CN ?? null;
        const issuer = Array.isArray(issuerRaw)
          ? (issuerRaw[0] ?? null)
          : issuerRaw;
        const valid_from = cert.valid_from
          ? new Date(cert.valid_from).toISOString()
          : null;
        const valid_to = cert.valid_to
          ? new Date(cert.valid_to).toISOString()
          : null;
        const toMs = cert.valid_to ? Date.parse(cert.valid_to) : NaN;
        const days_to_expiry = Number.isNaN(toMs)
          ? null
          : Math.floor((toMs - now) / 86400000);
        const sans =
          typeof cert.subjectaltname === "string"
            ? cert.subjectaltname
                .split(",")
                .map((s) => s.trim().replace(/^DNS:/, ""))
                .filter(Boolean)
            : [];

        finish({
          issuer,
          valid_from,
          valid_to,
          days_to_expiry,
          san_count: sans.length,
          sample_sans: sans.slice(0, 5),
        });
      }
    );

    socket.on("error", () => finish(null));
    socket.on("timeout", () => finish(null));
  });
}
