import type { Run } from "@sandbox-benchmarks/schema";
import { getMetric, getProvider } from "@sandbox-benchmarks/schema";
import { benchmarkDataOf } from "./figures.ts";
import type { LeaderboardRow } from "./leaderboard.ts";
import { buildLeaderboard } from "./leaderboard.ts";
import type { CombineDatasetsOptions } from "./leaderboard-datasets.ts";
import { combineLeaderboardDatasets } from "./leaderboard-datasets.ts";

export interface ImpactEstimate {
	value: number;
	lo: number;
	hi: number;
	width: number;
	sandboxes: number;
	trials: number;
	rank: number;
	position: number;
}
export interface MetricImpact {
	provider: string;
	metric: string;
	suite: string;
	unit: string;
	headline: boolean;
	direction: string;
	baseline: ImpactEstimate | null;
	added: ImpactEstimate | null;
	combined: ImpactEstimate;
	valueChangePercent: number | null;
	widthChangePercent: number | null;
	intervalChange: "narrower" | "wider" | "unchanged" | "new";
}
const percent = (before: number, after: number): number | null =>
	before === 0 ? null : (after / before - 1) * 100;
const key = (provider: string, metric: string) => `${provider}/${metric}`;
function estimates(run: Parameters<typeof buildLeaderboard>[0]): Map<string, ImpactEstimate> {
	return new Map(
		buildLeaderboard(run).dimensions.flatMap((dimension) =>
			dimension.metrics.flatMap(({ metric, rows }) =>
				rows.map((row: LeaderboardRow, index) => [
					key(row.providerId, metric.id),
					{
						value: row.value,
						lo: row.interval.lo,
						hi: row.interval.hi,
						width: row.interval.hi - row.interval.lo,
						sandboxes: row.sandboxes ?? 1,
						trials: row.n,
						rank: row.rank,
						position: index + 1,
					},
				]),
			),
		),
	);
}

/** Compare one baseline with the union of an array, always recomputing from retained samples. */
export function datasetImpact(
	baseline: Run,
	additions: readonly Run[],
	options: CombineDatasetsOptions = {},
) {
	const combined = combineLeaderboardDatasets([baseline, ...additions], options);
	const addedRuns = (combined.sources ?? [baseline]).filter(
		(source) => source.runId !== baseline.runId,
	);
	const selected = [baseline, ...addedRuns];
	const before = estimates(baseline);
	const after = estimates(combined);
	const added = addedRuns.length
		? estimates(combineLeaderboardDatasets(addedRuns, options))
		: new Map<string, ImpactEstimate>();
	const metrics: MetricImpact[] = [];
	for (const provider of combined.providers) {
		for (const result of provider.metrics) {
			const metric = getMetric(result.metricId);
			const next = after.get(key(provider.providerId, result.metricId));
			if (!metric || !next || metric.derived) continue;
			const previous = before.get(key(provider.providerId, result.metricId)) ?? null;
			const delta = previous ? next.width - previous.width : 0;
			const tolerance = previous ? Math.max(1, previous.width, next.width) * 1e-9 : 0;
			metrics.push({
				provider: provider.providerId,
				metric: result.metricId,
				suite: result.sourceFile?.split("/")[0] ?? metric.dimension,
				unit: metric.unit,
				direction: metric.direction,
				headline: metric.headline,
				baseline: previous,
				added: added.get(key(provider.providerId, result.metricId)) ?? null,
				combined: next,
				valueChangePercent: previous ? percent(previous.value, next.value) : null,
				widthChangePercent: previous ? percent(previous.width, next.width) : null,
				intervalChange: !previous
					? "new"
					: Math.abs(delta) <= tolerance
						? "unchanged"
						: delta < 0
							? "narrower"
							: "wider",
			});
		}
	}
	const pipelines = (run: Parameters<typeof benchmarkDataOf>[0]) =>
		new Map(
			benchmarkDataOf(run).suites.map((suite) => [
				suite.id,
				suite.bars
					.toSorted((a, b) => a.totalS - b.totalS || a.provider.localeCompare(b.provider))
					.map((bar, index) => ({
						provider: bar.provider,
						seconds: bar.totalS,
						position: index + 1,
					})),
			]),
		);
	const oldPipelines = pipelines(baseline);
	const newPipelines = pipelines(combined);
	const suiteNames = [
		...new Set(selected.flatMap((run) => run.providers.flatMap((p) => p.suitesCovered))),
	].sort();
	const suites = suiteNames.map((suite) => ({
		suite,
		providers: combined.providers.map((provider) => {
			const rows = metrics.filter((m) => m.provider === provider.providerId && m.suite === suite);
			const coverage = (run: Run) => {
				const cells = run.experiment?.partial?.cells.filter(
					(c) => c.provider === provider.providerId && c.suite === suite,
				);
				return {
					runId: run.runId,
					planned: cells?.length ?? null,
					complete: cells?.filter((c) => c.status === "complete").length ?? null,
				};
			};
			return {
				provider: provider.providerId,
				name: getProvider(provider.providerId)?.displayName ?? provider.providerId,
				metrics: rows.length,
				addedMetrics: rows.filter((r) => r.intervalChange === "new").length,
				narrower: rows.filter((r) => r.intervalChange === "narrower").length,
				wider: rows.filter((r) => r.intervalChange === "wider").length,
				unchanged: rows.filter((r) => r.intervalChange === "unchanged").length,
				coverage: selected.map(coverage),
				pipelineBefore:
					oldPipelines.get(suite)?.find((p) => p.provider === provider.providerId) ?? null,
				pipelineAfter:
					newPipelines.get(suite)?.find((p) => p.provider === provider.providerId) ?? null,
			};
		}),
	}));
	return {
		baseline: baseline.runId,
		additions: addedRuns.map((r) => r.runId),
		notes: combined.poolingNotes ?? [],
		summary: {
			paired: metrics.filter((m) => m.baseline).length,
			narrower: metrics.filter((m) => m.intervalChange === "narrower").length,
			wider: metrics.filter((m) => m.intervalChange === "wider").length,
			unchanged: metrics.filter((m) => m.intervalChange === "unchanged").length,
			new: metrics.filter((m) => m.intervalChange === "new").length,
		},
		metrics,
		suites,
		cells: combined.cells ?? [],
	};
}
export type DatasetImpact = ReturnType<typeof datasetImpact>;
const f = (n: number | null | undefined) => (n == null ? "—" : Number(n.toPrecision(5)).toString());
const pct = (n: number | null) => (n === null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`);
const name = (id: string) => getProvider(id)?.displayName ?? id;
const estimate = (e: ImpactEstimate | null) =>
	e ? `${f(e.value)} [${f(e.lo)}, ${f(e.hi)}]` : "unmeasured";

export function renderDatasetImpact(report: DatasetImpact): string {
	const { summary } = report;
	const lines = [
		"# Adding a dataset: leaderboard impact",
		"",
		`Baseline: ${report.baseline}. Added: ${report.additions.join(", ")}.`,
		"",
		`Of ${summary.paired} provider–metric pairs present in the baseline, ${summary.narrower} have narrower intervals, ${summary.wider} wider, and ${summary.unchanged} unchanged. There are ${summary.new} newly measured pairs. These are correlated comparisons (tasks share sandboxes), not independent votes or evidence of calibration.`,
		"",
		...report.notes.map((note) => `${note}\n`),
		"Intervals below are the existing nominal 95% percentile cluster-bootstrap intervals of the median of sandbox medians, not averages of old estimates or interval endpoints. Small sandbox counts have imperfect coverage; a zero-width empirical interval is not proof of zero uncertainty. Rank is the existing shared statistical rank; position is the strict value order. Rank changes can result from changed competitors or increased test power, not only changes in a provider's value.",
		"",
		"The added-only estimate is shown to expose run-to-run shifts. Pooling gives each retained sandbox equal weight, so a run with more successful sandboxes contributes more. Results condition on successful measurements and do not correct failure-related selection bias. Two run dates cannot establish stable future-run confidence. Different WAN servers, regions and host mixtures can change the population being compared.",
		"",
		"## Headline metrics by provider",
		"",
		"Values are estimate [interval low, interval high], rounded to five significant digits; the sibling JSON retains full precision. A dash in a percentage means no baseline or a zero denominator. Δ value is signed numerical change; negative is better for time, positive for throughput. Δ width compares absolute interval widths, not width divided by estimate.",
		"",
		"| Metric | Provider | Baseline | Added only | Combined | Δ value | Δ width | Sandboxes | Rank | Position |",
		"|---|---|---:|---:|---:|---:|---:|---:|---:|---:|",
		...report.metrics
			.filter((m) => m.headline)
			.map(
				(m) =>
					`| ${getMetric(m.metric)?.label} (${m.unit}) | ${name(m.provider)} | ${estimate(m.baseline)} | ${estimate(m.added)} | ${estimate(m.combined)} | ${pct(m.valueChangePercent)} | ${pct(m.widthChangePercent)} | ${m.baseline?.sandboxes ?? 0} → ${m.combined.sandboxes} | ${m.baseline?.rank ?? "—"} → ${m.combined.rank} | ${m.baseline?.position ?? "—"} → ${m.combined.position} |`,
			),
		"",
		"## Every suite and provider",
		"",
		"Coverage columns retain each original experiment's complete/planned cells; incomplete cells are not repaired by successes on another date. Interval counts cover all measured metrics in that suite. No-data providers remain listed. Pipeline totals are sums of task medians, not measured end-to-end durations or sums of confidence limits; their positions are descriptive orders.",
		"",
	];
	for (const suite of report.suites) {
		lines.push(
			`### ${suite.suite}`,
			"",
			"| Provider | Baseline cells | Added cells | Metrics | New | Narrower / wider / same | Pipeline seconds | Pipeline position |",
			"|---|---:|---:|---:|---:|---:|---:|---:|",
		);
		for (const p of suite.providers) {
			const cov = (index: number) => {
				const c = p.coverage[index];
				return c?.planned == null ? "unknown" : `${c.complete}/${c.planned}`;
			};
			lines.push(
				`| ${p.name} | ${cov(0)} | ${p.coverage
					.slice(1)
					.map((_, index) => cov(index + 1))
					.join(
						"; ",
					)} | ${p.metrics} | ${p.addedMetrics} | ${p.narrower} / ${p.wider} / ${p.unchanged} | ${f(p.pipelineBefore?.seconds)} → ${f(p.pipelineAfter?.seconds)} | ${p.pipelineBefore?.position ?? "—"} → ${p.pipelineAfter?.position ?? "—"} |`,
			);
		}
		lines.push("");
	}
	lines.push("## Every measured metric", "");
	for (const suite of report.suites) {
		lines.push(
			`### ${suite.suite}`,
			"",
			"| Metric | Provider | Baseline | Added only | Combined | Δ value | Δ width | Sandboxes | Rank | Position |",
			"|---|---|---:|---:|---:|---:|---:|---:|---:|---:|",
		);
		for (const m of report.metrics.filter((m) => m.suite === suite.suite))
			lines.push(
				`| ${getMetric(m.metric)?.label} (${m.unit}) | ${name(m.provider)} | ${estimate(m.baseline)} | ${estimate(m.added)} | ${estimate(m.combined)} | ${pct(m.valueChangePercent)} | ${pct(m.widthChangePercent)} | ${m.baseline?.sandboxes ?? 0} → ${m.combined.sandboxes} | ${m.baseline?.rank ?? "—"} → ${m.combined.rank} | ${m.baseline?.position ?? "—"} → ${m.combined.position} |`,
			);
		lines.push("");
	}
	lines.push(
		"## Economics and sources",
		"",
		"Hourly price is a published value, not an independent trial. Adding dates does not tighten a price confidence interval. The combined view uses the latest contributing hourly price and omits other derived metrics instead of treating them as repeated measurements.",
		"",
		"Statistical background: [NIST: sample size and variability determine interval width](https://itl.nist.gov/div898/handbook/eda/section3/eda352.htm); [Nature Methods: bootstrap sampling distributions](https://www.nature.com/articles/nmeth.3414). NIST's formula concerns means; it is not used to calculate these median intervals.",
		"",
	);
	return lines.join("\n");
}
