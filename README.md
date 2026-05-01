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

## TODO: Billit API endpoint coverage gap analysis

Comparison sources:

- Implemented endpoints in `plugins/billit-invoice/src/billitClient.ts`
- Billit endpoint catalog in https://docs.billit.be/reference

Missing endpoints from Billit reference:

- Party: GET `/v1/parties`, POST `/v1/parties`, GET `/v1/parties/{partyID}`, PATCH `/v1/parties/{partyID}`
- Order: PUT `/v1/orders/{orderID}/bookingEntries`, PATCH `/v1/orders/{orderID}`, DEL `/v1/orders/{orderID}`, POST `/v1/orders/{orderID}/payments`, GET `/v1/orders/deleted`
- File: GET `/v1/files/{fileID}`
- Accountant feeds: GET `/v1/accountant/feeds`, register feed (POST), feed index/download list (GET), delete feed (DEL), confirm feed item (POST), download feed file (GET)
- Account: GET `/v1/account/accountInformation`, GET `/v1/account/ssoToken`, POST `/v1/account/sequences`, POST `/v1/account/registercompany`
- Document: GET `/v1/documents`, POST `/v1/documents`, GET `/v1/documents/{documentID}`
- Financial transactions: POST `/v1/financialTransactions/importFile`, POST `/v1/financialTransactions/commands/import`, GET `/v1/financialTransactions`
- GL accounts and journals: POST `/v1/glaccounts`, POST `/v1/glaccounts/commands/import`, POST `/v1/journals/commands/import`
- Products: get single product (GET), list products (GET), create/update product (POST)
- ToProcess: POST `/v1/toProcess`, DEL `/v1/toProcess/{uploadID}`
- Peppol: POST `/v1/peppol/participants`, DEL `/v1/peppol/participants`, GET `/v1/peppol/inbox`, POST `/v1/peppol/inbox/{inboxItemId}/confirm`, POST `/v1/peppol/inbox/{inboxItemID}/refuse`, POST `/v1/peppol/sendOrder`, GET `/v1/peppol/participantInformation/{VATorCBE}`
- Misc: GET `/v1/misc/companysearch/{Keywords}`, GET `/v1/misc/typecodes/{TypeCodeType}`, GET `/v1/misc/typecodes/{TypeCodeType}/{key}`
- OAuth2: POST `/OAuth2/revoke`
- Reports: GET `/v1/reports`, GET `/v1/reports/{reportID}`
- Webhooks: create webhook (POST), get webhooks (GET), delete webhook (DEL), refresh webhook (POST)

Notes:

- Local webhook signature verification exists in the plugin, but Billit webhook-management API endpoints are not implemented yet.
- For some entries (accountant feeds, products, webhooks), the docs navigation lists operation titles and not always the exact path in the index; confirm exact paths on the endpoint detail pages before implementing.
