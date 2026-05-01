---
name: billit-invoice
description: Plugin-local guidance for Billit invoice tool usage.
---

# Billit Invoice Plugin Skill

This plugin skill documents plugin tools and safe usage rules.

1. Prefer billit_invoices_list and billit_invoice_get before state-changing calls.
2. For non-commercial use, prefer apiKey + PartyID; use OAuth tools only when consent-based access is required.
3. Keep allowStateChangingOperations disabled unless a billing operator explicitly approves the session scope.
4. Require human confirmation before billit_invoice_create and billit_invoice_send.
5. Verify webhook signatures before processing status updates.
6. Keep tokens, API keys, and signatures masked in all responses.
