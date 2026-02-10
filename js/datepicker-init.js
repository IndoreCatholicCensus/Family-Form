// ============================================================================
// DATEPICKER-INIT.JS - Flatpickr with Smart Manual Input (BEST UX)
// ============================================================================

/**
 * HYBRID APPROACH:
 * - Users can TYPE dates directly (fastest for known birth dates!)
 * - Calendar still available as backup (click icon)
 * - Smart parsing handles multiple formats
 * - Year jumper available in calendar for visual selection
 */

document.addEventListener('DOMContentLoaded', () => {
    initializeDatePickers();
});

/**
 * Initialize date pickers for head and spouse DOB
 */
function initializeDatePickers() {
    const today = new Date();
    
    const config = {
        dateFormat: 'Y-m-d',
        altInput: true,
        altFormat: 'F j, Y', // Shows "May 3, 1978" (human-friendly)
        maxDate: today,
        minDate: '1920-01-01',
        
        // KEY: Allow manual typing!
        allowInput: true,
        
        // Wrap to show calendar icon
        wrap: false,
        
        // Mobile friendly
        disableMobile: false,
        
        // Parse various input formats
        parseDate: (datestr, format) => {
            return parseFlexibleDate(datestr);
        },
        
        // Show year jumper when calendar opens
        onReady: function(selectedDates, dateStr, instance) {
            addYearJumperQuick(instance);
        }
    };
    
    // Initialize head DOB
    const headDob = document.querySelector('input[name="head_dob"]');
    if (headDob) {
        flatpickr(headDob, config);
        addPlaceholderHint(headDob);
    }
    
    // Initialize spouse DOB
    const spouseDob = document.querySelector('input[name="spouse_dob"]');
    if (spouseDob) {
        flatpickr(spouseDob, config);
        addPlaceholderHint(spouseDob);
    }
}

/**
 * Add helpful placeholder
 */
function addPlaceholderHint(input) {
    if (input) {
        input.setAttribute('placeholder', 'Type: 1978-05-03 or click to select');
    }
}

/**
 * Parse flexible date formats (forgiving input)
 */
function parseFlexibleDate(str) {
    if (!str) return null;
    
    // Try standard format first
    let d = new Date(str);
    if (!isNaN(d.getTime())) return d;
    
    // Try common formats: DD/MM/YYYY, DD-MM-YYYY
    const patterns = [
        /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/, // DD/MM/YYYY or DD-MM-YYYY
        /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/, // YYYY/MM/DD or YYYY-MM-DD
    ];
    
    for (const pattern of patterns) {
        const match = str.match(pattern);
        if (match) {
            const [_, a, b, c] = match;
            // Assume YYYY-MM-DD if first group is 4 digits
            if (a.length === 4) {
                d = new Date(parseInt(a), parseInt(b) - 1, parseInt(c));
            } else {
                // Assume DD/MM/YYYY
                d = new Date(parseInt(c), parseInt(b) - 1, parseInt(a));
            }
            if (!isNaN(d.getTime())) return d;
        }
    }
    
    return null;
}

/**
 * Simplified year jumper (smaller, less intrusive)
 */
function addYearJumperQuick(instance) {
    setTimeout(() => {
        const container = instance.calendarContainer;
        if (!container || container.querySelector('.year-jumper-quick')) return;
        
        const jumper = document.createElement('div');
        jumper.className = 'year-jumper-quick';
        jumper.innerHTML = `
            <span style="font-size:11px;color:#64748b;">Quick:</span>
            <button type="button" class="year-jump-quick" data-years="-50">1970s</button>
            <button type="button" class="year-jump-quick" data-years="-30">1990s</button>
            <button type="button" class="year-jump-quick" data-years="-20">2000s</button>
        `;
        
        const monthNav = container.querySelector('.flatpickr-months');
        if (monthNav) {
            monthNav.parentNode.insertBefore(jumper, monthNav.nextSibling);
        }
        
        jumper.querySelectorAll('.year-jump-quick').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const years = parseInt(btn.dataset.years);
                const targetYear = new Date().getFullYear() + years;
                instance.changeYear(targetYear);
            });
        });
    }, 50);
}

/**
 * Initialize date picker for a child DOB field
 */
function initializeChildDatePicker(childNum) {
    const today = new Date();
    
    const input = document.getElementById(`child${childNum}Dob`);
    if (!input) return;
    
    const config = {
        dateFormat: 'Y-m-d',
        altInput: true,
        altFormat: 'F j, Y',
        maxDate: today,
        minDate: '1920-01-01',
        allowInput: true,
        disableMobile: false,
        
        parseDate: (datestr) => parseFlexibleDate(datestr),
        
        onChange: function(selectedDates, dateStr, instance) {
            const event = new Event('change', { bubbles: true });
            input.dispatchEvent(event);
        },
        
        onReady: function(selectedDates, dateStr, instance) {
            addYearJumperQuick(instance);
        }
    };
    
    flatpickr(input, config);
    addPlaceholderHint(input);
}
