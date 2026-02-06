// ============================================================================
// SUBMIT.JS - Form Submission Handler (Terminal Post-Submission State)
// Holy Family Church Family Form - FIXED VERSION
// ============================================================================

/**
 * FIXES:
 * 1. Hide sticky-actions bar completely after submit
 * 2. Fix DONE button handler (was referencing undefined 'panel' variable)
 * 3. Keep Submit Another button available after DONE (forgiving UX)
 * 4. Better button prominence (DONE = primary, Submit Another = secondary)
 */

let __hfcSubmissionCompleted = false;

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('censusForm');
  if (!form) return;

  form.addEventListener('submit', handleSubmit);
});

/**
 * Main submit handler
 */
async function handleSubmit(e) {
  e.preventDefault();

  // If already submitted in this session, block any further submits.
  if (__hfcSubmissionCompleted) {
    showMessage?.('warning', 'This form has already been submitted. Please use "Submit another form" for a new entry.', 5000);
    return;
  }

  // Safety: if validation.js failed to load, never allow submission.
  if (typeof validateAllSteps !== 'function') {
    showMessage?.('error', 'Validation system not loaded. Please refresh and try again.', 7000);
    return;
  }

  // Hard validation (blocks submission)
  if (!validateAllSteps()) return;

  // Check if Google Script URL is configured (robust check)
  const scriptUrl = (typeof GOOGLE_SCRIPT_URL !== 'undefined' ? GOOGLE_SCRIPT_URL : '').toString().trim();
  const looksLikeAppsScript =
    /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9\-_]+\/exec$/i.test(scriptUrl);

  if (!looksLikeAppsScript) {
    showMessage?.('error', (MESSAGES?.error?.configMissing || 'Please configure the Google Apps Script URL first.'), 7000);
    return;
  }

  // Show loading overlay (if present)
  document.getElementById('loadingOverlay')?.classList.add('show');

  try {
    // Prepare payload
    const payload = prepareFormData();

    // Create a human-friendly public ID for UI/email (server also generates a UUID)
    // Format: HFC-YYYYMMDD-XXXX (XXXX = random base36)
    const publicId = generatePublicSubmissionId();
    payload.public_submission_id = publicId;

    // Helpful metadata (optional; server can ignore)
    payload.client_time = new Date().toISOString();
    payload.draft_used = !!localStorage.getItem('hfcDraft') || !!localStorage.getItem('hfc_draft');

    // Submit to Google Apps Script
    // NOTE: mode 'no-cors' yields an opaque response (can't read JSON), but works reliably with Apps Script.
    await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // Clear drafts (both keys used across versions)
    try { localStorage.removeItem('hfcDraft'); } catch (_) {}
    try { localStorage.removeItem('hfc_draft'); } catch (_) {}

    // Hide loading overlay
    document.getElementById('loadingOverlay')?.classList.remove('show');

    // Terminal success UI + lock
    enterTerminalSubmittedState({
      publicSubmissionId: publicId
    });

  } catch (err) {
    console.error('Submission error:', err);
    document.getElementById('loadingOverlay')?.classList.remove('show');
    showMessage?.('error', (MESSAGES?.error?.submit || 'Submission failed. Please try again.'), 8000);
  }
}

/**
 * Terminal post-submission UI - FIXED VERSION
 * - Disables all inputs and navigation
 * - Hides sticky-actions bar completely
 * - Replaces Review content with a clean success panel
 * - DONE button collapses to minimal message but keeps Submit Another available (forgiving UX!)
 */
function enterTerminalSubmittedState({ publicSubmissionId }) {
  __hfcSubmissionCompleted = true;

  // Disable all form controls
  document.querySelectorAll('#censusForm input, #censusForm select, #censusForm textarea, #censusForm button')
    .forEach(el => {
      // keep the post-submit buttons enabled later (they are outside the form)
      if (el && el.id && (el.id === 'submitAnotherBtn' || el.id === 'doneBtn' || el.id === 'submitAnotherBtn2')) return;
      el.disabled = true;
    });

  // Disable nav buttons
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');

  prevBtn?.setAttribute('disabled', 'disabled');
  nextBtn?.setAttribute('disabled', 'disabled');
  submitBtn?.setAttribute('disabled', 'disabled');

  // FIX #1: Hide the sticky-actions bar completely (not just the buttons)
  const stickyActions = document.querySelector('.sticky-actions');
  if (stickyActions) stickyActions.style.display = 'none';

  // Disable stepper navigation (if present)
  document.querySelectorAll('.step-link').forEach(el => {
    el.style.pointerEvents = 'none';
    el.setAttribute('aria-disabled', 'true');
  });

  // Ensure we're on the review step (best-effort)
  try {
    const total = (FORM_CONFIG?.totalSteps || 5);
    if (typeof gotoStep === 'function') gotoStep(total, { skipScroll: true });
  } catch (_) {}

  const review = document.getElementById('reviewContent');
  if (!review) {
    showMessage?.('success', (MESSAGES?.success?.submit || 'Form submitted successfully.'), 6000);
    return;
  }

  // Render post-submission panel inside review with ID for later manipulation
  review.innerHTML = `
    <div id="successPanel" style="background:#ecfdf5;border:1px solid #a7f3d0;padding:18px;border-radius:14px;">
      <h2 style="margin:0 0 8px;color:#065f46;">✅ Form submitted successfully</h2>
      <p style="margin:0 0 10px;color:#064e3b;">
        Please note your Submission ID for any corrections or follow-ups.
      </p>
      <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:10px 0 16px;">
        <div style="padding:10px 12px;border-radius:12px;background:#ffffff;border:1px solid #d1fae5;">
          <div style="font-size:12px;color:#065f46;opacity:0.9;">Submission ID</div>
          <div style="font-size:18px;font-weight:700;color:#064e3b;letter-spacing:0.5px;">${escapeHtml(publicSubmissionId)}</div>
        </div>
      </div>

      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;align-items:center;">
        <button type="button" id="doneBtn" class="btn btn-primary" style="min-width:120px;">Done</button>
        <button type="button" id="submitAnotherBtn" class="btn btn-secondary">Submit another form</button>
      </div>

      <div style="margin-top:12px;font-size:12px;color:#065f46;opacity:0.85;">
        💡 Tip: "Submit another form" is for volunteers filling multiple households.
      </div>
    </div>
  `;

  // Also show a brief toast (non-blocking)
  showMessage?.('success', (MESSAGES?.success?.submit || 'Form submitted successfully.'), 3500);

  // Wire actions
  const submitAnotherBtn = document.getElementById('submitAnotherBtn');
  const doneBtn = document.getElementById('doneBtn');

  submitAnotherBtn?.addEventListener('click', () => {
    // Clean reload gives a pristine state (and avoids partial resets)
    window.location.reload();
  });

  // FIX #2: Done button now properly references successPanel (not undefined 'panel')
  // FIX #3: Keeps Submit Another button available (forgiving UX as suggested by user!)
  doneBtn?.addEventListener('click', () => {
    const successPanel = document.getElementById('successPanel');
    if (!successPanel) return;
    
    // Replace with collapsed minimal message, but KEEP Submit Another button
    successPanel.innerHTML = `
      <div style="text-align:center;padding:20px;">
        <div style="font-size:48px;margin-bottom:12px;">✅</div>
        <h2 style="margin:0 0 8px;color:#065f46;font-size:22px;font-weight:700;">Thank you</h2>
        <p style="margin:0 0 16px;color:#064e3b;font-size:15px;">
          You may close this window now.
        </p>
        
        <div style="padding:10px 12px;border-radius:10px;background:#ffffff;border:1px solid #d1fae5;display:inline-block;margin-bottom:20px;">
          <div style="font-size:12px;color:#065f46;opacity:0.9;">Receipt ID</div>
          <div style="font-size:16px;font-weight:700;color:#064e3b;letter-spacing:0.5px;">${escapeHtml(publicSubmissionId)}</div>
        </div>
        
        <div style="border-top:1px solid #d1fae5;padding-top:16px;margin-top:16px;">
          <button type="button" id="submitAnotherBtn2" class="btn btn-secondary" style="opacity:0.8;">Submit another family</button>
          <div style="font-size:11px;color:#065f46;opacity:0.7;margin-top:8px;">For volunteers filling multiple forms</div>
        </div>
      </div>
    `;
    
    // Re-wire the Submit Another button in the collapsed state
    const submitAnotherBtn2 = document.getElementById('submitAnotherBtn2');
    submitAnotherBtn2?.addEventListener('click', () => {
      window.location.reload();
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Keep the ID available for future email UI work
  try { sessionStorage.setItem('hfc_last_public_submission_id', publicSubmissionId); } catch (_) {}
}

/**
 * Convert FormData -> plain object, handling multi-value fields.
 * Also adds child ages (if DOB provided) as extra keys.
 */
function prepareFormData() {
  const fd = new FormData(document.getElementById('censusForm'));
  const data = {};

  for (const [key, value] of fd.entries()) {
    if (data[key] !== undefined) {
      data[key] = Array.isArray(data[key]) ? [...data[key], value] : [data[key], value];
    } else {
      data[key] = value;
    }
  }

  // Add calculated ages for children (non-breaking)
  const numChildren = parseInt(data.num_children, 10) || 0;
  for (let i = 1; i <= numChildren; i++) {
    const dob = data[`child${i}_dob`];
    if (dob && typeof calculateAge === 'function') {
      data[`child${i}_age`] = calculateAge(dob);
    }
  }

  return data;
}

/**
 * Human-friendly public ID generator.
 * Not security-critical (server still generates UUID); this is for user-facing reference.
 */
function generatePublicSubmissionId() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');

  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `HFC-${yyyy}${mm}${dd}-${rand}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
