# Executive summary

A secure Billit invoice integration for OpenClaw should be built as a combination:

- Plugin + tools: confirmed as the official OpenClaw path for adding executable capabilities.
- Skill: confirmed as the official path for teaching the model how and when to use those tools safely.
- Hook: optional recommendation for extra guardrails and audit events, not required for baseline.

Safest practical architecture for invoice data:

1. Keep all Billit API calls in plugin tools with strict schemas.
2. Use a dedicated invoice skill to enforce workflow constraints and approval gates.
3. Restrict tools and skills to a dedicated billing agent.
4. Keep sandbox as default environment and production behind explicit promotion gates.

This repository now includes a starter structure for that design.

# What the official OpenClaw docs say

Confirmed from official OpenClaw docs:

- Skills are instruction files and do not execute code by themselves.
- Tools are executable functions called by the agent.
- Plugins are the extension layer that registers tools/channels/providers/hooks.
- Skills load from workspace and shared roots with precedence:
  workspace skills, then project-agent, personal-agent, managed, bundled, extra dirs.
- Skills visibility is controlled separately by agent allowlists.
- Plugin configuration and loading are controlled under plugins.* config.
- Tools are controlled with tools.profile, tools.allow, tools.deny.
- Plugin and skill security posture requires explicit trust and least privilege controls.

Confirmed operational controls from OpenClaw docs:

- plugins.allow can enforce explicit plugin allowlisting.
- agents.list[].skills and agents.list[].tools can restrict capability per agent.
- logging.redactSensitive should remain enabled.
- sandboxing is recommended for higher-risk workloads.

# What the Billit integration likely requires

Confirmed from official Billit docs:

- Separate sandbox and production environments:
  https://api.sandbox.billit.be and https://api.billit.be.
- OAuth is the recommended authentication model with client ID/secret and code exchange.
- Access tokens expire after 3600 seconds; refresh token flow is required.
- Invoice create endpoint uses POST /v1/orders.
- Invoice retrieve endpoint uses GET /v1/orders/{UniqueID}.
- Invoice list endpoint uses GET /v1/orders and supports OData filters.
- Invoice send endpoint uses POST /v1/orders/commands/send.
- Idempotency is supported through Idempotency-Key header and 409 conflict on duplicates.
- Webhook signatures are provided in Billit-Signature and verified via HMAC SHA-256 over timestamp.payload.
- Header context can include PartyID and related routing headers.
- 401 indicates authorization/context errors; 500 may be transient and should be handled robustly.

Recommendation based on those facts:

- Treat Billit as a state-changing financial API and require explicit human approvals for create/send actions.
- Use idempotency keys on all state-changing operations.
- Avoid direct raw payload logging and mask sensitive fields aggressively.

# Recommended architecture

## Decision: skill, tool, plugin, hook, or combination

Recommended: combination of plugin + tools + skill, with optional hook.

- Plugin: required to register executable Billit tools in OpenClaw.
- Tools: required for invoice operations and OAuth/webhook verification functions.
- Skill: required to give model-level operating policy, approval checkpoints, and safe sequencing.
- Hook: optional for additional runtime policy enforcement or audit side-channels.

Why this is safest:

- Separates execution from guidance.
- Allows strict, typed API boundary at tool layer.
- Enables agent-specific restriction without exposing Billit tooling globally.

## Suggested project structure

- config/openclaw.example.json5
- skills/billit-invoice-ops/SKILL.md
- plugins/billit-invoice/openclaw.plugin.json
- plugins/billit-invoice/package.json
- plugins/billit-invoice/tsconfig.json
- plugins/billit-invoice/src/index.ts
- plugins/billit-invoice/src/billitClient.ts
- plugins/billit-invoice/src/schemas.ts
- plugins/billit-invoice/src/toolHandlers.ts
- plugins/billit-invoice/src/logging.ts
- plugins/billit-invoice/src/redaction.ts
- plugins/billit-invoice/src/errors.ts
- plugins/billit-invoice/src/types.ts
- plugins/billit-invoice/skills/billit-invoice/SKILL.md
- plugins/billit-invoice/tests/billitClient.test.ts
- docs/openclaw-billit-invoice-implementation-plan.md
- .env.example

# Step-by-step implementation plan

1. Establish trust boundaries and threat model.
- Define who can trigger billing actions.
- Define allowed agents and communication channels.
- Confirm non-production defaults.

2. Create plugin skeleton and manifest.
- Add openclaw.plugin.json with strict config schema.
- Enable explicit activation and include plugin-owned skill path.

3. Implement typed Billit API client.
- Centralize HTTP calls, timeout, retry/backoff.
- Implement OAuth exchange/refresh methods.
- Implement list/get/create/send invoice methods.
- Implement webhook signature verifier.

4. Implement schema validation for each tool input.
- Validate inputs before making external requests.
- Reject malformed requests with explicit, safe error messages.

5. Add secure tool handlers.
- Redact sensitive fields in outputs/logs.
- Add mandatory human-approval gate for create/send.
- Enforce idempotency for state changes.

6. Register tools in plugin entrypoint.
- billit_oauth_exchange
- billit_oauth_refresh
- billit_invoices_list
- billit_invoice_get
- billit_invoice_create
- billit_invoice_send
- billit_webhook_verify

7. Add workspace skill for operational policy.
- Define call order.
- Define approval checkpoints.
- Define masking constraints.

8. Configure OpenClaw least privilege.
- plugins.allow only billit-invoice.
- billing agent skill allowlist includes only billit-invoice-ops.
- billing agent tool allowlist includes only Billit tools.
- deny runtime/fs/browser/automation tools unless strictly needed.

9. Add observability with safe logging.
- Keep structured events.
- Never log tokens, signatures, full invoice payloads.
- Keep correlation ids and idempotency keys.

10. Test in sandbox only.
- OAuth flow, token refresh, list/get/create/send, webhook verification.
- Idempotency conflict behavior.
- Retry behavior on transient errors.

11. Run failure and security drills.
- Simulate 401, 409, 429, 500, timeout, malformed webhook.
- Verify no sensitive leakage in logs/transcripts.

12. Production promotion with explicit checklist.
- Separate production credentials.
- Manual approval step for endpoint switch.
- Rollback plan to sandbox credentials and disabled send tool.

# Security best practices

## Secrets management

Do:

- Store Billit client secrets outside repository.
- Use environment/secret refs for runtime values.
- Separate sandbox and production credentials.
- Rotate credentials on incident or suspicion.

Avoid:

- Storing secrets in SKILL files, prompts, tests, or logs.
- Reusing sandbox credentials in production.

## Least privilege

Do:

- Restrict plugin loading via plugins.allow.
- Restrict Billit skill to billing agent only.
- Restrict tools to exact Billit operations.
- Keep gateway and cron tools denied for billing agent unless explicitly needed.

Avoid:

- Global tool exposure across all agents.
- Broad profiles without deny list in mixed-trust environments.

## Data minimization

Do:

- Return summary fields by default where possible.
- Mask customer identifiers when user does not need full details.
- Limit persisted transcript retention for billing sessions.

Avoid:

- Dumping complete invoice objects by default.
- Echoing original webhook payload to chat output.

## Access restrictions

Do:

- Keep gateway local and authenticated.
- Keep DM and group policies strict.
- Require mention gating in group channels.

Avoid:

- Open DM policy with state-changing billing tools.

## Safe logging and auditability

Do:

- Use structured logs with redaction.
- Log event type, operation, order id, idempotency key, and result class.
- Keep an explicit audit trail for create/send approvals.

Avoid:

- Logging tokens, signatures, API keys, full payload bodies.

## Failure handling and reliability

Do:

- Retry only transient classes (timeout, 429, 5xx).
- Use exponential backoff with jitter.
- Surface clear error categories for operator action.
- Use idempotency keys for create/send requests.

Avoid:

- Retrying blindly on 4xx authorization/validation errors.

## Backup and rollback

Do:

- Keep a frozen previous plugin release tag or artifact.
- Keep config snapshots before production changes.
- Provide emergency switch to disable send tool or plugin entry.

Avoid:

- One-way deployment changes without recovery path.

# Risks and pitfalls

What to do:

- Keep create/send behind explicit human approval.
- Validate all tool inputs and Billit responses.
- Verify webhook signature before any processing.
- Test idempotency and duplicate prevention under retries.

What to avoid:

- Auto-sending invoices directly from untrusted chat input.
- Mixing personal/general agent with billing authority.
- Allowing broad filesystem or runtime tools in billing agent.

Likely mistakes:

- Using wrong PartyID context for multi-company scenarios.
- Forgetting refresh token rotation handling.
- Logging masked fields in one code path but raw fields in another.
- Switching to production endpoint without environment gating.

Sensitive areas requiring extra care:

- OAuth token handling and refresh-token storage.
- Create/send operations that trigger legal/financial consequences.
- Webhook authenticity and replay windows.
- Session transcript handling for financial data.

# Recommended build order

1. Threat model and access boundary definitions.
2. Plugin manifest and config schema.
3. Typed Billit client with retries and timeout.
4. Tool input schema validation.
5. Redaction and safe logging utilities.
6. Tool handlers with approval gates and idempotency.
7. Plugin tool registration.
8. Workspace skill authoring for operating rules.
9. OpenClaw config hardening for billing agent isolation.
10. Sandbox integration tests.
11. Failure-mode and security tests.
12. Production readiness review and controlled cutover.

# Open questions / assumptions

Open questions from documentation gaps or environment-specific decisions:

1. Exact Billit rate-limit quotas and response headers were not clearly documented in the fetched pages.
2. Token storage strategy in your environment is not specified yet (vault, KMS, OpenClaw SecretRef provider choice).
3. Approval UX in your deployment (chat command, external approval service, or manual process) is not fixed yet.
4. Required invoice subset is not finalized (sales-only, purchase invoices, file fetch, status workflows).
5. Expected retention policy for invoice-related transcripts/logs is not yet defined.
6. Webhook endpoint hosting and mTLS/reverse-proxy policy is not yet defined.

Assumptions used in this starter:

- Sales invoice flow is priority.
- Sandbox-first rollout.
- Human-in-the-loop for all state-changing actions.
- One trusted operator boundary per OpenClaw gateway.
