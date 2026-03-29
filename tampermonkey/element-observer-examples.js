// ==UserScript==
// @name         Element Observer Examples
// @namespace    http://tampermonkey.net/
// @version      2025-12-05
// @description  try to take over the world!
// @author       Melle Dijkstra
// @match        https://example.com
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Waits for an element to appear in the DOM.
 * @param {string} selector - CSS selector to wait for.
 * @returns {Promise<Element>}
 */
function waitForElement(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

// Usage Example:
// (async () => {
//     const btn = await waitForElement('.my-target-button');
//     btn.click();
// })();

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
