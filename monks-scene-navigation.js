import { registerSettings } from "./settings.js";
//import initSceneNavigation from "./js/entity.js";

export let debug = (...args) => {
    if (debugEnabled > 1) console.log("DEBUG: monks-scene-navigation | ", ...args);
};
export let log = (...args) => console.log("monks-scene-navigation | ", ...args);
export let warn = (...args) => {
    if (debugEnabled > 0) console.warn("monks-scene-navigation | ", ...args);
};
export let error = (...args) => console.error("monks-scene-navigation | ", ...args);
export let i18n = key => {
    return game.i18n.localize(key);
};

Hooks.once('init', async function () {
    log('Initializing Monks Scene Navigation');
    registerSettings();

    const msn = initSceneNavigation();
    CONFIG.ui.nav = msn;
});

Hooks.on("renderSceneNavigation", (app, html, data) => {
    $(html).addClass('monks-scene-navigation');
    log('render scene navigation', data);
});

export default function initSceneNavigation() {
    return class MonksSceneNavigation extends CONFIG.ui.nav {
        constructor(folder) {
            super();
            this.folderid = folder;
            this.templatepath = "./modules/monks-scene-navigation/templates/" + (folder == undefined ? "subnavigation.html" : "navigation.html");
        }

        static get defaultOptions() {
            return mergeObject(super.defaultOptions, {
                id: "navigation" + this.folderid,
                template: "templates/hud/navigation.html",//this.templatepath,
                popOut: false,
                dragDrop: [{ dragSelector: ".scene" }]
            });
        }

        get scenes() {
            //make sure that 
            let scenes = game.scenes.entities.filter(s => {
                return ((s.data.navigation && s.visible) || s.active || s.isView) && s.data.folder == this.folderid;
            });
            const folders = ui.scenes.folders.filter(f => {
                return f?.parent?.id == this.folderid;
            });
            scenes = scenes.concat(folders);

            scenes.sort((a, b) => a.data.navOrder - b.data.navOrder);
            return scenes;
        }

        getData(options) {

            // Modify Scene data
            const scenes = this.scenes.map(s => {
                if (s instanceof Scene) {
                    let data = duplicate(s.data);
                    let users = game.users.entities.filter(u => u.active && (u.viewedScene === s._id));
                    data.name = TextEditor.truncateText(data.navName || data.name, { maxLength: 32 });
                    data.users = users.map(u => { return { letter: u.name[0], color: u.data.color } });
                    data.visible = (game.user.isGM || s.owner || s.active);
                    data.css = [
                        s.isView ? "view" : null,
                        s.active ? "active" : null,
                        data.permission.default === 0 ? "gm" : null
                    ].filter(c => !!c).join(" ");
                    return data;
                } else {
                    let data = duplicate(s.data);
                    data.name = TextEditor.truncateText(data.navName || data.name, { maxLength: 32 });
                    data.visible = (game.user.isGM || s.owner || s.active);
                    data.css = [
                        s.expanded ? "expanded" : null,
                        s.permission === 0 ? "gm" : null
                    ].filter(c => !!c).join(" ");
                    data.directory = true;
                    return data;
                }
            });

            // Return data for rendering
            return {
                collapsed: this._collapsed,
                scenes: scenes
            }
        }
    }
}


