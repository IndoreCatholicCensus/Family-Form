// ============================================================================
// DATEPICKER INITIALIZATION - jQuery UI
// Holy Family Church Family Form
// ============================================================================

(function($) {
    'use strict';

    // Get current year dynamically - updates automatically every year!
    const currentYear = new Date().getFullYear();
    const today = new Date();
    
    // Initialize all date pickers
    function initDatepickers() {
        // Adult date pickers (head, spouse) - default year 1980
        $('input[name="head_dob"], input[name="spouse_dob"]').datepicker({
            changeMonth: true,
            changeYear: true,
            yearRange: '1920:' + currentYear, // Automatically includes current year
            dateFormat: 'yy-mm-dd',
            maxDate: today, // Can't select future dates
            defaultDate: new Date(1980, 0, 1),
            showButtonPanel: false
        });

        // Child date pickers - default year 2010
        $('input[name^="child"][name$="_dob"]').datepicker({
            changeMonth: true,
            changeYear: true,
            yearRange: '1920:' + currentYear, // Automatically includes current year
            dateFormat: 'yy-mm-dd',
            maxDate: today, // Can't select future dates
            defaultDate: new Date(2010, 0, 1),
            showButtonPanel: false
        });
    }

    // Make function available globally for dynamically added children
    window.initChildDatepicker = function(element) {
        $(element).datepicker({
            changeMonth: true,
            changeYear: true,
            yearRange: '1920:' + currentYear, // Automatically includes current year
            dateFormat: 'yy-mm-dd',
            maxDate: today, // Can't select future dates
            defaultDate: new Date(2010, 0, 1),
            showButtonPanel: false
        });
    };

    // Initialize on page load
    $(document).ready(initDatepickers);

})(jQuery);
