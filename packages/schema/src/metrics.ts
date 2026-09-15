// The Metric vocabulary: the Dimensions a Sandbox is measured across, the Direction a Metric
// improves in, and the MetricDef shape every catalogued Metric declares — all arktype-first, so the
// Catalog (./catalog.ts), the Run model (./run.ts) and the PTS parser share one validated source of
// truth for these and the TypeScript types are inferred, never hand-written twice.
import { type } from "arktype";

/** Whether a higher or lower value is better. HIB = higher-is-better, LIB = lower-is-better. */
export const directionSchema = type("'HIB' | 'LIB'");
export type Direction = typeof directionSchema.infer;

/**
 * The axes a Sandbox provider is measured across — a closed, ordered vocabulary. A
 * Metric's Dimension is part of its stability contract, so this set changes only by deliberate
 * schema revision. The tuple is the ordering source; {@link dimensionSchema} validates it at runtime.
 * Landed in full even though this slice populates only `cpu`: the vocabulary is cheap, and downstream
 * code switches over it exhaustively.
 */
export const DIMENSIONS = [
	"lifecycle",
	"control-plane",
	"cpu",
	"disk",
	"memory",
	"network",
	"system",
	"realworld",
	"economics",
] as const;

export const dimensionSchema = type.enumerated(...DIMENSIONS);
export type Dimension = typeof dimensionSchema.infer;

/**
 * Dimensions that lead with more than one headline Metric — the editorial rule of ADR-0015. Network
 * presents both WAN directions, because a single direction cannot represent both inbound and
 * outbound WAN throughput. Partial on purpose: a dimension declared here before its Metrics are
 * ported has no expectation to meet yet, and data rather than a predicate so a second multi-headline
 * dimension is an edit to this object and not to a condition.
 */
const HEADLINE_COUNTS: Partial<Record<Dimension, number>> = { network: 2 };

/**
 * How many headline Metrics a Dimension is expected to carry, declared ONCE for the catalog's load
 * check and the curation tests that all have to agree on it.
 *
 * It lives here, beside the Dimension vocabulary it is a property of, rather than in `catalog.ts`:
 * the curation tests check the merged override map *without* wiring it into `METRIC_CATALOG`, and
 * importing `catalog.ts` would run that module's construction and load checks as a side effect.
 *
 * It says how MANY, never which. Identity stays with the `headline: true` flags in the override map
 * and the harness/economics registries, and the per-dimension id assertions in the catalog tests are
 * what pin the actual counts and catch a swap WITHIN a dimension — a count never can.
 */
export function expectedHeadlines(dimension: Dimension): number {
	return HEADLINE_COUNTS[dimension] ?? 1;
}

/**
 * The PTS provenance pin on a catalogued Metric. `onUndeclaredKey("reject")` because arktype keeps
 * undeclared keys by default: a typo'd pin (`scael: "MB/s"`) would otherwise validate, keep the junk
 * key, and silently degrade the entry to UNPINNED — which the matcher then resolves by description
 * alone, i.e. arbitrarily between a scale twin pair. A rejected key is a loud generator/authoring bug.
 */
const ptsSourceSchema = type({
	test: "string >= 1",
	"description?": "string >= 1",
	"scale?": "string >= 1",
}).onUndeclaredKey("reject");

/**
 * The PTS match key. The index build and lookup (results/pts.ts) and the catalog invariant
 * (catalog.ts) must spell key equality IDENTICALLY — the invariant is only sound because it groups
 * entries the same way the matcher indexes them, so a divergence would bless catalogs the matcher
 * still collides on. One definition, three call sites.
 */
export function ptsKey(test: string, description?: string, scale?: string): string {
	return JSON.stringify([test, description, scale]);
}

/**
 * One Metric's definition: its stable id, the Dimension it belongs to, unit, Direction, and whether
 * it headlines that Dimension on the leaderboard. PTS-derived Metrics also carry the `pts` provenance
 * the results normalizer uses to map a parsed `<Result>` onto the Catalog.
 *
 * An arktype schema, not a hand-written interface, so the Metric Catalog — itself a stability
 * contract whose ids, units and directions are the keys that keep Runs comparable across history — is
 * validated at load, with the TypeScript {@link MetricDef} type inferred from the same source.
 */
export const metricDefSchema = type({
	// Stable, unique identifier, e.g. "node_web_tooling_runs_per_s". Non-empty: an empty id would
	// silently collapse the byId registry (catalog.ts) and is always an authoring/generator bug.
	id: "string >= 1",
	dimension: dimensionSchema,
	// Display unit, e.g. "runs/s", "ms", "MB/s".
	unit: "string >= 1",
	direction: directionSchema,
	// Shown on the leaderboard/summary for its Dimension.
	headline: "boolean",
	label: "string >= 1",
	description: "string >= 1",
	// For Metrics parsed from a PTS `<Result>`: the versionless test profile (e.g.
	// "pts/node-web-tooling") and — for multi-result tests — the exact `<Description>` this Metric maps
	// to. Each PTS `<Result>` maps to exactly one Metric. All non-empty when present (an empty
	// `test`/`description`/`scale` would never match a real `<Result>`). `scale` exists for tests whose
	// parsers emit MULTIPLE `<Result>`s under one `<Description>` differing only in `<Scale>` (fio: the
	// same run reports bandwidth in MB/s and IOPS) — it pins this Metric to the exact runtime `<Scale>`
	// so the two results can't collapse onto one Metric. Absent when the description alone is unique.
	"pts?": ptsSourceSchema,
	// Primary-source definition (upstream PTS profile, methodology doc, …).
	"sourceUrl?": "string",
	// Economics Metrics derived from other Metrics + pricing, never parsed.
	"derived?": "boolean",
});

export type MetricDef = typeof metricDefSchema.infer;
