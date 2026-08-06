import { describe, expect, it } from "bun:test";
import { SUITES } from "@sandbox-benchmarks/schema";
import { REPO_URL, setupSteps } from "./setup.ts";

describe("setupSteps", () => {
	const labels = setupSteps(SUITES["cpu-node"]).map((step) => step.label);

	it("clones the repo and brings the toolchain up (node + PTS for cpu-node)", () => {
		expect(labels).toEqual([
			"install base packages",
			"clone repo",
			"install mise",
			"trust mise config",
			"setup node 22 + pnpm 10",
			"ensure PTS build deps + fresh apt index",
			"setup phoronix-test-suite",
		]);
	});

	it("refreshes apt + build deps for every PTS suite, including a stale baked image", () => {
		const ptsStep = setupSteps(SUITES["cpu-node"]).find(
			(step) => step.label === "ensure PTS build deps + fresh apt index",
		);
		expect(ptsStep?.script).toMatch(/apt-get.*update/);
		expect(ptsStep?.script).toContain("autoconf");
		expect(ptsStep?.script).not.toContain("command -v phoronix-test-suite");
	});

	it("includes fast-cli's Puppeteer/Chrome runtime libs in the stock-image PTS deps fallback", () => {
		// Regression guard for the class of bug fixed in a2dd493: this list must stay in lockstep with
		// packages/templates/images/base/scripts/00-apt.sh's Chrome/Puppeteer block, or a stock-image
		// provider (e.g. modal) crashes fast-cli's freshly-downloaded Chrome with a missing-.so error.
		const ptsStep = setupSteps(SUITES["cpu-node"]).find(
			(step) => step.label === "ensure PTS build deps + fresh apt index",
		);
		for (const chromeDep of [
			"libglib2.0-0",
			"libnss3",
			"libgtk-3-0",
			"libx11-6",
			"fonts-liberation",
			"libasound2",
			"libatk-bridge2.0-0",
			"libcairo2",
			"libgbm1",
			"libxcomposite1",
			"libxdamage1",
			"libxrandr2",
			"xdg-utils",
		]) {
			expect(ptsStep?.script).toContain(chromeDep);
		}
	});

	it("does not install repository developer tools inside benchmark sandboxes", () => {
		expect(labels).not.toContain("mise install");
		const nodeStep = setupSteps(SUITES["cpu-node"]).find(
			(step) => step.label === "setup node 22 + pnpm 10",
		);
		expect(nodeStep?.script).toContain('cd "$HOME"');
		expect(nodeStep?.script).toContain("mise use --global");
		expect(nodeStep?.script).toContain("node@22.22.3");
		expect(nodeStep?.script).toContain('npm install --global --prefix "$HOME/.local" pnpm@10.34.3');
		expect(nodeStep?.script).not.toMatch(/mise use[^&]*pnpm/);
		expect(nodeStep?.script).not.toContain(`cd "$HOME/sandbox-benchmarks" && mise use`);
	});

	it("checksum-verifies the pinned mise fallback without executing a remote installer", () => {
		const miseStep = setupSteps(SUITES["cpu-node"]).find((step) => step.label === "install mise");
		expect(miseStep?.script).toContain("sha256sum -c -");
		expect(miseStep?.script).toContain("mise-v2026.5.16-linux-$a.tar.gz");
		expect(miseStep?.script).not.toContain("mise.run");
		// The pin must name the extracted EXECUTABLE, not the archive, so this fallback keeps the same
		// trust anchor as the toolchain image's direct-binary fetch (05-mise-binary.sh / pins.ts).
		expect(miseStep?.script).toContain('"$sha" "$tmp/mise/bin/mise"');
		// Extract one member path only — never the whole archive, which would let a crafted tarball
		// write outside the temp dir.
		expect(miseStep?.script).toContain("tar -xzf");
		expect(miseStep?.script).toContain("mise/bin/mise");
	});

	it("time-bounds every setup download so a stalled connection cannot eat the step timeout", () => {
		// Regression guard for run 31064232149, where 8 of 9 suites died on `Step "install mise" timed
		// out after 300s`: curl with retries but no --max-time never abandons a stalled transfer, so it
		// neither fails nor retries — it consumes the whole step budget, three times over. Every
		// download that runs inside a sandbox needs a per-attempt cap AND a --retry-max-time window,
		// since curl resets --max-time on each retry (see lib/bench.sh seed_pts_download_cache).
		//
		// Match an invocation (`curl -…`), not the bare word: "install base packages" names curl as a
		// package and probes for it with `command -v curl`, neither of which transfers anything.
		const downloads = setupSteps(SUITES["cpu-node"]).filter((step) =>
			/\bcurl\s+-/.test(step.script),
		);
		expect(downloads.map((step) => step.label)).toEqual([
			"install mise",
			"setup phoronix-test-suite",
		]);
		for (const step of downloads) {
			expect(step.script, `${step.label} needs --connect-timeout`).toContain("--connect-timeout");
			expect(step.script, `${step.label} needs --max-time`).toMatch(/\s--max-time \d+/);
			expect(step.script, `${step.label} needs --retry-max-time`).toContain("--retry-max-time");
		}
	});

	it("emits syntactically valid shell for every setup step", () => {
		for (const step of setupSteps(SUITES["cpu-node"])) {
			const result = Bun.spawnSync(["bash", "-n", "-c", step.script]);
			expect(result.exitCode, `${step.label}: ${result.stderr.toString()}`).toBe(0);
		}
	});

	it("clones this repo by default, so the in-sandbox producer matches the harness", () => {
		expect(REPO_URL).toContain("sandbox-benchmarks");
	});

	it("omits node/PTS setup for a bare suite", () => {
		const bare = setupSteps({
			commandTimeoutMinutes: 1,
			timeoutMinutes: 1,
			dimensions: [],
			metrics: [],
			commands: [],
		}).map((step) => step.label);
		expect(bare).not.toContain("setup node 22 + pnpm 10");
		expect(bare).not.toContain("setup phoronix-test-suite");
	});
});
