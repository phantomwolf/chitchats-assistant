/**
 * Waits for an element to appear.
 * @param selector - The CSS selector to watch for.
 * @param timeout - Max time to wait in milliseconds (default 5 seconds).
 * @returns The target element.
 */
export async function waitForElement<T extends Element>(selector: string, timeout = 5000): Promise<T> {
    return new Promise((resolve, reject) => {
        const element = document.querySelector<T>(selector);
        if (element) return resolve(element);

        const observer = new MutationObserver(() => {
            const el = document.querySelector<T>(selector);
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

        const timer = setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Timeout: Element ${selector} not found within ${timeout}ms`));
        }, timeout);
    });
}

/**
 * Find an HTML element using both CSS selector and its text content.
 * @param selector CSS selector of the target element.
 * @param text Text content of the target element.
 * @returns The first element that matches the selector and text content, or `undefined` if no matching element is found.
 */
export function querySelectorAndText<T extends Element>(selector: string, text: string): T | undefined {
    const elements = document.querySelectorAll<T>(selector);
    return Array.from(elements).find(elem => elem.textContent?.trim().toLowerCase() === text);
}

/**
 * Waits for an element to appear in the DOM.
 * @param selector The CSS selector of the target element.
 * @param text Text content of the target element.
 * @param timeout Max time to wait in milliseconds (default 5 seconds).
 */
export async function waitForElementByText<T extends Element>(selector: string, text: string, timeout = 5000): Promise<T> {
    return new Promise((resolve, reject) => {
        // Try to find the target element.
        const element = querySelectorAndText<T>(selector, text);
        if (element) {
            return resolve(element);
        }

        // If not found, set an observer.
        const observer = new MutationObserver(() => {
            const element = querySelectorAndText<T>(selector, text);
            if (element) {
                clearTimeout(timer);
                observer.disconnect();
                resolve(element);
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Setup timeout timer.
        const timer = setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Timeout: Element '${selector}'(text: ${text}) not found within ${timeout}ms`));
        }, timeout);
    });
}

/**
 * Set the value of an HTML input element.
 * @param element HTML input element to set the value for.
 * @param value The value to be set.
*/
export function setInputValueNew(element: HTMLInputElement, value: string) {
    element.value = value;

    // Trigger events(input, change) to notify listeners.
    const eventConfig = { bubbles: true };
    element.dispatchEvent(new Event('input', eventConfig));
    element.dispatchEvent(new Event('change', eventConfig));
}

/**
 * Set the value of an text input.
 * @param selector CSS selector to select the input element.
 * @param text The text to be typed into the input text.
 * @param timeout Timeout(unit: ms) before the element shows up.
*/
export async function setInputValue(selector: string, text: string, timeout = 3000) {
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
export async function scrollToElement(selector: string, position: ScrollLogicalPosition) {
    const element = await waitForElement(selector) as HTMLElement;
    // We wait for the next frame to ensure the browser has updated the element's position in the layout.
    await new Promise(requestAnimationFrame);
    element.scrollIntoView({ behavior: 'instant', block: position });
}