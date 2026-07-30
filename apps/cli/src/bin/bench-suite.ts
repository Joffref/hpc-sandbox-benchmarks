#!/usr/bin/env bun
// `bench-suite` — run a benchmark suite on a provider sandbox, collect the raw results into a
// data/raw tree, and normalize them into a validated Run document. Missing provider credentials are
// recorded as a skip (the provider stays `pending` in the Run), so this is runnable without secrets.
// Logging and results go through @actions/core (groups, debug, annotations, job summary) so the
// nested "<suite> / <provider>" cell is metadata-rich in the Actions UI.
//
// One invocation runs ONE replicate sandbox and reports it as a {@link ReplicateOutcome} rather than
// exiting from inside the run: the concurrent fan-out that lands on top of this drives R of them from
// one process, where a replicate that dies must not take its peers' sandboxes down with it.

import { join } from "node:path";
import * as core from "@actions/core";
import {
	CREATE_FAILURE_PREFIX,
	requiredProviders,
	runSuite,
	SuiteUsageError,
	unmetRequirements,
} from "@sandbox-benchmarks/harness";
import { writeNormalizedRun } from "@sandbox-benchmarks/results";
import type { Run } from "@sandbox-benchmarks/schema";
import type { CellKind, SummaryRow } from "../lib/actions-log.ts";
import {
	fail,
	inActions,
	logInfo,
	logProviderStatuses,
	logWarning,
	providerSummaryRows,
	withGroup,
	writeJobSummary,
} from "../lib/actions-log.ts";
import { handleDiscovery } from "../lib/discovery.ts";
import { lastFlagValue, parseReplicateIndex } from "../lib/replicates.ts";
import { suiteMetricSummaryRows, suiteTaskSummaryRows } from "../lib/suite-summary.ts";
import type { SuiteTaskPlan } from "../lib/suite-tasks.ts";
import { describeSuiteTasks } from "../lib/suite-tasks.ts";

function plural(n: number, singular: string, pluralForm: string = `${singular}s`): string {
	return `${n} ${n === 1 ? singular : pluralForm}`;
}

function miseTaskSummary(plan: SuiteTaskPlan): string {
	const commands = plan.tasks.filter((t) => t.role === "command").length;
	const leaves = plan.tasks.filter((t) => t.role === "leaf").length;
	if (leaves === 0) return plural(commands, "task");
	return `${plural(commands, "command")} → ${plural(leaves, "leaf task")}`;
}

/** The Actions-visible name of a (suite, provider) cell — the job-summary heading, the annotation
 *  title, and the log line, all of which have to agree for a reader to connect them. */
function cellTitle(suite: string, provider: string): string {
	return `${suite} / ${provider}`;
}

/** Agent-facing usage; bare invocation keeps the daytona-vm/cpu-node local-dev default. Every provider
 *  named here is a canonical {@link ProviderId} — the positional argument is matched against the
 *  registry exactly, so a copied example that said "daytona" or "modal" would fail as unknown. */
export const HELP = `bench-suite — run a benchmark suite on a provider sandbox and normalize it into a Run document.

usage: bench-suite [provider] [suite] [runId]
       bench-suite [--help] [--list-providers] [--list-suites] [--json]

  provider           Provider to run on (default: daytona-vm). See --list-providers.
  suite              Suite to run (default: cpu-node). See --list-suites.
  runId              Run identifier for the data/ tree (default: local-<timestamp>).
  --replicate <idx>  Replicate sandbox index this shard represents (a non-negative integer). Stamped
                     onto the shard Run so the aggregate folds ≥2 replicates of one suite together.
  --require <ids>    Comma-separated providers that MUST reach "validated"; exit 1 otherwise.
                     Also read from REQUIRE_PROVIDERS. CI sets this so a missing secret fails loudly.
  --list-providers   List the registered providers.
  --list-suites      List the registered suites and their dimensions/metrics.
  --json             Emit --list-* output as JSON instead of human-readable lines.
  --help, -h         Show this help.

Missing provider credentials are recorded as a skip (the provider stays "pending"), so this is
runnable without secrets. Writes data/runs/<runId>.json and updates data/runs/index.json.

examples:
  bench-suite daytona-vm cpu-node         # one suite locally, auto runId
  bench-suite modal-vm memory ci-1234     # a specific cell + runId
  bench-suite e2b memory --require e2b    # fail (don't skip) if E2B_API_KEY is absent
  bench-suite --list-suites               # discover the suite names first

Next: render the Run with \`leaderboard data/runs/<runId>.json\`.`;

/** What one replicate produced. Returned, never exited on: a replicate that dies must not take a
 *  concurrent peer's sandbox down with it, so the caller decides the process exit code once, at the end. */
export interface ReplicateOutcome {
	/** The replicate index, or undefined for the single un-indexed run (local/smoke). */
	index?: number;
	/** Where this replicate's shard Run belongs. Always set — including on a failure that never got as
	 *  far as writing it — so a summary can name the missing shard rather than blanking the cell. */
	outFile: string;
	/** The normalized shard Run, absent when normalization itself failed. */
	run?: Run;
	failed: boolean;
	/** Why it failed (or a note about a recorded gap) — the annotation/summary text. */
	detail?: string;
	/**
	 * Wall-clock milliseconds this replicate took, end to end.
	 *
	 * Recorded because collapsing the runner axis DELETED it: when every replicate was its own job,
	 * the Actions UI listed R durations for free, and a straggler was obvious. Driven from one runner
	 * they share a single job duration, so without this a report cannot say which sandbox was slow —
	 * and a straggler is precisely what puts the cell near its `timeout-minutes`, where the whole
	 * fleet's shards are lost at once rather than one replicate's.
	 */
	durationMs: number;
}

/** Elapsed wall clock, rendered for a summary cell: sub-minute stays in seconds, longer reads as
 *  `m` + `s` so a straggler is legible against a job budget quoted in minutes. */
export function formatDuration(ms: number): string {
	const totalSeconds = Math.round(ms / 1000);
	if (totalSeconds < 60) return `${totalSeconds}s`;
	return `${Math.floor(totalSeconds / 60)}m${String(totalSeconds % 60).padStart(2, "0")}s`;
}

/** A short, stable label for one replicate in logs and summary tables. */
function replicateLabel(index: number | undefined): string {
	return index === undefined ? "single" : `r${index}`;
}

/**
 * Parse `--replicate <idx>` / `--replicate=<idx>` into a non-negative integer, or `undefined` when the
 * flag is absent. A dangling or non-integer value fails loudly rather than silently defaulting the shard
 * to replicate 0 — a wrong index would collide two sandboxes into one replicate slot at aggregate time.
 * Exported so the parsing is unit-testable without spawning a process. (This is the single-sandbox
 * spelling, sharing its validation with the plural `--replicates` in ../lib/replicates.ts.)
 */
export function parseReplicateFlag(argv: readonly string[]): number | undefined {
	const raw = lastFlagValue(argv, "replicate");
	if (raw === undefined) return undefined;
	return parseReplicateIndex(raw);
}

/** Identity of the cell being reported. */
interface CellIdentity {
	provider: string;
	suite: string;
	runId: string;
	sha: string;
	/** The suite's resolved task plan, absent when discovery failed (the summary then omits it). */
	taskPlan?: SuiteTaskPlan;
}

/**
 * The half of a cell's job summary that does NOT depend on how many sandboxes ran: heading, cell
 * identity, the suite's task plan, and the annotation wiring. `fields`/`tables` are appended to it, so
 * a report covering several sandboxes can reuse the shared half instead of restating it — and a change
 * to that half cannot land in one reporter and miss the other.
 */
async function writeCellSummary(
	opts: CellIdentity & {
		failed: boolean;
		/** Report-specific field rows, rendered after the cell identity. */
		fields: Array<[label: string, value: string, kind: CellKind]>;
		/** Report-specific tables, rendered before the task-plan tables. */
		tables: Array<{ heading: string; rows: SummaryRow[] }>;
		detail?: string;
		annotationMessage: string;
	},
): Promise<void> {
	const title = cellTitle(opts.suite, opts.provider);
	const plan = opts.taskPlan;
	await writeJobSummary({
		heading: title,
		fields: [
			["Status", opts.failed ? "failure" : "success", "plain"],
			["Suite", opts.suite, "code"],
			["Provider", opts.provider, "code"],
			["Run id", opts.runId, "code"],
			["SHA", opts.sha, "code"],
			...opts.fields,
			["Harness commands", plan?.commands.join(" · ") ?? "", "code"],
			["Mise tasks", plan ? miseTaskSummary(plan) : "", "plain"],
		],
		tables: [
			...opts.tables,
			...(plan
				? [
						{ heading: "Mise tasks", rows: suiteTaskSummaryRows(plan) },
						{ heading: "Declared metrics", rows: suiteMetricSummaryRows(plan) },
					]
				: []),
		],
		detail: opts.detail,
		annotation: { failed: opts.failed, title, message: opts.annotationMessage },
	});
}

/**
 * The single-sandbox report: ONE cell, described in full. This is what a human reads after a manual
 * bench-smoke dispatch or a local run, so it keeps the whole-Run provider table (every registered
 * provider, with the skipped/failed gap split) and names the target provider's validation state in the
 * annotation itself.
 */
async function reportCell(
	opts: CellIdentity & {
		outFile: string;
		run?: Run;
		failed: boolean;
		detail?: string;
		durationMs: number;
	},
): Promise<void> {
	const provider = opts.run?.providers.find((p) => p.providerId === opts.provider);
	await writeCellSummary({
		// Identity + failed/detail ride through as-is; `outFile`/`run` are spent on the rows below.
		...opts,
		fields: [
			["Artifact", opts.outFile, "code"],
			["Duration", formatDuration(opts.durationMs), "plain"],
			["Validation", provider?.validationStatus ?? (opts.run ? "absent" : ""), "plain"],
			["Metrics", provider ? String(provider.metrics.length) : "", "plain"],
			["Suites covered", provider ? String(provider.suitesCovered.length) : "", "plain"],
			["Gaps", provider ? String(provider.gaps.length) : "", "plain"],
			["Observed CPU", provider?.observedSpecs.cpuModel ?? "", "code"],
			[
				"Spec matched",
				provider?.specMatched === undefined ? "" : String(provider.specMatched),
				"plain",
			],
		],
		tables: opts.run ? [{ heading: "Provider status", rows: providerSummaryRows(opts.run) }] : [],
		annotationMessage:
			opts.detail ??
			(provider
				? `${provider.providerId} ${provider.validationStatus} metrics=${provider.metrics.length}`
				: cellTitle(opts.suite, opts.provider)),
	});
}

/** Everything one replicate needs; `replicateIndex` undefined is the single un-indexed run. */
interface ReplicateContext {
	provider: string;
	suite: string;
	runId: string;
	sha: string;
	rawRoot: string;
	outFile: string;
	indexFile: string;
	replicateIndex?: number;
	/** Providers that must reach "validated" for this replicate to count as a success. */
	required: readonly string[];
}

/**
 * Run ONE replicate end to end — suite → normalize → gap verification → require gate — and report
 * what happened. Total by construction: it never throws and never exits, so a concurrent driver can
 * hold several in flight without one replicate's failure aborting its peers or skipping their shard
 * writes (the per-replicate matrix cells had `fail-fast: false` for the same reason).
 */
export async function runReplicate(ctx: ReplicateContext): Promise<ReplicateOutcome> {
	const { provider, suite, runId, sha, rawRoot, outFile, indexFile, replicateIndex } = ctx;
	// The replicate rides in the annotation TITLE: annotations are emitted as `::warning::` workflow
	// commands, so once several replicates share a process there is nothing else in a warning saying
	// which sandbox it came from.
	const cell =
		cellTitle(suite, provider) +
		(replicateIndex === undefined ? "" : ` ${replicateLabel(replicateIndex)}`);
	const startedAt = Bun.nanoseconds();
	// A getter, so every `...base` spread below stamps the elapsed time AT ITS OWN return rather than
	// freezing it here, before the suite has even started.
	const base = {
		index: replicateIndex,
		outFile,
		get durationMs() {
			return Math.round((Bun.nanoseconds() - startedAt) / 1e6);
		},
	};

	// A suite that RAN AND BROKE is a result — the harness has already written its `--failed.json` marker
	// into the raw tree — so the error is held, not thrown. Normalizing anyway is what turns that marker
	// into a recorded `failed` gap on this shard's Run document; rethrowing here would skip the write, the
	// shard would contribute nothing for the aggregate to merge, and the only trace of the failure would
	// die inside the CI artifact. The replicate still reports failed at the bottom of this block.
	let suiteError: unknown;
	let usageError: string | undefined;
	await withGroup(`Run suite ${suite} on ${provider}`, async () => {
		try {
			await runSuite({
				providerName: provider,
				suiteName: suite,
				// Tag the raw tree by suite: `<rawRoot>/<provider>/<suite>/`. The normalizer reads each suite
				// subdirectory independently and rejects any catalogued metric a suite emits off its declared
				// Dimensions (the runtime half of the suite↔dimension↔metric contract).
				resultsDir: join(rawRoot, provider, suite),
			});
			logInfo(`Suite "${suite}" completed on ${provider}`);
		} catch (err) {
			// A usage error (unknown provider/suite) produced no raw tree and no marker: there is nothing to
			// normalize, and pretending otherwise would write an empty Run for a cell that never existed.
			if (err instanceof SuiteUsageError) {
				usageError = err.message;
				return;
			}
			suiteError = err;
			logWarning(
				`Suite "${suite}" threw on ${provider} — will normalize any failed marker into a gap: ${
					err instanceof Error ? err.message : String(err)
				}`,
				{ title: cell },
			);
		}
	});
	if (usageError !== undefined) return { ...base, failed: true, detail: usageError };

	let run: Run | undefined;
	let normalizeError: unknown;
	await withGroup("Normalize Run document", async () => {
		try {
			run = writeNormalizedRun({
				rawRoot,
				runId,
				sha,
				outFile,
				updateIndexFile: indexFile,
				...(replicateIndex !== undefined ? { replicateIndex } : {}),
			});
			logInfo(`Normalized Run ${runId} → ${outFile}`);
			// Already inside withGroup — don't nest another ::group::.
			await logProviderStatuses(run, { grouped: false });
		} catch (err) {
			// Prefer the suite failure that caused a bad tree; otherwise keep the normalize error.
			normalizeError = suiteError ?? err;
		}
	});
	if (!run) {
		const detail =
			normalizeError instanceof Error
				? normalizeError.message
				: normalizeError
					? String(normalizeError)
					: "normalize produced no Run document";
		return { ...base, failed: true, detail };
	}
	const normalized = run;

	if (suiteError) {
		const message = suiteError instanceof Error ? suiteError.message : String(suiteError);
		// Verify before claiming: the harness writes the failed marker, but a throw can predate it (or
		// the marker can be lost before normalize), leaving this shard's Run EMPTY for the cell. Saying
		// "recorded as a failed gap" then would launder the loss — the aggregate would show a bare
		// pending provider while every job log claims the gap exists — so check the normalized Run itself.
		//
		// Match the gap's REASON against THIS run's error, not just its (scope, id, outcome): the harness
		// records the marker reason verbatim (`message`) for a post-run failure, or under the
		// `Failed to create sandbox: ` prefix for a creation failure. A bare shape check would also accept
		// a stale `--failed.json` from an earlier error, or an independently-derived suite gap (a disk
		// shortfall, a dedup twin) — none of which prove the marker THIS run tried to write survived.
		const gapRecorded = normalized.providers
			.find((p) => p.providerId === provider)
			?.gaps.some(
				(g) =>
					g.scope === "suite" &&
					g.id === suite &&
					g.outcome === "failed" &&
					(g.reason === message || g.reason === `${CREATE_FAILURE_PREFIX}${message}`),
			);
		const detail = gapRecorded
			? `Suite "${suite}" failed on ${provider} — recorded as a failed gap in ${outFile}: ${message}`
			: `Suite "${suite}" failed on ${provider} but no gap could be recorded in ${outFile} ` +
				`(no failed marker survived into the raw tree; this job log is the only trace): ${message}`;
		return { ...base, run: normalized, failed: true, detail };
	}

	// Missing credentials (and an unusable sandbox) are recorded as a skip, not a throw — the lenient
	// local-dev default. That would make a smoke run whose secret is missing/misnamed exit 0 having
	// benchmarked nothing, so CI passes `--require <provider>` (or REQUIRE_PROVIDERS) to assert the
	// provider actually reached `validated` — i.e. produced at least one catalogued metric.
	if (ctx.required.length > 0) {
		const reports = normalized.providers.map((p) => ({
			provider: p.providerId,
			status: p.validationStatus === "validated" ? "ok" : p.validationStatus,
		}));
		const unmet = unmetRequirements(reports, ctx.required);
		if (unmet.length > 0) {
			const details: string[] = [];
			for (const providerId of unmet) {
				// The gaps ARE the explanation for "no metrics", and their outcome is the important half of
				// it: a required provider that skipped on a precondition is a configuration problem, one that
				// failed is an outage, and the operator reading this line needs to know which they have.
				const gaps = normalized.providers.find((p) => p.providerId === providerId)?.gaps ?? [];
				const gapDetail = gaps.map((g) => `${g.id} ${g.outcome}: ${g.reason}`).join("; ");
				const line = `Required provider "${providerId}" produced no metrics${gapDetail ? ` — ${gapDetail}` : " and was absent from the Run"}`;
				details.push(line);
			}
			return { ...base, run: normalized, failed: true, detail: details.join("\n") };
		}
	}

	logInfo(`Cell ${cell} succeeded → ${outFile}`);
	return { ...base, run: normalized, failed: false };
}

if (import.meta.main) {
	const argv = process.argv.slice(2);
	// Flags that consume a separate operand — one source of truth so the discovery filter and the
	// positional-skip loop below can never enumerate different sets.
	const VALUE_FLAGS = ["--require", "--replicate"];
	const discovery = handleDiscovery(argv, HELP, VALUE_FLAGS);
	if (discovery !== null) {
		if (discovery.ok) {
			process.stdout.write(`${discovery.text}\n`);
			process.exit(0);
		}
		fail(discovery.text, { properties: { title: "bench-suite discovery" }, exitCode: 2 });
	}

	// Filter flags out before positional resolution so a trailing/misplaced flag (e.g.
	// `bench-suite daytona-vm cpu-node --json`) never gets captured as the runId. The VALUE_FLAGS above
	// are the ones that take a separate operand, so consume that operand too — otherwise
	// `--require daytona-vm` would leave `daytona-vm` behind to be read as the runId.
	const positionals: string[] = [];
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === undefined) continue;
		// Only the space-separated spelling needs the skip: `--require=<ids>`/`--replicate=<idx>` are
		// single tokens already dropped by the leading-`-` guard below. Both flags take a separate operand.
		if (VALUE_FLAGS.includes(arg)) {
			i++;
			continue;
		}
		if (arg.startsWith("-")) continue;
		positionals.push(arg);
	}
	const provider = positionals[0] ?? "daytona-vm";
	const suite = positionals[1] ?? "cpu-node";
	const runId = positionals[2] ?? `local-${Date.now()}`;
	const sha = process.env.GITHUB_SHA ?? "local";
	const cell = cellTitle(suite, provider);

	// A malformed replicate index must fail the cell before a sandbox is created: a shard stamped with
	// the wrong index would collide two sandboxes into one replicate slot at aggregate time.
	let replicateIndex: number | undefined;
	try {
		replicateIndex = parseReplicateFlag(argv);
	} catch (err) {
		fail(err instanceof Error ? err.message : String(err), {
			properties: { title: "bench-suite usage" },
			exitCode: 2,
		});
	}

	// The local newest-first Run index — a local convenience only (`leaderboard data/runs/<id>.json`
	// discovery). Nothing downstream reads it: the aggregate is handed explicit shard paths.
	const indexFile = join("data", "runs", "index.json");
	// Hoisted so the debug payload below can name them. They are the diagnostic an artifact-path
	// failure is read with — "which tree did it pull into, which file did it normalize to" — and
	// nothing else in the single-sandbox report carries rawRoot at all.
	const rawRoot = join("data", "raw", runId);
	const outFile = join("data", "runs", `${runId}.json`);
	// Pass the sliced argv explicitly rather than letting it default to `process.argv` (which also
	// carries the bun executable and script path), so the flag this bin parses is the flag the require
	// gate inside the replicate reads.
	const required = requiredProviders(argv);

	logInfo(`Benchmark cell ${cell}`);
	if (inActions()) {
		core.debug(
			JSON.stringify({
				provider,
				suite,
				runId,
				sha,
				replicate: replicateIndex ?? null,
				rawRoot,
				outFile,
				require: required,
			}),
		);
	}

	// Resolve the precise mise tasks + PTS pins before any sandbox runs, so the job summary can
	// name what this cell planned to execute (schema commands → mise task info → run_task leaves). It
	// is a property of the suite, not of a replicate, so it is resolved outside runReplicate.
	let taskPlan: SuiteTaskPlan | undefined;
	await withGroup(`Discover suite tasks (${suite})`, async () => {
		try {
			taskPlan = await describeSuiteTasks(suite);
			logInfo(`commands: ${taskPlan.commands.join(" · ")}`);
			for (const task of taskPlan.tasks) {
				const pts = task.ptsProfile ? ` pts=${task.ptsProfile}` : "";
				const prefix = task.resultsPrefix ? ` prefix=${task.resultsPrefix}` : "";
				logInfo(
					`${task.role} ${task.task}${task.description ? ` — ${task.description}` : ""}${pts}${prefix}`,
				);
			}
			if (inActions()) {
				for (const metric of taskPlan.metrics) {
					core.debug(
						`metric ${metric.id} label=${metric.label}` +
							(metric.ptsTest ? ` pts.test=${metric.ptsTest}` : ""),
					);
				}
			}
		} catch (err) {
			const msg = `Could not describe suite tasks for "${suite}": ${err instanceof Error ? err.message : String(err)}`;
			logWarning(msg, { title: cell });
		}
	});

	// One shard at the un-suffixed `data/runs/<runId>.json`, which bench-smoke.yml and
	// commit-dataset.yml both name directly — so the filename is a contract.
	const outcome = await runReplicate({
		provider,
		suite,
		runId,
		sha,
		rawRoot,
		outFile,
		indexFile,
		...(replicateIndex !== undefined ? { replicateIndex } : {}),
		required,
	});
	await reportCell({
		provider,
		suite,
		runId,
		sha,
		outFile: outcome.outFile,
		...(outcome.run ? { run: outcome.run } : {}),
		failed: outcome.failed,
		durationMs: outcome.durationMs,
		...(outcome.detail !== undefined ? { detail: outcome.detail } : {}),
		...(taskPlan ? { taskPlan } : {}),
	});
	if (outcome.failed) fail(outcome.detail ?? `Cell ${cell} failed`, { annotate: false });
}
