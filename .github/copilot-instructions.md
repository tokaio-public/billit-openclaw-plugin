# Copilot Instructions for the Billit OpenClaw Skill

## Project goal

Build a secure, maintainable OpenClaw skill that integrates with the Billit API so an agent can help Billit clients manage invoices and related accounting workflows.

The Billit API reference is here:

- https://docs.billit.be/reference/

The Billit API currently exposes endpoint groups including Party, Order, File, Accountant, Account, Document, FinancialTransaction, GLAccount, Journal, Product, ToProcess, Peppol, Misc, OAuth2, Reports, and Webhook. Use the official Billit reference as the source of truth when implementing support for these endpoints. :contentReference[oaicite:0]{index=0}

## Instruction file intent

This file exists to guide GitHub Copilot when working on this repository. VS Code supports project-level instruction files for Copilot so the agent can use repo-specific guidance consistently across chat requests. :contentReference[oaicite:1]{index=1}

## Core principles

- Security first.
- Privacy first.
- Correctness over speed.
- Keep the architecture boring and robust.
- Do not invent API behavior.
- Do not assume undocumented Billit behavior.
- Prefer small, reviewable changes.
- Treat invoice data as sensitive business data at all times.

## Source-of-truth rules

When implementing or modifying this project:

1. Use the official Billit API docs as the source of truth for:
   - endpoints
   - request/response schemas
   - authentication
   - paging
   - filters
   - webhook behavior
   - rate limits if documented

2. Use official OpenClaw documentation as the source of truth for:
   - skills
   - tools
   - agent bindings
   - configuration
   - secrets and environment handling
   - channel exposure
   - deployment patterns

3. If documentation is unclear:
   - say so explicitly
   - do not guess
   - leave a note in code or docs
   - prefer adding a TODO with a precise question

## Functional scope

The skill should eventually support the full usable Billit API surface relevant to assisting clients with invoice and related document workflows.

At minimum, design the project so it can grow cleanly across these endpoint groups:

- Account
- Party
- Order
- Document
- File
- Product
- Reports
- FinancialTransaction
- ToProcess
- Webhook
- OAuth2
- Accountant
- GLAccount
- Journal
- Peppol
- Misc

Do not hardcode the assumption that only invoices matter. The architecture should support adjacent financial workflows too, while keeping invoice management the primary use case. The Billit reference shows those endpoint groups are part of the current API surface. :contentReference[oaicite:2]{index=2}

## Recommended architecture

Prefer a layered architecture:

1. `auth/`
   - OAuth/token handling
   - token refresh logic
   - auth config validation

2. `client/`
   - low-level HTTP client
   - retries
   - timeouts
   - request signing / auth headers
   - error mapping

3. `schemas/`
   - request validation
   - response validation
   - typed models

4. `services/`
   - business-oriented wrappers around Billit resources
   - examples: invoices, parties, documents, reports

5. `tools/` or `skill/`
   - agent-facing actions
   - narrow, safe, high-value operations
   - human-readable descriptions for agent use

6. `security/`
   - redaction helpers
   - safe logging
   - permission checks
   - audit utilities

7. `tests/`
   - unit tests
   - contract tests
   - mock API tests
   - sandbox integration tests

8. `docs/`
   - architecture notes
   - setup guide
   - endpoint coverage matrix
   - threat model
   - rollout checklist

## Security requirements

Invoice and accounting data is private and business-critical.

Always follow these rules:

- Never log full invoice payloads in plaintext.
- Never log tokens, secrets, client secrets, refresh tokens, or authorization headers.
- Redact personally identifiable or financially sensitive fields in logs by default.
- Use least privilege wherever possible.
- Keep secrets in environment variables or approved secret stores, never in source code.
- Avoid exposing raw Billit data directly to agents when a reduced summary is sufficient.
- Validate all Billit responses before further processing.
- Validate agent inputs before calling the API.
- Fail closed on authentication or permission errors.
- Add audit-friendly logging for sensitive operations, but keep logs redacted.
- Require explicit human confirmation for destructive or high-risk actions where appropriate.

## Implementation rules

When Copilot implements code in this repository:

- Make one small step at a time.
- Preserve existing structure unless there is a clear reason to improve it.
- Prefer typed code and explicit schemas.
- Wrap external API calls in a dedicated client layer.
- Centralize error handling.
- Centralize redaction and safe logging.
- Add tests for every new service or tool.
- Add docstrings and concise module documentation.
- Keep functions focused and composable.
- Prefer explicit names over clever abstractions.

## Billit API handling rules

When implementing Billit endpoint support:

- Read the exact endpoint docs first.
- Mirror the documented request/response structure closely.
- Do not rename fields unless there is a strong internal DTO boundary.
- Keep raw API models separate from simplified agent-facing models.
- Support pagination where the API provides it.
- Handle partial failures and network failures explicitly.
- Use sandbox-safe testing paths first.
- Treat production and sandbox configuration as separate environments.
- Make base URL, credentials, and company/account identifiers configurable.

## OpenClaw integration rules

When implementing the OpenClaw side:

- Choose the right integration mechanism deliberately.
- If a capability is agent-invokable and action-oriented, implement it as a tool/skill surface.
- Keep the Billit API wrapper separate from OpenClaw-specific glue code.
- Restrict access so only intended agents can use Billit capabilities.
- Document how the skill is loaded, configured, and bound.
- Do not mix transport/channel logic with Billit business logic.
- Keep OpenClaw-specific configuration isolated and easy to audit.

## Privacy and data minimization

Default to minimum necessary data exposure.

Examples:
- For invoice list operations, return summaries first.
- For invoice detail operations, return only the fields needed for the user task.
- For agent summaries, prefer normalized outputs over raw dumps.
- For search, filter aggressively and avoid unnecessary full-record retrieval.

## Error handling expectations

All API-facing code must:

- handle authentication failures cleanly
- handle authorization failures cleanly
- handle validation failures cleanly
- distinguish user error from system error
- include retry logic only where safe
- never retry unsafe writes blindly
- surface actionable error messages to the caller
- keep internal diagnostics richer than user-facing messages

## Testing expectations

Every meaningful change should include or update tests.

Test layers should include:

- unit tests for helpers and serializers
- unit tests for auth/token handling
- mock-based tests for API client behavior
- service tests for invoice workflows
- sandbox integration tests where safe
- regression tests for redaction and sensitive logging behavior

Do not rely only on manual testing.

## Documentation expectations

Keep documentation current.

Important docs to maintain:
- `README.md`
- setup instructions
- environment variable reference
- endpoint coverage matrix
- skill usage examples
- security notes
- sandbox testing guide
- production rollout checklist

When implementing a new endpoint group, update the coverage documentation.

## Coding style expectations

- Be concise.
- Be direct.
- Avoid unnecessary abstraction.
- Avoid broad refactors unless explicitly requested.
- Keep diffs easy to review.
- Prefer explicit schema definitions.
- Prefer deterministic behavior.
- Add comments only where they add real value.

## Working style for Copilot

When asked to implement a plan:

- implement only one step at a time
- summarize the intended change briefly before editing
- stop after the requested step
- update any checklist or plan file if requested
- do not continue to the next step automatically

If a requested step is too large:
- split it into smaller substeps
- explain the split
- wait for approval

## Things to avoid

- guessing undocumented Billit behavior
- storing secrets in code
- logging raw invoice data
- making destructive changes without clear guardrails
- mixing API code with agent presentation logic
- giant all-in-one Billit client files
- silent failures
- swallowing HTTP errors
- exposing production credentials in examples
- building unsupported behavior based on assumptions

## Preferred deliverables from Copilot

When making changes, prefer to produce:

- focused code changes
- tests
- concise docs
- config examples with placeholders
- explicit TODOs for undocumented edge cases
- security notes when relevant

## Example priorities

Priority order when making choices:

1. security
2. correctness
3. maintainability
4. observability
5. performance
6. convenience

## If uncertain

If something is unclear in the Billit or OpenClaw docs:

- say exactly what is unclear
- cite the uncertainty in comments or docs
- propose the safest implementation path
- avoid pretending certainty