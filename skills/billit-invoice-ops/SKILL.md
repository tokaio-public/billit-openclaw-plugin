---
name: billit-invoice-ops
description: Operate Billit invoice workflows safely with strict validation, redaction, and approval gates.
metadata: {"openclaw":{"requires":{"env":["BILLIT_API_BASE_URL"]},"os":["linux","darwin","win32"]}}
---

# Billit Invoice Operations

Use this skill only for invoice operations where confidentiality and correctness are required.

## Safety rules

1. Never print full invoice payloads, OAuth tokens, API keys, signatures, or customer identifiers in plain text.
2. Before creating or sending an invoice, ask for human confirmation if:
- total amount differs from prior expectation,
- recipient identifier changed,
- transport type changed,
- PartyID context changed.
3. Prefer list and retrieve operations before create/send when user intent is ambiguous.
4. Use idempotency keys for create/send operations.
5. On API errors, return sanitized diagnostics with retry guidance, not raw payload dumps.

## Preferred tool order

1. billit_invoices_list to find candidate invoices.
2. billit_invoice_get to inspect a single invoice summary.
3. billit_invoice_create only after explicit user approval.
4. billit_invoice_send only after explicit user approval and destination confirmation.

## OAuth lifecycle

- Use billit_oauth_exchange only with short-lived auth code.
- Use billit_oauth_refresh when access token expires.
- Never echo refresh tokens.

## Webhook handling

- Verify each webhook with billit_webhook_verify before processing status updates.
- Reject and log only redacted metadata when signature verification fails.
