import { resolveTxt } from "node:dns/promises";
import type { EmailSecurity } from "../types.js";

/** SPF / DMARC posture from DNS TXT records. Keyless. */
export async function emailSecurity(domain: string): Promise<EmailSecurity> {
  const [spfRecords, dmarcRecords] = await Promise.all([
    resolveTxt(domain).catch(() => [] as string[][]),
    resolveTxt(`_dmarc.${domain}`).catch(() => [] as string[][]),
  ]);

  const flatten = (recs: string[][]) => recs.map((r) => r.join("").toLowerCase());
  const spfTxt = flatten(spfRecords);
  const dmarcTxt = flatten(dmarcRecords);

  const spf = spfTxt.some((t) => t.includes("v=spf1"));
  const dmarcRecord = dmarcTxt.find((t) => t.includes("v=dmarc1"));
  let dmarc_policy: string | null = null;
  if (dmarcRecord) {
    const m = dmarcRecord.match(/p=([a-z]+)/);
    dmarc_policy = m ? m[1] : null;
  }

  return { spf, dmarc: Boolean(dmarcRecord), dmarc_policy };
}
