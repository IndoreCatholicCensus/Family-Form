// ============================================================================
// CHILDREN.JS - Dynamic Children Section Creation (FIXED VERSION)
// ============================================================================

/**
 * FIX #3: Work status and marital status only appear after DOB is entered
 * and child is 18+. Education appears at age 3+.
 * FIX #4: Soft warning if child age >= parent age
 */
function createChildSection(num) {
    const div = document.createElement('div');
    div.className = 'child-section';
    const ordinal = ['1st', '2nd', '3rd', '4th'][num - 1];

    div.innerHTML = `
        <h3>Child ${num} (${ordinal})</h3>

        <div class="form-group">
            <label class="required">Name & Gender</label>
            <div class="name-input">
                <select name="child${num}_gender" required>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                </select>
                <input type="text" name="child${num}_firstname" placeholder="First Name" required data-type="text-only" maxlength="40">
                <input type="text" name="child${num}_lastname" placeholder="Last Name" required data-type="text-only" maxlength="40">
            </div>
        </div>

        <div class="form-group">
            <label class="required">Date of Birth</label>
            <input type="text" name="child${num}_dob" id="child${num}Dob" required placeholder="Select date" readonly>
            <input type="hidden" id="child${num}Age">
        </div>

        <!-- Education: Shows when age >= 3 -->
        <div class="form-group hidden" id="child${num}EducationGroup">
            <label class="required">Education</label>
            <select name="child${num}_education" required>
                <option value="">Select</option>
                ${EDUCATION_OPTIONS.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
            </select>
        </div>

        <!-- Working Status: Shows when age >= 18 -->
        <div class="form-group hidden" id="child${num}WorkStatusGroup">
            <label class="required">Working Status</label>
            <select name="child${num}_working_status" id="child${num}WorkStatus" required>
                <option value="">Select</option>
                ${WORKING_STATUS.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
            </select>
        </div>

        <div class="form-group hidden" id="child${num}WorkGroup">
            <label>Work Details</label>
            <input type="text" name="child${num}_work_details" placeholder="Company / Role (optional)" maxlength="100">
        </div>

        <!-- Mobile Number: Shows when age >= 18 -->
        <div class="form-group hidden" id="child${num}MobileGroup">
            <label>Mobile Number</label>
            <input type="tel" name="child${num}_mobile" placeholder="98260 12345" data-type="phone" inputmode="numeric" autocomplete="tel" pattern="\d{10}" maxlength="13">
            <div class="sub-label">Optional - for direct communication</div>
        </div>

        <!-- Marital Status: Shows when age >= 18 -->
        <div class="form-group hidden" id="child${num}MaritalStatusGroup">
            <label class="required">Marital Status</label>
            <select name="child${num}_marital_status" id="child${num}MaritalStatus" required>
                <option value="">Select</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
            </select>
        </div>

        <div class="form-group hidden" id="child${num}SpouseGroup">
            <label>Spouse Name</label>
            <input type="text" name="child${num}_spouse_name" placeholder="Spouse Name" data-type="text-only" maxlength="40">
        </div>

        <div class="form-group hidden" id="child${num}SpouseMobileGroup">
            <label>Spouse Mobile Number</label>
            <input type="tel" name="child${num}_spouse_mobile" placeholder="98260 12345" data-type="phone" inputmode="numeric" autocomplete="tel" pattern="\d{10}" maxlength="13">
        </div>

        <!-- FIX #4: Age warning -->
        <div class="message warning hidden" id="child${num}AgeWarning">
            ⚠️ Warning: Child age appears to be equal to or greater than a parent's age. Please verify the date of birth.
        </div>
    `;

    setupChildEventListeners(num, div);
    
    // Initialize Flatpickr for this child's DOB field
    setTimeout(() => {
        if (typeof initializeChildDatePicker === 'function') {
            initializeChildDatePicker(num);
        }
    }, 100);
    
    return div;
}

/**
 * Setup event listeners for a child section
 */
function setupChildEventListeners(num, div) {
    const dobInput = div.querySelector(`#child${num}Dob`);
    const ageHidden = div.querySelector(`#child${num}Age`);
    const workStatusGroup = div.querySelector(`#child${num}WorkStatusGroup`);
    const workStatus = div.querySelector(`#child${num}WorkStatus`);
    const workGroup = div.querySelector(`#child${num}WorkGroup`);
    const mobileGroup = div.querySelector(`#child${num}MobileGroup`);
    const maritalStatusGroup = div.querySelector(`#child${num}MaritalStatusGroup`);
    const maritalStatus = div.querySelector(`#child${num}MaritalStatus`);
    const spouseGroup = div.querySelector(`#child${num}SpouseGroup`);
    const spouseMobileGroup = div.querySelector(`#child${num}SpouseMobileGroup`);
    const educationGroup = div.querySelector(`#child${num}EducationGroup`);
    const ageWarning = div.querySelector(`#child${num}AgeWarning`);

    // FIX #4: Get parent ages for comparison
    function getParentAges() {
        const ages = [];
        const headDob = document.querySelector('input[name="head_dob"]')?.value;
        const spouseDob = document.querySelector('input[name="spouse_dob"]')?.value;
        if (headDob) ages.push(calculateAge(headDob));
        if (spouseDob) ages.push(calculateAge(spouseDob));
        return ages.filter(a => Number.isFinite(a) && a > 0);
    }

    if (dobInput) {
        dobInput.addEventListener('change', function () {
            const dob = this.value;
            if (!dob) {
                // Hide all conditional fields if no DOB
                educationGroup?.classList.add('hidden');
                workStatusGroup?.classList.add('hidden');
                workGroup?.classList.add('hidden');
                mobileGroup?.classList.add('hidden');
                maritalStatusGroup?.classList.add('hidden');
                spouseGroup?.classList.add('hidden');
                spouseMobileGroup?.classList.add('hidden');
                ageWarning?.classList.add('hidden');
                return;
            }

            const age = calculateAge(dob);
            if (ageHidden) ageHidden.value = String(age);

            // FIX #3: Education gating (age >= 3)
            const minEduAge = FORM_CONFIG?.educationMinAge ?? 3;
            if (educationGroup) {
                if (age >= minEduAge) {
                    educationGroup.classList.remove('hidden');
                    const sel = educationGroup.querySelector('select');
                    if (sel) sel.setAttribute('required', 'required');
                } else {
                    educationGroup.classList.add('hidden');
                    const sel = educationGroup.querySelector('select');
                    if (sel) {
                        sel.removeAttribute('required');
                        sel.value = '';
                    }
                }
            }

            // FIX #3: Work status and marital status only for adults (age >= 18)
            const adultAge = FORM_CONFIG?.adultAge ?? 18;
            
            if (workStatusGroup) {
                if (age >= adultAge) {
                    workStatusGroup.classList.remove('hidden');
                    const sel = workStatusGroup.querySelector('select');
                    if (sel) sel.setAttribute('required', 'required');
                } else {
                    workStatusGroup.classList.add('hidden');
                    workGroup?.classList.add('hidden');
                    const sel = workStatusGroup.querySelector('select');
                    if (sel) {
                        sel.removeAttribute('required');
                        sel.value = '';
                    }
                    const inp = workGroup?.querySelector('input');
                    if (inp) inp.value = '';
                }
            }

            // Show mobile number for adults (18+)
            if (mobileGroup) {
                if (age >= adultAge) {
                    mobileGroup.classList.remove('hidden');
                } else {
                    mobileGroup.classList.add('hidden');
                    const inp = mobileGroup.querySelector('input');
                    if (inp) inp.value = '';
                }
            }

            if (maritalStatusGroup) {
                if (age >= adultAge) {
                    maritalStatusGroup.classList.remove('hidden');
                    const sel = maritalStatusGroup.querySelector('select');
                    if (sel) sel.setAttribute('required', 'required');
                } else {
                    maritalStatusGroup.classList.add('hidden');
                    spouseGroup?.classList.add('hidden');
                    spouseMobileGroup?.classList.add('hidden');
                    const sel = maritalStatusGroup.querySelector('select');
                    if (sel) {
                        sel.removeAttribute('required');
                        sel.value = '';
                    }
                    const nameInp = spouseGroup?.querySelector('input');
                    if (nameInp) nameInp.value = '';
                    const mobileInp = spouseMobileGroup?.querySelector('input');
                    if (mobileInp) mobileInp.value = '';
                }
            }

            // FIX #4: Age warning if child >= parent age
            if (ageWarning) {
                const parentAges = getParentAges();
                if (parentAges.length > 0) {
                    const minParentAge = Math.min(...parentAges);
                    if (age >= minParentAge) {
                        ageWarning.classList.remove('hidden');
                    } else {
                        ageWarning.classList.add('hidden');
                    }
                } else {
                    ageWarning.classList.add('hidden');
                }
            }
        });
    }

    // Work status change handler
    if (workStatus) {
        workStatus.addEventListener('change', function () {
            if (!workGroup) return;
            if (this.value === 'Yes') {
                workGroup.classList.remove('hidden');
            } else {
                workGroup.classList.add('hidden');
                const inp = workGroup.querySelector('input');
                if (inp) inp.value = '';
            }
        });
    }

    // Marital status change handler
    if (maritalStatus) {
        maritalStatus.addEventListener('change', function () {
            if (this.value === 'Married') {
                spouseGroup?.classList.remove('hidden');
                spouseMobileGroup?.classList.remove('hidden');
            } else {
                spouseGroup?.classList.add('hidden');
                spouseMobileGroup?.classList.add('hidden');
                const nameInp = spouseGroup?.querySelector('input');
                if (nameInp) nameInp.value = '';
                const mobileInp = spouseMobileGroup?.querySelector('input');
                if (mobileInp) mobileInp.value = '';
            }
        });
    }
}

/**
 * Calculate age from date string
 */
function calculateAge(dateString) {
    const birth = new Date(dateString);
    const today = new Date();

    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}