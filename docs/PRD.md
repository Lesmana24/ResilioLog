# PRD — ResilioLog V1

## 1. Problem
During disasters, local logistics volunteers record incoming and distributed relief goods under unreliable or absent connectivity. Paper logs and ad-hoc messaging cause lost records, duplicated distribution, and unreliable stock counts. A central server is unavailable when it is needed most.
(Empirical evidence for this section comes from Role D's 3–5 volunteer interviews and literature, e.g. Balcik et al. 2010 — to be filled by Role A/D. Do not state field claims without a source.)

## 2. Users
| User | Context | Needs |
|---|---|---|
| **Field volunteer** | Phone, intermittent/no network, stressful and time-constrained | Record stock in/out in seconds, offline, with no sync decisions |
| **Command Center coordinator** | Laptop/phone at a hub; receives devices intermittently | See a merged, trustworthy view; allocate stock quota to field nodes; review overrides |

## 3. Goal and success criteria
**Goal:** convergent, loss-free inventory records across offline devices, with no overselling, exchanged without any server.

| # | Criterion | How verified |
|---|---|---|
| S1 | Merge is commutative, associative, idempotent | property tests (≥1000 runs) |
| S2 | N replicas under random partitions + arbitrary sync order converge to identical state | convergence harness |
| S3 | Without override, stock never goes negative across any merged state | invariant tests |
| S4 | Two real devices converge via QR or WebRTC in the demo | live demo / usability test |
| S5 | Volunteer can record an issue in the app without training beyond a short walkthrough | Role D usability test (3–5 users) |

## 4. V1 scope (must work by Fri 27 Nov 18:00)
1. **Local-first stock recording** offline (Role C UI + Role B engine)
2. **Stock ledger** per item: PN-Counter (in/out)
3. **Distribution log**: OR-Set of entries (receive/issue/override)
4. **Quota enforcement**: Bounded Counter; issue allowed only if `localRights(node) ≥ qty`
5. **Rights transfer** between nodes (Command Center allocates quota)
6. **Emergency medical override** with mandatory reason and audit trail (see `EMERGENCY-OVERRIDE.md`)
7. **Top-up queue**: when remaining quota ≤ 15%, a request is enqueued automatically
8. **Delta sync** between two nodes via **QR (chunked) + compressed JSON**, and **WebRTC local** (P1)

## 5. Final Day scope (planned, NOT V1 — keep separate in video)
2–3 substantive tasks to be chosen by Role A. Candidates: automatic top-up fulfilment suggestions, Command Center aggregation view, sync history/audit view.

## 6. Non-goals
- BLE / Wi-Fi Direct background sync (roadmap; PWA radio APIs are restricted)
- Central server, accounts, authentication, multi-tenant
- CRDT garbage collection / tombstone compaction
- Editing item metadata after creation; deleting items
- Real-time collaborative text, maps, routing

## 7. User stories and acceptance criteria
**US-1 Record receipt.** As a volunteer, I add received goods to an item while offline.
AC: operation succeeds with no network; persists across reload; appears in log with Lamport timestamp.

**US-2 Issue goods.** As a volunteer, I record issuing N units.
AC: allowed iff `localRights ≥ N`; otherwise clear error "not enough local quota" with option to request top-up or use emergency override.

**US-3 Allocate quota.** As a coordinator, I transfer M units of rights from my node to a field node.
AC: allowed iff coordinator `localRights ≥ M`; recipient's rights increase after sync.

**US-4 Auto top-up request.** As a coordinator, I see which nodes are running low.
AC: after an issue leaves ≤15% of a node's granted rights, one open request exists for that item/node (no duplicates).

**US-5 Emergency override.** As a volunteer facing a medical emergency, I issue beyond quota.
AC: reason required; entry flagged `override_issue`; deficit visible; never silently lost.

**US-6 Sync two devices.** As a volunteer, I exchange updates with another device without internet.
AC: export delta as QR (chunked if needed) or send via WebRTC; importing is idempotent; both devices show identical totals afterward.

## 8. Constraints
5 days total; Feature Freeze Fri 18:00; English-only proposal/video; every member must understand CvRDT and Bounded Counter; proposal ≤10 pages (excl. cover, references, declaration); demo video ≤2 minutes, 1080p.
