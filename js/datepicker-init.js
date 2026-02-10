// ============================================================================
// FLATPICKR INITIALIZATION - FIXED VERSION (No monthSelect plugin)
// ============================================================================

(function() {
    'use strict';

    const currentYear = new Date().getFullYear();

    // Common Flatpickr configuration
    const flatpickrConfig = {
        dateFormat: "Y-m-d",
        maxDate: "today",
        minDate: "1920-01-01",
        
        // Show year/month dropdowns in the header
        static: false,
        
        // Trigger change event when date is selected
        onChange: function(selectedDates, dateStr, instance) {
            instance.input.dispatchEvent(new Event('change', { bubbles: true }));
        },
        
        // Allow year selection via arrow buttons
        showMonths: 1
    };

    function initDatepickers() {
        // Adult date pickers (head, spouse)
        const adultInputs = document.querySelectorAll('input[name="head_dob"], input[name="spouse_dob"]');
        adultInputs.forEach(input => {
            if (!input._flatpickr) {
                flatpickr(input, flatpickrConfig);
            }
        });

        // Child date pickers (initial load)
        const childInputs = document.querySelectorAll('input.flatpickr-child:not([data-fp-initialized])');
        childInputs.forEach(input => {
            input.setAttribute('data-fp-initialized', 'true');
            if (!input._flatpickr) {
                flatpickr(input, flatpickrConfig);
            }
        });
    }

    // Initialize for dynamically added children
    window.initChildFlatpickr = function(element) {
        if (!element || element._flatpickr || element.getAttribute('data-fp-initialized')) return;
        
        element.setAttribute('data-fp-initialized', 'true');
        flatpickr(element, flatpickrConfig);
    };

    // Wait for Flatpickr library to load
    function waitForFlatpickr() {
        if (typeof flatpickr !== 'undefined') {
            initDatepickers();
        } else {
            setTimeout(waitForFlatpickr, 100);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForFlatpickr);
    } else {
        waitForFlatpickr();
    }

})();
