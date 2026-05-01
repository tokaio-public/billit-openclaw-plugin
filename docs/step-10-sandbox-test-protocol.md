# Step 10: Billit Sandbox Test Protocol

This checklist defines exactly what is required to run end-to-end validation against Billit sandbox.

## Prerequisites from operator

Provide these values in a local secret store, then map them to runtime environment variables:

- BILLIT_API_BASE_URL=https://api.sandbox.billit.be
- BILLIT_PARTY_ID
- BILLIT_WEBHOOK_SECRET

For non-commercial API-key flow, provide:

- BILLIT_API_KEY

For OAuth flow validation (optional), provide:

- BILLIT_CLIENT_ID
- BILLIT_CLIENT_SECRET
- BILLIT_REDIRECT_URI

For OAuth flow validation (optional), also provide one-time values during test execution:

- BILLIT_AUTH_CODE (short-lived authorization code)

Optional for non-interactive refresh/list checks:

- BILLIT_ACCESS_TOKEN
- BILLIT_REFRESH_TOKEN

## Test sequence

1. API key read flow (non-commercial baseline)
- Call billit_invoices_list with apiKey and PartyID.
- Expected: 200 response, invoice summaries available.

2. OAuth exchange (optional)
- Call billit_oauth_exchange with auth code.
- Expected: token metadata returned, tokens redacted in tool output.

3. OAuth refresh (optional)
- Call billit_oauth_refresh with refresh token.
- Expected: rotated access token metadata, no raw token leakage.

4. List invoices
- Call billit_invoices_list with access token or apiKey and PartyID.
- Expected: 200 response, invoice summaries available.

5. Get invoice
- Pick an OrderID from list and call billit_invoice_get.
- Expected: invoice details returned with sensitive fields redacted.

6. Create invoice (gated)
- Enable allowStateChangingOperations=true in plugin config.
- Call billit_invoice_create only after manual operator approval.
- Expected: invoice created once; reusing same idempotency key should not duplicate.

7. Send invoice (gated)
- Call billit_invoice_send only after manual operator approval and destination confirmation.
- Expected: send command accepted and status traceable.

8. Webhook verification
- Verify a captured webhook body + Billit-Signature header using billit_webhook_verify.
- Expected: valid=true for authentic events, valid=false for tampered payload/header.

## Evidence to record

- Timestamped audit note for each state-changing action.
- Correlation id or idempotency key per create/send call.
- Sanitized error category for any failed call.
- Confirmation that no token/signature values appeared in logs/transcript.
