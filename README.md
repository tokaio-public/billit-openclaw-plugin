# billit-openclaw-plugin

Manage invoices for Billit e-invoicing through an OpenClaw plugin + skill architecture.

## What is included

- Secure starter OpenClaw plugin scaffold for Billit invoice operations.
- Workspace skill focused on safe invoice workflows and approval gates.
- Example OpenClaw configuration showing least-privilege setup.
- Implementation plan with security and reliability controls.
- Sandbox/failure/production checklists for controlled rollout.

## Repository layout

- `docs/openclaw-billit-invoice-implementation-plan.md`
- `docs/step-1-trust-boundary-and-threat-model.md`
- `docs/step-10-sandbox-test-protocol.md`
- `docs/step-11-failure-security-drills.md`
- `docs/step-12-production-promotion-checklist.md`
- `config/openclaw.example.json5`
- `skills/billit-invoice-ops/SKILL.md`
- `plugins/billit-invoice/`
- `.env.example`

## Initial usage

1. Fill environment variables from `.env.example` with sandbox values.
2. Install/link the plugin into your OpenClaw environment.
3. Apply the example config from `config/openclaw.example.json5` and adjust agent ids/tool policy.
4. Keep `allowStateChangingOperations` disabled while validating read-only/OAuth flows.
5. Start a new OpenClaw session and verify tools and skills are visible only to your billing agent.
6. Enable state-changing operations only for approved create/send sessions.

## Safety notes

- Keep state-changing invoice operations behind human approval.
- Keep production disabled until sandbox test checklist is complete.
- Never log or return raw tokens, signatures, or unmasked invoice payloads.
