/**
 * Kynthai malware scan (ClamAV).
 *
 * HEALTH-SECURITY: uploaded files are validated (magic bytes, size, type) and
 * AES-256-GCM encrypted at rest, but that doesn't catch a genuinely malicious
 * PDF/document. ClamAV adds signature-based malware detection.
 *
 * Deployment reality:
 *  - Self-hosted / local / a box with the `clamscan` binary: REAL scanning.
 *  - Vercel serverless: `clamscan` is NOT available, so scans degrade to a
 *    no-op and are logged (uploads still work). If malware scanning is a hard
 *    requirement, route uploads to a separate scanner service/worker instead.
 *
 * Policy:
 *  - `KYNTHAI_REQUIRE_AV=1` makes Av REQUIRED: uploads are rejected when the
 *    scanner is unavailable (fail-closed). Off by default so a scan
 *    misconfiguration never breaks legit uploads in prod.
 */

import { spawn } from 'child_process';
import { logger } from '@/lib/logger';

export type ScanVerdict =
  | { clean: boolean; infected: boolean; engine: 'clamav' | 'unavailable'; details?: string };

/**
 * Scan a file's bytes with ClamAV (clamscan reading from stdin). Returns a
 * verdict. `clean:false, infected:true` if a signature matched; when the
 * binary isn't installed it reports `unavailable` (or fail-closed if
 * KYNTHAI_REQUIRE_AV=1).
 */
export function scanBuffer(buffer: Buffer, filename?: string): Promise<ScanVerdict> {
  return new Promise((resolve) => {
    let clamscan = process.env.KYNTHAI_CLAMSCAN || 'clamscan';

    const child = spawn(clamscan, ['-', '--no-summary', ...(filename ? [`--scan-archive=yes`] : [])], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve({ clean: true, infected: false, engine: 'clamav', details: 'scan timeout (treated as clean)' });
    }, 30000); // 30s hard cap per file

    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));

    child.on('error', (err: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      // clamscan not installed / not executable.
      const required = process.env.KYNTHAI_REQUIRE_AV === '1';
      logger.phiSafeError(err, 'antivirus.scan-missing');
      if (required) {
        resolve({ clean: false, infected: false, engine: 'clamav', details: 'AV unavailable (fail-closed)' });
      } else {
        resolve({ clean: true, infected: false, engine: 'unavailable', details: err.message });
      }
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      // clamscan exit codes: 0 = clean, 1 = infected, 2 = error.
      if (code === 0) return resolve({ clean: true, infected: false, engine: 'clamav' });
      if (code === 1) {
        const m = stdout.match(/^.*: ([A-Za-z0-9._\- ]+)\s+FOUND/m);
        return resolve({
          clean: false,
          infected: true,
          engine: 'clamav',
          details: m?.[1] || 'malware signature matched',
        });
      }
      // code 2 (scan error) — fail-closed if AV is required, else treat as clean.
      const required = process.env.KYNTHAI_REQUIRE_AV === '1';
      resolve({
        clean: !required,
        infected: false,
        engine: 'clamav',
        details: `clamscan error (code ${code})`, 
      });
    });

    child.stdin.on('error', () => {});
    child.stdin.write(buffer);
    child.stdin.end();
  });
}
