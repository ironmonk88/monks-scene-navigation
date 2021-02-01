import { registerSettings } from "./settings.js";

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

export class MonksSceneNavigation {
    static init() {
	    log("initializing");
        // element statics
       // CONFIG.debug.hooks = true;

        
        registerSettings();
    }

    static ready() {
    }

    
}

/**
 * Assorted hooks
 */
/* ------------------------------------ */
/* Initialize module					*/
/* ------------------------------------ */
Hooks.once('init', async function () {
    log('Initializing Monks Little Details');
    MonksLittleDetails.init();
});

/**
 * Ready hook
 */
Hooks.on("ready", MonksLittleDetails.ready);

Hooks.on("renderSceneNavigation", (app, html, data) => {
    $(html).addClass('monks-scene-navigation');
    log('render scene navigation', data);
});

