// pi-zentui 0.22.3 honors gitCounts for stash and remote divergence, but not
// per-file status categories. Keep this idempotent consumer patch until upstream ships the fix.
const fs = require("node:fs");
const path = require("node:path");

const target = path.resolve(
	__dirname,
	"../node_modules/pi-zentui/extensions/zentui/footer.ts",
);
if (!fs.existsSync(target)) {
	throw new Error(`pi-zentui footer source not found: ${target}`);
}

const before = [
	"\t\t\t\tconst gitCounts = config.components.footer.styles.starship.segments.gitCounts;",
	"\t\t\t\tconst stashLabel =",
	"\t\t\t\t\tstate.stashed > 0",
	"\t\t\t\t\t\t? gitCounts",
	"\t\t\t\t\t\t\t? `${config.icons.stashed}${state.stashed}`",
	"\t\t\t\t\t\t\t: config.icons.stashed",
	"\t\t\t\t\t\t: \"\";",
	"\t\t\t\tconst allStatus = [",
	"\t\t\t\t\tstate.conflicted > 0 ? config.icons.conflicted : \"\",",
	"\t\t\t\t\tstashLabel,",
	"\t\t\t\t\tstate.deleted > 0 ? config.icons.deleted : \"\",",
	"\t\t\t\t\tstate.renamed > 0 ? config.icons.renamed : \"\",",
	"\t\t\t\t\tstate.modified > 0 ? config.icons.modified : \"\",",
	"\t\t\t\t\tstate.typechanged > 0 ? config.icons.typechanged : \"\",",
	"\t\t\t\t\tstate.staged > 0 ? config.icons.staged : \"\",",
	"\t\t\t\t\tstate.untracked > 0 ? config.icons.untracked : \"\",",
	"\t\t\t\t].join(\"\");",
].join("\n");

const after = [
	"\t\t\t\tconst gitCounts = config.components.footer.styles.starship.segments.gitCounts;",
	"\t\t\t\tconst gitStatusLabel = (icon: string, count: number) =>",
	"\t\t\t\t\tcount > 0 ? `${icon}${gitCounts ? count : \"\"}` : \"\";",
	"\t\t\t\tconst allStatus = [",
	"\t\t\t\t\tgitStatusLabel(config.icons.conflicted, state.conflicted),",
	"\t\t\t\t\tgitStatusLabel(config.icons.stashed, state.stashed),",
	"\t\t\t\t\tgitStatusLabel(config.icons.deleted, state.deleted),",
	"\t\t\t\t\tgitStatusLabel(config.icons.renamed, state.renamed),",
	"\t\t\t\t\tgitStatusLabel(config.icons.modified, state.modified),",
	"\t\t\t\t\tgitStatusLabel(config.icons.typechanged, state.typechanged),",
	"\t\t\t\t\tgitStatusLabel(config.icons.staged, state.staged),",
	"\t\t\t\t\tgitStatusLabel(config.icons.untracked, state.untracked),",
	"\t\t\t\t].join(\"\");",
].join("\n");

const source = fs.readFileSync(target, "utf8");
if (source.includes(after)) {
	console.log("pi-zentui git-count patch already applied");
	process.exit(0);
}
if (!source.includes(before)) {
	throw new Error(
		"pi-zentui footer implementation changed; review the git-count patch before reinstalling",
	);
}
fs.writeFileSync(target, source.replace(before, after));
console.log("applied pi-zentui git-count patch");
