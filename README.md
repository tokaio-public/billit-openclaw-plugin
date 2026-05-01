# billit-openclaw-plugin

Manage invoices for Billit e-invoicing through an OpenClaw plugin + skill architecture.

## What is included

- Secure starter OpenClaw plugin scaffold for Billit invoice operations.
- Workspace skill focused on safe invoice workflows and approval gates.
- Example OpenClaw configuration showing least-privilege setup.
- Implementation plan with security and reliability controls.

## Repository layout

- `docs/openclaw-billit-invoice-implementation-plan.md`
- `config/openclaw.example.json5`
- `skills/billit-invoice-ops/SKILL.md`
- `plugins/billit-invoice/`
- `.env.example`

## Initial usage

1. Fill environment variables from `.env.example` with sandbox values.
2. Install/link the plugin into your OpenClaw environment.
3. Apply the example config from `config/openclaw.example.json5` and adjust agent ids/tool policy.
4. Start a new OpenClaw session and verify tools and skills are visible only to your billing agent.

## Safety notes

- Keep state-changing invoice operations behind human approval.
- Keep production disabled until sandbox test checklist is complete.
- Never log or return raw tokens, signatures, or unmasked invoice payloads.
