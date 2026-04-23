/* ============================================================
   File:        main.js
   Author:      Jordan Champagne (Student ID: JC484889)
   Course:      TECH1101 — Web and Internet Fundamentals
   Institution: Bow Valley College
   Date:        April 2026
   Description: Shared JavaScript for Jordan Champagne's personal portfolio
                website. Handles the responsive hamburger navigation toggle,
                active nav link highlighting, floating back-to-top button,
                trapping temperature safety calculator, and project popup helper.
   AI Assistance: GitHub Copilot used for code suggestions and debugging.
   ============================================================ */

/* ---------- Responsive Navigation (hamburger menu) ---------- */

/**
 * Toggles the mobile nav menu open/closed when the
 * hamburger button is clicked.
 */
const navToggle = document.getElementById('nav-toggle');
const navLinks  = document.getElementById('nav-links');

if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
        navLinks.classList.toggle('open');

        // Flip the aria-expanded attribute for accessibility
        const isOpen = navLinks.classList.contains('open');
        navToggle.setAttribute('aria-expanded', isOpen);
    });

    // Close the menu if a link inside it is clicked (single-page nav)
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('open');
            navToggle.setAttribute('aria-expanded', false);
        });
    });
}

/* ---------- Highlight the active nav link ---------- */

/**
 * Adds the 'active' CSS class to the nav link whose href
 * matches the current page filename.
 */
(function highlightActiveLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const links = document.querySelectorAll('.nav-links a');

    links.forEach(link => {
        const linkPage = link.getAttribute('href').split('/').pop();
        if (linkPage === currentPage) {
            link.classList.add('active');
        }
    });
})();

/* ============================================================
   Trapping Temperature Checker (hobby.html)
   Checks whether the current temperature is within the safe
   range recommended for humanely trapping feral cats.
   ============================================================ */

// Safe trapping temperature range based on City of Calgary guidelines (Celsius).
const TRAP_MIN_C = 2;    // Minimum safe trapping temperature (°C)
const TRAP_MAX_C = 27;   // Maximum safe trapping temperature (°C)

/**
 * Converts Fahrenheit to Celsius.
 * @param {number} f - Temperature in Fahrenheit
 * @returns {number} Temperature in Celsius
 */
function fahrenheitToCelsius(f) {
    return (f - 32) * (5 / 9);
}

/**
 * Evaluates a temperature and returns a result object describing
 * whether it is safe to trap.
 * @param {number} tempC - Temperature in Celsius
 * @returns {{ safe: boolean, level: 'safe'|'cold'|'hot', message: string }}
 */
function evaluateTrapTemperature(tempC) {
    if (tempC < TRAP_MIN_C) {
        return {
            safe: false,
            level: 'cold',
            message: `Too cold to trap safely (${tempC.toFixed(1)}\u00B0C). 
                      Cats can suffer from hypothermia if left in a trap overnight.
                      Wait for warmer conditions.`
        };
    }
    if (tempC > TRAP_MAX_C) {
        return {
            safe: false,
            level: 'hot',
            message: `Too hot to trap safely (${tempC.toFixed(1)}\u00B0C). 
                      Cats can overheat quickly inside a trap in direct sun.
                      Wait for cooler conditions.`
        };
    }
    return {
        safe: true,
        level: 'safe',
        message: `Good to go! ${tempC.toFixed(1)}\u00B0C is within the safe trapping range 
                  (${TRAP_MIN_C}\u00B0C \u2013 ${TRAP_MAX_C}\u00B0C).`
    };
}

// Wire up the checker UI — only runs if the elements exist on the page
(function initTrapChecker() {
    const btn       = document.getElementById('check-temp-btn');
    const input     = document.getElementById('temp-input');
    const unitSel   = document.getElementById('temp-unit');
    const resultDiv = document.getElementById('temp-result');
    const noteEl    = document.getElementById('temp-threshold-note');

    // Bail out silently if we're not on the hobby page
    if (!btn) return;

    // Show the threshold range in the note text
    const minF = ((TRAP_MIN_C * 9 / 5) + 32).toFixed(1);
    const maxF = ((TRAP_MAX_C * 9 / 5) + 32).toFixed(1);
    noteEl.textContent =
        `Safe trapping range: ${TRAP_MIN_C}\u00B0C \u2013 ${TRAP_MAX_C}\u00B0C  ` +
        `(${minF}\u00B0F \u2013 ${maxF}\u00B0F)`;

    btn.addEventListener('click', () => {
        const rawValue = parseFloat(input.value);

        // Validate input
        if (isNaN(rawValue)) {
            resultDiv.textContent  = 'Please enter a valid number.';
            resultDiv.className    = 'temp-result temp-result--warn';
            resultDiv.hidden       = false;
            return;
        }

        // Convert to Celsius if user chose Fahrenheit
        const tempC = (unitSel.value === 'F') ? fahrenheitToCelsius(rawValue) : rawValue;
        const result = evaluateTrapTemperature(tempC);

        // Update the result box with appropriate styling class
        resultDiv.textContent = result.message;
        resultDiv.className   = `temp-result temp-result--${result.level}`;
        resultDiv.hidden      = false;
    });

    // Also allow pressing Enter in the input field to trigger the check
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') btn.click();
    });
})();

/* ---------- Floating Back-to-Top Button ---------- */
(function initFloatTopBtn() {
    const btn = document.getElementById('float-top-btn');
    if (!btn) return;
    window.addEventListener('scroll', () => {
        const scrolledDown = window.scrollY > 200;
        const nearBottom = (window.scrollY + window.innerHeight) >= (document.body.scrollHeight - 300);
        if (scrolledDown && !nearBottom) {
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    });
})();

/* ---------- Project Popup Window Links ---------- */
(function exposeProjectPopupHelper() {
    window.openProjectPopup = function openProjectPopup(href) {
        if (!href) return false;

        const width = Math.min(window.screen.availWidth - 120, 1200);
        const height = Math.min(window.screen.availHeight - 120, 800);
        const left = Math.max(0, Math.round((window.screen.availWidth - width) / 2));
        const top = Math.max(0, Math.round((window.screen.availHeight - height) / 2));
        const features =
            `popup=yes,width=${width},height=${height},left=${left},top=${top},` +
            'resizable=yes,scrollbars=yes,toolbar=yes,menubar=yes,location=yes,status=yes';

        const popup = window.open(href, 'projectPreviewWindow', features);

        if (popup) {
            popup.focus();
            return false;
        }

        // If popups are blocked, fall back to same-tab navigation.
        window.location.href = href;
        return false;
    };
})();

(function initProjectPopupLinks() {
    const links = document.querySelectorAll('.project-popup-link');
    if (!links.length) return;

    links.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();

            const href = link.getAttribute('href');
            window.openProjectPopup(href);
        });
    });
})();
