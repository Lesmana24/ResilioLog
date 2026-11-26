# CLAIMS — what the proposal and video may say

Rule: a claim may appear in the PDF or video **only if status = VERIFIED** with evidence. Role B fills this in during Fri–Mon. Keep V1 (working) separate from Final Day (planned).

| ID | Claim (English) | Where used | Evidence (test / command / commit) | Status |
|---|---|---|---|---|
| CL-01 | Merge of PN-Counter, OR-Set, Bounded Counter and ResilioState is commutative, associative and idempotent | Ch. 4.2 | `pnpm test` laws L1–L3, N runs | UNVERIFIED |
| CL-02 | Replicas converge under arbitrary partition, duplication and reordering (C1–C3) | Ch. 4.2, video | convergence tests | UNVERIFIED |
| CL-03 | Without emergency override, stock never goes below zero in any merged state | Ch. 4.3 | B1, B5 tests | UNVERIFIED |
| CL-04 | With override, shortfall is bounded by the audited override total | Ch. 4.3 | B4 test | UNVERIFIED |
| CL-05 | Top-up request is created automatically at ≤15% remaining local quota | Ch. 4.3, video | B6 test | UNVERIFIED |
| CL-06 | Two devices exchange state via QR without internet | video | manual demo log (date/devices) | UNVERIFIED |
| CL-07 | Two devices exchange state via local WebRTC over hotspot | video | manual demo log | UNVERIFIED (P1) |
| CL-08 | Typical delta fits in N QR chunks | Ch. 4.4 | W8 size report (measured numbers only) | UNVERIFIED |
| CL-09 | Volunteers (n=?) completed core tasks in X min | Ch. 6 | Role D notes | UNVERIFIED |

## Wording to avoid
- "0% conflicts / no overselling" without the override caveat → use CL-03 + CL-04 wording.
- "Works over BLE/Wi-Fi Direct" → roadmap only.
- Any performance number not measured by us.

## Citations (verify bibliographic details against the real papers before submission)
| Key | Reference (as understood; VERIFY) | Supports |
|---|---|---|
| Shapiro 2011 | Shapiro, Preguiça, Baquero, Zawirski. "Conflict-free Replicated Data Types." SSS 2011 (also INRIA RR-7506 "A comprehensive study of CRDTs") | CvRDT, join-semilattice, strong eventual consistency (Ch. 4.2) |
| Balegas 2015 | Balegas et al. "Extending Eventually Consistent Cloud Databases for Enforcing Numeric Invariants." SRDS 2015 | Bounded Counter, rights (Ch. 4.3) |
| Balcik 2010 | Balcik, Beamon, Krejci, Muramatsu, Ramirez. "Coordination in humanitarian relief chains: Practices, challenges and opportunities." Int. J. Production Economics 126(1), 2010 | Problem analysis (Ch. 2) |
Cite explicitly in paragraph text of Ch. 2 and Ch. 4 (judge feedback: citations only in the reference list was penalized).
