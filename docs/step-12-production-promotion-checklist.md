# Step 12: Production Promotion Checklist

Use this checklist for controlled cutover from sandbox to production.

## Change controls

- [ ] Security review approved for latest code and config.
- [ ] Rollback owner and communication channel assigned.
- [ ] Frozen artifact/version selected for deployment.

## Secrets and environment separation

- [ ] Production Billit credentials are separate from sandbox credentials.
- [ ] Production secrets stored outside repository.
- [ ] Access policy for production secrets reviewed.

## Configuration gates

- [ ] BILLIT_API_BASE_URL switched to https://api.billit.be only after approval.
- [ ] allowStateChangingOperations remains false until go-live window starts.
- [ ] OpenClaw tool allowlist reviewed for least privilege.
- [ ] Billing agent scope and mention/channel policies verified.

## Validation before go-live

- [ ] OAuth exchange/refresh tested in production tenant with operator supervision.
- [ ] Read-only list/get flow validated first.
- [ ] One controlled create/send test executed with audit evidence.
- [ ] Webhook signature verification validated on production ingress path.

## Rollback plan

- [ ] Fast switch documented to disable billit_invoice_create and billit_invoice_send.
- [ ] Procedure documented to revert endpoint to sandbox and disable plugin entry if needed.
- [ ] Incident response contact list confirmed.

## Post-deploy verification

- [ ] Logs show structured, redacted events only.
- [ ] No secret leakage found in transcripts/logs after deployment.
- [ ] Operator sign-off recorded.
