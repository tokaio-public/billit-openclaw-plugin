# billit-openclaw-plugin

Manage invoices for Billit e-invoicing through an OpenClaw plugin + skill architecture.

> **WARNING**: This repository comes with no warranty! For now, it is untested and should therefore be considered NOT-for-production!

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

## Billit API endpoint coverage

All known Billit API endpoint groups are implemented. See `plugins/billit-invoice/src/billitClient.ts` for the full method list.

Covered endpoint groups:

| Group | Implemented | Sandbox verified |
|---|---|---|
| Party | GET/POST `/v1/parties`, GET/PATCH `/v1/parties/{partyID}` | ✅ |
| Order | Full CRUD + payments, booking entries, deleted list | ✅ |
| File | GET `/v1/files/{fileID}` | — (requires known file ID) |
| Accountant | Feed list/create/delete, feed index, item confirm, file download | ✅ |
| Account | Account info, SSO token, sequences, register company | ✅ |
| Document | List, create, get by ID | ✅ |
| FinancialTransaction | Import file, import transactions, list | ✅ |
| GLAccount | Create, bulk import | — (write-only) |
| Journal | Bulk import | — (write-only) |
| Product | Get, list, create | ✅ |
| ToProcess | Submit, delete | — (write-only) |
| Peppol | Register/deregister participant, inbox, confirm/refuse, send order, participant info | ✅ |
| Misc | Company search, type codes list, type code get | ✅ |
| OAuth2 | Exchange, refresh, revoke | — (credentials needed) |
| Reports | List, get by ID | ✅ |
| Webhook | Create, list, delete, refresh, verify signature | ✅ |

## Quickstart

### Prerequisites

- Node.js 22+
- An OpenClaw server instance
- A Billit account with an API key ([get one from your Billit dashboard](https://app.billit.be))

---

### Step 1 — Clone and build the plugin

Clone the repo and compile the plugin. The build produces a `dist/` directory that OpenClaw loads.

```sh
git clone https://github.com/tokaio-public/billit-openclaw-plugin.git
cd billit-openclaw-plugin/plugins/billit-invoice
npm ci
npm run build
```

To verify everything works before deploying, run the test suite:

```sh
npm test
```

All 76 tests should pass.

---

### Step 2 — Configure your credentials

Copy the example env file and fill in your values. Never commit the filled-in `.env` to source control.

```sh
cp .env.example .env
```

Edit `.env`:

```sh
# Your Billit non-commercial API key (from the Billit dashboard)
BILLIT_API_KEY=your_billit_api_key

# The PartyID of the company you are managing (visible in Billit URL or account settings)
BILLIT_PARTY_ID=123456

# Use the sandbox URL while testing, switch to production only after completing the checklist
BILLIT_API_BASE_URL=https://api.sandbox.billit.be

# Secret used to verify incoming Billit webhook signatures
BILLIT_WEBHOOK_SECRET=replace_with_a_strong_random_value
```

> **On a server:** do not use a `.env` file. Inject these as real environment variables via systemd, Docker, or a secret manager (Vault, AWS Secrets Manager, Doppler, etc.).

---

### Step 3 — Register the plugin with OpenClaw

Copy the plugin directory to wherever your OpenClaw instance loads plugins from (check your OpenClaw server docs for the exact path):

```sh
cp -r plugins/billit-invoice /path/to/openclaw/plugins/billit-invoice
```

The file `openclaw.plugin.json` at the root of the plugin directory is what OpenClaw reads to discover the plugin, its config schema, and its skills.

---

### Step 4 — Apply the OpenClaw configuration

Copy the example config and adjust agent IDs to match your setup:

```sh
cp config/openclaw.example.json5 /path/to/openclaw/openclaw.json5
```

Key sections to review:

```json5
plugins: {
  entries: {
    "billit-invoice": {
      config: {
        // Keep pointing at sandbox until you have verified all read flows
        apiBaseUrl: "https://api.sandbox.billit.be",

        // IMPORTANT: keep false until you are ready for live writes
        allowStateChangingOperations: false,
      }
    }
  }
},
agents: {
  list: [
    {
      id: "billing-agent",   // change to match your agent's actual ID
      skills: ["billit-invoice-ops"],
      tools: {
        allow: ["billit_invoices_list", "billit_invoice_get", "billit_webhook_verify"],
        deny: ["group:runtime", "group:fs", "browser"],
      },
    },
  ],
},
```

The `allow` list is the exact set of tools your billing agent can call. Everything not listed is denied by default. Expand it deliberately as you validate each operation.

---

### Step 5 — Start OpenClaw and verify

Start (or restart) your OpenClaw server so it picks up the plugin and config. Then open a session with your billing agent and confirm:

- The `billit_invoices_list` tool appears in the tool list.
- The `billit-invoice-ops` skill is loaded.
- A list call against the sandbox returns results without errors.

```
> List my invoices
```

If authentication fails, double-check that `BILLIT_API_KEY` and `BILLIT_PARTY_ID` are visible in the OpenClaw process environment.

---

### Step 6 — Enable write operations (when ready)

By default, all tools that create, modify, or delete data are **not registered at all** — this is a hard gate, not a permission check. To enable them:

1. Complete the sandbox test protocol: `docs/step-10-sandbox-test-protocol.md`
2. Complete the production promotion checklist: `docs/step-12-production-promotion-checklist.md`
3. Set `allowStateChangingOperations: true` in your OpenClaw config.
4. Add only the specific mutation tools your agent needs to the `allow` list.
5. Switch `apiBaseUrl` to `https://api.billit.be` for production.

Keep `requireHumanApproval: true` in any tool call payload for irreversible operations (create invoice, send to Peppol, delete).

---

### API key security summary

| Practice | Why |
|---|---|
| Use `BILLIT_API_KEY` + `BILLIT_PARTY_ID` env vars | Never embed credentials in config files or source code |
| Use a secret manager in production | Enables rotation without redeploy; limits blast radius |
| Rotate the key immediately on suspected exposure | Billit keys have no automatic expiry |
| Keep `BILLIT_WEBHOOK_SECRET` separate from the API key | Limits the damage if either secret leaks |
| Set `allowStateChangingOperations: false` by default | Prevents accidental writes even if auth is compromised |

