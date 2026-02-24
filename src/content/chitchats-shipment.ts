import { getSettings, Settings } from '../utils/settings.js';
import { focusAndScroll, selectOptionByValueOrLabel, selectRadio, setInputValue, waitForElement } from '../utils/dom.js';
import { Package } from '../types/package.js';
import { sleep } from '../utils/utils.js';

export class ChitChatsShipment {
    orderId: string;
    shipmentId: string = '';

    // HTML elements
    rowElem: HTMLTableRowElement;

    constructor(orderId: string, rowElem: HTMLTableRowElement) {
        this.orderId = orderId;
        this.rowElem = rowElem;
    }

    /**
     * Open shipment popup window.
     */
    async openPopup() {
        // Click the shipment row.
        this.rowElem.click();
        this.rowElem.dispatchEvent(new Event('change', { bubbles: true }));

        const shipmentIdElem = await waitForElement(
            '.js-right-sidebar-content h2.small-title + .clearfix > strong'
        ) as HTMLElement;
        this.shipmentId = shipmentIdElem.textContent.trim();
        if (!this.shipmentId) {
            throw new Error(`[Order ${this.orderId}] Failed to get shipment ID`);
        }

        // Add package
        const addPackageElem = await waitForElement(
            `main#content .js-right-sidebar-content a.info-panel__edit-link`,
        ) as HTMLLinkElement;
        addPackageElem.click();
        addPackageElem.dispatchEvent(new Event('change', { bubbles: true }));

        const settings = await getSettings();
        console.log(`ChitChats client ID: ${settings.chitchatsClientId}`);
        try {
            await waitForElement(`button[aria-label="Close"]`);
        } catch (err) {
            throw new Error(`[Order ${this.orderId}] Failed to open shipment popup window`);
        }
    }

    /**
     * Wait for navigation step to show up.
     * @param text Navigation step text to be searched.
     * @param timeout Max time to wait for.
     * @returns The HTML element of the navigation step; or undefined if not found.
     */
    async waitForNavigationSteps(text: string, timeout = 3000): Promise<HTMLAnchorElement | undefined> {
        const tabLinkSel = 'nav.nav-steps a.nav-steps__item';
        try {
            await waitForElement(tabLinkSel, timeout);
        } catch (err) {
            throw new Error(`[Order ${this.orderId}] Failed to find shipment tab links: ${err}`);
        }

        const navStepLinks = document.querySelectorAll<HTMLAnchorElement>(tabLinkSel);
        return Array.from(navStepLinks).find(link => {
            return link.textContent?.trim().toLowerCase() === text.toLowerCase();
        });
    }

    /**
     * Fill in product details.
     */
    async fillProductDetails() {
        // Jump to description navigation step if necessary.
        const descLink = await this.waitForNavigationSteps('description');
        if (descLink) {
            descLink.click();
            descLink.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const settings = await getSettings();
        let i = 0;
        while (true) {
            // Wait for manufacturer contact text input to show up
            const contactElemSel = `#shipment_customs_view_model_shipment_items_attributes_${i}_manufacturer_contact`;
            let contactElem: HTMLInputElement;
            try {
                contactElem = await waitForElement(contactElemSel) as HTMLInputElement;
            } catch (err) {
                console.log('Reached the end of product list');
                break;
            }

            // Skip products already processed
            if (contactElem.value !== '') {
                console.log(`[Order ${this.orderId}] Product ${i} already processed`);

                // Scroll down
                try {
                    await focusAndScroll(contactElemSel, 'start');
                } catch (err) {
                    throw new Error(`[Order ${this.orderId}] Scrolling to product ${i} failed`);
                }

                i++;
                continue;
            }

            // Fix unit value for swatch orders
            const unitValueSel = `#shipment_customs_view_model_shipment_items_attributes_${i}_value_amount`;
            const unitValueElem = document.querySelector(unitValueSel) as HTMLInputElement;
            const unitValue = Number(unitValueElem?.value) || 0;
            if (unitValue < 3) {
                try {
                    await setInputValue(unitValueSel, '18');
                } catch (err) {
                    throw new Error(`[Order ${this.orderId}] Failed to set product ${i} unit price: ${err}`);
                }
            }

            // Fill in product description
            const descriptionElem = document.querySelector(`#shipment_customs_view_model_shipment_items_attributes_${i}_description`) as HTMLInputElement;
            const productName = descriptionElem.value;
            const productMatcher = await settings.searchProductMatcher(productName);
            if (!productMatcher) {
                // Can't find a matching product
                throw new Error(`[Order ${this.orderId}] Failed to find a matching description for '${productName}'`);
            }
            try {
                await setInputValue(`#shipment_customs_view_model_shipment_items_attributes_${i}_description`, productMatcher.description);
            } catch (err) {
                throw new Error(`[Order ${this.orderId}] Failed to set product ${i} description: ${err}`);
            }

            // Select origin country
            try {
                await selectOptionByValueOrLabel(`#shipment_customs_view_model_shipment_items_attributes_${i}_origin_country`, productMatcher.originCountry);
            } catch (err) {
                throw new Error(`[Order ${this.orderId}] Failed to select product ${i} origin country: ${err}`);
            }

            // Fill in HS code
            try {
                await setInputValue(`#shipment_customs_view_model_shipment_items_attributes_${i}_hs_tariff_code`, productMatcher.hsCode);
            } catch (err) {
                throw new Error(`[Order ${this.orderId}] Failed to set product ${i} HS code: ${err}`);
            }

            // Fill in steel and aluminum percentage
            try {
                await setInputValue(`#shipment_customs_view_model_shipment_items_attributes_${i}_additional_tariff_details_steel`, '0');
            } catch (err) {
                throw new Error(`[Order ${this.orderId}] Failed to set product ${i} steel percentage: ${err}`);
            }
            try {
                await setInputValue(`#shipment_customs_view_model_shipment_items_attributes_${i}_additional_tariff_details_aluminum`, '0');
            } catch (err) {
                throw new Error(`[Order ${this.orderId}] Failed to set product ${i} aluminum percentage: ${err}`);
            }

            // Fill in manufacturer contact
            const manufacturer = settings.manufacturers[productMatcher.manufacturer];
            if (!manufacturer) {
                throw new Error(`[Order ${this.orderId}] Failed to find manufacturer '${productMatcher.manufacturer}'`);
            }
            try {
                await setInputValue(contactElemSel, manufacturer.contact);
            } catch (err) {
                throw new Error(`[Order ${this.orderId}] Failed to set product ${i} manufacturer contact: ${err}`);
            }

            // Fill in manufacturer country
            try {
                await setInputValue(`#shipment_customs_view_model_shipment_items_attributes_${i}_manufacturer_country_code`, manufacturer.country);
            } catch (err) {
                throw new Error(`[Order ${this.orderId}] Failed to set product ${i} manufacturer country: ${err}`);
            }

            // Fill in manufacturer address1
            try {
                await setInputValue(`#shipment_customs_view_model_shipment_items_attributes_${i}_manufacturer_street`, manufacturer.address1);
            } catch (err) {
                throw new Error(`[Order ${this.orderId}] Failed to set product ${i} manufacturer address1: ${err}`);
            }

            // Fill in manufacturer address2 if needed
            if (manufacturer.address2) {
                try {
                    await setInputValue(`#shipment_customs_view_model_shipment_items_attributes_${i}_manufacturer_street_2`, manufacturer.address2);
                } catch (err) {
                    throw new Error(`[Order ${this.orderId}] Failed to set product ${i} manufacturer address2: ${err}`);
                }
            }

            // Fill in manufacturer city
            try {
                await setInputValue(`#shipment_customs_view_model_shipment_items_attributes_${i}_manufacturer_city`, manufacturer.city);
            } catch (err) {
                throw new Error(`[Order ${this.orderId}] Failed to set product ${i} manufacturer city: ${err}`);
            }

            // Fill in manufacturer postal code
            try {
                await setInputValue(`#shipment_customs_view_model_shipment_items_attributes_${i}_manufacturer_postal_code`, manufacturer.postalCode);
            } catch (err) {
                throw new Error(`[Order ${this.orderId}] Failed to set product ${i} manufacturer postal code: ${err}`);
            }

            // Fill in manufacturer phone
            try {
                await setInputValue(`#shipment_customs_view_model_shipment_items_attributes_${i}_manufacturer_phone`, manufacturer.phone);
            } catch (err) {
                throw new Error(`[Order ${this.orderId}] Failed to set product ${i} manufacturer phone: ${err}`);
            }

            // Fill in manufacturer email
            const emailElemSel = `#shipment_customs_view_model_shipment_items_attributes_${i}_manufacturer_email`;
            try {
                await setInputValue(emailElemSel, manufacturer.email);
            } catch (err) {
                throw new Error(`[Order ${this.orderId}] Failed to set product ${i} manufacturer email: ${err}`);
            }

            // Select province
            try {
                await selectOptionByValueOrLabel(`select[id="shipment_customs_view_model[shipment_items_attributes][${i}]_province_code_ca"]`, manufacturer.provinceState);
            } catch (err) {
                throw new Error(`[Order ${this.orderId}] Failed to select product ${i} manufacturer province: ${err}`);
            }

            // Scroll down
            try {
                await focusAndScroll(emailElemSel, 'start')
            } catch (err) {
                throw new Error(`[Order ${this.orderId}] Scrolling to product '${productName}' (index ${i}) manufacturer email text input failed`);
            }

            i++;
        }

        await this.submitProductDetails();

        // Sleep for a short period to wait for next step to show up.
        await sleep(300);
    }

    /**
     * Click 'Save and Continue' button to submit product details.
     */
    async submitProductDetails() {
        const submitBtn = await waitForElement(
            `form#new_shipment_customs_view_model input[type="submit"][name="save"]`
        ) as HTMLInputElement;
        submitBtn.click();
        submitBtn.dispatchEvent(new Event('change', { bubbles: true }));
    }

    /**
     * Fill in package details.
     */
    async fillPackageDetails() {
        try {
            await waitForElement('form#new_shipment_package_view_model');
        } catch (err) {
            throw new Error(`[Order ${this.orderId}] Failed to find package type form: ${err}`);
        }

        // Wait for package type 'parcel' to show up.
        const parcelRadioSel = '#shipment_package_view_model_package_category_parcel';
        try {
            await waitForElement(parcelRadioSel);
        } catch (err) {
            throw new Error(`[Order ${this.orderId}] Failed to find package type 'parcel': ${err}`);
        }

        // Check if package type is already selected.
        const isSelected = document.querySelector(
            'input[type="radio"][name="shipment_package_view_model[package_category]"]:checked'
        );
        if (isSelected) {
            // Package already selected.
            console.log(`[Order ${this.orderId}] Package type already selected`);
            await this.submitPackageDetails();
            return;
        }

        // Select package type: parcel
        try {
            await selectRadio(parcelRadioSel);
        } catch (err) {
            throw new Error(`[Order ${this.orderId}] Failed to select package type 'parcel': ${err}`);
        }

        // Fill in package weight
        const weightElem = await waitForElement(
            'input#shipment_package_view_model_weight_amount'
        ) as HTMLInputElement;
        let weightValue = Number(weightElem.value);

        // Add the weight of the package itself to the total weight
        weightElem.value = (weightValue + 52).toString();
        weightElem.dispatchEvent(new Event('input', { bubbles: true }));
        weightElem.dispatchEvent(new Event('change', { bubbles: true }));

        // Select correct package size
        const settings = await getSettings();
        let pkg: Package | null = null;
        for (const item of settings.packages) {
            if (weightValue >= item.fromWeight && weightValue <= item.toWeight) {
                pkg = item;
            }
        }
        if (!pkg) {
            throw new Error(`[Order ${this.orderId}] No suitable package size found`);
        }

        // Fill in package size
        try {
            await setInputValue('input#shipment_package_view_model_size_x_amount', pkg.length.toString());
        } catch (err) {
            throw new Error(`[Order ${this.orderId}] Failed to set package length: ${err}`);
        }
        try {
            await setInputValue('input#shipment_package_view_model_size_y_amount', pkg.width.toString());
        } catch (err) {
            throw new Error(`[Order ${this.orderId}] Failed to set package width: ${err}`);
        }
        try {
            await setInputValue('input#shipment_package_view_model_size_z_amount', pkg.height.toString());
        } catch (err) {
            throw new Error(`[Order ${this.orderId}] Failed to set package height: ${err}`);
        }

        // Scroll to the bottom
        try {
            await focusAndScroll('input#shipment_package_view_model_size_z_amount', 'start');
        } catch (err) {
            throw new Error(`[Order ${this.orderId}] Failed to scroll to the bottom`);
        }

        await this.submitPackageDetails();

        // Sleep for a short period to wait for next step to show up.
        await sleep(300);
    }

    /**
     * Click 'Save and Continue' button to submit package details.
     */
    async submitPackageDetails() {
        const submitBtn = await waitForElement(
            `form#new_shipment_package_view_model input[type="submit"][name="save"]`
        ) as HTMLInputElement;
        submitBtn.click();
        submitBtn.dispatchEvent(new Event('change', { bubbles: true }));
    }

    /**
     * Fill in postage details.
     */
    async fillPostageDetails() {
        try {
            await waitForElement('form#new_shipment_platform_postage_view_model');
        } catch (err) {
            throw new Error(`[Order ${this.orderId}] Failed to find postage details form: ${err}`);
        }

        const isSelected = document.querySelector(
            'input[type="radio"][name="shipment_platform_postage_view_model[postage_rate_id]"]:checked'
        );
        if (isSelected) {
            // Postage already selected.
            console.log(`[Order ${this.orderId}] Postage rate already selected`);
            return;
        }

        const settings = await getSettings();
        let postageSelected = false;
        for (const pos of settings.postages) {
            try {
                const radioElemSel = `div[data-postage-description="${pos.name}"] input[type="radio"][name="shipment_platform_postage_view_model[postage_rate_id]"]`;
                try {
                    await selectRadio(radioElemSel);
                } catch (err) {
                    throw new Error(`[Order ${this.orderId}] Failed to select postage rate '${pos.name}': ${err}`);
                }
                postageSelected = true;
                try {
                    await focusAndScroll(radioElemSel, 'start');
                } catch (err) {
                    throw new Error(`[Order ${this.orderId}] Scrolling to postage rate '${pos.name}' failed: ${err}`);
                }
                break;
            } catch (err) {
                // Ignore error and try the next postage rate.
                continue;
            }
        }
        if (!postageSelected) {
            throw new Error(`[Order ${this.orderId}] No suitable postage rate found`);
        }

        // Buy shipping label
        await this.submitPostageDetails();

        // Sleep for a short period to wait for next step to show up.
        await sleep(300);
    }

    async submitPostageDetails() {
        const submitBtn = await waitForElement(
            `form#new_shipment_platform_postage_view_model input[type="submit"][name="buy"]`
        ) as HTMLInputElement;
        submitBtn.click();
        submitBtn.dispatchEvent(new Event('change', { bubbles: true }));
    }

    async downloadShippingLabel() {
        const linkSel = '.js-print-rows a[href*=".pdf"]';
        try {
            await waitForElement(linkSel);
        } catch (err) {
            throw new Error(`[Order ${this.orderId}] Failed to find shipping label download link: ${err}`);
        }

        const links = document.querySelectorAll<HTMLAnchorElement>(linkSel);
        const downloadLink = Array.from(links).find(link => link.textContent?.trim().toLowerCase().includes('download'));
        if (!downloadLink) {
            throw new Error(`[Order ${this.orderId}] Failed to find shipping label download link`);
        }

        try {
            await chrome.runtime.sendMessage({
                action: 'DOWNLOAD_FILE',
                url: downloadLink.href,
                filename: `ChitChatsLabels/${this.orderId}.pdf`,
            });
        } catch (err) {
            throw new Error(`[Order ${this.orderId}] Downloading shipping label failed: ${err}`);
        }

        sleep(500);

        // Click 'Done' to close the dialog
        const buttons = document.querySelectorAll<HTMLAnchorElement>('.js-modal-close');
        const doneBtn = Array.from(buttons).find(btn => btn.textContent?.trim().toLowerCase().includes('done'));
        if (!doneBtn) {
            throw new Error(`[Order ${this.orderId}] Closing shipment dialog failed`);
        }
        const eventOptions = { bubbles: true, cancelable: true, view: window };
        doneBtn.dispatchEvent(new MouseEvent('mousedown', eventOptions));
        doneBtn.dispatchEvent(new MouseEvent('mouseup', eventOptions));
        doneBtn.click();

        sleep(500);
    }
}
