// ============================================================================
// VALIDATION.JS - Input Validation & Formatting
// ============================================================================

/**
 * Setup all validation listeners on form load
 */
function setupValidation() {
    document.querySelectorAll('input, select, textarea').forEach(field => { bindValidationToField(field); bindLiveErrorClearing(field); });
}

/**
 * Bind validation/formatting to a single field (also used for dynamic fields)
 */
function bindValidationToField(field) {
    if (!field || field.__hfcBound) return;
    field.__hfcBound = true;

    // Text-only fields (names, places, etc.)
    if (field.dataset.type === FIELD_TYPES.TEXT_ONLY) {
        field.addEventListener('input', function () {
            this.value = this.value.replace(/[^A-Za-z\s\.]/g, '');
        });
    }

    // Phone number formatting
    if (field.dataset.type === FIELD_TYPES.PHONE) {
        field.addEventListener('input', function () {
            formatPhoneNumber(this);
        });
    }

    // Pincode formatting
    if (field.dataset.type === FIELD_TYPES.PINCODE) {
        field.addEventListener('input', function () {
            this.value = this.value.replace(/\D/g, '').slice(0, 6);
        });
    }

    // Date max (no future dates)
    if (field.type === 'date') {
        const today = new Date().toISOString().split('T')[0];
        field.setAttribute('max', today);
    }
}

/**
 * Format phone number as "XXXXX XXXXX"
 */
function formatPhoneNumber(input) {
    const digits = (input.value || '').replace(/\D/g, '').slice(0, 10);
    input.value = digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits;
}

/**
 * Setup date max limits
 */
function setupDateLimits() {
    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(input => {
        input.setAttribute('max', today);
    });
}

/**
 * Age calculation (shared)
 */
function calculateAge(dob) {
    if (!dob) return 0;
    const birth = new Date(dob);
    const today = new Date();

    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
    return (phone || '').replace(/\D/g, '').length === 10;
}

function isEffectivelyHidden(field) {
    const fg = field.closest('.form-group');
    if (!fg) return false;
    return fg.classList.contains('hidden') || fg.style.display === 'none';
}

function setFieldErrorState(field, isError) {
    if (!field) return;
    field.classList.toggle('error', !!isError);
    field.setAttribute('aria-invalid', isError ? 'true' : 'false');

    const fg = field.closest('.form-group');
    if (fg) fg.classList.toggle('has-error', !!isError);

    const cg = field.closest('.checkbox-group');
    if (cg) cg.classList.toggle('error', !!isError);
}

/**
 * Lightweight validity check for UX highlighting
 */
function isFieldValid(field) {
    if (!field) return true;
    if (isEffectivelyHidden(field)) return true;

    const required = field.hasAttribute('required');
    const value = (field.value || '').toString().trim();

    if (required) {
        if (field.type === 'checkbox' || field.type === 'radio') {
            const name = field.name;
            if (!name) return true;
            return !!document.querySelector(`input[name="${CSS.escape(name)}"]:checked`);
        }
        if (!value) return false;
    } else {
        if (!value) return true;
    }

    if (field.type === 'email') return isValidEmail(value);
    if (field.dataset.type === FIELD_TYPES.PHONE) return isValidPhone(value);
    if (field.dataset.type === FIELD_TYPES.PINCODE) return value.replace(/\D/g, '').length === 6;

    return true;
}

function bindLiveErrorClearing(field) {
    if (!field || field.__hfcLiveBound) return;
    field.__hfcLiveBound = true;

    const handler = () => {
        const ok = isFieldValid(field);
        setFieldErrorState(field, !ok);
    };

    field.addEventListener('input', handler);
    field.addEventListener('change', handler);
}

/**
 * Soft validation for a step (warn but allow navigation)
 */
function validateStep(stepNumber) {
    const step = document.querySelector(`.form-step[data-step="${stepNumber}"]`);
    if (!step) return true;

    const required = step.querySelectorAll('[required]');
    let missingCount = 0;

    required.forEach(field => {
        if (isEffectivelyHidden(field)) {
            setFieldErrorState(field, false);
            return;
        }

        if (field.type === 'checkbox' || field.type === 'radio') {
            const name = field.name;
            const ok = !!(name && step.querySelector(`input[name="${CSS.escape(name)}"]:checked`));
            setFieldErrorState(field, !ok);
            if (!ok) missingCount++;
            return;
        }

        const v = (field.value || '').toString().trim();
        const ok = !!v;
        setFieldErrorState(field, !ok);
        if (!ok) missingCount++;
    });

    if (missingCount > 0) {
        showMessage?.(
            'warning',
            `⚠️ ${missingCount} required field(s) look incomplete in this step. You can proceed, but please complete them before final submission.`,
            3500
        );
    }

    return true;
}

/**
 * Final validation across all required fields (BLOCKS submission)
 * Used by submit.js
 */
function validateAllSteps() {
    const allRequired = document.querySelectorAll('[required]');
    const missingByStep = {};

    allRequired.forEach(field => {
        if (isEffectivelyHidden(field)) {
            setFieldErrorState(field, false);
            return;
        }

        let ok = true;

        if (field.type === 'checkbox' || field.type === 'radio') {
            const name = field.name;
            ok = !!(name && document.querySelector(`input[name="${CSS.escape(name)}"]:checked`));
        } else {
            ok = !!(field.value || '').toString().trim();
        }

        setFieldErrorState(field, !ok);

        if (!ok) {
            const stepNum = field.closest('.form-step')?.dataset.step || 'Unknown';
            const label = field.closest('.form-group')?.querySelector('label')?.textContent || field.name || 'Unknown';

            if (!missingByStep[stepNum]) missingByStep[stepNum] = [];
            missingByStep[stepNum].push(label.replace('*', '').trim());
        }
    });

    const totalMissing = Object.values(missingByStep).reduce((sum, arr) => sum + arr.length, 0);

    if (totalMissing > 0) {
        let html = '<div style="background:#fef2f2;padding:16px;border-radius:10px;border-left:4px solid #ef4444;">';
        html += '<h3 style="color:#b91c1c;margin:0 0 10px;">❌ Please complete these required fields:</h3>';

        Object.entries(missingByStep).forEach(([step, fields]) => {
            html += `<div style="margin:10px 0;"><strong>Step ${escapeHtmlForMsg(step)}:</strong><ul style="margin:6px 0 0 18px;">`;
            fields.slice(0, 10).forEach(f => { html += `<li>${escapeHtmlForMsg(f)}</li>`; });
            if (fields.length > 10) html += `<li>...and ${fields.length - 10} more</li>`;
            html += '</ul></div>';
        });

        html += '</div>';
        showMessage?.('error', html, 12000, true);

        // Jump to first missing step + scroll/focus the first invalid field (mobile-friendly)
        const firstStep = parseInt(Object.keys(missingByStep).sort((a, b) => parseInt(a, 10) - parseInt(b, 10))[0], 10);
        if (Number.isFinite(firstStep) && typeof gotoStep === 'function') {
            gotoStep(firstStep);
            setTimeout(() => {
                const stepEl = document.querySelector(`.form-step[data-step="${firstStep}"]`);
                const firstBad = stepEl?.querySelector('.error');
                if (firstBad && typeof firstBad.scrollIntoView === 'function') {
                    firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    if (typeof firstBad.focus === 'function') firstBad.focus({ preventScroll: true });
                }
            }, 50);
        }

        return false;
    }

    return true;
}

/**
 * Apply validation to dynamically created elements
 */
function applyValidationToElement(element) {
    if (!element) return;
    element.querySelectorAll('input, select, textarea').forEach(field => { bindValidationToField(field); bindLiveErrorClearing(field); });
}

function escapeHtmlForMsg(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}