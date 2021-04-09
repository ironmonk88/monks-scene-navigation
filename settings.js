export const registerSettings = function () {
	// Register any custom module settings here
	let modulename = "monks-scene-navigation";
	
	game.settings.register(modulename, "click-to-view", {
		name: game.i18n.localize("MonksSceneNavigation.click-to-view.name"),
		hint: game.i18n.localize("MonksSceneNavigation.click-to-view.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});
	game.settings.register(modulename, "scene-indicator", {
		name: game.i18n.localize("MonksSceneNavigation.scene-indicator.name"),
		hint: game.i18n.localize("MonksSceneNavigation.scene-indicator.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});
	game.settings.register(modulename, "folder-position", {
		name: game.i18n.localize("MonksSceneNavigation.folder-position.name"),
		hint: game.i18n.localize("MonksSceneNavigation.folder-position.hint"),
		scope: "world",
		config: true,
		default: "back",
		choices: {
			'front': game.i18n.localize("MonksSceneNavigation.folder-position.front"),
			'back': game.i18n.localize("MonksSceneNavigation.folder-position.back"),
		},
		type: String
	});
	game.settings.register(modulename, "player-folders", {
		name: game.i18n.localize("MonksSceneNavigation.player-folders.name"),
		hint: game.i18n.localize("MonksSceneNavigation.player-folders.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
	});
	game.settings.register(modulename, "display-background", {
		name: game.i18n.localize("MonksSceneNavigation.display-background.name"),
		hint: game.i18n.localize("MonksSceneNavigation.display-background.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
		onChange: () => {
			location.reload();
		}
	});
};
