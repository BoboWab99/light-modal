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
     * Ensure "popstate" is fired once per modal closed manually
     */
    var __popped = false;

    /**
     * True if the modal is closing or opening
     */
    var __transitioning = false;

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
        if (!__transitioning && e.key === "Escape") closeTop();
    });

    window.addEventListener("popstate", () => {
        // @TODO Possible to prevent if __transitioning???
        if (!__popped && __stack.length > 0) {
            __closeTop(true);
            __popped = __stack.length == 0;
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

        history.pushState({ isWabModalOpen: true }, "");
        __popped = false;
        __transitioning = true;

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
        __meta[id] = { focus, closable, backdropClose, opener, duration, data };

        // Add modal id to stack
        __stack.push(id);

        // Fire open event
        dispatch("wab.modal.open", id, data);

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
        backdrop.__wabModalClickHandler = clickHandler;

        // Handle focus and Fire opened event
        setTimeout(() => {
            __transitioning = false;

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
        return __close(id, false);
    }

    /**
     * Close open modal
     * @param {String} id Modal id
     * @param {Boolean} popstate True if called from "popstate" event handler
     * @returns 
     */
    function __close(id, popstate) {
        const backdrop = document.getElementById(id);
        if (!backdrop || !__meta[id]) return;

        __transitioning = true;

        const { opener, duration, data } = __meta[id];

        // Fire close event
        dispatch("wab.modal.close", id, data);

        backdrop.classList.remove("open");

        // Restore body scroll if no modals are open
        if (__stack.length === 0) {
            document.body.style.overflow = "";
        }

        // Clean up backdrop click listener
        if (backdrop.__wabModalClickHandler) {
            backdrop.removeEventListener("click", backdrop.__wabModalClickHandler);
            delete backdrop.__wabModalClickHandler;
        }

        // Manually trigger back navigation
        if (!popstate) history.back();

        // Fire closed event and cleanup metadata
        // Restore focus to opener element
        setTimeout(() => {
            __transitioning = false;

            delete __meta[id];

            const idx = __stack.indexOf(id);
            if (idx > -1) __stack.splice(idx, 1);

            if (opener && __stack.length === 0) {
                opener.focus();
            }

            dispatch("wab.modal.closed", id, data);
        }, duration);
    }

    /**
     * Close topmost open modal
     * @param {Boolean} popstate True if called from "popstate" event handler
     */
    function __closeTop(popstate) {
        if (__stack.length > 0) {
            const topModalId = __stack[__stack.length - 1];
            if (__meta[topModalId]?.closable !== false) {
                return __close(topModalId, popstate);
            }
        }
    }

    /**
     * Close topmost open modal
     */
    function closeTop() {
        return __closeTop(false);
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

    return { open, close, closeTop, closeAll, getData };
})();

// Event listeners
// document.addEventListener("wab.modal.open", (e) => {
//     console.log(`🔝 Modal opening: ${e.detail.id}`, e.detail.data);
// });

// document.addEventListener("wab.modal.opened", (e) => {
//     console.log(`✅ Modal opened: ${e.detail.id}`, e.detail.data);
// });

// document.addEventListener("wab.modal.close", (e) => {
//     console.log(`🔙 Modal closing: ${e.detail.id}`, e.detail.data);
// });

// document.addEventListener("wab.modal.closed", (e) => {
//     console.log(`❌ Modal closed: ${e.detail.id}`, e.detail.data);
// });