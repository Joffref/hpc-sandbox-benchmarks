import type { ProviderId } from "@sandbox-benchmarks/driver";
import { quotaDomain } from "@sandbox-benchmarks/schema";

/**
 * Reviewed inventory scopes (ADR-0011, ADR-0016), bound to the experiment's source revision.
 *
 * Fork-local deviation: `blaxel` is benchmark-scoped here, not account-scoped as upstream has it.
 * This fork benchmarks against a shared Blaxel dev workspace that also hosts unrelated sandboxes, so
 * account scope blocks every cell before allocation. Blaxel creates carry the `sandbox-benchmarks`
 * ownership label (packages/blaxel/src/index.ts), so reconciliation still only ever deletes
 * benchmark-owned sandboxes; foreign ones are counted and left alone.
 */
export function accountInventoryScope(id: ProviderId): "account" | "benchmark" {
	const account = quotaDomain(id);
	return account === "daytona" ||
		account === "novita" ||
		account === "modal" ||
		account === "blaxel"
		? "benchmark"
		: "account";
}
