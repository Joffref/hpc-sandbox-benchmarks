#!/usr/bin/env bun
// Untracked reproduction helper: issue the exact sandbox create the benchmark driver issues
// (packages/blaxel/src/index.ts blaxelSpec) against whatever control plane BL_ENV selects, print the
// control plane's answer, then delete the sandbox. Flags drop or change one parameter at a time so
// a "Sandbox deployment failed" can be bisected to the parameter the dev control plane rejects.
//
//   BL_ENV=dev BL_API_KEY=... BL_WORKSPACE=... bun scripts/blaxel-create-repro.ts            # driver request
//   bun scripts/blaxel-create-repro.ts --volume-mb 40960                                     # old fork size
//   bun scripts/blaxel-create-repro.ts --no-volume | --no-ttl | --no-labels
//   bun scripts/blaxel-create-repro.ts --region eu-lon-1 --image blaxel/ts-app:latest --memory 8192
import { randomUUID } from "node:crypto";
import { initialize, SandboxInstance } from "@blaxel/core";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const value = (name: string, fallback: string) => {
	const i = args.indexOf(name);
	return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};

initialize({ apikey: process.env.BL_API_KEY, workspace: process.env.BL_WORKSPACE });

const name = `benchmark-${randomUUID()}`;
const memory = Number(value("--memory", "8192"));
const volumeMb = Number(value("--volume-mb", String(40 * 1024 + 256)));
const request = {
	name,
	image: value("--image", "blaxel/ts-app:latest"),
	memory,
	region: value("--region", "us-was-1"),
	...(flag("--no-ttl") ? {} : { ttl: "10800s" }),
	...(flag("--no-labels")
		? {}
		: { labels: { "sandbox-benchmarks": "blaxel", "sandbox-benchmarks-attempt": name } }),
	...(flag("--no-volume")
		? {}
		: {
				volumes: [
					{
						name: `sbx-bench-${name.slice(-8)}`,
						mountPath: "/var/lib/phoronix-test-suite",
						type: "ephemeral" as const,
						sizeMb: volumeMb,
					},
				],
			}),
};

console.log(
	`BL_ENV=${process.env.BL_ENV ?? "(unset → prod)"} workspace=${process.env.BL_WORKSPACE}`,
);
console.log("create request:", JSON.stringify(request, null, 2));

const started = Date.now();
try {
	const sandbox = await SandboxInstance.create(
		request as Parameters<typeof SandboxInstance.create>[0],
	);
	const m = sandbox.metadata;
	console.log(`created in ${Date.now() - started} ms: name=${m.name} status=${sandbox.status}`);
	console.log("spec:", JSON.stringify(sandbox.spec, null, 2));

	// Replay prepareBlaxelSandbox (packages/blaxel/src/index.ts) step by step so the step that the
	// bridge reports only as "preparation and verification callback failed" is named here.
	if (!flag("--no-prepare")) {
		console.log("\n[1/3] keepalive: process.exec sleep infinity (keepAlive, no wait)");
		const keepalive = await sandbox.process.exec({
			name: "benchmark-keepalive",
			command: "sleep infinity",
			keepAlive: true,
			timeout: 0,
			waitForCompletion: false,
		});
		console.log("      status =", keepalive.status, '(driver requires "running")');

		console.log(
			"[2/3] memory: spec.runtime.memory =",
			sandbox.spec?.runtime?.memory,
			"(driver requires",
			memory,
			")",
		);

		console.log("[3/3] volume probe + arch");
		const probe = await sandbox.process.exec({
			command: `sh -c 'uname -m; df -Pk /var/lib/phoronix-test-suite | awk "NR==2 {print \\$2}"'`,
			waitForCompletion: true,
			timeout: 60,
		});
		console.log("      exit =", probe.exitCode, "status =", probe.status);
		console.log("      stdout =", JSON.stringify(probe.stdout ?? probe.logs));
		if (probe.stderr) console.log("      stderr =", JSON.stringify(probe.stderr));
	}
} catch (caught) {
	console.error(`create FAILED after ${Date.now() - started} ms`);
	console.error(caught);
	const body = (caught as { response?: unknown }).response;
	if (body !== undefined) console.error("response:", body);
	process.exitCode = 1;
} finally {
	try {
		await SandboxInstance.delete(name);
		console.log(`deleted ${name}`);
	} catch (caught) {
		console.error(`delete ${name} failed (may not exist):`, (caught as Error).message ?? caught);
	}
}
