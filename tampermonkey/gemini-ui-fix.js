// ==UserScript==
// @name         Gemini UI Fix
// @namespace    http://tampermonkey.net/
// @version      2025-12-05
// @description  Make response box bigger for better readability
// @author       Melle Dijkstra
// @match        https://gemini.google.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=gemini.google.com
// @grant        none
// ==/UserScript==

const SELECTOR = '.conversation-container';

/**
 * Continuously observes the DOM for changes.
 * @param {function} callback - Function to run on change.
 * @param {string} [targetSelector='body'] - The container to watch.
 * @param {Object} [config] - MutationObserver config.
 * @returns {MutationObserver}
 */
function observeContinuous(callback, targetSelector = 'body', config = { childList: true, subtree: true }) {
    const target = document.querySelector(targetSelector);

    if (!target) {
        console.error('Target element not found');
        return null;
    }

    const observer = new MutationObserver(callback);
    observer.observe(target, config);

    return observer;
}

// Usage Example:
// const observer = observeContinuous((mutations) => {
//     for (const mutation of mutations) {
//         if (mutation.addedNodes.length) {
//             console.log('New nodes added');
//         }
//     }
// });
// To stop: observer.disconnect();

function act(elem) {
    elem.style.maxWidth = '100%';
    elem.style.width = '100%';
    elem.style.minWidth = '100%';
}

(async function() {
    'use strict';

    observeContinuous((mutations) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes.length && document.querySelector(SELECTOR)) {
                const targets = document.querySelectorAll(SELECTOR);
                for (const target of targets) {
                    act(target);
                }
            }
        }
    })
})();