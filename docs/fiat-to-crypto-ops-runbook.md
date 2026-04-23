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

## Commission & net-crypto pricing (FCX-22)

Every order persists the authoritative quote so ops, finance, and audit can reconstruct exactly how much fee was applied and how much crypto was delivered.

- **Engine:** `src/domain/fiatToCryptoPricing.js`. `computeFiatToCryptoQuote` returns `grossFiatAmount`, `feeFiatAmount`, `netFiatAmount`, `netCryptoAmount`, `exchangeRateApplied`, a `commissionConfigSnapshot`, `pricingComputedAt`, and any `warnings` (`net_fiat_is_zero`, `net_crypto_below_dust_threshold`).
- **Commission models:** `fixed`, `percentage` (basis points), or `hybrid` (fixed + percentage). Optional `minFiat` / `maxFiat` floor/cap. Configurable per-request via the API or fall back to `DEFAULT_COMMISSION_CONFIG` ($0.50 + 1.5%, $1.00 floor).
- **Precision:** BigInt internal math with half-up rounding. Fiat rounds to 2 decimals; crypto rounds per `ASSET_PRECISION` (BTC/ETH 8 decimals, USDC/USDT 2 decimals, default 8). `dustMinor` flags deliverables below the dust threshold.
- **Persisted per order:** `grossFiatAmount`, `feeFiatAmount`, `netFiatAmount`, `exchangeRateApplied`, `netCryptoAmount`, `netCryptoAssetCode`, `commissionConfigSnapshot`, `pricingComputedAt`, optional `pricingWarnings`. Set at intake when `exchangeRate` is provided, refreshed when the admin approves with a locked rate.
- **Ops pricing preview:** `POST /api/fiat-to-crypto/admin/orders/:id/pricing` with `{ exchangeRate, commissionConfig? }` returns the quote without mutating the order. The admin queue screen uses this to show gross/fee/net/net-crypto before the reviewer clicks Approve.
- **Approval path:** `POST /api/fiat-to-crypto/admin/orders/:id/decision` on `approve` now accepts optional `exchangeRate` + `commissionConfig`. When supplied, the endpoint runs `computeFiatToCryptoQuote` and merges the resulting pricing patch onto the order via `updateFiatToCryptoOrder`.

**Change-control signals:** a change to `DEFAULT_COMMISSION_CONFIG` or to `ASSET_PRECISION` must go through finance review because it affects every order without an explicit `commissionConfig`. Audit entries capture the snapshot at decision time — historical orders are unaffected.

---

## Admin review queue (FCX-26)

Validated `paid` orders wait for human approval before moving to `purchasing`.

- **Entry point:** `/admin/orders` — lists orders in `paid` via `GET /api/fiat-to-crypto/admin/queue`.
- **Action:** `POST /api/fiat-to-crypto/admin/orders/:id/decision` with `{ decision: "approve" | "reject", reason }`.
- **Permissions:** only callers with the `decide_order_approval` permission (roles `order_reviewer`, `operations_manager`, `compliance_officer`) can decide. `read_only_auditor` can view but not decide. See `src/domain/adminPermissions.js`.
- **Approve:** runs `evaluateFiatToCryptoOrderTransitionWithCompliance` (KYC still **verified**, AML and sanctions **cleared**). If compliance blocks, the approval is refused and the order stays in `paid` — the attempt is recorded with `outcome: "blocked"` in the admin audit log.
- **Reject:** transitions `paid` → `failed` with `failureCode: admin_rejected` and the reviewer’s reason stored as `failureMessage`.
- **Audit:** every decision (including blocked attempts) is appended to `getAdminDecisionAuditLogSnapshot()` with schema version, reviewer id + roles, previous/new status, and any compliance reason codes. Production: persist this payload in the durable audit sink alongside `ComplianceAuditEntry`.

> Demo authentication: the current routes trust `x-admin-user-id` and `x-admin-roles` headers from the client. **Production must derive both from a verified session / role store** — never from the browser.

---

## Deposit verification & reconciliation (FCX-23)

Before an order can move from `submitted` to `paid`, ops must match the incoming bank / PSP deposit to the order and verify that amount and currency match the quote. The engine is pure and transport-agnostic so webhook handlers, ops scripts, and the admin UI all share one policy.

- **Engine:** `src/domain/fiatToCryptoDeposit.js`. `reconcileDeposit({ deposit, order, priorReconciledDepositIds, toleranceBps, actor, notes })` returns `{ outcome, event, orderPatch? }` and appends one `DepositReconciliationEvent` to the audit buffer. Only the `matched` outcome returns an order patch that transitions `submitted` → `paid`.
- **Outcomes:**
    - `matched` — amount and currency within tolerance; order moves to `paid`.
    - `amount_under` — deposit short by more than tolerance; order stays `submitted`. Ops options: wait for top-up, issue partial refund, or fail the order.
    - `amount_over` — deposit exceeds by more than tolerance; held for review. Credit surplus, refund surplus, or fail.
    - `currency_mismatch` — never auto-matches; always holds (currency conversion is out of scope for this flow).
    - `no_matching_order` — no candidate order found by reference. Deposit is parked in suspense; reconcile again once the order exists or refund per policy.
    - `order_not_eligible` — candidate order already past `submitted`. Do not touch its status; log for audit.
    - `duplicate_deposit` — the deposit id was already reconciled. No order patch; protects against webhook replays.
- **Tolerance:** `DEFAULT_DEPOSIT_AMOUNT_TOLERANCE_BPS = 0` (strict match). Raise carefully — anything ≥ 1 bp permits silent under/over payment. Production should configure per-processor.
- **Matching:** `findOrderForDeposit` resolves by `order.id`, `order.idempotencyKey`, or explicit `order.depositReference`. The API route auto-fetches submitted orders from persistence; callers can force a specific order with `orderId` in the request body.
- **Persisted per order on any non-duplicate outcome:** `depositId`, `depositAmount`, `depositCurrency`, `depositReference`, `depositReceivedAt`, `reconciledAt`, `reconciliationOutcome`, `reconciliationVariance` (signed minor-unit delta), `reconciliationNotes`. On `matched`, `status` → `paid` and `paidAt` is set.
- **Audit:** `getDepositReconciliationAuditLogSnapshot()` returns every attempted reconciliation (including duplicates and no-matches). Persist to the durable sink in production; treat the records as the ledger of record for finance reconciliation.
- **API:**
    - `POST /api/fiat-to-crypto/admin/deposits/reconcile` — requires the `reconcile_deposit` permission (roles `order_reviewer`, `operations_manager`). Returns HTTP 200 on `matched`, 409 on any other recorded outcome, 400 on payload errors.
    - `GET /api/fiat-to-crypto/admin/deposits/log` — returns all reconciliation events for audit (requires `view_order_queue`).
- **Admin UI:** `/admin/deposits` renders a form to enter deposit details (id, amount, currency, reference, processor, tolerance bps, notes) and a reverse-chronological log of past events. The orders screen links to it, and vice versa.

**Ops signals:** rising `amount_under` rate → check processor fee deduction; `currency_mismatch` spikes → customer routing / UX bug on intake; persistent `no_matching_order` → investigate reference generation at checkout; `duplicate_deposit` → webhook replay, confirm idempotency on the processor side.

---

## Purchase execution (FCX-24)

After approval an order lives in `purchasing` with a locked `exchangeRateApplied` and `netCryptoAmount`. Execution is the step that converts that quote into an actual crypto fill with a liquidity provider.

- **Engine:** `src/domain/fiatToCryptoExecution.js`. `executePurchaseWithRetry(order, options)` guards eligibility (order must be `purchasing` **and** have a locked pricing snapshot), calls the registered liquidity provider, retries transient failures, writes one audit entry per attempt, and returns either a success payload (`providerId`, `providerOrderId`, `fillPrice`, `fillQuantity`, `filledAssetCode`, `attempts`) or a failure payload (`errorCode`, `errorMessage`, `attempts`).
- **Retry policy:** up to `DEFAULT_MAX_PURCHASE_ATTEMPTS` (3) for codes in `RETRYABLE_ERROR_CODES` (`PROVIDER_TIMEOUT`, `INSUFFICIENT_LIQUIDITY`, `NETWORK_ERROR`). Non-retryable codes (e.g. `RATE_REJECTED`, `INVALID_ORDER_STATE`) fail immediately. Provider exceptions become `INTERNAL_ERROR`.
- **Providers:** registered via `registerLiquidityProvider(id, fn)`. The demo ships `internal_simulator` with deterministic outcomes driven by `simulatedOutcome`. Production wires in the real venue adapter and should keep per-provider secrets out of the audit payload.
- **Persistence:** success → `purchasing` → `transferring` with `executionProviderId`, `executionProviderOrderId`, `executionFillPrice`, `executionFillQuantity`, `executionFilledAssetCode`, `executionExecutedAt`, `executionAttempts`. Final failure → `purchasing` → `failed` with `failureCode`, `failureMessage`, `executionLastErrorCode`, and `executionAttempts` capturing retry effort. `buildExecutionOrderPatch` returns the exact patch the API merges.
- **API:** `POST /api/fiat-to-crypto/admin/orders/:id/execute-purchase` requires the `execute_purchase` permission (roles `order_reviewer`, `operations_manager`). Accepts `{ providerId?, simulatedOutcome?, maxAttempts? }`. Returns `{ ok, order, result }` with HTTP 200 on success, 409 on failure so ops can distinguish retryable UI responses from auth errors.
- **Admin UI:** `/admin/orders` adds a **Purchase execution (approved orders)** section fed by `GET /api/fiat-to-crypto/admin/queue?status=purchasing`. Operators can preview simulated outcomes before running execution and see a live banner with fill details or error codes.
- **Audit:** every attempt appends a `PurchaseExecutionAuditEntry` to `executionAuditBuffer` (retrievable via `getPurchaseExecutionAuditLogSnapshot`). Persist this buffer to the durable sink in production and alert on streaks of `MAX_RETRIES_EXCEEDED`.

**Ops signals:** repeated `INSUFFICIENT_LIQUIDITY` → coordinate with treasury before re-executing; `RATE_REJECTED` → provider rejected the locked rate, re-approval with a fresh quote is required; non-zero `executionAttempts` on completed orders is healthy noise, but p95 should stay ≤ 2.

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
- **Action:** Do **not** set `paid` on a guess. Use `POST /api/fiat-to-crypto/admin/deposits/reconcile` — the engine returns `no_matching_order` / `amount_under` / `amount_over` / `currency_mismatch` as appropriate and keeps the event in the audit log. Park funds in suspense; ops matches using bank metadata. If the quote expired or risk requires closure, transition **`submitted` → `failed`** with internal reason (customer comms per policy). See E2E test: graph allows this failure edge.

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
| `src/domain/fiatToCryptoOrderProgress.js` | User timeline, notification trigger keys, failure copy, completed delivery summary (FCX-20) |
| `src/domain/fiatToCryptoIntake.js` + `POST /api/fiat-to-crypto/orders` | Intake validation and creating orders in `submitted` (FCX-25) |
| `src/domain/adminPermissions.js` | Admin roles and permission checks (FCX-26) |
| `src/domain/fiatToCryptoAdminQueue.js` + admin API routes | Admin review queue, approve/reject decisions, audit log (FCX-26) |
| `src/domain/fiatToCryptoPricing.js` + `POST /api/fiat-to-crypto/admin/orders/[id]/pricing` | Commission & net-crypto calculation engine, ops pricing preview (FCX-22) |
| `src/domain/fiatToCryptoExecution.js` + `POST /api/fiat-to-crypto/admin/orders/[id]/execute-purchase` | Liquidity-provider purchase, retry loop, execution audit, order patch (FCX-24) |
| `src/domain/fiatToCryptoDeposit.js` + `POST /api/fiat-to-crypto/admin/deposits/reconcile` + `GET …/deposits/log` | Deposit matching, amount/currency verification, under/over/mismatch/duplicate handling, audit log (FCX-23) |
| `src/domain/fiatToCryptoOperations.e2e.test.js` | Automated happy path, failure path, edge cases |
