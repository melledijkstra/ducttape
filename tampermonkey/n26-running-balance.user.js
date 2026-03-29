// ==UserScript==
// @name         N26 Running Balance
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Calculates and displays the running account balance next to each transaction on the N26 web app
// @author       Melle Dijkstra
// @match        https://app.n26.com/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // ─── Configuration ───────────────────────────────────────────────
  // CSS class used to mark injected balance elements so we can find/remove them later
  const BALANCE_MARKER = "n26-running-balance";

  // Debounce delay (ms) to avoid recalculating on every tiny DOM mutation
  const DEBOUNCE_MS = 300;

  // ─── Currency Helpers ────────────────────────────────────────────

  /**
   * Parses a euro-formatted string into a numeric value.
   * Handles formats like "€2,286.73", "-€7,000.00", "€0.05"
   * @param {string} text - The euro amount string
   * @returns {number} - The parsed numeric value (negative for debits)
   */
  function parseEuroAmount(text) {
    if (!text) return 0;
    text = text.trim();

    // Determine sign: a leading minus means a debit/expense
    const isNegative = text.startsWith("-");

    // Strip everything except digits and the decimal point
    const cleaned = text.replace(/[^0-9.]/g, "");
    const value = parseFloat(cleaned);

    if (isNaN(value)) return 0;
    return isNegative ? -value : value;
  }

  /**
   * Formats a number as a euro currency string.
   * Uses dot as thousands separator and comma as decimal separator (EU style).
   * @param {number} amount - The numeric amount
   * @returns {string} - Formatted string like "€1.234,56" or "-€50,00"
   */
  function formatEuro(amount) {
    const isNegative = amount < 0;
    // Format with 2 decimal places using German/EU locale for proper separators
    const formatted = Math.abs(amount).toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${isNegative ? "-" : ""}€${formatted}`;
  }

  // ─── DOM Query Helpers ───────────────────────────────────────────

  /**
   * Reads the current account balance from the account selector button.
   * Uses the stable `data-testid` attribute to find the button, then searches
   * for a span whose text matches the euro amount pattern.
   * @returns {number|null} - The current balance, or null if not found
   */
  function getCurrentBalance() {
    // The account button has a stable data-testid attribute
    const accountButton = document.querySelector(
      '[data-testid="transactions-list-activity-switch"]'
    );
    if (!accountButton) return null;

    // Search for a leaf span (no child elements) that contains an euro amount.
    // This avoids matching container spans whose textContent aggregates children.
    const spans = accountButton.querySelectorAll("span");
    for (const span of spans) {
      if (span.children.length > 0) continue; // skip non-leaf spans
      const text = span.textContent.trim();
      if (/^-?€[\d,.]+$/.test(text)) {
        return parseEuroAmount(text);
      }
    }
    return null;
  }

  /**
   * Collects all transaction <li> elements in page order (newest first).
   * Each timeline section (day group) is identified by `data-testid="timeline-module"`,
   * and each transaction within contains a link with `data-testid="feed-timeline-item"`.
   * @returns {HTMLElement[]} - Array of <li> elements representing transactions
   */
  function getAllTransactions() {
    const timelineSections = document.querySelectorAll(
      '[data-testid="timeline-module"]'
    );
    const transactions = [];

    timelineSections.forEach((section) => {
      // Get all <li> items in this day group
      const items = section.querySelectorAll("li");
      items.forEach((li) => {
        // Confirm it's a real transaction by checking for the transaction link
        if (li.querySelector('[data-testid="feed-timeline-item"]')) {
          transactions.push(li);
        }
      });
    });

    return transactions;
  }

  /**
   * Checks whether a transaction was declined/failed.
   * Declined transactions have a status label (e.g. "Declined") inside the label div,
   * and a failed icon overlay (failed.png). We check for the text since it's more
   * resilient than matching image URLs or class names.
   *
   * @param {HTMLElement} li - The transaction <li> element
   * @returns {boolean} - True if the transaction was declined/failed
   */
  function isDeclinedTransaction(li) {
    const labelDiv = li.querySelector('[id$="-label"]');
    if (!labelDiv) return false;

    // Look for a leaf span whose text indicates a declined/failed status.
    // N26 uses "Declined" but we also check common alternatives for robustness.
    const spans = labelDiv.querySelectorAll("span");
    for (const span of spans) {
      if (span.children.length > 0) continue; // only leaf spans
      const text = span.textContent.trim().toLowerCase();
      if (text === "declined" || text === "failed" || text === "rejected") {
        return true;
      }
    }
    return false;
  }

  /**
   * Extracts the total monetary impact of a single transaction.
   * This sums the primary amount AND any secondary amounts (e.g. round-up savings),
   * since both affect the main account balance.
   *
   * We look for "leaf" <span> elements (no children) whose text matches the euro pattern.
   * This avoids double-counting from parent spans that aggregate child text.
   *
   * @param {HTMLElement} li - The transaction <li> element
   * @returns {number} - The total signed amount (negative = money out, positive = money in)
   */
  function getTransactionAmount(li) {
    let total = 0;
    const spans = li.querySelectorAll("span");

    for (const span of spans) {
      // Only consider leaf spans (no nested elements)
      if (span.children.length > 0) continue;

      // Skip any balance labels we previously injected
      if (span.closest(`.${BALANCE_MARKER}`)) continue;

      const text = span.textContent.trim();

      // Match euro amounts: optional minus, € sign, digits with commas/dots
      if (/^-?€[\d,.]+$/.test(text)) {
        total += parseEuroAmount(text);
      }
    }

    return total;
  }

  // ─── Balance Injection ───────────────────────────────────────────

  /**
   * Injects (or updates) a running balance display into a transaction row.
   * The balance is shown as a small label below the merchant/payee name.
   *
   * @param {HTMLElement} li - The transaction <li> element
   * @param {number} balance - The account balance after this transaction
   */
  function injectBalance(li, balance) {
    // Check if we already injected a balance element into this transaction
    let balanceEl = li.querySelector(`.${BALANCE_MARKER}`);

    if (!balanceEl) {
      // Create a new balance display element
      balanceEl = document.createElement("span");
      balanceEl.classList.add(BALANCE_MARKER);

      // Style it to be subtle but readable
      balanceEl.style.cssText = `
        display: block;
        font-size: 14px;
        color: #888;
        margin-top: 2px;
        font-weight: normal;
        letter-spacing: 0.2px;
      `;

      // Find the label container (holds the merchant name).
      // It uses an id like "radix-:rXX:-label" — we select by the id pattern.
      // This is more stable than relying on class names.
      const labelDiv = li.querySelector('[id$="-label"]');
      if (labelDiv) {
        // Append the balance below the merchant name
        labelDiv.appendChild(balanceEl);
      } else {
        // Fallback: append to the <li> itself
        li.appendChild(balanceEl);
      }
    }

    // Update the displayed balance text.
    // If balance is null, this is a declined transaction — show a distinct label.
    if (balance === null) {
      balanceEl.textContent = "Declined — no balance impact";
      balanceEl.style.color = "#b55";
      balanceEl.style.fontStyle = "italic";
    } else {
      balanceEl.textContent = `Balance: ${formatEuro(balance)}`;
      balanceEl.style.color = "#888";
      balanceEl.style.fontStyle = "normal";
    }
  }

  // ─── Main Calculation Logic ──────────────────────────────────────

  /**
   * Core function: reads the current balance, iterates through all visible
   * transactions (newest first), and calculates + injects the running balance.
   *
   * Logic:
   *   - The current balance is the balance AFTER the most recent transaction.
   *   - For each transaction going top-to-bottom (newest → oldest):
   *       1. Display the running balance (= balance after this transaction)
   *       2. Subtract this transaction's amount to "undo" it,
   *          giving us the balance before this transaction
   *          (which equals the balance after the next-older transaction)
   */
  function calculateAndInjectBalances() {
    const currentBalance = getCurrentBalance();
    if (currentBalance === null) return; // Balance not visible on page

    const transactions = getAllTransactions();
    if (transactions.length === 0) return; // No transactions found

    // Start with the current balance — this is the balance after the newest transaction
    let runningBalance = currentBalance;

    for (const li of transactions) {
      // Skip declined/failed transactions — they didn't affect the balance
      if (isDeclinedTransaction(li)) {
        injectBalance(li, null); // Show "Declined" instead of a balance
        continue;
      }

      // Get the total amount of this transaction (including round-ups)
      const amount = getTransactionAmount(li);

      // Show the balance AFTER this transaction was applied
      injectBalance(li, runningBalance);

      // "Undo" this transaction to get the balance before it,
      // which is the balance after the next (older) transaction.
      // If amount is -€50 (debit), subtracting it adds €50 back (balance was higher before).
      // If amount is +€100 (income), subtracting it removes €100 (balance was lower before).
      runningBalance -= amount;
    }
  }

  // ─── DOM Observation (watch for new transactions) ─────────────────

  let debounceTimer = null;

  /**
   * Debounced wrapper around calculateAndInjectBalances.
   * MutationObserver can fire many times in quick succession (e.g. when
   * "Load more" adds multiple transaction rows). Debouncing ensures we
   * only recalculate once after the DOM settles.
   */
  function debouncedCalculate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      calculateAndInjectBalances();
    }, DEBOUNCE_MS);
  }

  /**
   * Sets up a MutationObserver on the <main> element (or document.body as fallback).
   * This watches for:
   *   - New transactions loaded via "Load more" button
   *   - SPA navigation that replaces the transaction list
   *   - Any other DOM changes that add/remove transaction elements
   *
   * The observer uses { childList: true, subtree: true } to catch additions
   * anywhere in the tree, not just direct children.
   */
  function startObserving() {
    // Prefer observing <main> to reduce noise from unrelated DOM changes
    const target = document.querySelector("main") || document.body;

    const observer = new MutationObserver((mutations) => {
      // Quick check: only recalculate if mutations involve element additions/removals
      // This filters out attribute-only changes that don't affect transactions
      const hasRelevantChange = mutations.some(
        (m) => m.addedNodes.length > 0 || m.removedNodes.length > 0
      );
      if (hasRelevantChange) {
        debouncedCalculate();
      }
    });

    observer.observe(target, {
      childList: true, // Watch for added/removed child nodes
      subtree: true, // Watch the entire subtree, not just direct children
    });
  }

  // ─── Initialization ──────────────────────────────────────────────

  /**
   * Waits for the transaction list to appear on the page before starting.
   * The N26 app is a SPA, so the content may not be present when the script
   * first runs. We poll until we find the account button or timeline modules.
   */
  function waitForTransactionsAndStart() {
    const checkInterval = setInterval(() => {
      const accountButton = document.querySelector(
        '[data-testid="transactions-list-activity-switch"]'
      );
      if (accountButton) {
        clearInterval(checkInterval);
        // Initial calculation
        calculateAndInjectBalances();
        // Start watching for new transactions (load more, navigation, etc.)
        startObserving();
      }
    }, 500); // Check every 500ms
  }

  // Kick off once the page is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", waitForTransactionsAndStart);
  } else {
    waitForTransactionsAndStart();
  }
})();
