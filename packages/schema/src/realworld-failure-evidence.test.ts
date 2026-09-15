import { afterEach, describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const runner = readFileSync(
	join(import.meta.dir, "../../../lib/pts/realworld/realworld-runner.sh"),
	"utf8",
);
// Exercise the production boundary without provisioning PTS or requiring a writable cgroup.
const bounded = runner.match(/^run_bounded\(\) \{\n[\s\S]*?^\}/m)?.[0];
if (!bounded) throw new Error("run_bounded not found in realworld runner");
const dirs: string[] = [];
afterEach(() => {
	for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function probe(code: string, counters = true) {
	const dir = mkdtempSync(join(tmpdir(), "realworld-evidence-"));
	dirs.push(dir);
	if (counters) writeFileSync(join(dir, "memory.events"), "max 12\noom 1\noom_kill 1\n");
	const wrapper = join(dir, "wrapper.ts");
	writeFileSync(wrapper, code);
	return Bun.spawnSync(
		[
			"sh",
			"-c",
			`${bounded}
# Forward the command without depending on GNU timeout on the test host.
timeout() { shift; shift; "$@"; }
# A plain task failure must never enter the timeout process sweep.
pkill() { echo UNEXPECTED_SWEEP >&2; }
run_bounded "$@"`,
			"failure-evidence",
			process.execPath,
			wrapper,
		],
		{ env: { ...process.env, TASK: "test_types", TASK_TIMEOUT_SECONDS: "1200", BENCH_CG: dir } },
	);
}

describe("realworld task failure evidence", () => {
	it("captures cgroup evidence when an upstream wrapper maps a killed child to exit 1", () => {
		const result = probe(`const child = Bun.spawnSync(["sh", "-c", "kill -KILL $$"]);
if (child.signalCode !== "SIGKILL") throw new Error("fixture child was not killed");
process.exit(1);`);
		expect(result.exitCode).toBe(1);
		expect(result.stderr.toString()).toContain("bench-cgroup: memory.events oom_kill 1");
		expect(result.stderr.toString()).not.toContain("UNEXPECTED_SWEEP");
	});

	it("preserves ordinary failures while recording available memory counters", () => {
		const result = probe("process.exit(7);");
		expect(result.exitCode).toBe(7);
		expect(result.stderr.toString()).toContain("bench-cgroup: memory.events max 12");
		expect(result.stderr.toString()).not.toContain("UNEXPECTED_SWEEP");
	});

	it("preserves failures on providers without readable cgroup counters", () => {
		const result = probe("process.exit(7);", false);
		expect(result.exitCode).toBe(7);
		expect(result.stderr.toString()).not.toContain("memory.events");
	});

	it("keeps successful commands quiet even when counters contain earlier events", () => {
		const result = probe('console.log("workload output");');
		expect(result.exitCode).toBe(0);
		expect(result.stdout.toString()).toBe("workload output\n");
		expect(result.stderr.toString()).toBe("");
	});
});
