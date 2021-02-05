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
    log('render scene navigation', data);
});

Hooks.on("renderMonksSceneNavigation", (app, html, data) => {
    $('.scene.view, .folder.expanded', html).prev().addClass('pre-view');
    log('render monks scene navigation', data);
});

export default function initSceneNavigation() {
    return class MonksSceneNavigation extends CONFIG.ui.nav {
        constructor(folder, options = {}) {
            super(options);
            //this.folderid = folder;
            //this.templatepath = "./modules/monks-scene-navigation/templates/" + (folder == undefined ? "subnavigation.html" : "navigation.html");
        }

        static get defaultOptions() {
            return mergeObject(super.defaultOptions, {
                id: "navigation",// + this.folderid,
                template: "./modules/monks-scene-navigation/templates/navigation.html",
                popOut: false,
                dragDrop: [{ dragSelector: ".scene,.folder" }]
            });
        }

        get scenes() {
            let folders = [];
            if (game.user.isGM) {
                folders = ui.scenes.folders.filter(f => {
                    return true;
                });
                folders.sort((a, b) => a.data.sort - b.data.sort - 1);
            }

            let scenes = game.scenes.entities.filter(s => {
                return ((s.data.navigation && s.visible) || s.active || s.isView); // || s.permission > 3
            });
            scenes.sort((a, b) => a.data.navOrder - b.data.navOrder);

            return folders.concat(scenes);
        }

        getData(options) {
            let groups = [];
            const allscenes = this.scenes;
            // Modify Scene data
            let mapScenes = function (folder) {
                let scenes = allscenes.filter(s => { return (s.data.parent || s.data.folder) == folder?._id || !game.user.isGM })   //flatten the scenes if not the GM
                    .map(s => {
                        if (s instanceof Scene) {
                            let users = game.users.entities
                                .filter(u => u.active && (u.viewedScene === s._id))
                                .map(u => { return { letter: u.name[0], color: u.data.color } });
                            if (folder && users.length)
                                folder.users = (folder.users || []).concat(users);

                            if (folder == undefined || folder?.navopen) {
                                if (folder && users.length)
                                    folder.users = (folder.users || []).concat(users);
                                let data = duplicate(s.data);
                                data.name = TextEditor.truncateText(data.navName || data.name, { maxLength: 32 });
                                data.users = users;
                                data.visible = (game.user.isGM || s.owner || s.active);
                                data.css = [
                                    s.isView ? "view" : null,
                                    s.active ? "active" : null,
                                    data.permission.default === 0 ? "gm" : null
                                ].filter(c => !!c).join(" ");
                                return data;
                            } else
                                return {};
                        } else if(game.user.isGM) { //only tranverse the folders if it's the GM
                            let data = {}
                            if (folder == undefined || folder?.navopen) {
                                data = duplicate(s.data);
                                data.name = TextEditor.truncateText(data.navName || data.name, { maxLength: 32 });
                                data.visible = game.user.isGM;
                                data.css = [
                                    s.data.navopen ? "expanded" : null, "gm"
                                ].filter(c => !!c).join(" ");
                                data.directory = true;
                            } else {
                                data._id = s.data._id;
                                data.navopen = s.data.navopen;
                            }

                            mapScenes(data);
                            return data;
                        }
                    });

                if(folder == undefined || folder.navopen)
                    groups.push({ folder: folder?._id, scenes: scenes });
            }
            mapScenes();

            if (groups.length == 0)
                groups = [{}];
            else
                groups.reverse();

            log('get data', allscenes, groups);

            // Return data for rendering
            return {
                collapsed: this._collapsed,
                groups: groups
            }
        }

        activateListeners(html) {
            super.activateListeners(html);

            // Click event listener
            const folders = html.find('.folder');
            folders.click(this._onClickFolder.bind(this));
        }

        _getContextMenuOptions() {
            let contextmenu = super._getContextMenuOptions();
            let menu = contextmenu.find(m => { return m.name == "SCENES.ToggleNav" });
            if (menu != undefined)
                menu.name = "MONKSCENENAVIGATION.RemoveNav";

            return contextmenu;
        }

        _onClickFolder(event) {
            event.preventDefault();
            let folderId = event.currentTarget.dataset.folderId;

            log('Click on a folder');

            let scenes = this.scenes
            let folder = scenes.find(f => f.id == folderId);

            let updates = scenes.filter(f => {
                return f instanceof Folder && f.data.parent == folder.data.parent && f.data.navopen && f._id != folder._id
            }).map(f => { return { _id: f.id, navopen: false } });
            updates.push({ _id: folder.id, navopen: !folder.data.navopen });
            Folder.update(updates);
            //folder.update({ navopen: !folder.data.navopen });
            //for (let item of prevopen) {
            //    item.update({ navopen: false });
            //}
            //this.render(true);
        }
    }
}

Hooks.on("init", () => {
    let oldContext = SceneDirectory.prototype._getEntryContextOptions;
    SceneDirectory.prototype._getEntryContextOptions = function () {
        let options = oldContext.call(this);
        let idx = options.findIndex(o => o.name === "SIDEBAR.Duplicate");
        if (idx != -1) {
            var permission = {
                name: "PERMISSION.Configure",
                icon: '<i class="fas fa-lock"></i>',
                condition: () => game.user.isGM,
                callback: li => {
                    const entity = this.constructor.collection.get(li.data("entityId"));
                    new PermissionControl(entity, {
                        top: Math.min(li[0].offsetTop, window.innerHeight - 350),
                        left: window.innerWidth - 720
                    }).render(true);
                }
            };
            options.splice(idx + 1, 0, permission);
        }
    
        return options;
    }
});

Hooks.on("renderPermissionControl", (app, html, options) => {
    if (app.object instanceof Scene) {
        $('option[value="1"],option[value="2"]', html).remove();
        $('option[value="3"]', html).html('Observer');

    }
});


