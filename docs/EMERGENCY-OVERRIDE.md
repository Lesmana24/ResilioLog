# Emergency Medical Override

## Purpose
Strict quota enforcement can block a volunteer during a genuine medical emergency (e.g., insulin, oxygen, antibiotics) when their local rights are exhausted but stock exists elsewhere or arrives later. The override lets them issue anyway, **visibly and accountably**.

## Rules
1. Operation: `emergencyIssue(replica, itemId, qty, { reason, ... })`. `reason` (3–200 chars) is **mandatory**; otherwise error `REASON_REQUIRED`.
2. Effect: `O[node] += qty` in the item's Bounded Counter; `ledger` out += qty; log entry `kind: "override_issue"` with reason, node, Lamport timestamp.
3. The override does **not** consume rights, so it never corrupts rights accounting of other nodes.
4. Global `value` may become negative. `deficit = max(0, −value)` is shown prominently in the Command Center for that item.
5. Overrides are never silent: they appear in the distribution log (flagged), in summary counts per node, and can be filtered/exported for audit.
6. Overrides cannot be undone by `void`. Mistakes are corrected by a compensating `receive` with a note.
7. Guarantee statement (use exactly this wording in the proposal): *"Replicas always converge. Without emergency override, stock never goes below zero in any merged state. With override, the shortfall is bounded by the total audited override quantity."* (`value ≥ −Σ O`)

## Reconciliation
- Restock (`receive`) raises `value`; once `value ≥ 0`, deficit is cleared.
- The Command Center reviews all `override_issue` entries; a coordinator may add a `note`-bearing `receive` or transfer rights to cover the node's future needs.

## UI requirements (Role C)
- Normal issue blocked → show remaining local rights, "Request top-up", and "Emergency override" (explicit, red, requires reason).
- Command Center badge: "N overrides · deficit D" per item.

## Claim hygiene
Do **not** claim "0% conflicts and no overselling" without the override caveat. Claim: *convergence 100% (verified by tests); overselling prevented except explicit, audited overrides.*
