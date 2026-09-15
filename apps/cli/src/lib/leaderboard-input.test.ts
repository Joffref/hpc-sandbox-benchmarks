import { expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { aggregate } from "@sandbox-benchmarks/schema";
import { loadLeaderboardInput } from "./leaderboard-input.ts";

it("loads paths relative to the manifest and records every source instead of silently picking one", async () => {
	const directory = mkdtempSync(join(tmpdir(), "leaderboard-input-"));
	try {
		for (const runId of ["a", "b"])
			await Bun.write(
				join(directory, `${runId}.json`),
				JSON.stringify({
					schemaVersion: "3",
					runId,
					sha: "test",
					generatedAt: "2026-09-14T00:00:00.000Z",
					targetSpec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
					providers: [
						{
							providerId: "e2b",
							validationStatus: "validated",
							observedSpecs: {},
							suitesCovered: ["cpu-node"],
							gaps: [],
							uncatalogued: [],
							metrics: [
								{
									metricId: "node_web_tooling_runs_per_s",
									samples: [1],
									aggregates: aggregate([1]),
									sourceFile: "cpu-node/pts.xml",
								},
							],
						},
					],
				}),
			);
		const path = join(directory, "inputs.json");
		await Bun.write(path, JSON.stringify(["a.json", "b.json"]));
		await expect(loadLeaderboardInput(path)).rejects.toThrow("cohort");
		const data = await loadLeaderboardInput(path, "Reviewed fixture");
		expect(data.sources?.map((source) => source.runId)).toEqual(["a", "b"]);
		expect(data.providers[0]?.metrics[0]?.replicates).toHaveLength(2);
		const cli = Bun.spawn(
			[
				process.execPath,
				new URL("../bin/leaderboard.ts", import.meta.url).pathname,
				path,
				"--cohort-review",
				"Reviewed fixture",
			],
			{ stdout: "pipe", stderr: "pipe" },
		);
		const [output, errors, code] = await Promise.all([
			new Response(cli.stdout).text(),
			new Response(cli.stderr).text(),
			cli.exited,
		]);
		expect(code, errors).toBe(0);
		expect(output).toContain("Combined dataset analysis");
		await Bun.write(path, "[]");
		await expect(loadLeaderboardInput(path)).rejects.toThrow("must be non-empty");
		// A repeated path is named where the operator wrote it; see datasetManifestSchema.
		await Bun.write(path, JSON.stringify(["a.json", "a.json"]));
		await expect(loadLeaderboardInput(path, "Reviewed fixture")).rejects.toThrow(
			"distinct Run paths (repeated: a.json)",
		);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});
