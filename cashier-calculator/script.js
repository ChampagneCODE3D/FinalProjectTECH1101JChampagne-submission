// =====================================================
// Cashier Calculator - JavaScript Logic
// TECH1101 Assignment 3
// Author: Jordan Champagne (Student ID: JC484889)
// Course: TECH1101 — Web and Internet Fundamentals
// Institution: Bow Valley College
// Date: April 2026
//
// Instructor Feedback Applied (Post-Submission):
// - Replaced all legacy "let" declarations with "let" or "const"
//   as recommended. "let" is function-scoped and can cause subtle
//   bugs due to hoisting. "let" is block-scoped (safer), and
//   "const" is used where a variable is never reassigned (best practice).
//
// Input Validation:
// Helper functions (escapeHTML, validateEmail)
// are adapted from Poka-Yoke style input validation [1] used
// in SODV1101 GLA8 (GLA8JC484889.cpp), originally written in
// C++ (askInt, askYesNo). Converted to JavaScript for browser
// use with real-time input capping and XSS prevention.
//
// [1] Poka-Yoke: https://www.isixsigma.com/dictionary/poka-yoke/
//
// AI Tools Used:
// - GitHub Copilot (Claude Sonnet 4.6): Assisted with syntax adaptation
//   from C++ to JavaScript, input validation techniques, XSS escaping,
//   bug identification and fixes (mailto handling, input validation logic),
//   and code quality review (dead code removal, style separation).
//   All suggestions were reviewed and approved by me.
// =====================================================

// ===== Data Arrays =====
// Array to store product names
let productNames = [];
// Array to store product prices (index matches productNames)
let productPrices = [];

// ===== Shopping Cart Arrays =====
// Array to store cart item names
let cartProductNames = [];
// Array to store cart item prices per unit
let cartProductPrices = [];
// Array to store cart item quantities
let cartProductUnits = [];

// Track whether the transaction has been paid (receipt finalized)
let transactionPaid = false;

// Frozen receipt date and time (captured at payment)
let receiptDate = "";
let receiptTime = "";

// Interval ID for the running clock on the receipt
let clockInterval = null;

// ===== Helper Functions (adapted from GLA8 Poka-Yoke validation) =====

/**
 * escapeHTML(str) - Escapes HTML special characters to prevent XSS.
 * @param {string} str - The string to sanitize
 * @returns {string} - Escaped string safe for innerHTML
 */
function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

/**
 * validateEmail(email) - Checks if an email address has a valid format.
 * @param {string} email - The email to validate
 * @returns {boolean} - True if valid format
 */
function validateEmail(email) {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
}

/**
 * showToast(message, type) - Shows a brief, non-blocking notification.
 * Replaces alert() for a smoother UX. Auto-dismisses after 3 seconds.
 * @param {string} message - The message to display
 * @param {string} type - "error", "success", or "info" (default "error")
 */
function showToast(message, type) {
    if (!type) type = "error";
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = "toast toast-" + type;
    toast.textContent = message;
    container.appendChild(toast);

    // Trigger slide-in animation
    setTimeout(function () { toast.classList.add("toast-visible"); }, 10);

    // Auto-dismiss after 3 seconds
    setTimeout(function () {
        toast.classList.remove("toast-visible");
        setTimeout(function () { container.removeChild(toast); }, 300);
    }, 3000);
}

/**
 * lockRegister() - Disables all inputs and buttons except
 * New Transaction after payment. Prevents further changes.
 */
function lockRegister() {
    // Disable all inputs
    document.getElementById("product-name-input").disabled = true;
    document.getElementById("price-input").disabled = true;
    document.getElementById("unit-input").disabled = true;
    document.getElementById("checkout-product-select").disabled = true;
    document.getElementById("admin-product-select").disabled = true;

    // Disable all buttons except New Transaction and Email Receipt
    const buttons = document.querySelectorAll("button");
    for (let i = 0; i < buttons.length; i++) {
        if (buttons[i].onclick &&
            buttons[i].onclick.toString().indexOf("newTransaction") === -1 &&
            buttons[i].onclick.toString().indexOf("emailReceipt") === -1) {
            buttons[i].disabled = true;
        }
    }
}

/**
 * unlockRegister() - Re-enables all inputs and buttons
 * when a new transaction starts.
 */
function unlockRegister() {
    // Re-enable all inputs
    document.getElementById("product-name-input").disabled = false;
    document.getElementById("price-input").disabled = false;
    document.getElementById("unit-input").disabled = false;
    document.getElementById("checkout-product-select").disabled = false;
    document.getElementById("admin-product-select").disabled = false;

    // Re-enable all buttons
    const buttons = document.querySelectorAll("button");
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].disabled = false;
    }
}

/**
 * getCurrentDateString() - Returns the current date formatted
 * as a readable string (e.g. "April 17, 2026").
 */
function getCurrentDateString() {
    const now = new Date();
    return now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

/**
 * getCurrentTimeString() - Returns the current time formatted
 * with hours, minutes, and seconds (e.g. "02:35:14 PM").
 */
function getCurrentTimeString() {
    const now = new Date();
    return now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
    });
}

/**
 * startClock() - Starts a running clock that updates the
 * date and time on the receipt every second.
 */
function startClock() {
    // Clear any existing clock interval first
    if (clockInterval !== null) {
        clearInterval(clockInterval);
    }

    // Update immediately, then every second
    updateClockDisplay();
    clockInterval = setInterval(updateClockDisplay, 1000);
}

/**
 * updateClockDisplay() - Updates the date and time elements
 * on the receipt with the current values.
 */
function updateClockDisplay() {
    let dateEl = document.getElementById("receipt-date");
    let timeEl = document.getElementById("receipt-time");
    if (dateEl) {
        dateEl.textContent = "Date: " + getCurrentDateString();
    }
    if (timeEl) {
        timeEl.textContent = "Time: " + getCurrentTimeString();
    }
}

/**
 * stopClock() - Stops the running clock interval.
 */
function stopClock() {
    if (clockInterval !== null) {
        clearInterval(clockInterval);
        clockInterval = null;
    }
}

// =====================================================
// ADMIN FUNCTIONS
// =====================================================

/**
 * addProduct() - Adds a new product to the product list.
 * Reads the product name from the input, validates it,
 * pushes it into productNames with a default price of 0,
 * then refreshes all displays.
 */
function addProduct() {
    // Get the product name from the input field
    const name = document.getElementById("product-name-input").value.trim();

    // Validate: make sure the name is not empty
    if (name === "") {
        showToast("Please enter a product name.");
        return;
    }

    // Validate: max 50 characters
    if (name.length > 50) {
        showToast("Product name cannot exceed 50 characters.");
        return;
    }

    // Validate: no duplicate names (case-insensitive)
    for (let i = 0; i < productNames.length; i++) {
        if (productNames[i].toLowerCase() === name.toLowerCase()) {
            showToast("A product named \"" + name + "\" already exists.");
            return;
        }
    }

    // Add the product with a default price of 0
    productNames.push(name);
    productPrices.push(0);

    // Refresh dropdowns and the admin product list
    updateDropdowns();
    updateProductList();

    // Clear the input field
    document.getElementById("product-name-input").value = "";
}

/**
 * setPrice() - Sets the price per unit for an existing product.
 * Reads the selected product from the admin dropdown and
 * the price from the input field, then updates productPrices.
 */
function setPrice() {
    // Get the selected product index
    const select = document.getElementById("admin-product-select");
    const index = select.selectedIndex;

    // Validate: ensure a product exists
    if (index < 0 || productNames.length === 0) {
        showToast("Please add a product first.");
        return;
    }

    // Get and validate the price value
    const priceValue = parseFloat(document.getElementById("price-input").value);
    if (isNaN(priceValue) || priceValue <= 0) {
        showToast("Please enter a price greater than $0.00.");
        return;
    }
    if (priceValue > 10000000) {
        showToast("Price cannot exceed $10,000,000.");
        return;
    }

    // Update the price in the array
    productPrices[index] = priceValue;

    // Clear the price input BEFORE refreshing so the red preview disappears
    document.getElementById("price-input").value = "";

    // Refresh dropdowns and the admin product list
    updateDropdowns();
    updateProductList();
}

/**
 * updateDropdowns() - Refreshes both the Admin and Checkout
 * dropdown menus with the current products and prices.
 */
function updateDropdowns() {
    const adminSelect = document.getElementById("admin-product-select");
    const checkoutSelect = document.getElementById("checkout-product-select");

    // Clear existing options
    adminSelect.innerHTML = "";
    checkoutSelect.innerHTML = "";

    // Build new options for each product
    for (let i = 0; i < productNames.length; i++) {
        // Admin dropdown shows name only
        const adminOption = document.createElement("option");
        adminOption.text = productNames[i];
        adminSelect.appendChild(adminOption);

        // Checkout dropdown shows name + price
        const checkoutOption = document.createElement("option");
        checkoutOption.text = productNames[i] + " $" + productPrices[i].toFixed(2) + "/unit";
        checkoutSelect.appendChild(checkoutOption);
    }

    // Default both dropdowns to the most recently added product
    if (productNames.length > 0) {
        adminSelect.selectedIndex = productNames.length - 1;
        checkoutSelect.selectedIndex = productNames.length - 1;
    }
}

/**
 * updateProductList() - Shows a live table of all products
 * and their prices in the Admin section. If the user is
 * typing a price, a red preview shows what the price will
 * become before they click "Add Price".
 */
function updateProductList() {
    const listDiv = document.getElementById("product-list");

    // Always show the table frame with headers
    let html = "<table>";
    html += "<tr><th>Product</th><th>&#9998;</th><th>Price</th><th>&#9998;</th><th>&#128465;</th></tr>";

    // If no products exist, show an empty row placeholder
    if (productNames.length === 0) {
        html += '<tr><td colspan="5" class="placeholder-text">No Products Added Yet.</td></tr>';
        html += "</table>";
        listDiv.innerHTML = html;
        return;
    }

    // Check if the admin is typing a pending price
    const adminSelect = document.getElementById("admin-product-select");
    const pendingIndex = adminSelect.selectedIndex;
    const pendingPrice = parseFloat(document.getElementById("price-input").value);
    const hasPending = (pendingIndex >= 0 && !isNaN(pendingPrice) && pendingPrice >= 0);
    for (let i = 0; i < productNames.length; i++) {
        // If this product has a pending price, show it in preview style
        if (hasPending && i === pendingIndex) {
            html += '<tr class="preview-price-row">';
            html += "<td>" + escapeHTML(productNames[i]) + "</td>";
            html += '<td class="edit-cell"><button class="btn-edit" onclick="renameProduct(' + i + ')" title="Rename product">&#9998;</button></td>';
            html += "<td>$" + pendingPrice.toFixed(2) + "</td>";
            html += '<td class="edit-cell"><button class="btn-edit" onclick="editPrice(' + i + ')" title="Edit price">&#9998;</button></td>';
            html += '<td class="edit-cell"><button class="btn-delete" onclick="deleteProduct(' + i + ')" title="Delete product">&#128465;</button></td>';
            html += "</tr>";
        } else {
            html += "<tr>";
            html += "<td>" + escapeHTML(productNames[i]) + "</td>";
            html += '<td class="edit-cell"><button class="btn-edit" onclick="renameProduct(' + i + ')" title="Rename product">&#9998;</button></td>';
            html += "<td>$" + productPrices[i].toFixed(2) + "</td>";
            html += '<td class="edit-cell"><button class="btn-edit" onclick="editPrice(' + i + ')" title="Edit price">&#9998;</button></td>';
            html += '<td class="edit-cell"><button class="btn-delete" onclick="deleteProduct(' + i + ')" title="Delete product">&#128465;</button></td>';
            html += "</tr>";
        }
    }
    html += "</table>";

    listDiv.innerHTML = html;
}

// =====================================================
// CHECKOUT FUNCTIONS
// =====================================================

/**
 * newTransaction() - Starts a fresh transaction.
 * Clears the cart arrays, unit input, and receipt.
 * Admin data (products/prices) is retained.
 */
function newTransaction() {
    // Empty the cart arrays
    cartProductNames = [];
    cartProductPrices = [];
    cartProductUnits = [];

    // Reset the paid flag
    transactionPaid = false;

    // Unlock all inputs and buttons
    unlockRegister();

    // Clear the unit input
    document.getElementById("unit-input").value = "";

    // Clear the receipt section completely
    document.getElementById("receipt-content").innerHTML = "";

    // Stop any existing clock before rebuilding
    stopClock();

    // Rebuild the live receipt (shows empty table ready for items)
    renderLiveReceipt();
}

/**
 * selectUnit(num) - Sets the unit input to the number
 * clicked on the number pad. Also updates the red preview
 * row in the receipt so the cashier can see the pending item.
 * @param {number} num - The number (1-9) that was clicked
 */
function selectUnit(num) {
    document.getElementById("unit-input").value = num;

    // Update the receipt preview row whenever a number is pressed
    renderLiveReceipt();
}

/**
 * clearUnit() - Clears the unit input field and removes
 * any red preview row from the live receipt.
 */
function clearUnit() {
    document.getElementById("unit-input").value = "";
    renderLiveReceipt();
}

/**
 * removeLastFromCart() - Removes the most recently added
 * item from the cart. Quick undo for mistakes.
 */
function removeLastFromCart() {
    if (cartProductNames.length === 0) {
        return;
    }
    cartProductNames.pop();
    cartProductPrices.pop();
    cartProductUnits.pop();
    renderLiveReceipt();
}

/**
 * editPrice(index) - Selects the product at the given index
 * in the admin dropdown and focuses the price input so the
 * user can quickly type a new price.
 * @param {number} index - The product index to edit
 */
function editPrice(index) {
    // Set the admin dropdown to the clicked product
    document.getElementById("admin-product-select").selectedIndex = index;

    // Pre-fill the price input with the current price
    const priceInput = document.getElementById("price-input");
    priceInput.value = productPrices[index].toFixed(2);
    priceInput.focus();
    priceInput.select();

    // Update the product list to show the preview
    updateProductList();
}

/**
 * renameProduct(index) - Prompts the user to enter a new
 * name for the product at the given index.
 * @param {number} index - The product index to rename
 */
function renameProduct(index) {
    const newName = prompt("Rename product:", productNames[index]);

    // If user cancelled or entered empty string, do nothing
    if (newName === null || newName.trim() === "") {
        return;
    }

    const trimmed = newName.trim();

    // Validate: max 50 characters
    if (trimmed.length > 50) {
        showToast("Product name cannot exceed 50 characters.");
        return;
    }

    // Validate: no duplicate names (case-insensitive, skip self)
    for (let i = 0; i < productNames.length; i++) {
        if (i !== index && productNames[i].toLowerCase() === trimmed.toLowerCase()) {
            showToast("A product named \"" + trimmed + "\" already exists.");
            return;
        }
    }

    const oldName = productNames[index];
    productNames[index] = trimmed;

    // Update cart items that had the old name
    for (let j = 0; j < cartProductNames.length; j++) {
        if (cartProductNames[j] === oldName) {
            cartProductNames[j] = trimmed;
        }
    }

    // Refresh dropdowns and product list
    updateDropdowns();
    updateProductList();
    renderLiveReceipt();
}

/**
 * deleteProduct(index) - Removes a product from the store
 * inventory. Updates the dropdowns and product list.
 * @param {number} index - The product index to delete
 */
function deleteProduct(index) {
    // Confirm before deleting
    if (!confirm("Delete \"" + productNames[index] + "\"?")) {
        return;
    }

    // Remove matching items from the cart
    for (let j = cartProductNames.length - 1; j >= 0; j--) {
        if (cartProductNames[j] === productNames[index]) {
            cartProductNames.splice(j, 1);
            cartProductPrices.splice(j, 1);
            cartProductUnits.splice(j, 1);
        }
    }

    productNames.splice(index, 1);
    productPrices.splice(index, 1);

    // Clear the price input to avoid stale preview
    document.getElementById("price-input").value = "";

    // Refresh dropdowns, product list, and receipt
    updateDropdowns();
    updateProductList();
    renderLiveReceipt();
}

/**
 * clearCart() - Empties the entire cart but keeps the
 * transaction open. Admin data is retained.
 */
function clearCart() {
    cartProductNames = [];
    cartProductPrices = [];
    cartProductUnits = [];
    document.getElementById("unit-input").value = "";
    renderLiveReceipt();
}

/**
 * addToCart() - Locks the current preview item into the cart.
 * The red preview row becomes a confirmed black row in the receipt.
 */
function addToCart() {
    const select = document.getElementById("checkout-product-select");
    const index = select.selectedIndex;

    // Validate: product must exist
    if (index < 0 || productNames.length === 0) {
        showToast("Please add a product in the Admin section first.");
        return;
    }

    // Validate: unit must be 1-9
    let units = parseInt(document.getElementById("unit-input").value);
    if (isNaN(units) || units < 1 || units > 9) {
        showToast("Please select a number of units (1-9) using the number pad.");
        return;
    }

    // Validate: product must have a price set
    if (productPrices[index] <= 0) {
        showToast("This product has no price set. Please set a price in Admin first.");
        return;
    }

    // Push item details into the cart arrays (now confirmed)
    cartProductNames.push(productNames[index]);
    cartProductPrices.push(productPrices[index]);
    cartProductUnits.push(units);

    // Clear the unit input for the next item
    document.getElementById("unit-input").value = "";

    // Re-render the receipt — the item is now confirmed (black)
    renderLiveReceipt();
}

/**
 * renderLiveReceipt() - Builds the live receipt in the Receipt
 * section. Always shows the table frame with headers.
 * Confirmed cart items appear in black. If the cashier
 * has a product and quantity selected, a red "preview" row
 * shows at the bottom so they can see what will be added next.
 */
function renderLiveReceipt() {
    // Don't overwrite a finalized receipt
    if (transactionPaid) {
        return;
    }

    // Always show date/time with live clock elements
    let html = "";
    html += '<p><strong id="receipt-date">Date: ' + getCurrentDateString() + '</strong></p>';
    html += '<p><strong id="receipt-time">Time: ' + getCurrentTimeString() + '</strong></p>';

    // Start the receipt table with headers
    html += "<table>";
    html += "<tr>";
    html += "<th>Product</th>";
    html += "<th>$/Unit</th>";
    html += "<th>Unit(s)</th>";
    html += "<th>Price</th>";
    html += '<th>&#128465;</th>';
    html += "</tr>";

    // Running subtotal for confirmed items
    let subTotal = 0;

    // Render all confirmed cart items in black with a trash icon
    for (let i = 0; i < cartProductNames.length; i++) {
        let lineTotal = cartProductPrices[i] * cartProductUnits[i];
        subTotal += lineTotal;

        html += "<tr>";
        html += "<td>" + escapeHTML(cartProductNames[i]) + "</td>";
        html += "<td>" + cartProductPrices[i].toFixed(2) + "</td>";
        html += "<td>" + cartProductUnits[i] + "</td>";
        html += "<td>" + lineTotal.toFixed(2) + "</td>";
        html += '<td class="remove-cell"><button class="btn-remove" onclick="removeFromCart(' + i + ')" title="Remove item">&#128465;</button></td>';
        html += "</tr>";
    }

    // Check if there is a pending selection to preview in red
    const select = document.getElementById("checkout-product-select");
    const index = select.selectedIndex;
    let units = parseInt(document.getElementById("unit-input").value);

    // Only show the red preview if a product exists and a unit is selected
    if (index >= 0 && productNames.length > 0 && !isNaN(units) && units >= 1 && units <= 9) {
        const previewPrice = productPrices[index];
        const previewTotal = previewPrice * units;

        // Red row — this item has NOT been added yet
        html += '<tr class="preview-row">';
        html += "<td>" + escapeHTML(productNames[index]) + "</td>";
        html += "<td>" + previewPrice.toFixed(2) + "</td>";
        html += "<td>" + units + "</td>";
        html += "<td>" + previewTotal.toFixed(2) + "</td>";
        html += "<td></td>";
        html += "</tr>";
    }

    // Totals rows built into the table
    html += '<tr class="totals-row"><td colspan="3"><strong>Total Price</strong></td>';
    html += "<td><strong>" + (subTotal > 0 ? "$" + subTotal.toFixed(2) : "--") + "</strong></td>";
    html += "<td></td></tr>";

    html += '<tr class="totals-row"><td colspan="3"><strong>Taxes (5%)</strong></td>';
    html += "<td><strong>--</strong></td>";
    html += "<td></td></tr>";

    html += '<tr class="totals-row grand-total-row"><td colspan="3"><strong>Amount Due</strong></td>';
    html += "<td><strong>--</strong></td>";
    html += "<td></td></tr>";

    html += "</table>";

    // Update the receipt section
    document.getElementById("receipt-content").innerHTML = html;

    // Start the running clock
    startClock();
}

// =====================================================
// PAYMENT / RECEIPT
// =====================================================

/**
 * pay() - Finalizes the receipt with date/time, totals,
 * 5% tax, and grand total. Locks the receipt so preview
 * rows no longer appear.
 */
function pay() {
    // Validate: prevent double-pay
    if (transactionPaid) {
        showToast("This transaction has already been paid. Click New Transaction to start a new one.");
        return;
    }

    // Validate: cart must have items
    if (cartProductNames.length === 0) {
        showToast("The cart is empty. Please add items before paying.");
        return;
    }

    // Mark transaction as paid so the live preview stops
    transactionPaid = true;

    // Lock all inputs and buttons except New Transaction
    lockRegister();

    // Stop the running clock and capture the current time
    stopClock();
    const dateString = getCurrentDateString();
    const timeString = getCurrentTimeString();

    // Store frozen receipt timestamp for email
    receiptDate = dateString;
    receiptTime = timeString;

    // Build finalized receipt HTML
    let receiptHTML = "";
    receiptHTML += "<p><strong>Date: " + dateString + "</strong></p>";
    receiptHTML += "<p><strong>Time: " + timeString + "</strong></p>";

    // Receipt table header
    receiptHTML += "<table>";
    receiptHTML += "<tr>";
    receiptHTML += "<th>Product</th>";
    receiptHTML += "<th>$/Unit</th>";
    receiptHTML += "<th>Unit(s)</th>";
    receiptHTML += "<th>Price</th>";
    receiptHTML += "</tr>";

    // Loop through confirmed cart items
    let subTotal = 0;
    for (let i = 0; i < cartProductNames.length; i++) {
        let lineTotal = cartProductPrices[i] * cartProductUnits[i];
        subTotal += lineTotal;

        receiptHTML += "<tr>";
        receiptHTML += "<td>" + escapeHTML(cartProductNames[i]) + "</td>";
        receiptHTML += "<td>" + cartProductPrices[i].toFixed(2) + "</td>";
        receiptHTML += "<td>" + cartProductUnits[i] + "</td>";
        receiptHTML += "<td>" + lineTotal.toFixed(2) + "</td>";
        receiptHTML += "</tr>";
    }

    // Calculate 5% tax and grand total
    let tax = subTotal * 0.05;
    let grandTotal = subTotal + tax;

    // Round to avoid floating-point display errors
    subTotal = Math.round(subTotal * 100) / 100;
    tax = Math.round(tax * 100) / 100;
    grandTotal = Math.round(grandTotal * 100) / 100;

    // Totals as table rows
    receiptHTML += '<tr class="totals-row"><td colspan="3"><strong>Total Price</strong></td>';
    receiptHTML += "<td><strong>$" + subTotal.toFixed(2) + "</strong></td></tr>";

    receiptHTML += '<tr class="totals-row"><td colspan="3"><strong>Taxes (5%)</strong></td>';
    receiptHTML += "<td><strong>$" + tax.toFixed(2) + "</strong></td></tr>";

    receiptHTML += '<tr class="totals-row grand-total-row"><td colspan="3"><strong>Amount Due</strong></td>';
    receiptHTML += "<td><strong>$" + grandTotal.toFixed(2) + "</strong></td></tr>";

    receiptHTML += "</table>";

    // Insert finalized receipt
    document.getElementById("receipt-content").innerHTML = receiptHTML;
}

/**
 * emailReceipt() - Opens the user's email client with the
 * receipt details formatted in the email body using a mailto link.
 */
function emailReceipt() {
    // Only allow emailing a finalized receipt
    if (!transactionPaid) {
        showToast("Please finalize the receipt by clicking Pay first.");
        return;
    }

    // Build a plain-text version of the receipt
    let body = "=== CASHIER RECEIPT ===\n\n";
    body += "Date: " + receiptDate + "\n";
    body += "Time: " + receiptTime;
    body += "\n\n";

    // Build itemized list
    body += "Product | $/Unit | Units | Price\n";
    body += "------------------------------------\n";

    let subTotal = 0;
    for (let i = 0; i < cartProductNames.length; i++) {
        let lineTotal = cartProductPrices[i] * cartProductUnits[i];
        subTotal += lineTotal;
        body += cartProductNames[i] + " | $" + cartProductPrices[i].toFixed(2);
        body += " | " + cartProductUnits[i] + " | $" + lineTotal.toFixed(2) + "\n";
    }

    let tax = subTotal * 0.05;
    let grandTotal = subTotal + tax;

    // Round to avoid floating-point display errors
    subTotal = Math.round(subTotal * 100) / 100;
    tax = Math.round(tax * 100) / 100;
    grandTotal = Math.round(grandTotal * 100) / 100;

    body += "------------------------------------\n";
    body += "Total Price: $" + subTotal.toFixed(2) + "\n";
    body += "Taxes (5%): $" + tax.toFixed(2) + "\n";
    body += "Amount Due: $" + grandTotal.toFixed(2) + "\n";
    body += "\n=== THANK YOU ===";

    // Get the email address from the input field
    const email = document.getElementById("email-input").value.trim();
    if (email === "") {
        showToast("Please enter a customer email address.");
        return;
    }
    if (!validateEmail(email)) {
        showToast("Please enter a valid email address (e.g. name@example.com).");
        return;
    }

    // Open mailto link with recipient, subject, and body
    const subject = "Receipt - " + receiptDate;
    const mailtoLink = "mailto:" + encodeURIComponent(email) + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    window.location.href = mailtoLink;
}

// =====================================================
// EVENT LISTENERS
// =====================================================

/**
 * Listen for changes on the checkout dropdown so the
 * preview row updates when the cashier switches products.
 */
document.getElementById("checkout-product-select").addEventListener("change", function () {
    renderLiveReceipt();
});

/**
 * Listen for typing in the price input so the admin product
 * list shows a red preview of the pending price in real time.
 */
document.getElementById("price-input").addEventListener("input", function () {
    // Cap the value at 10,000,000 in real time
    let val = parseFloat(this.value);
    if (!isNaN(val) && val > 10000000) {
        this.value = 10000000;
    }
    updateProductList();
});

/**
 * Listen for changes on the admin dropdown so the price
 * preview updates when switching products.
 */
document.getElementById("admin-product-select").addEventListener("change", function () {
    updateProductList();
});

/**
 * removeFromCart(index) - Removes a single item from the cart
 * arrays at the given index. Lets the cashier fix mistakes
 * without starting a whole new transaction.
 * @param {number} index - The cart item index to remove
 */
function removeFromCart(index) {
    // Remove the item from all three cart arrays
    cartProductNames.splice(index, 1);
    cartProductPrices.splice(index, 1);
    cartProductUnits.splice(index, 1);

    // Re-render the live receipt
    renderLiveReceipt();
}

// Render the empty receipt frame on page load
renderLiveReceipt();

// Show the empty product list table on page load
updateProductList();
