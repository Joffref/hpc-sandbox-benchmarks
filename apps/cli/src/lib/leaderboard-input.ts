import { dirname, resolve } from "node:path";
import type { LeaderboardDataset } from "@sandbox-benchmarks/results";
import { combineLeaderboardDatasets } from "@sandbox-benchmarks/results";
import { parseRun } from "@sandbox-benchmarks/schema";

/** A single Run, or a manifest array of paths relative to the manifest. */
export async function loadLeaderboardInput(
	path: string,
	cohortReview?: string,
): Promise<LeaderboardDataset> {
	const input: unknown = await Bun.file(path).json();
	if (!Array.isArray(input)) return parseRun(input);
	if (!input.length || !input.every((entry) => typeof entry === "string" && entry.length > 0)) {
		throw new Error("Dataset manifest must be a non-empty array of Run file paths");
	}
	const runs = await Promise.all(
		input.map(async (entry: string) =>
			parseRun(await Bun.file(resolve(dirname(path), entry)).json()),
		),
	);
	return combineLeaderboardDatasets(runs, { cohortReview });
}
