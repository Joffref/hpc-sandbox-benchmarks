import { afterEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SandboxDriver } from "@sandbox-benchmarks/driver";
import { evidenceDigest } from "@sandbox-benchmarks/results";
import type { ExperimentAttempt } from "@sandbox-benchmarks/schema";
import type { AccountRecord } from "./account-journal.ts";
import { recoverAccount } from "./account-journal.ts";
import { rawTreeDigest } from "./experiment-artifacts.ts";
import { recoverRejectedCreate } from "./rejected-create-recovery.ts";

const SOURCE = "b".repeat(40);
const directories: string[] = [];
afterEach(() => {
	for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function fixture() {
	const directory = mkdtempSync(join(tmpdir(), "rejected-create-"));
	directories.push(directory);
	const raw = join(directory, "raw");
	mkdirSync(join(raw, "tama", "realworld-openclaw"), { recursive: true });
	const marker = join(
		raw,
		"tama",
		"realworld-openclaw",
		"sandbox-tama-realworld-openclaw--failed.json",
	);
	writeFileSync(
		marker,
		JSON.stringify({
			provider: "tama",
			suite: "realworld-openclaw",
			outcome: "failed",
			reason: "Failed to create sandbox: tama new bench-1 …: exit 1; failed to provision",
			cause: { kind: "sandbox-create-failed", detail: "bench-1 failed to provision" },
		}),
	);
	const run = {
		schemaVersion: "6",
		runId: "456",
		sha: SOURCE,
		generatedAt: "2026-09-12T00:00:00Z",
		targetSpec: { vcpus: 4, memoryGb: 8 },
		providers: [],
	};
	writeFileSync(join(directory, "run.json"), JSON.stringify(run));
	const evidence: ExperimentAttempt = {
		schemaVersion: "1",
		id: "attempt-1",
		cellId: "tama-realworld-openclaw-r4",
		planDigest: `sha256:${"a".repeat(64)}`,
		sha: SOURCE,
		workloadRevision: "realworld-openclaw",
		environmentRevision: "env",
		artifactIdentity: "image",
		passes: 1,
		workflowRun: "456",
		workflowAttempt: 1,
		job: "bench",
		sequence: 0,
		outcome: "failed",
		measurementStarted: false,
		retryable: false,
		cleanup: "unresolved",
		completion: "unknown",
		runDigest: evidenceDigest(run),
		rawDigest: rawTreeDigest(raw),
	};
	const save = () => writeFileSync(join(directory, "attempt.json"), JSON.stringify(evidence));
	save();
	const records: AccountRecord[] = [
		{
			version: "1",
			kind: "intent",
			account: "tama",
			attempt: evidence.id,
			cellId: evidence.cellId,
			planDigest: evidence.planDigest,
		},
	];
	const events: string[] = [];
	let owned: SandboxRefList = [];
	const driver: SandboxDriver = {
		create: async () => {
			throw new Error("must not allocate");
		},
		inventory: {
			list: async () => {
				events.push("inventory");
				return { owned, foreignCount: 0 };
			},
		},
		probes: { observe: async () => ({ state: "absent" }) },
		destroyById: async () => {
			owned = [];
		},
	};
	const journal = {
		read: async () => records,
		append: async (record: AccountRecord) => {
			events.push("release");
			records.push(record);
		},
	};
	const options = {
		directory,
		provider: "tama" as const,
		suite: "realworld-openclaw" as const,
		drivers: [{ id: "tama" as const, driver }],
		journal,
		assertQuiescent: async () => {
			events.push("quiescent");
		},
		signal: AbortSignal.timeout(1000),
	};
	return {
		options,
		records,
		events,
		evidence,
		save,
		marker,
		driver,
		hold: (refs: SandboxRefList) => {
			owned = refs;
		},
	};
}
type SandboxRefList = { provider: "tama"; id: string }[];

test("releases the intent as not-allocated, leaving the attempt and the journal consistent", async () => {
	const f = fixture();
	const original = readFileSync(join(f.options.directory, "attempt.json"), "utf8");
	await recoverRejectedCreate(f.options);
	expect(f.events).toEqual(["quiescent", "inventory", "inventory", "quiescent", "release"]);
	expect(f.records.at(-1)).toEqual({
		version: "1",
		kind: "released",
		outcome: "not-allocated",
		account: "tama",
		attempt: f.evidence.id,
		cellId: f.evidence.cellId,
		planDigest: f.evidence.planDigest,
	});
	// The recovery is evidence, not a rewrite: the failed attempt is untouched.
	expect(readFileSync(join(f.options.directory, "attempt.json"), "utf8")).toBe(original);
	// The whole point: admission accepts the account afterwards.
	await recoverAccount("tama", new Map([["tama", f.driver]]), f.options.journal, f.options.signal);
});

test("refuses an account still holding an owned sandbox — the create was not cleanly rejected", async () => {
	const f = fixture();
	f.hold([{ provider: "tama", id: "bench-1" }]);
	expect(recoverRejectedCreate(f.options)).rejects.toThrow(/not cleanly rejected/);
	expect(f.records).toHaveLength(1);
});

test("defers to identity-based recovery when the attempt retained an allocation", async () => {
	const f = fixture();
	writeFileSync(
		join(f.options.directory, "raw", "allocation.json"),
		JSON.stringify({
			version: "1",
			kind: "allocated",
			account: "tama",
			attempt: f.evidence.id,
			cellId: f.evidence.cellId,
			planDigest: f.evidence.planDigest,
			ref: { provider: "tama", id: "bench-1" },
		}),
	);
	// The retained allocation is part of the raw tree, so its digest covers it.
	f.evidence.rawDigest = rawTreeDigest(join(f.options.directory, "raw"));
	f.save();
	expect(recoverRejectedCreate(f.options)).rejects.toThrow(/recover-allocated-intent/);
	expect(f.records).toHaveLength(1);
});

for (const change of [
	"measured",
	"resolved",
	"marker",
	"identity",
	"released",
	"variant",
] as const) {
	test(`refuses to clear a ${change} attempt`, async () => {
		const f = fixture();
		if (change === "measured") {
			f.evidence.measurementStarted = true;
			f.save();
		}
		if (change === "resolved") {
			f.evidence.cleanup = "confirmed";
			f.save();
		}
		if (change === "marker")
			writeFileSync(
				f.marker,
				JSON.stringify({
					provider: "tama",
					suite: "realworld-openclaw",
					outcome: "failed",
					reason: "teardown failed",
					cause: { kind: "sandbox-teardown-failed", detail: "teardown failed" },
				}),
			);
		if (change === "identity") {
			f.evidence.cellId = "tama-memory-r4";
			f.save();
		}
		if (change === "released")
			f.records.push({
				version: "1",
				kind: "released",
				outcome: "not-allocated",
				account: "tama",
				attempt: f.evidence.id,
				cellId: f.evidence.cellId,
				planDigest: f.evidence.planDigest,
			});
		const options =
			change === "variant"
				? { ...f.options, drivers: [...f.options.drivers, ...f.options.drivers] }
				: f.options;
		expect(recoverRejectedCreate(options)).rejects.toThrow();
		expect(f.records.filter((record) => record.kind === "released")).toHaveLength(
			change === "released" ? 1 : 0,
		);
	});
}
