/**
 * Waits for an element to appear in the DOM.
 * @param selector - The CSS selector to watch for.
 * @param timeout - Max time to wait in milliseconds (default 5 seconds).
 */
export async function waitForElement(selector: string, timeout = 5000): Promise<Element> {
    return new Promise((resolve, reject) => {
        console.log(`Waiting for HTML element: ${selector}`);
        // 1. Check if it's already there
        const element = document.querySelector(selector);
        if (element) return resolve(element);

        // 2. Set up the Observer
        const observer = new MutationObserver(() => {
            const el = document.querySelector(selector);
            if (el) {
                clearTimeout(timer);
                observer.disconnect();
                resolve(el);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // 3. Set the "Time's Up" alarm
        const timer = setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Timeout: Element ${selector} not found within ${timeout}ms`));
        }, timeout);
    });
}

/**
 * Set the value of an text input.
 * @param selector CSS selector to select the input element.
 * @param text The text to be typed into the input text.
 * @param timeout Timeout(unit: ms) before the element shows up.
*/
export async function setInputValue(selector: string, text: string, timeout = 3000) {
    //const inputElem = document.querySelector<HTMLInputElement>(selector);
    const inputElem = await waitForElement(selector, timeout) as HTMLInputElement;
    inputElem.value = text;

    // Trigger events: input, change
    const eventConfig = { bubbles: true };
    inputElem.dispatchEvent(new Event('input', eventConfig));
    inputElem.dispatchEvent(new Event('change', eventConfig));
}

/**
 * Selects an option in a dropdown menu by its value and triggers change events.
 * @param selector CSS selector to select the select element.
 * @param valueOrLabel Value of the option to be selected.
 * @param timeout Max time to wait in milliseconds.
 */
export async function selectOptionByValueOrLabel(selector: string, valueOrLabel: string, timeout = 3000) {
    const selectElem = await waitForElement(selector, timeout) as HTMLSelectElement;

    // Try to select by value
    const valueExists = Array.from(selectElem.options).some(opt => opt.value === valueOrLabel);
    if (valueExists) {
        selectElem.value = valueOrLabel;
        selectElem.dispatchEvent(new Event('change', { bubbles: true }));
        return;
    }

    // Try to select by label
    const targetOption = Array.from(selectElem.options).find(opt => opt.text.trim() === valueOrLabel);
    if (targetOption) {
        selectElem.value = targetOption.value;
        selectElem.dispatchEvent(new Event('change', { bubbles: true }));
        return;
    }
    throw new Error(`Value/Label "${valueOrLabel}" not found in select "${selector}"`);
}

/**
 * 
 * @param selector CSS selector for the radio button.
 * @param timeout Max time to wait before selecting the radio option.
 */
export async function selectRadio(selector: string, timeout = 3000) {
    const radioElem = await waitForElement(selector, timeout) as HTMLInputElement;
    radioElem.click();
    radioElem.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Focuses and scrolls to an element, ensuring the DOM is ready.
 */
export async function focusAndScroll(selector: string, position: ScrollLogicalPosition) {
    const element = await waitForElement(selector) as HTMLElement;
    // We wait for the next frame to ensure the browser has updated the element's position in the layout.
    await new Promise(requestAnimationFrame);
    element.scrollIntoView({ behavior: 'instant', block: position });
}