import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { providerIdSchema, quotaDomain, suiteNameSchema } from "@sandbox-benchmarks/schema";
import { type } from "arktype";
import type { AccountJournal } from "./account-journal.ts";
import { accountRecordSchema } from "./account-journal.ts";
import type { AccountDriver } from "./account-reconciliation.ts";
import { reconcileAccount } from "./account-reconciliation.ts";
import { readExperimentAttempt } from "./experiment-artifacts.ts";

/**
 * A create the vendor REJECTED, leaving an intent no allocation can resolve.
 *
 * The intent append happens before create, so a rejected create leaves `intent` alone in the journal.
 * The executor now closes that itself (a cleanly rejected create appends `released/not-allocated`),
 * but attempts recorded before that fix left the intent open, and `recoverAccount` refuses them:
 * there is no durable sandbox identity to confirm removal against. Neither sibling recovery fits —
 * identity-based recovery needs a retained `allocation.json`, and the completed-create clearance is
 * pinned to one historical revision.
 *
 * So this replays the append that was lost rather than asserting anything new: the record written is
 * the same `released/not-allocated` the fixed executor writes. What makes that safe is proving the
 * account holds nothing — a rejected create that actually leaked would surface as an owned sandbox in
 * reconciliation, and this refuses to clear the intent when one does.
 *
 * An explicit operator command under exclusive account ownership; never part of admission.
 */
const rejectedMarker = type({
	provider: providerIdSchema,
	suite: suiteNameSchema,
	outcome: "'failed'",
	reason: "string >= 1",
	cause: { kind: "'sandbox-create-failed'", detail: "string >= 1" },
}).onUndeclaredKey("delete");

export async function recoverRejectedCreate(options: {
	directory: string;
	provider: typeof providerIdSchema.infer;
	suite: typeof suiteNameSchema.infer;
	drivers: readonly AccountDriver[];
	journal: AccountJournal;
	/** Recheck that the original workflow terminated and no allocating workflows can run. */
	assertQuiescent: (workflowRun: string, sourceSha: string) => Promise<void>;
	signal: AbortSignal;
}): Promise<void> {
	const { evidence, execution, cleanup } = readExperimentAttempt(options.directory);
	if (
		evidence.outcome !== "failed" ||
		evidence.measurementStarted ||
		evidence.cleanup !== "unresolved" ||
		!evidence.rawDigest ||
		execution ||
		cleanup
	)
		throw new Error("attempt does not prove an unresolved create rejection");
	// A retained allocation means create RETURNED a sandbox and only the append failed. That is a
	// known resource with its own recovery, and clearing it here would abandon a live sandbox.
	if (existsSync(join(options.directory, "raw", "allocation.json")))
		throw new Error("attempt retains allocation.json; recover with recover-allocated-intent");
	const marker = rejectedMarker.assert(
		JSON.parse(
			readFileSync(
				join(
					options.directory,
					"raw",
					options.provider,
					options.suite,
					`sandbox-${options.provider}-${options.suite}--failed.json`,
				),
				"utf8",
			),
		),
	);
	if (
		marker.provider !== options.provider ||
		marker.suite !== options.suite ||
		!evidence.cellId.startsWith(`${marker.provider}-${marker.suite}-r`)
	)
		throw new Error("recovery marker identity mismatch");
	const account = quotaDomain(options.provider);
	// Reconciliation proves absence for the whole account, so it may only clear an account whose
	// every provider is reconciled here; a shared quota domain's other variants are not covered.
	if (
		account !== options.provider ||
		options.drivers.length !== 1 ||
		options.drivers[0]?.id !== options.provider
	)
		throw new Error("rejected-create recovery requires the complete single-provider account");
	const readIntent = async () => {
		const records = (await options.journal.read(account))
			.map((record) => accountRecordSchema.assert(record))
			.filter((record) => record.attempt === evidence.id);
		const intent = records[0];
		if (
			records.length !== 1 ||
			intent?.kind !== "intent" ||
			intent.account !== account ||
			intent.cellId !== evidence.cellId ||
			intent.planDigest !== evidence.planDigest
		)
			throw new Error("recovery requires a matching unresolved intent without allocation evidence");
		return intent;
	};
	await readIntent();
	await options.assertQuiescent(evidence.workflowRun, evidence.sha);
	const reconciliation = await reconcileAccount(options.drivers, {
		timeoutMs: 180_000,
		signal: options.signal,
	});
	// The rejection claimed nothing was allocated. An owned sandbox contradicts that, and the leak
	// must be recovered against its own identity instead of cleared here.
	if (reconciliation.removed.length > 0)
		throw new Error(
			`account held ${reconciliation.removed.length} owned sandbox(es); the create was not cleanly rejected`,
		);
	await options.assertQuiescent(evidence.workflowRun, evidence.sha);
	const intent = await readIntent();
	options.signal.throwIfAborted();
	await options.journal.append(
		accountRecordSchema.assert({ ...intent, kind: "released", outcome: "not-allocated" }),
	);
}
