// ============================================================================
// CONFIG.JS (FINAL / STABLE)
// ============================================================================
// IMPORTANT:
// 1) Put your Google Apps Script Web App URL in GOOGLE_SCRIPT_URL below.
//    It must look like: https://script.google.com/macros/s/XXXX/exec
// 2) Keep this file loaded BEFORE submit.js in index.html.
// ============================================================================

// ============================================================================
// CONFIG.JS - Configuration Settings (Holy Family Church Family Form)
// ============================================================================

// Google Apps Script URL (replace with your deployed script URL)
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxjHeANb6hfnWeY0DE-z-KoFgVkEOxCGCv-_U8etlu0eo35WPJxMTsuiT-xuYdRV9i_8Q/exec';

// Form configuration
const FORM_CONFIG = {
    totalSteps: 5,
    maxChildren: 4,

    minAge: 0,
    maxAge: 120,
    adultAge: 18,

    // Show Education field only when child age >= this
    educationMinAge: 3,

    // Job seeker blocks (dynamic add/remove)
    jobSeekerMax: 5,

    // Auto-save draft interval (milliseconds)
    autoSaveDraftInterval: 60000, // 1 minute

    // i18n helpers (optional)
    i18n: {
        // If you add data-hi="..." to any <label>, JS will auto-insert a Hindi sub-label.
        enableHindiSubLabels: true,
        // If you add data-note="..." to any input/select/textarea wrapper (.form-group),
        // JS will auto-insert a footnote under the field.
        enableFootnotes: true
    },

    // Feature flags
    features: {
        autoSave: true,
        stepValidation: true,     // Soft warnings per step (still allow navigation)
        requireAllFields: false   // Only enforce on final submit (submit.js)
    }
};

// Field type definitions for validation.js
const FIELD_TYPES = {
    TEXT_ONLY: 'text-only',
    PHONE: 'phone',
    PINCODE: 'pincode',
    EMAIL: 'email',
    DATE: 'date'
};

// Messages (used across JS)
const MESSAGES = {
    success: {
        submit: 'âœ“ Form submitted successfully!',
        draftSaved: 'ðŸ’¾ Draft saved successfully!',
        draftLoaded: 'âœ“ Draft loaded!'
    },
    error: {
        submit: 'Submission failed. Please try again.',
        validation: 'Please fix the highlighted errors before submitting.',
        incompleteFields: 'Some required fields are incomplete.',
        configMissing: 'Please configure Google Script URL first.'
    },
    warning: {
        incompleteStep: 'âš ï¸ Some fields in this step are incomplete. You can proceed, but please complete them before final submission.',
        unsavedChanges: 'You have unsaved changes. Are you sure you want to leave?'
    },
    info: {
        loading: 'Loading draft...',
        submitting: 'Submitting form...'
    }
};

// Step names (optional UX helper)
const STEP_NAMES = {
    1: 'Basic Information',
    2: 'Children Information',
    3: 'Community & Dependents',
    4: 'Additional Information',
    5: 'Review & Submit'
};

// Child education options
const EDUCATION_OPTIONS = [
    'Not started',
    'In school',
    'Higher Secondary',
    'Undergraduate',
    'Graduate',
    'PG/Masters',
    'PHD',
    'Other'
];

// Working status options (children.js)
const WORKING_STATUS = [
    'Yes',
    'No',
    'Seeking'
];