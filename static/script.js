/**
 * script.js - Frontend logic for AI Travel Planner
 *
 * Handles:
 * 1. Collecting form data
 * 2. Sending request to Flask backend
 * 3. Loading states
 * 4. Rendering travel plan + sources
 * 5. Error handling
 */

// ─────────────────────────────────────────────
// Main function: called when user clicks Generate
// ─────────────────────────────────────────────
async function generatePlan() {
  const destination = document.getElementById("destination").value.trim();
  const budget = document.getElementById("budget").value.trim();
  const days = document.getElementById("days").value.trim();
  const customQuery = document.getElementById("custom_query").value.trim();

  const travelTypeEl = document.querySelector('input[name="travel_type"]:checked');
  const travelType = travelTypeEl ? travelTypeEl.value : "solo";

  const interestEls = document.querySelectorAll('.interest-chip input[type="checkbox"]:checked');
  const interests = Array.from(interestEls).map(el => el.value);

  // Validation
  if (!destination) {
    showError("Please enter a destination before generating a plan.");
    return;
  }

  const payload = {
    destination,
    budget: budget || "flexible",
    days: days || "3",
    travel_type: travelType,
    interests,
    custom_query: customQuery
  };

  setLoading(true);
  hideResults();
  hideError();

  try {
    const response = await fetch("/plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error("Invalid response from server.");
    }

    if (!response.ok || data.error) {
      throw new Error(data.error || "Server error. Please try again.");
    }

    renderResults(data.plan, data.sources);

  } catch (err) {
    showError(err.message || "Network error. Make sure the Flask server is running.");
  } finally {
    setLoading(false);
  }
}

// ─────────────────────────────────────────────
// Render travel plan + sources
// ─────────────────────────────────────────────
function renderResults(plan, sources) {
  const resultsCard = document.getElementById("resultsCard");
  const planContent = document.getElementById("planContent");
  const sourcesBar = document.getElementById("sourcesBar");

  if (sources && sources.length > 0) {
    sourcesBar.innerHTML =
      '<span class="sources-label">📚 Sources used:</span> ' +
      sources.map(s => `<span class="source-tag">${escapeHtml(s)}</span>`).join(" ");
  } else {
    sourcesBar.innerHTML =
      '<span class="sources-label">📚 Generated using Gemini general knowledge</span>';
  }

  planContent.innerHTML = formatPlanToHTML(plan);

  resultsCard.classList.remove("hidden");
  resultsCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ─────────────────────────────────────────────
// Convert Gemini text to clean HTML
// Supports:
// - #, ##, ### headings
// - bullet lists
// - numbered lists
// - horizontal rules
// - paragraphs
// ─────────────────────────────────────────────
function formatPlanToHTML(text) {
  if (!text) return "<p>No plan generated.</p>";

  const lines = text.split("\n");
  let html = "";
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) {
      html += "</ul>";
      inUl = false;
    }
    if (inOl) {
      html += "</ol>";
      inOl = false;
    }
  };

  for (let line of lines) {
    const trimmed = line.trim();

    // Empty line
    if (trimmed === "") {
      closeLists();
      continue;
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      closeLists();
      html += `<h3>${escapeHtml(trimmed.slice(4))}</h3>`;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      closeLists();
      html += `<h2>${escapeHtml(trimmed.slice(3))}</h2>`;
      continue;
    }

    if (trimmed.startsWith("# ")) {
      closeLists();
      html += `<h2>${escapeHtml(trimmed.slice(2))}</h2>`;
      continue;
    }

    // Horizontal rule
    if (trimmed === "---" || trimmed === "***") {
      closeLists();
      html += "<hr/>";
      continue;
    }

    // Bullet list
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (inOl) {
        html += "</ol>";
        inOl = false;
      }
      if (!inUl) {
        html += "<ul>";
        inUl = true;
      }
      html += `<li>${inlineFormat(trimmed.slice(2))}</li>`;
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(trimmed)) {
      if (inUl) {
        html += "</ul>";
        inUl = false;
      }
      if (!inOl) {
        html += "<ol>";
        inOl = true;
      }
      html += `<li>${inlineFormat(trimmed.replace(/^\d+\.\s/, ""))}</li>`;
      continue;
    }

    // Regular paragraph
    closeLists();
    html += `<p>${inlineFormat(trimmed)}</p>`;
  }

  closeLists();
  return html;
}

// ─────────────────────────────────────────────
// Safe inline formatting
// IMPORTANT: escape HTML first, then allow limited formatting
// ─────────────────────────────────────────────
function inlineFormat(text) {
  let safe = escapeHtml(text);

  safe = safe
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");

  return safe;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

// Copy plan to clipboard
function copyToClipboard() {
  const content = document.getElementById("planContent").innerText;

  navigator.clipboard.writeText(content)
    .then(() => {
      const btn = document.querySelector(".action-btn");
      if (!btn) return;

      const original = btn.textContent;
      btn.textContent = "✓ Copied!";
      setTimeout(() => {
        btn.textContent = original;
      }, 2000);
    })
    .catch(() => {
      alert("Could not copy to clipboard. Please copy manually.");
    });
}

// Scroll back to top/form
function scrollToTop() {
  const formCard = document.querySelector(".form-card");
  if (formCard) {
    formCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  hideResults();
  hideError();
}

// ─────────────────────────────────────────────
// UX: Press Enter in input fields to generate
// (but not inside textarea)
// ─────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const inputs = document.querySelectorAll("input[type='text'], input[type='number']");

  inputs.forEach(input => {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        generatePlan();
      }
    });
  });
});