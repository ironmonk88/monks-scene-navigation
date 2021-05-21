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
export let setting = key => {
    return game.settings.get("monks-scene-navigation", key);
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
    //$('.scene.view, .folder.expanded', html).prev().addClass('pre-view');
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
            if (game.user.isGM || setting("player-folders")) {
                folders = ui.scenes.folders.filter(f => {
                    return true;
                });
                folders.sort((a, b) => a.data.sort - b.data.sort - 1);
            }

            //show the scene if the scene is active, or is currently being viewed, or can be navigated to
            let scenes = game.scenes.entities.filter(s => {
                return ((s.data.navigation && s.visible) || s.active || s.isView); // || s.permission > 3
            });
            scenes.sort((a, b) => a.data.navOrder - b.data.navOrder);

            return (game.settings.get("monks-scene-navigation", "folder-position") == "front" ? folders.concat(scenes) : scenes.concat(folders));
        }

        getData(options) {
            let groups = [];
            const allscenes = this.scenes;

            // Modify Scene data
            let mapScenes = function (folder) { //flatten the scenes if not the GM
                let scenes = allscenes.filter(s => {
                    return (s.data.parent || s.data.folder) == folder?._id || (!game.user.isGM && !setting("player-folders"))
                });   
                scenes = scenes.map(s => {
                    if (s instanceof Scene) {
                        let users = game.users.entities
                            .filter(u => u.active && (u.viewedScene === s._id))
                            .map(u => { return { letter: u.name[0], color: u.data.color } });
                        if (folder && users.length)
                            folder.users = (folder.users || []).concat(users);
                        if (folder && s.active)
                            folder.active = true;

                        //if (folder == undefined || folder?.navopen) {
                            //if (folder && users.length)
                            //    folder.users = (folder.users || []).concat(users);
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
                        //} else
                        //    return {};
                    } else if (game.user.isGM || setting("player-folders")) { //only tranverse the folders if it's the GM
                        let data = {}
                        //if (folder == undefined || folder?.navopen) {
                            data = duplicate(s.data);
                            data.name = TextEditor.truncateText(data.navName || data.name, { maxLength: 32 });
                            //data.visible = game.user.isGM;
                        data.navopen = game.user.getFlag("monks-scene-navigation", "navopen" + data._id);
                        log('folder check', data.navopen, data);
                            data.css = [
                                data.navopen ? "expanded" : null, "gm"
                            ].filter(c => !!c).join(" ");
                            data.directory = true;
                            data.scenes = mapScenes(data);

                        data.visible = (data.scenes.find(s => { return !s.directory || s.visible }) != undefined); //(data.scenes.length > 0); //(game.user.isGM && data.scenes.length > 0);

                            if (folder && data.users?.length)
                                folder.users = (folder.users || []).concat(data.users);
                            if (folder && data.active)
                                folder.active = true;
                        //} else {
                        //    data._id = s.data._id;
                        //    data.navopen = s.getFlag("monks-scene-navigation", "navopen") ;
                        //}

                        return data;
                    }
                });

                return scenes;
            }

            let makeGroup = function (parent) {
                let group = { folder: parent };
                groups.push(group);

                let folder = parent.scenes.find(s => s.directory && s.navopen && s.visible);
                if (folder) {
                    makeGroup(folder);
                }
            }

            let scenes = mapScenes();
            makeGroup({ scenes: scenes });

            if (groups.length == 0)
                groups = [{}];

            log('get data', allscenes, groups);

            // Return data for rendering
            let color = game?.user?.data?.flags?.PF2e?.settings?.color || 'blue'; 
            return {
                collapsed: this._collapsed,
                cssClass: [
                    setting('display-background') ? "background" : null,
                    color,
                    (this._collapsed ? 'collapsed' : null)
                ].filter(c => c !== null).join(" "),
                groups: groups
            }
        }

        activateListeners(html) {
            super.activateListeners(html);

            // Click event listener
            const folders = html.find('.folder');
            folders.click(this._onClickFolder.bind(this));
        }

        /**
     * Expand the SceneNavigation menu, sliding it down if it is currently collapsed
     */
        expand() {
            if (!this._collapsed) return true;
            const nav = this.element;
            const icon = nav.find("#nav-toggle i.fas");
            const ul = $(".monks-scene-navigation .scene-list", nav);
            nav.removeClass("collapsed");
            return new Promise(resolve => {
                ul.slideDown(200, () => {
                    icon.removeClass("fa-caret-down").addClass("fa-caret-up");
                    this._collapsed = false;
                    Hooks.callAll("collapseSceneNavigation", this, this._collapsed);
                    return resolve(true);
                });
            });
        }

        /* -------------------------------------------- */

        /**
         * Collapse the SceneNavigation menu, sliding it up if it is currently expanded
         * @return {Promise<boolean>}
         */
        async collapse() {
            if (this._collapsed) return true;
            const nav = this.element;
            const icon = nav.find("#nav-toggle i.fas");
            const ul = $(".monks-scene-navigation .scene-list", nav);
            return new Promise(resolve => {
                ul.slideUp(200, () => {
                    nav.addClass("collapsed");
                    icon.removeClass("fa-caret-up").addClass("fa-caret-down");
                    this._collapsed = true;
                    Hooks.callAll("collapseSceneNavigation", this, this._collapsed);
                    return resolve(true);
                });
            });
        }

        _getContextMenuOptions() {
            let contextmenu = super._getContextMenuOptions();
            let menu = contextmenu.find(m => { return m.name == "SCENES.ToggleNav" });
            if (menu != undefined)
                menu.name = "MonksSceneNavigation.RemoveNav";

            contextmenu.push({
                name: "Set View Position",
                icon: '<i class="fas fa-crop-alt"></i>',
                condition: li => game.user.isGM && game.scenes.get(li.data("sceneId"))._view,
                callback: li => {
                    let scene = game.scenes.get(li.data("sceneId"));
                    let x = parseInt(canvas.stage.pivot.x);
                    let y = parseInt(canvas.stage.pivot.y);
                    let scale = canvas.stage.scale.x;
                    scene.update({initial: {x: x, y: y, scale: scale}});
                    ui.notifications.info("Captured canvas position as initial view.")
                }
            });

            return contextmenu;
        }

        _onClickFolder(event) {
            event.preventDefault();
            let folderId = event.currentTarget.dataset.folderId;

            log('Click on a folder', folderId);
            let navopen = game.user.getFlag("monks-scene-navigation", "navopen" + folderId) || false;

            let updates = {};
            updates["navopen" + folderId] = !navopen;

            let scenes = this.scenes;
            let folder = scenes.find(f => f.id == folderId);

            let openfolder = scenes.filter(f => {
                return f instanceof Folder && game.user.getFlag("monks-scene-navigation", "navopen" + f.id) && f.id != folderId && f.data.parent == folder.data.parent;
            });
            if (openfolder.length != 0) {
                for (let fldr of openfolder) {
                    updates["navopen" + fldr._id] = false;
                }
            }

            game.user.update({ flags: {'monks-scene-navigation': updates}}).then(() => {
                ui.nav.render();
            });

            /*
            game.user.setFlag("monks-scene-navigation", "navopen" + folderId, !navopen).then(() => {
                ui.nav.render();
            });*/

            /*
            let scenes = this.scenes;
            let folder = scenes.find(f => f.id == folderId);

            let updates = scenes.filter(f => {
                return f instanceof Folder && f.data.parent == folder.data.parent && game.user.getFlag("monks-scene-navigation", "navopen" + f._id)  && f._id != folder._id
            }).map(f => { delete f.data.opening; return { _id: f.id, flags: { 'monks-scene-navigation': { navopen: false } } } });
            folder.data.opening = true;
            updates.push({ _id: folder.id, flags: { 'monks-scene-navigation': { navopen: !folder.getFlag("monks-scene-navigation", "navopen") } } });
            Folder.update(updates);
            */
        }

        /*
        render(force, context = {}) {
            super.render(force, context);
            let app = this;

            log('rendering', app);

            let opening = $('.monks-scene-navigation.opening', app.element);
            new Promise(resolve => {
                $('.scene-list', opening).each(function () {
                    let scenelist = this;
                    $(scenelist).slideDown(200, () => {
                        $(scenelist).parent().removeClass("opening");
                        let folderId = scenelist.parentNode.dataset.folderId;
                        let folder = ui.scenes.folders.find(f => { return f._id == folderId; });
                        delete folder.data.opening;
                        Hooks.callAll("expandSceneNavigationFolder", app, folder);
                    });
                });
                return resolve(true);
            });
        }*/
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
        /*
        let opt = options.find(o => o.name === "SCENES.ToggleNav");
        if (opt != undefined) {
            let oldcondition = opt.condition;
            opt.condition = (li) => {
                let result = true;
                if (oldcondition != undefined)
                    result = oldcondition.call(this, li);

                const scene = game.scenes.get(li.data("entityId"));
                if (result)
                    li.name = (scene.data.navigation ? "MonksSceneNavigation.RemoveNav" : "SCENES.ToggleNav");

                return result;
            }
        }*/
    
        return options;
    }

    if (game.settings.get("monks-scene-navigation", "click-to-view")) {
        let oldEntityClick = SceneDirectory.prototype._onClickEntityName;
        SceneDirectory.prototype._onClickEntityName = function (event) {
            event.preventDefault();
            const entity = this.constructor.collection.get(event.currentTarget.parentElement.dataset.entityId);
            if (entity instanceof Scene)
                entity.view();
            else
                oldEntityClick.call(this, event);
        };
    }
});

Hooks.on("renderPermissionControl", (app, html, options) => {
    if (app.object instanceof Scene) {
        $('option[value="1"],option[value="2"]', html).remove();
        $('option[value="3"]', html).html('Observer');
    }
});

Hooks.on("renderSceneDirectory", (app, html, options) => {
    //add scene indicators
    if (game.settings.get("monks-scene-navigation", "scene-indicator")) {
        $('li.scene', html).each(function () {
            let id = this.dataset.entityId;
            let scene = game.scenes.entities.find(s => { return s._id == id });
            if (scene != undefined) {
                //show active, if players can navigate
                $('h3 a', this).attr('title', $('h3 a', this).html());
                if (scene.active)
                    $('h3 a', this).prepend($('<i>').addClass('fas fa-bullseye'));

                if (scene.data.navigation || scene.data.permission.default > 0 || Object.keys(scene.data.permission).length > 1) {
                    let permissions = $('<div>').addClass('permissions');
                    if (scene.data.navigation)
                        permissions.append($('<i>').addClass('fas fa-compass').attr('title', 'Navigatable'));
                    if (scene.data.permission.default > 0)
                        permissions.append($('<i>').addClass('fas fa-users').attr('title', 'Everyone'));
                    else {
                        for (let [key, value] of Object.entries(scene.data.permission)) {
                            let user = game.users.find(u => {
                                return u.id == key && !u.isGM;
                            });
                            if(user != undefined && value > 0)
                                permissions.append($('<div>').css({ backgroundColor: user.data.color }).html(user.name[0]).attr('title', user.name));
                        }
                    }
                    $('h3', this).append(permissions);
                }
            }
        });
    }
});

Hooks.on("updateScene", (scene, data, options, userid) => {
    if (data.navigation != undefined)
        ui.scenes.render();
});


