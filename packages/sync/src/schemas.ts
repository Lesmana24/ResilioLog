import { z } from 'zod';

export const NodeIdSchema = z.string().regex(/^[a-z0-9]{4,16}$/);
export const ItemIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,47}$/);
export const TagSchema = z.string().regex(/^[a-z0-9]{4,16}:[0-9]+$/);
export const NatSchema = z.number().int().min(0).max(9007199254740991);
export const QtySchema = z.number().int().min(1).max(1000000000);

export const LamportSchema = z.strictObject({
  c: NatSchema,
  n: NodeIdSchema,
});

export const NatMapSchema = z.record(NodeIdSchema, NatSchema);

export const PNCounterSchema = z.strictObject({
  p: NatMapSchema,
  n: NatMapSchema,
});

export const BoundedCounterSchema = z.strictObject({
  R: z.record(NodeIdSchema, NatMapSchema),
  U: NatMapSchema,
  O: NatMapSchema,
});

export const CategorySchema = z.enum([
  'food',
  'water',
  'medicine',
  'shelter',
  'hygiene',
  'other',
]);

export const ItemMetaSchema = z.strictObject({
  name: z.string().min(1).max(60),
  unit: z.string().min(1).max(16),
  category: CategorySchema,
  createdBy: NodeIdSchema,
  createdAt: LamportSchema,
});

export const ItemStateSchema = z.strictObject({
  meta: ItemMetaSchema,
  ledger: PNCounterSchema,
  quota: BoundedCounterSchema,
  touchedAt: LamportSchema,
});

export const DistributionEntrySchema = z
  .strictObject({
    kind: z.enum(['receive', 'issue', 'override_issue']),
    itemId: ItemIdSchema,
    qty: QtySchema,
    by: NodeIdSchema,
    ts: LamportSchema,
    wallTime: z.string().datetime().optional(),
    counterparty: z.string().max(80).optional(),
    note: z.string().max(200).optional(),
    reason: z.string().min(3).max(200).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.kind === 'override_issue' && val.reason === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['reason'],
        message: 'reason is required when kind is override_issue',
      });
    }
  });

export const TopUpRequestSchema = z.strictObject({
  itemId: ItemIdSchema,
  requester: NodeIdSchema,
  ts: LamportSchema,
});

function hasUniqueItems(arr: readonly string[]): boolean {
  return new Set(arr).size === arr.length;
}

export const DistributionLogSchema = z.strictObject({
  adds: z.record(TagSchema, DistributionEntrySchema),
  removed: z.array(TagSchema).refine(hasUniqueItems, 'removed tags must be unique'),
});

export const TopUpQueueSchema = z.strictObject({
  adds: z.record(TagSchema, TopUpRequestSchema),
  removed: z.array(TagSchema).refine(hasUniqueItems, 'removed tags must be unique'),
});

export const ResilioStateSchema = z.strictObject({
  schemaVersion: z.literal(1),
  items: z.record(ItemIdSchema, ItemStateSchema),
  distributionLog: DistributionLogSchema,
  topUpQueue: TopUpQueueSchema,
});

export const SyncEnvelopeSchema = z.strictObject({
  v: z.literal(1),
  type: z.enum(['delta', 'full']),
  msgId: z.string().regex(/^[a-z0-9]{6}$/),
  from: NodeIdSchema,
  to: NodeIdSchema.optional(),
  since: NatSchema,
  until: NatSchema,
  crc32: z.string().regex(/^[0-9a-f]{8}$/),
  payload: ResilioStateSchema,
});

export const SignalEnvelopeSchema = z.strictObject({
  v: z.literal(1),
  type: z.literal('signal'),
  msgId: z.string().regex(/^[a-z0-9]{6}$/),
  from: NodeIdSchema,
  kind: z.enum(['offer', 'answer']),
  sdp: z.string().max(20000),
});

export const QrChunkSchema = z
  .string()
  .regex(/^RL1\|[a-z0-9]{6}\|[0-9]{1,3}\/[0-9]{1,3}\|[A-Za-z0-9_-]+$/);

export const EnvelopeSchema = z.union([SyncEnvelopeSchema, SignalEnvelopeSchema]);
