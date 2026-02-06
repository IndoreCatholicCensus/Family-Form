// ============================================================================
// FORM-LOGIC.JS - Main Form Logic, Navigation & Conditional Display
// ============================================================================

let currentStep = 1;

document.addEventListener('DOMContentLoaded', function () {
    setupDateLimits?.();
    setupValidation?.();
    setupConditionalLogic();
    setupStepIndicatorNavigation();
    setupBilingualHelpers();

    gotoStep(1, { skipScroll: true });
    loadDraft();

    document.getElementById('prevBtn')?.addEventListener('click', () => changeStep(-1));
    document.getElementById('nextBtn')?.addEventListener('click', () => changeStep(1));

    if (FORM_CONFIG?.features?.autoSave) {
        setInterval(() => {
            try { saveDraft(true); } catch (_) {}
        }, FORM_CONFIG.autoSaveDraftInterval || 60000);
    }

    window.addEventListener('beforeunload', function (e) {
        if (currentStep > 1 && currentStep < (FORM_CONFIG?.totalSteps || 5)) {
            e.preventDefault();
            e.returnValue = (MESSAGES?.warning?.unsavedChanges || 'You have unsaved changes.');
        }
    });
});

function showMessage(type, message, duration = 4000, isHtml = false) {
    const container = document.getElementById('messageContainer');
    if (!container) return;

    const msg = document.createElement('div');
    msg.className = `message ${type || 'info'}`;

    if (isHtml) msg.innerHTML = message;
    else msg.textContent = message;

    container.appendChild(msg);

    if (duration > 0) {
        setTimeout(() => {
            msg.style.opacity = '0';
            msg.style.transition = 'opacity 300ms ease';
            setTimeout(() => msg.remove(), 350);
        }, duration);
    }
}

function gotoStep(step, opts = {}) {
    const total = FORM_CONFIG?.totalSteps || 5;
    const target = Math.max(1, Math.min(total, parseInt(step, 10) || 1));

    document.querySelector(`.form-step[data-step="${currentStep}"]`)?.classList.remove('active');
    document.querySelector(`.step[data-step="${currentStep}"]`)?.classList.remove('active');

    currentStep = target;

    document.querySelector(`.form-step[data-step="${currentStep}"]`)?.classList.add('active');
    document.querySelector(`.step[data-step="${currentStep}"]`)?.classList.add('active');

    updateNavigation();
    if (currentStep === total) generateReview();

    if (!opts.skipScroll) window.scrollTo({ top: 0, behavior: 'smooth' });
}

function changeStep(direction) {
    if (direction === 1 && FORM_CONFIG?.features?.stepValidation) {
        try { validateStep?.(currentStep); } catch (_) {}
    }

    markStepStatus(currentStep);
    gotoStep(currentStep + direction);
}

function markStepStatus(stepNum) {
    const stepEl = document.querySelector(`.form-step[data-step="${stepNum}"]`);
    const indicator = document.querySelector(`.step[data-step="${stepNum}"]`);
    if (!stepEl || !indicator) return;

    const requiredFields = Array.from(stepEl.querySelectorAll('[required]'));
    const hasIncomplete = requiredFields.some(field => {
        const fg = field.closest('.form-group');
        if (fg && (fg.classList.contains('hidden') || fg.style.display === 'none')) return false;

        if (field.type === 'checkbox' || field.type === 'radio') {
            const name = field.name;
            if (!name) return false;
            return !document.querySelector(`input[name="${CSS.escape(name)}"]:checked`);
        }
        return !(field.value || '').toString().trim();
    });

    indicator.classList.toggle('incomplete', hasIncomplete);
    indicator.classList.toggle('completed', !hasIncomplete);
}

function updateNavigation() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');

    if (prevBtn) prevBtn.style.display = currentStep === 1 ? 'none' : 'inline-flex';

    const total = FORM_CONFIG?.totalSteps || 5;
    if (currentStep === total) {
        if (nextBtn) nextBtn.style.display = 'none';
        if (submitBtn) submitBtn.classList.remove('hidden');
    } else {
        if (nextBtn) nextBtn.style.display = 'inline-flex';
        if (submitBtn) submitBtn.classList.add('hidden');
    }
}

function setupStepIndicatorNavigation() {
    document.querySelectorAll('.step-link').forEach((el) => {
        const step = parseInt(el.getAttribute('data-step') || '', 10);
        if (!step) return;

        const go = () => {
            markStepStatus(currentStep);
            gotoStep(step);
        };

        el.addEventListener('click', go);
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                go();
            }
        });
    });
}

// ============================================================================
// CONDITIONAL LOGIC - FIXED VERSION
// ============================================================================
function setupConditionalLogic() {
    // ------------------------------------------------------------------------
    // FIX #1: Marital status - improved spouse field handling
    // ------------------------------------------------------------------------
    const maritalEl = document.getElementById('maritalStatus');
    const spouseSection = document.getElementById('spouseSection');

    function clearSpouseValues() {
        const fields = ['spouse_prefix','spouse_firstname','spouse_lastname',
                       'spouse_dob','spouse_blood_group','spouse_blood_group_other','spouse_mobile'];
        fields.forEach(n => {
            const el = document.querySelector(`[name="${n}"]`);
            if (el) el.value = '';
        });
    }

    function applySpouseVisibility() {
        if (!maritalEl || !spouseSection) return;

        const status = (maritalEl.value || '').trim();
        const groups = Array.from(spouseSection.querySelectorAll('.form-group'));

        // Default: hide everything
        spouseSection.style.display = 'none';
        
        if (status === 'Married') {
            // Show all spouse fields
            spouseSection.style.display = 'block';
            groups.forEach(g => (g.style.display = ''));
            return;
        }

        if (status === 'Spouse Deceased') {
            // Show only name field (first form-group)
            spouseSection.style.display = 'block';
            groups.forEach((g, idx) => {
                g.style.display = (idx === 0) ? '' : 'none';
            });

            // Set prefix to "Late." as default
            const pref = document.querySelector('[name="spouse_prefix"]');
            if (pref && !pref.value) pref.value = 'Late.';
            return;
        }

        // For Divorced, Separated, Single: hide all and clear values
        spouseSection.style.display = 'none';
        clearSpouseValues();
        refreshAllChildAgeWarnings();
    }

    maritalEl?.addEventListener('change', applySpouseVisibility);

    // Refresh warnings when parent DOB changes
    document.querySelector('[name="head_dob"]')?.addEventListener('change', refreshAllChildAgeWarnings);
    document.querySelector('[name="spouse_dob"]')?.addEventListener('change', refreshAllChildAgeWarnings);

    // ------------------------------------------------------------------------
    // FIX #2: Head "Other" blood group field
    // ------------------------------------------------------------------------
    const headBloodGroup = document.querySelector('[name="head_blood_group"]');
    const headBloodOtherGroup = document.getElementById('headBloodOtherGroup');

    function applyHeadBloodGroupVisibility() {
        if (!headBloodGroup || !headBloodOtherGroup) return;
        
        if (headBloodGroup.value === 'Other') {
            headBloodOtherGroup.classList.remove('hidden');
            const input = headBloodOtherGroup.querySelector('input');
            if (input) input.setAttribute('required', 'required');
        } else {
            headBloodOtherGroup.classList.add('hidden');
            const input = headBloodOtherGroup.querySelector('input');
            if (input) {
                input.removeAttribute('required');
                input.value = '';
            }
        }
    }

    headBloodGroup?.addEventListener('change', applyHeadBloodGroupVisibility);

    // ------------------------------------------------------------------------
    // Spouse "Other" blood group field
    // ------------------------------------------------------------------------
    const spouseBloodGroup = document.querySelector('[name="spouse_blood_group"]');
    const spouseBloodOtherGroup = document.getElementById('spouseBloodOtherGroup');

    function applySpouseBloodGroupVisibility() {
        if (!spouseBloodGroup || !spouseBloodOtherGroup) return;
        
        if (spouseBloodGroup.value === 'Other') {
            spouseBloodOtherGroup.classList.remove('hidden');
            const input = spouseBloodOtherGroup.querySelector('input');
            if (input) input.setAttribute('required', 'required');
        } else {
            spouseBloodOtherGroup.classList.add('hidden');
            const input = spouseBloodOtherGroup.querySelector('input');
            if (input) {
                input.removeAttribute('required');
                input.value = '';
            }
        }
    }

    spouseBloodGroup?.addEventListener('change', applySpouseBloodGroupVisibility);

    // ------------------------------------------------------------------------
    // Rite - show "Other" field
    // ------------------------------------------------------------------------
    const riteSelect = document.getElementById('riteSelect');
    const otherRiteGroup = document.getElementById('otherRiteGroup');

    function applyRiteVisibility() {
        if (!riteSelect || !otherRiteGroup) return;
        if (riteSelect.value === 'Other') {
            otherRiteGroup.classList.remove('hidden');
            otherRiteGroup.querySelector('input')?.setAttribute('required', 'required');
        } else {
            otherRiteGroup.classList.add('hidden');
            otherRiteGroup.querySelector('input')?.removeAttribute('required');
            const otherInput = otherRiteGroup.querySelector('input');
            if (otherInput) otherInput.value = '';
        }
    }

    riteSelect?.addEventListener('change', applyRiteVisibility);

    // ------------------------------------------------------------------------
    // "Other" specify fields for checkbox groups
    // ------------------------------------------------------------------------
    function wireOtherSpecify(groupName, specifyInputId) {
        const specify = document.getElementById(specifyInputId);
        if (!specify) return;

        const update = () => {
            const hasOther = Array.from(document.querySelectorAll(`input[name="${groupName}"]:checked`))
                .some(cb => cb.value === 'Other');

            if (hasOther) {
                specify.classList.remove('hidden');
            } else {
                specify.classList.add('hidden');
                specify.value = '';
            }
        };

        document.addEventListener('change', (e) => {
            if (e.target && e.target.name === groupName) update();
        });

        update();
    }

    wireOtherSpecify('illness', 'illnessOther');
    wireOtherSpecify('conditions', 'conditionOther');
    wireOtherSpecify('insurance', 'insuranceOther');
    wireOtherSpecify('vehicle', 'vehicleOther');

    // ------------------------------------------------------------------------
    // Dependents
    // ------------------------------------------------------------------------
    document.addEventListener('change', function (e) {
        if (e.target && e.target.name === 'dependents') updateDependents();
    });

    // ------------------------------------------------------------------------
    // Number of children
    // ------------------------------------------------------------------------
    const numChildrenEl = document.getElementById('numChildren');
    numChildrenEl?.addEventListener('change', function () {
        buildChildrenSections(parseInt(this.value, 10) || 0);
    });

    // ------------------------------------------------------------------------
    // Job seeker section
    // ------------------------------------------------------------------------
    const jobSeekingEl = document.getElementById('jobSeeking');

    function isJobSeekingYes(val) {
        return val === 'Yes - Family' || val === 'Yes - Relative';
    }

    function buildJobSeekerBlock(i) {
        const block = document.createElement('div');
        block.className = 'child-section';
        block.setAttribute('data-jobseeker', String(i));
        block.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                <h3 style="margin:0;">Job Seeker ${i}</h3>
                <button type="button" class="btn btn-secondary js-remove-jobseeker" aria-label="Remove this person">Remove</button>
            </div>

            <div class="input-row" style="margin-top:10px;">
                <div class="form-group">
                    <label>Name</label>
                    <input type="text" name="jobseeker${i}_name" data-type="text-only" maxlength="80">
                </div>
                <div class="form-group">
                    <label>Gender</label>
                    <select name="jobseeker${i}_gender">
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
            </div>

            <div class="input-row">
                <div class="form-group">
                    <label>Age</label>
                    <input type="number" name="jobseeker${i}_age" min="10" max="90" inputmode="numeric" oninput="if(this.value.length > 2) this.value = this.value.slice(0,2);">
                </div>
                <div class="form-group">
                    <label>Qualification</label>
                    <input type="text" name="jobseeker${i}_qualification" data-type="text-only" maxlength="100">
                </div>
            </div>

            <div class="form-group">
                <label>Work experience (optional)</label>
                <input type="text" name="jobseeker${i}_experience" placeholder="e.g., 2 years, Sales" maxlength="200">
            </div>
        `;
        return block;
    }

    function renumberJobSeekers(blocksWrap) {
        const blocks = Array.from(blocksWrap.querySelectorAll('[data-jobseeker]'));
        blocks.forEach((block, idx) => {
            const num = idx + 1;
            block.setAttribute('data-jobseeker', String(num));
            const h3 = block.querySelector('h3');
            if (h3) h3.textContent = `Job Seeker ${num}`;

            block.querySelectorAll('input, select, textarea').forEach(el => {
                if (!el.name) return;
                el.name = el.name.replace(/^jobseeker\d+_/, `jobseeker${num}_`);
            });
        });
    }

    function renderJobSeekers(initialCount = 0) {
        const jobContainer = document.getElementById('jobSeekerContainer');
        if (!jobContainer) return;

        const val = jobSeekingEl ? jobSeekingEl.value : '';
        if (!isJobSeekingYes(val)) {
            jobContainer.innerHTML = '';
            jobContainer.classList.add('hidden');
            return;
        }

        jobContainer.classList.remove('hidden');
        jobContainer.innerHTML = '';

        const max = FORM_CONFIG?.jobSeekerMax || 5;

        const help = document.createElement('div');
        help.className = 'form-group';
        help.innerHTML = `
            <div class="message info" style="margin:0 0 12px;">
                Optional section. Add as many people as you need (up to ${max}).
            </div>
            <button type="button" id="addJobSeekerBtn" class="btn btn-secondary">+ Add a person</button>
        `;
        jobContainer.appendChild(help);

        const blocksWrap = document.createElement('div');
        blocksWrap.id = 'jobSeekerBlocks';
        jobContainer.appendChild(blocksWrap);

        const safeCount = Math.max(0, Math.min(initialCount, max));
        for (let i = 1; i <= safeCount; i++) blocksWrap.appendChild(buildJobSeekerBlock(i));

        applyValidationToElement?.(jobContainer);
        setupBilingualHelpers(jobContainer);

        jobContainer.querySelector('#addJobSeekerBtn')?.addEventListener('click', () => {
            const existing = blocksWrap.querySelectorAll('[data-jobseeker]').length;
            if (existing >= max) {
                showMessage('warning', `Maximum ${max} people allowed.`, 2500);
                return;
            }
            blocksWrap.appendChild(buildJobSeekerBlock(existing + 1));
            applyValidationToElement?.(blocksWrap);
            setupBilingualHelpers(blocksWrap);
        });

        blocksWrap.addEventListener('click', (e) => {
            const btn = e.target?.closest?.('.js-remove-jobseeker');
            if (!btn) return;
            const block = btn.closest('[data-jobseeker]');
            block?.remove();
            renumberJobSeekers(blocksWrap);
        });
    }

    jobSeekingEl?.addEventListener('change', () => renderJobSeekers(0));

    // Initial state
    applySpouseVisibility();
    applyHeadBloodGroupVisibility();
    applySpouseBloodGroupVisibility();
    applyRiteVisibility();
    updateDependents();
    renderJobSeekers(0);
}

function buildChildrenSections(num) {
    const container = document.getElementById('childrenContainer');
    if (!container) return;

    container.innerHTML = '';
    const max = FORM_CONFIG?.maxChildren || 4;
    const safeNum = Math.max(0, Math.min(num, max));

    for (let i = 1; i <= safeNum; i++) {
        container.appendChild(createChildSection(i));
    }

    applyValidationToElement?.(container);
    setupBilingualHelpers(container);
    refreshAllChildAgeWarnings();
}

function refreshAllChildAgeWarnings() {
    document.querySelectorAll('#childrenContainer input[type="date"][name^="child"][name$="_dob"]').forEach(d => {
        if (d.value) d.dispatchEvent(new Event('change', { bubbles: true }));
    });
}

function updateDependents() {
    const container = document.getElementById('dependentsContainer');
    if (!container) return;

    const selected = Array.from(document.querySelectorAll('input[name="dependents"]:checked'))
        .map(cb => cb.value);

    container.innerHTML = '';

    selected.forEach(dep => {
        const wrapper = document.createElement('div');
        wrapper.className = 'input-row';
        wrapper.style.marginTop = '15px';

        const safeNameKey = dep.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

        wrapper.innerHTML = `
            <div class="form-group">
                <label>${dep}'s Name</label>
                <input type="text" name="${safeNameKey}_name" data-type="text-only" maxlength="80">
            </div>
            <div class="form-group">
                <label>${dep}'s Age</label>
                <input type="number" name="${safeNameKey}_age" min="1" max="120" inputmode="numeric" oninput="if(this.value.length > 3) this.value = this.value.slice(0,3);">
            </div>
            ${dep === 'Other' ? `
            <div class="form-group">
                <label>Relationship with family (optional)</label>
                <input type="text" name="dependent_other_relationship" data-type="text-only" maxlength="40">
            </div>` : ``}
        `;

        container.appendChild(wrapper);
    });

    applyValidationToElement?.(container);
    setupBilingualHelpers(container);
}

function saveDraft(silent = false) {
    const form = document.getElementById('censusForm');
    if (!form) return;

    const draft = {
        currentStep,
        timestamp: new Date().toISOString(),
        values: {}
    };

    const elements = Array.from(form.elements).filter(el => el.name);

    elements.forEach(el => {
        const name = el.name;

        if (el.type === 'checkbox') {
            draft.values[name] = draft.values[name] || [];
            if (el.checked) draft.values[name].push(el.value);
            return;
        }

        if (el.type === 'radio') {
            if (el.checked) draft.values[name] = el.value;
            return;
        }

        if (el.tagName === 'SELECT' && el.multiple) {
            draft.values[name] = Array.from(el.options).filter(o => o.selected).map(o => o.value);
            return;
        }

        draft.values[name] = el.value;
    });

    draft.jobSeekerCount = getCurrentJobSeekerCountFromDOM();

    localStorage.setItem('hfc_draft', JSON.stringify(draft));
    if (!silent) showMessage('info', MESSAGES?.success?.draftSaved || 'Draft saved!', 2000);
}

function getCurrentJobSeekerCountFromDOM() {
    return document.querySelectorAll('#jobSeekerContainer [data-jobseeker]').length || 0;
}

function loadDraft() {
    const raw = localStorage.getItem('hfc_draft');
    if (!raw) return;

    let draft;
    try { draft = JSON.parse(raw); } catch (_) { return; }

    const ok = confirm('A saved draft was found. Would you like to load it?');
    if (!ok) return;

    const form = document.getElementById('censusForm');
    if (!form) return;

    const values = draft.values || draft;

    const savedChildrenCount = parseInt(values.num_children || '0', 10) || 0;
    const numChildrenEl = document.getElementById('numChildren');
    if (numChildrenEl) {
        numChildrenEl.value = String(savedChildrenCount);
        buildChildrenSections(savedChildrenCount);
    }

    const jobSeekingEl = document.getElementById('jobSeeking');
    if (jobSeekingEl && values.job_seeking !== undefined) {
        jobSeekingEl.value = values.job_seeking;
    }
    jobSeekingEl?.dispatchEvent(new Event('change'));

    const jobSeekerCount = parseInt(draft.jobSeekerCount || '0', 10) || 0;
    if (jobSeekerCount > 0 && jobSeekingEl && (jobSeekingEl.value || '').startsWith('Yes')) {
        const addBtn = document.getElementById('addJobSeekerBtn');
        for (let i = 0; i < jobSeekerCount; i++) addBtn?.click();
    }

    Object.entries(values).forEach(([name, value]) => {
        const nodes = form.querySelectorAll(`[name="${CSS.escape(name)}"]`);
        if (!nodes.length) return;

        const first = nodes[0];

        if (first.type === 'checkbox') {
            const arr = Array.isArray(value) ? value : [value];
            nodes.forEach(cb => { cb.checked = arr.includes(cb.value); });
            return;
        }

        if (first.type === 'radio') {
            nodes.forEach(r => { r.checked = (r.value === value); });
            return;
        }

        first.value = value;
    });

    document.getElementById('maritalStatus')?.dispatchEvent(new Event('change'));
    document.getElementById('riteSelect')?.dispatchEvent(new Event('change'));
    document.querySelector('[name="head_blood_group"]')?.dispatchEvent(new Event('change'));
    document.querySelector('[name="spouse_blood_group"]')?.dispatchEvent(new Event('change'));
    updateDependents();

    const step = parseInt(draft.currentStep || '1', 10) || 1;
    gotoStep(step);

    showMessage('success', MESSAGES?.success?.draftLoaded || 'Draft loaded!', 2500);
}

function setupBilingualHelpers(root = document) {
    const enableHindi = FORM_CONFIG?.i18n?.enableHindiSubLabels !== false;
    const enableNotes = FORM_CONFIG?.i18n?.enableFootnotes !== false;

    if (enableHindi) {
        root.querySelectorAll('label[data-hi], label[data-hindi]').forEach(label => {
            const hi = label.getAttribute('data-hi') || label.getAttribute('data-hindi');
            if (!hi) return;

            const fg = label.closest('.form-group');
            if (!fg) return;

            const next = label.nextElementSibling;
            if (next && next.classList.contains('sub-label')) return;

            const sub = document.createElement('div');
            sub.className = 'sub-label';
            sub.textContent = hi;
            label.insertAdjacentElement('afterend', sub);
        });

        root.querySelectorAll('[data-hi-inline]').forEach(el => {
            if (el.__hiDone) return;
            el.__hiDone = true;
            el.textContent = el.getAttribute('data-hi-inline') || '';
            el.classList.add('sub-label-inline');
        });

        root.querySelectorAll('.sub-label[data-hi]').forEach(el => {
            if (el.__hiDone) return;
            el.__hiDone = true;
            el.textContent = el.getAttribute('data-hi') || '';
        });
    }

    if (enableNotes) {
        root.querySelectorAll('[data-note]').forEach(control => {
            if (control.__noteDone) return;
            control.__noteDone = true;

            const note = control.getAttribute('data-note');
            if (!note) return;

            const fg = control.closest('.form-group') || control.parentElement;
            if (!fg) return;

            const existing = fg.querySelector('.field-note');
            if (existing) return;

            const div = document.createElement('div');
            div.className = 'field-note';
            div.textContent = note;
            fg.appendChild(div);
        });
    }
}

function generateReview() {
    const review = document.getElementById('reviewContent');
    const form = document.getElementById('censusForm');
    if (!review || !form) return;

    const data = {};
    const fd = new FormData(form);
    for (const [k, v] of fd.entries()) {
        if (data[k] !== undefined) {
            data[k] = Array.isArray(data[k]) ? [...data[k], v] : [data[k], v];
        } else {
            data[k] = v;
        }
    }

    const sections = [];

    sections.push({
        title: 'Basic',
        items: [
            ['Head of Family', `${data.head_prefix || ''} ${data.head_firstname || ''} ${data.head_lastname || ''}`.trim()],
            ['Head DOB', data.head_dob || ''],
            ['Birth Place', data.head_birthplace || ''],
            ['Blood Group', data.head_blood_group || ''],
            ['Mobile', data.head_mobile || ''],
            ['Marital Status', data.marital_status || ''],
            ['Spouse', (data.spouse_firstname ? `${data.spouse_prefix || ''} ${data.spouse_firstname || ''} ${data.spouse_lastname || ''}`.trim() : '')],
            ['Address', `${data.address_house || ''}, ${data.address_street || ''}, ${data.address_city || ''}, ${data.address_state || ''} ${data.address_pincode || ''}`.replace(/\s+,/g, ',').trim()],
            ['Email', data.email || '']
        ]
    });

    const numChildren = parseInt(data.num_children || '0', 10) || 0;
    const childItems = [];
    for (let i = 1; i <= numChildren; i++) {
        const nm = `${data[`child${i}_firstname`] || ''} ${data[`child${i}_lastname`] || ''}`.trim();
        const gender = data[`child${i}_gender`] || '';
        childItems.push([`Child ${i}`, `${nm} (${gender})`]);
        childItems.push([`Child ${i} DOB`, data[`child${i}_dob`] || '']);
        if (data[`child${i}_education`]) childItems.push([`Child ${i} Education`, data[`child${i}_education`]]);
        childItems.push([`Child ${i} Working`, data[`child${i}_working_status`] || '']);
        if (data[`child${i}_work_details`]) childItems.push([`Child ${i} Work details`, data[`child${i}_work_details`]]);
        childItems.push([`Child ${i} Marital status`, data[`child${i}_marital_status`] || '']);
        if (data[`child${i}_spouse_name`]) childItems.push([`Child ${i} Spouse`, data[`child${i}_spouse_name`]]);
    }
    if (childItems.length) sections.push({ title: 'Children', items: childItems });

    sections.push({
        title: 'Community',
        items: [
            ['Rite', data.rite || ''],
            ['Other Rite', data.rite_other || ''],
            ['Caste Category', data.caste_category || ''],
            ['Ethnic Community', data.ethnic_community || ''],
            ['Home Diocese', data.home_diocese || ''],
            ['Home Parish', data.home_parish || ''],
            ['Dependents', Array.isArray(data.dependents) ? data.dependents.join(', ') : (data.dependents || '')]
        ]
    });

    sections.push({
        title: 'Additional',
        items: [
            ['Illness', Array.isArray(data.illness) ? data.illness.join(', ') : (data.illness || '')],
            ['Conditions', Array.isArray(data.conditions) ? data.conditions.join(', ') : (data.conditions || '')],
            ['Insurance', Array.isArray(data.insurance) ? data.insurance.join(', ') : (data.insurance || '')],
            ['Vehicle', Array.isArray(data.vehicle) ? data.vehicle.join(', ') : (data.vehicle || '')],
            ['Job Seeking', data.job_seeking || '']
        ]
    });

    const jobItems = [];
    const jobBlocks = document.querySelectorAll('#jobSeekerContainer [data-jobseeker]');
    jobBlocks.forEach((block, idx) => {
        const n = idx + 1;
        const name = data[`jobseeker${n}_name`] || '';
        const age = data[`jobseeker${n}_age`] || '';
        const qual = data[`jobseeker${n}_qualification`] || '';
        const exp = data[`jobseeker${n}_experience`] || '';
        const gender = data[`jobseeker${n}_gender`] || '';
        if ([name, age, qual, exp, gender].some(Boolean)) {
            jobItems.push([`Person ${n}`, `${name}${gender ? ' (' + gender + ')' : ''}`.trim()]);
            if (age) jobItems.push([`Person ${n} Age`, age]);
            if (qual) jobItems.push([`Person ${n} Qualification`, qual]);
            if (exp) jobItems.push([`Person ${n} Experience`, exp]);
        }
    });
    if (jobItems.length) sections.push({ title: 'Job Seekers', items: jobItems });

    review.innerHTML = sections.map(sec => {
        const items = (sec.items || []).filter(([_, v]) => (v || '').toString().trim() !== '');
        if (!items.length) return '';
        const rows = items.map(([k, v]) =>
            `<div class="review-item"><strong>${escapeHtmlForMsg ? escapeHtmlForMsg(k) : k}:</strong> ${escapeHtmlForMsg ? escapeHtmlForMsg(v) : v}</div>`
        ).join('');
        return `<div class="review-section"><h3>${sec.title}</h3>${rows}</div>`;
    }).join('');
}