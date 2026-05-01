---
name: billit-invoice
description: Plugin-local guidance for Billit invoice tool usage.
---

# Billit Invoice Plugin Skill

This plugin skill documents plugin tools and safe usage rules.

1. Prefer billit_invoices_list and billit_invoice_get before state-changing calls.
2. Require human confirmation before billit_invoice_create and billit_invoice_send.
3. Keep tokens and signatures masked in all responses.
