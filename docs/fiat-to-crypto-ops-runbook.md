# Fiat-to-crypto operations runbook (FCX-18)

Operational guidance for safely running fiat-to-crypto flows aligned with `src/domain/fiatToCryptoOrder.js` (lifecycle) and `src/domain/fiatToCryptoCompliance.js` (KYC / AML / sanctions gates).

---

## Roles

| Area | Typical owner |
|------|----------------|
| Customer onboarding / KYC | Compliance operations |
| Payment capture & deposit matching | Treasury / payment processor |
| AML & sanctions screening | Compliance / vendor workflows |
| Crypto purchase & liquidity | Treasury |
| On-chain or custodial payout | Custody |
| Stuck funds / refunds | Operations + treasury |

---

## Happy path (monitoring)

1. **Order created (`submitted`)** — `evaluateKycGateForOrderCreation` must have allowed **verified** KYC before persistence. Audit entry: gate `order_creation`, decision `allowed`.
2. **Fiat received (`paid`)** — payment processor confirms good funds; treasury matched deposit to order reference.
3. **Enter purchasing (`paid` → `purchasing`)** — AML and sanctions must be **cleared**; KYC still **verified**. `evaluateFiatToCryptoOrderTransitionWithCompliance` or `evaluateAmlSanctionsGateForPurchasing`. Audit: gate `enter_purchasing`, decision `allowed`.
4. **Transferring → completed** — custody confirms payout to customer wallet.

**Signals to watch:** spike in `blocked` compliance audits, growth of orders stuck in `submitted` or `paid`, custody `transferring` duration SLAs.

---

## Manual intervention

### KYC rejected or expired before or at execution

- **Symptom:** `kyc_rejected`, `kyc_expired`, or `kyc_not_verified` on create or purchasing gate.
- **Action:** Do not create orders or move to `purchasing`. Notify customer; compliance handles re-verification. If fiat already captured, follow **refund / escalation** procedure (outside this doc’s code scope).

### AML pending or blocked

- **Symptom:** `aml_pending_review`, `aml_blocked`, or `aml_screening_error`.
- **Action:** Hold at `paid` (do not transition to `purchasing`). Escalate to compliance. Log vendor case IDs in your ticket system. Persist compliance audit payloads from `logComplianceDecisionForAudit` / durable store.

### Sanctions match or screening error

- **Symptom:** `sanctions_match`, `sanctions_pending_review`, `sanctions_screening_error`.
- **Action:** Same as AML: **no purchasing**. If match confirmed, follow legal policy (freeze, SAR, etc.). Audit entries are mandatory.

### Invalid wallet / payout address

- **Symptom:** validation fails at order draft (`validateFiatToCryptoOrderDraft`) or downstream custody rejects address.
- **Action:** Reject or correct address **before** `purchasing`. Never broadcast to an unvalidated address.

### Unmatched deposit (wrong amount, wrong reference, unknown sender)

- **Symptom:** fiat received but cannot be tied to a single `submitted` order within SLA.
- **Action:** Do **not** set `paid` on a guess. Park funds in suspense; ops matches using bank metadata. If the quote expired or risk requires closure, transition **`submitted` → `failed`** with internal reason (customer comms per policy). See E2E test: graph allows this failure edge.

### Failed transfer (on-chain revert, custodial error)

- **Symptom:** payout in `transferring` cannot complete.
- **Action:** Transition **`transferring` → `failed`** (custody-owned in the model). Reconcile balances, notify customer, open refund or retry ticket. Do not mark `completed` without settlement proof.

### Stuck in `purchasing`

- **Symptom:** liquidity or venue failure.
- **Action:** Model allows **`purchasing` → `failed`**. Treasury owns; coordinate customer communication and refund.

---

## Go-live checklist

- [ ] **KYC vendor** live in production; webhook/API for status synced to `kycVerificationStatus` used by gates.
- [ ] **AML & sanctions** vendors configured; screening jobs complete before `paid` → `purchasing`; timeouts and retries defined.
- [ ] **Compliance audit sink** persists `ComplianceAuditEntry` payloads (not only in-memory buffer) with retention per policy.
- [ ] **Payment processor** rules: deposit reference / amount matching documented; unmatched-deposit runbook rehearsed.
- [ ] **Custody** payout monitoring and alerting for `transferring` SLA breaches.
- [ ] **Idempotency** on payment webhooks and status transitions to avoid double `paid` or double payout.
- [ ] **Secrets & env** for production isolated from staging; least-privilege access for treasury and custody tools.
- [ ] **On-call** roster and escalation path for compliance holds and custody failures.
- [ ] **Rollback:** feature flags or circuit breaker to stop **new** `submitted` orders without blocking in-flight reconciliation (define per deployment).
- [ ] **Tests:** `npm test` passes including `src/domain/fiatToCryptoOperations.e2e.test.js`.

---

## Related code

| Asset | Purpose |
|-------|---------|
| `src/domain/fiatToCryptoOrder.js` | Statuses, transitions, draft validation |
| `src/domain/fiatToCryptoCompliance.js` | KYC / AML / sanctions gates and audit entries |
| `src/domain/fiatToCryptoTransfer.js` | Payout network config, address validation, tx hash fields, failure policy (FCX-21) |
| `src/domain/fiatToCryptoOperations.e2e.test.js` | Automated happy path, failure path, edge cases |
