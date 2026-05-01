# Step 11: Failure and Security Drills

Run these drills before any production promotion.

## API failure drills

1. Unauthorized token (401)
- Use expired/invalid access token with billit_invoices_list.
- Expected: immediate failure, no retry storm, sanitized diagnostics only.

2. Conflict/idempotency (409)
- Re-send create/send with same idempotency key.
- Expected: no duplicate invoice side effects.

3. Rate limit (429)
- Trigger a throttled request in sandbox.
- Expected: bounded retries with backoff and optional Retry-After handling.

4. Server error (500)
- Simulate transient upstream failure.
- Expected: bounded retries then sanitized error.

5. Timeout/network interruption
- Block outbound calls or reduce timeout to induce abort.
- Expected: retriable handling with capped attempts.

## Security drills

1. Webhook tamper
- Modify payload while keeping original signature.
- Expected: signature verification fails.

2. Replay window
- Reuse old valid webhook signature beyond tolerance window.
- Expected: rejected as timestamp_out_of_tolerance.

3. Transcript leakage check
- Search logs/transcripts for token/signature/secret patterns.
- Expected: no raw secrets in output.

4. Permission boundary check
- With allowStateChangingOperations=false, attempt create/send.
- Expected: operations blocked before API side effects.

## Exit criteria

- All drill outcomes match expected behavior.
- All failures categorized without sensitive payload dumps.
- Any mismatch is captured with remediation owner and due date.
