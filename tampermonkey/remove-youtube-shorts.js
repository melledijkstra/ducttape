// ==UserScript==
// @name         Remove YouTube Shorts
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Removes YouTube Shorts from homepage/feed
// @author       Melle Dijkstra
// @match        https://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const SHORT_TAG = 'span';
    const SHORTS_KEYWORD = 'shorts';
    const SHORTS_PARENT_ID = 'dismissible';

    function removeShorts() {
        const spans = document.querySelectorAll('#title');
        spans.forEach(span => {
            if (span.textContent.toLowerCase().trim() === SHORTS_KEYWORD) {
                let parent = span;
                while (parent && parent.id !== SHORTS_PARENT_ID) {
                    parent = parent.parentElement;
                }
                if (parent && parent.id === SHORTS_PARENT_ID) {
                    const message = document.createElement('div');
                    message.textContent = 'Shorts removed from here :)';
                    message.style.padding = '1em';
                    message.style.fontWeight = 'bold';
                    message.style.textAlign = 'center';
                    message.style.backgroundColor = '#f9f9f9';
                    // uncomment below line to find shorts contents
                    //parent.style.border = '1px solid red';
                    parent.replaceWith(message);
                }
            }
        });
    }

    const observer = new MutationObserver((mutations) => {
        mutations.forEach(() => removeShorts());
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Run once at load
    removeShorts();
})();
