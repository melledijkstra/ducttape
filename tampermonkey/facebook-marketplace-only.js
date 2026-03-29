// ==UserScript==
// @name         Facebook Marketplace Only
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Hide Facebook feed and other distractions, show only Marketplace.
// @author       Melle Dijkstra
// @match        https://www.facebook.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=facebook.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const marketplaceRegex = /^\/marketplace(\/|$)/;
    let debounceTimeout = null;

    function isMarketplacePath(path) {
        return marketplaceRegex.test(path);
    }

    function hideClutter() {
        // no clutter to hide
    }

    function clearNonMarketplacePage() {
        console.log('not facebook marketplace, removing clutter');
        const mainFeed = document.querySelector('[role="main"]')
        if (mainFeed) {
            const notice = document.createElement('div');
            notice.style.cssText = 'text-align:center;padding:50px;font-size:24px;font-family:sans-serif;';
            notice.textContent = 'Only Facebook Marketplace is available with this script.';
            mainFeed.replaceWith();
        }
        const rightMenu = document.querySelector('[role="complementary"]');
        if (rightMenu) {
            rightMenu.remove();
        }
    }

    if (isMarketplacePath(window.location.pathname)) {
        hideClutter();
    } else {
        clearNonMarketplacePage();
    }

})();

