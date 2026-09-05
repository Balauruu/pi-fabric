const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const createJiti = require("../node_modules/jiti");

const profileRoot = path.resolve(__dirname, "../..");
const sourceRoot = path.join(__dirname, "../node_modules/pi-zentui/extensions/zentui");
const jiti = createJiti(__filename);
const { installFooter } = jiti(path.join(sourceRoot, "footer.ts"));
const { mergeConfig } = jiti(path.join(sourceRoot, "config.ts"));
const { createInitialState } = jiti(path.join(sourceRoot, "state.ts"));
const { emptyGitStatus } = jiti(path.join(sourceRoot, "git.ts"));

function renderGitStatus(gitCounts) {
	const config = mergeConfig(
		JSON.parse(fs.readFileSync(path.join(profileRoot, "zentui.json"), "utf8")),
	);
	config.components.footer.styles.starship.format = "$git_status";
	config.components.footer.styles.starship.responsive = false;
	config.components.footer.styles.starship.segments.gitStatus = true;
	config.components.footer.styles.starship.segments.gitCounts = gitCounts;

	const state = createInitialState(emptyGitStatus());
	Object.assign(state, { branch: "main", dirty: true, modified: 2 });

	let footerFactory;
	const ctx = {
		cwd: profileRoot,
		model: undefined,
		getContextUsage: () => ({ tokens: 0, contextWindow: 100_000, percent: 0 }),
		sessionManager: {
			getSessionName: () => undefined,
			getBranch: () => [],
		},
		ui: {
			setFooter: (factory) => {
				footerFactory = factory;
			},
		},
	};
	installFooter(ctx, state, () => config, {
		setRequestRender() {},
		scheduleProjectRefresh() {},
	});
	assert.equal(typeof footerFactory, "function", "footer factory should be installed");

	const passthroughTheme = new Proxy(
		{},
		{ get: () => (...args) => String(args.at(-1) ?? "") },
	);
	const component = footerFactory(
		{ requestRender() {} },
		passthroughTheme,
		{
			getExtensionStatuses: () => new Map(),
			onBranchChange: () => () => {},
		},
	);
	return { config, rendered: component.render(120).join("\n").trim() };
}

const counted = renderGitStatus(true);
assert.match(
	counted.rendered,
	new RegExp(`\\[${escapeRegex(counted.config.icons.modified)}2\\]`),
	"gitCounts=true should append each category count to its icon",
);

const uncounted = renderGitStatus(false);
assert.match(
	uncounted.rendered,
	new RegExp(`\\[${escapeRegex(uncounted.config.icons.modified)}\\]`),
	"gitCounts=false should preserve the icon-only status",
);

console.log("pi-zentui git count regression: PASS");

function escapeRegex(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
