/**
 * script.js - Frontend logic for AI Travel Planner
 *
 * This file handles:
 * 1. Collecting form data
 * 2. Sending it to the Flask backend via fetch()
 * 3. Showing/hiding loading states
 * 4. Rendering the response (plan + sources)
 * 5. Error handling
 */

// ─────────────────────────────────────────────
// Main function: called when user clicks the button
// ─────────────────────────────────────────────
async function generatePlan() {
  // 1. Collect all form values
  const destination = document.getElementById("destination").value.trim();
  const budget = document.getElementById("budget").value.trim();
  const days = document.getElementById("days").value.trim();
  const customQuery = document.getElementById("custom_query").value.trim();

  // Get selected travel type from radio buttons
  const travelTypeEl = document.querySelector('input[name="travel_type"]:checked');
  const travelType = travelTypeEl ? travelTypeEl.value : "solo";

  // Get all checked interests
  const interestEls = document.querySelectorAll('.interest-chip input[type="checkbox"]:checked');
  const interests = Array.from(interestEls).map(el => el.value);

  // 2. Validate: destination is required
  if (!destination) {
    showError("Please enter a destination before generating a plan.");
    return;
  }

  // 3. Build the request payload
  const payload = {
    destination: destination,
    budget: budget || "flexible",
    days: days || "3",
    travel_type: travelType,
    interests: interests,
    custom_query: customQuery
  };

  // 4. Show loading state
  setLoading(true);
  hideResults();
  hideError();

  try {
    // 5. Send POST request to Flask backend
    const response = await fetch("/plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    // Parse the JSON response
    const data = await response.json();

    // Check if the server returned an error
    if (!response.ok || data.error) {
      throw new Error(data.error || "Server error. Please try again.");
    }

    // 6. Render the result
    renderResults(data.plan, data.sources);

  } catch (err) {
    // Show error message to user
    showError(err.message || "Network error. Make sure the Flask server is running.");
  } finally {
    // Always turn off loading state
    setLoading(false);
  }
}

// ─────────────────────────────────────────────
// Render the travel plan and sources
// ─────────────────────────────────────────────
function renderResults(plan, sources) {
  const resultsCard = document.getElementById("resultsCard");
  const planContent = document.getElementById("planContent");
  const sourcesBar = document.getElementById("sourcesBar");

  // Render the sources used (knowledge base files)
  if (sources && sources.length > 0) {
    sourcesBar.innerHTML =
      '<span class="sources-label">📚 Sources used:</span>' +
      sources.map(s => `<span class="source-tag">${s}</span>`).join(" ");
  } else {
    sourcesBar.innerHTML = '<span class="sources-label">📚 Generated from Gemini general knowledge</span>';
  }

  // Convert the Gemini markdown-like text to HTML
  planContent.innerHTML = formatPlanToHTML(plan);

  // Show the results card
  resultsCard.classList.remove("hidden");

  // Smooth scroll to results
  resultsCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ─────────────────────────────────────────────
// Convert Gemini's text to clean HTML
// Handles: headers (##), bold (**), bullet lists, horizontal rules
// ─────────────────────────────────────────────
function formatPlanToHTML(text) {
  if (!text) return "<p>No plan generated.</p>";

  // Split into lines for processing
  let lines = text.split("\n");
  let html = "";
  let inList = false;

  for (let line of lines) {
    const trimmed = line.trim();

    // Heading level 2: ## Heading
    if (trimmed.startsWith("## ")) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h2>${escapeHtml(trimmed.slice(3))}</h2>`;

    // Heading level 3: ### Heading
    } else if (trimmed.startsWith("### ")) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h3>${escapeHtml(trimmed.slice(4))}</h3>`;

    // Heading level 1: # Heading
    } else if (trimmed.startsWith("# ")) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h2>${escapeHtml(trimmed.slice(2))}</h2>`;

    // Horizontal rule
    } else if (trimmed === "---" || trimmed === "***") {
      if (inList) { html += "</ul>"; inList = false; }
      html += "<hr/>";

    // Bullet list item: - item or * item
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${inlineFormat(trimmed.slice(2))}</li>`;

    // Numbered list item: 1. item
    } else if (/^\d+\.\s/.test(trimmed)) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${inlineFormat(trimmed.replace(/^\d+\.\s/, ""))}</li>`;

    // Empty line: close list or add paragraph break
    } else if (trimmed === "") {
      if (inList) { html += "</ul>"; inList = false; }
      html += "";

    // Regular paragraph
    } else {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<p>${inlineFormat(trimmed)}</p>`;
    }
  }

  // Close any open list
  if (inList) html += "</ul>";

  return html;
}

// Handles inline bold (**text**) and italic (*text*)
function inlineFormat(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

// Simple HTML escape to prevent XSS from AI output
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ─────────────────────────────────────────────
// UI Helpers
// ─────────────────────────────────────────────

function setLoading(isLoading) {
  const btn = document.getElementById("generateBtn");
  const btnText = btn.querySelector(".btn-text");
  const btnLoader = btn.querySelector(".btn-loader");
  const loadingCard = document.getElementById("loadingCard");

  if (isLoading) {
    btn.disabled = true;
    btnText.classList.add("hidden");
    btnLoader.classList.remove("hidden");
    loadingCard.classList.remove("hidden");
  } else {
    btn.disabled = false;
    btnText.classList.remove("hidden");
    btnLoader.classList.add("hidden");
    loadingCard.classList.add("hidden");
  }
}

function hideResults() {
  document.getElementById("resultsCard").classList.add("hidden");
}

function hideError() {
  document.getElementById("errorCard").classList.add("hidden");
}

function showError(message) {
  const errorCard = document.getElementById("errorCard");
  document.getElementById("errorMessage").textContent = message;
  errorCard.classList.remove("hidden");
  errorCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Copy the plan text to clipboard
function copyToClipboard() {
  const content = document.getElementById("planContent").innerText;
  navigator.clipboard.writeText(content).then(() => {
    const btn = document.querySelector(".action-btn");
    const original = btn.textContent;
    btn.textContent = "✓ Copied!";
    setTimeout(() => { btn.textContent = original; }, 2000);
  }).catch(() => {
    alert("Could not copy to clipboard. Please select and copy manually.");
  });
}

// Scroll back to the form at the top
function scrollToTop() {
  document.querySelector(".form-card").scrollIntoView({ behavior: "smooth", block: "start" });
  hideResults();
  hideError();
}

// Allow pressing Enter in text fields to trigger generation (nice UX)
document.addEventListener("DOMContentLoaded", () => {
  const inputs = document.querySelectorAll("input[type='text'], input[type='number']");
  inputs.forEach(input => {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") generatePlan();
    });
  });
});
