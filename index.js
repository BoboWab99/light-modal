const Modal = (() => {
    /**
     * Track open modals' id values for ESC key handling
     */
    const __stack = [];

    /**
     * Store each modal's metadata, an object with the following properties:
     * - focus (true): enables focus on the element with autofocus or any other focusable element
     * - closable (true): indicates whether the modal can be closed with ESC key
     * - backdropClose (true): indicates whether the modal can be closed by clicking on the backdrop
     * - opener: the focused element in the DOM when the modal is opened
     * - duration (300): a number indicating the custom animation speed (default 300ms)
     * - data (null): an object with any details to pass to custom event when opening the modal
     */
    const __meta = {};

    /**
     * Default CSS z-index for one modal
     */
    const __zIndex = 1000;

    /**
     * Transition duration from hidden to fully visible and vice-versa
     */
    const __duration = 300;

    /**
     * Helper to dispatch custom events
     * @param {String} eventName 
     * @param {String} modalId 
     * @param {*} data 
     */
    function dispatch(eventName, modalId, data = null) {
        const event = new CustomEvent(eventName, {
            detail: { id: modalId, data },
            bubbles: true,
            cancelable: true
        });
        document.dispatchEvent(event);
    }

    // Global ESC key listener
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && __stack.length > 0) {
            const topModalId = __stack[__stack.length - 1];
            if (__meta[topModalId]?.closable !== false) {
                close(topModalId);
            }
        }
    });

    /**
     * Open modal
     * @param {String} id Modal id
     * @param {*} options { closable, backdropClose, duration, data }
     * @returns 
     */
    function open(id, options = {}) {
        const backdrop = document.getElementById(id);
        if (!backdrop) return;

        const {
            focus = true,
            closable = true,
            backdropClose = true,
            data = null,
            duration = __duration
        } = options;

        // Get opener element for focus restoration
        const opener = document.activeElement;

        // Store metadata
        __meta[id] = { closable, backdropClose, opener, duration, data };

        // Fire open event
        dispatch("wab.modal.open", id, data);

        // Add modal id to stack
        __stack.push(id);

        // Update z-index for stacking
        backdrop.style.zIndex = __zIndex + __stack.length;

        const modal = backdrop.querySelector(".modal");
        
        // Apply custom animation duration
        if (duration !== __duration) {
            backdrop.style.transition = `opacity ${duration}ms ease, visibility ${duration}ms ease`;
            modal.style.transition = `transform ${duration}ms ease`;
        }

        backdrop.classList.add("open");
        document.body.style.overflow = "hidden";

        // Close on backdrop click
        const clickHandler = (e) => {
            if (e.target === backdrop && backdropClose) {
                close(id);
            }
        };
        backdrop.addEventListener("click", clickHandler);
        backdrop.__clickHandler = clickHandler;

        // Handle focus and Fire opened event
        setTimeout(() => {
            if (focus) {
                const autofocusable = modal.querySelector("[autofocus]");
                if (autofocusable) {
                    autofocusable.focus();
                } else {
                    const focusable = modal.querySelectorAll('input, textarea, select, [href], button, [tabindex]:not([tabindex="-1"])');
                    if (focusable.length) focusable[0].focus();
                }
            }
            dispatch("wab.modal.opened", id, data);
        }, duration);
    }

    /**
     * Close open modal
     * @param {String} id Modal id
     * @returns 
     */
    function close(id) {
        const backdrop = document.getElementById(id);
        if (!backdrop || !__meta[id]) return;

        const { opener, duration, data } = __meta[id];

        // Fire close event
        dispatch("wab.modal.close", id, data);

        backdrop.classList.remove("open");

        // Remove modal id from stack
        const idx = __stack.indexOf(id);
        if (idx > -1) __stack.splice(idx, 1);

        // Restore body scroll if no modals are open
        if (__stack.length === 0) {
            document.body.style.overflow = "";
        }

        // Clean up backdrop click listener
        if (backdrop.__clickHandler) {
            backdrop.removeEventListener("click", backdrop.__clickHandler);
            delete backdrop.__clickHandler;
        }

        // Fire closed event and cleanup metadata
        // Restore focus to opener element
        setTimeout(() => {
            delete __meta[id];
            if (opener && __stack.length === 0) {
                opener.focus();
            }
            dispatch("wab.modal.closed", id, data);
        }, duration);
    }

    /**
     * Close all open modals in reverse order (topmost first)
     */
    function closeAll() {
        const stack = [...__stack];
        stack.reverse().forEach(id => close(id));
    }

    /**
     * Retrieve data passed to an open modal
     * @param {*} id Modal id
     * @returns 
     */
    function getData(id) {
        return __meta[id]?.data || null;
    }

    return { open, close, closeAll, getData };
})();


// Event listeners
document.addEventListener("wab.modal.open", (e) => {
    console.log(`🔝 Modal opening: ${e.detail.id}`, e.detail.data);
});

document.addEventListener("wab.modal.opened", (e) => {
    console.log(`✅ Modal opened: ${e.detail.id}`, e.detail.data);
});

document.addEventListener("wab.modal.close", (e) => {
    console.log(`🔙 Modal closing: ${e.detail.id}`, e.detail.data);
});

document.addEventListener("wab.modal.closed", (e) => {
    console.log(`❌ Modal closed: ${e.detail.id}`, e.detail.data);
});