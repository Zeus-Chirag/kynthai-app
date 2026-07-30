/**
 * POST /api/csp-report
 *
 * Content Security Policy violation reporting endpoint.
 * Receives CSP violation reports and logs them for monitoring.
 *
 * CSP violations indicate either:
 *   - Legitimate bugs in the CSP policy
 *   - XSS/script injection attempts
 *
 * All reports are logged via the logger utility for Sentry/alerting.
 * Returns 204 No Content (no response body expected by CSP spec).
 */
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // CSP reports can be sent as:
    // 1. application/csp-report (old spec — JSON body)
    // 2. application/reports+json (Reporting API spec)
    const contentType = req.headers.get('content-type') ?? '';

    if (contentType.includes('csp-report') || contentType.includes('reports+json')) {
      const body = await req.json();

      // Extract the violation details safely (different shapes per spec version)
      const violation =
        body['csp-report'] ??     // CSP Level 1/2
        body['body'] ??            // Reporting API
        null;

      if (violation) {
        const {
          'document-uri': documentUri,
          'blocked-uri': blockedUri,
          'violated-directive': violatedDirective,
          'effective-directive': effectiveDirective,
          'original-policy': _originalPolicy, // omit from logs (may contain inline nonces)
          disposition,
          'source-file': sourceFile,
          'line-number': lineNumber,
          'column-number': columnNumber,
          'script-sample': _scriptSample, // omit from logs (may contain malicious payload)
        } = violation;

        logger.warn('CSP violation detected', {
          documentUri,
          blockedUri,
          violatedDirective,
          effectiveDirective,
          disposition,
          sourceFile,
          lineNumber,
          columnNumber,
        });
      } else if (body.type === 'csp-violation' && body.body) {
        // Reporting API shape
        logger.warn('CSP violation (Reporting API)', {
          documentUri: body.body.documentURL,
          blockedUri: body.body.blockedURL,
          violatedDirective: body.body.violatedDirective,
          effectiveDirective: body.body.effectiveDirective,
        });
      } else {
        // Unknown CSP report format
        logger.warn('CSP report received (unrecognized format)', {
          contentType,
          bodyKeys: Object.keys(body),
        });
      }
    } else {
      logger.warn('CSP endpoint called with unexpected content-type', { contentType });
    }

    // CSP spec requires 204 No Content response
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    // Malformed CSP reports are common — log but don't error
    logger.phiSafeError(error, 'csp-report.parse');
    return new NextResponse(null, { status: 204 });
  }
}
