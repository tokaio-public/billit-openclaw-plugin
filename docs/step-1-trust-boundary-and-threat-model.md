# Step 1: Trust boundary and threat model

Status: implemented (draft for review)
Scope: only Step 1 from the implementation plan

## 1) Trust boundary

Primary boundary:
- One trusted operator boundary per OpenClaw gateway instance.

Operational rule:
- Billing capabilities must not be exposed to shared or public agents.
- If mixed-trust usage is required, use separate gateway instances.

## 2) Who can trigger billing actions

Authorized trigger surface:
- Billing actions are triggered only through a dedicated billing agent.
- State-changing actions (create/send) require explicit human approval.

Disallowed trigger surface:
- General-purpose agent
- Public or shared bot surfaces
- Any agent without the billing skill and billing tool allowlist

## 3) Allowed agents and communication channels

Allowed agents:
- billing-agent: allowed for Billit invoice operations
- general-agent: denied Billit invoice operations

Allowed channels for billing-agent:
- Direct messages from approved/paired operators only
- Group channels only if mention-gated and sender allowlisted

Channel restrictions:
- No open DM policy for billing-agent
- No open group policy for billing-agent

## 4) Non-production defaults

Environment defaults:
- Billit API base URL defaults to sandbox
- Production credentials are not used in default configuration

Execution defaults:
- Human approval remains required for state-changing actions
- Strict redaction for logs and tool outputs
- Least-privilege tool policy for billing-agent

## 5) Threat model (focused)

Primary risks:
- Unauthorized invoice creation/sending
- Sensitive data leakage (invoice/customer/token)
- Wrong company context (PartyID) in multi-company operations
- Replay/forgery risk for webhook events

Baseline mitigations for Step 1:
- Dedicated billing agent boundary
- Restricted trigger surfaces
- Human-in-the-loop for state changes
- Sandbox-first environment posture

## 6) Acceptance criteria for Step 1

Step 1 is considered complete when:
1. Trust boundary is explicitly documented.
2. Authorized trigger sources are explicitly documented.
3. Allowed agents/channels are explicitly documented.
4. Non-production defaults are explicitly documented.
5. No Step 2+ implementation changes are introduced.
