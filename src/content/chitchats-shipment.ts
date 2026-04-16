import { getSettings } from '../utils/settings.js';
import { scrollToElement, selectOptionByValueOrLabel, selectRadio, setInputValue, setInputValueNew, waitForElement } from '../utils/dom.js';
import { Package } from '../types/package.js';
import { sleep } from '../utils/utils.js';

type InputValueOrFn = string | ((oldValue: string) => string);

export class ChitChatsShipment {
    public readonly orderId: string;
    public readonly status: string;
    public readonly destinationCountryCode: string;
    public shipmentId: string = '';

    // HTML elements
    private readonly rowElem: HTMLTableRowElement;

    constructor(rowId: string) {
        const rowElem = document.querySelector<HTMLTableRowElement>(
            `.js-shipments-table tr.${rowId}`
        );
        if (!rowElem) {
            throw new Error('Failed to find shipment row element');
        }
        this.rowElem = rowElem;
        this.orderId = this.getOrderId();
        this.status = this.getStatus();
        this.destinationCountryCode = this.getDestinationCountryCode();
    }

    private getOrderId(): string {
        const orderElem = this.rowElem.querySelector(`span[data-bs-original-title*="Shopify order:"]`);
        if (!orderElem) {
            throw new Error(`Failed to find shopify order ID: ${this.rowElem.className}`);
        }
        const attr = orderElem.getAttribute('data-bs-original-title') || '';
        const match = attr.match(/Shopify order:\s*(\d+)/i);
        if (!match) {
            throw new Error(`Failed to find shopify order ID: ${this.rowElem.className} = ${attr}`);
        }
        return match[1];
    }

    private getStatus(): string {
        const statusElem = this.rowElem.querySelector(`td.table__td--shrink span.text-muted`);
        if (!statusElem) {
            throw new Error(`Failed to find shipment status: ${this.rowElem.className}`);
        }
        return statusElem.textContent.trim().toLowerCase();
    }

    private getDestinationCountryCode(): string {
        const countryElem = this.rowElem.querySelector(`td:nth-child(5) span[data-bs-toggle="tooltip"]`);
        if (!countryElem) {
            throw new Error(`Failed to find destination country: ${this.rowElem.className}`);
        }
        return countryElem.textContent.trim();
    }

    private async setInputValue(selector: string, valueOrFn: InputValueOrFn, errorMsg: string) {
        try {
            const element = await waitForElement<HTMLInputElement>(selector);
            const oldValue = element.value;
            const newValue = (typeof valueOrFn === "function") ? valueOrFn(oldValue) : valueOrFn;
            setInputValueNew(element, newValue);
        } catch (err) {
            throw new Error(`${errorMsg}: ${err}`);
        }
    }

    /**
     * Open shipment popup window.
     */
    async openPopup() {
        // Click the shipment row.
        this.rowElem.click();
        this.rowElem.dispatchEvent(new Event('change', { bubbles: true }));

        const shipmentIdElem = await waitForElement<HTMLElement>(
            '.js-right-sidebar-content h2.small-title + .clearfix > strong'
        );
        this.shipmentId = shipmentIdElem.textContent.trim();
        if (!this.shipmentId) {
            throw new Error(`Failed to get shipment ID`);
        }

        // Add package
        const addPackageElem = await waitForElement<HTMLLinkElement>(
            `main#content .js-right-sidebar-content a.info-panel__edit-link`,
        );
        addPackageElem.click();
        addPackageElem.dispatchEvent(new Event('change', { bubbles: true }));

        const settings = await getSettings();
        console.log(`ChitChats client ID: ${settings.chitChatsClientId}`);
        try {
            await waitForElement(`button[aria-label="Close"]`);
        } catch (err) {
            throw new Error(`Failed to open shipment popup window`);
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
            throw new Error(`Failed to find shipment tab links: ${err}`);
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
            // Fill in product description
            const descriptionElemSel = `#shipment_customs_view_model_shipment_items_attributes_${i}_description`;
            let descriptionElem: HTMLInputElement;
            try {
                descriptionElem = await waitForElement<HTMLInputElement>(descriptionElemSel);
            } catch (err) {
                console.log('Reached the end of product list');
                break;
            }
            const productName = descriptionElem.value;
            const productMatcher = await settings.searchProductMatcher(productName);
            if (!productMatcher) {
                // Can't find a matching product
                throw new Error(`Failed to find a matching description for '${productName}'`);
            }
            await this.setInputValue(
                descriptionElemSel,
                productMatcher.description,
                `Failed to set product ${i} description`
            );

            // Set to product default price if price is out of range.
            const unitValueSel = `#shipment_customs_view_model_shipment_items_attributes_${i}_value_amount`;
            await this.setInputValue(
                unitValueSel,
                (oldValue: string) => {
                    const oldPrice = Number(oldValue) || 0;
                    if (productMatcher.defaultPrice) {
                        if ((productMatcher.lowestPrice && oldPrice < productMatcher.lowestPrice)
                            || (productMatcher.highestPrice && oldPrice > productMatcher.highestPrice)) {
                                return productMatcher.defaultPrice.toString();
                        }
                    }
                    return oldValue;
                },
                `Failed to set product ${i} unit price`
            );

            // Skip the following steps for CA shipments.
            if (this.destinationCountryCode === 'CA') {
                i++;
                console.log(`[Order ${this.orderId}] Skipping manufacturer info for CA shipments.`);
                continue;
            }

            // Wait for manufacturer contact text input to show up
            const contactElemSel = `#shipment_customs_view_model_shipment_items_attributes_${i}_manufacturer_contact`;
            const contactElem = document.querySelector<HTMLInputElement>(contactElemSel);
            // Skip products already processed
            if (contactElem?.value !== '') {
                console.log(`Product ${i} already processed`);

                // Scroll down
                try {
                    await scrollToElement(contactElemSel, 'start');
                } catch (err) {
                    throw new Error(`Scrolling to product ${i} failed`);
                }

                i++;
                continue;
            }

            // Select origin country
            try {
                await selectOptionByValueOrLabel(`#shipment_customs_view_model_shipment_items_attributes_${i}_origin_country`, productMatcher.originCountry);
            } catch (err) {
                throw new Error(`Failed to select product ${i} origin country: ${err}`);
            }

            // Fill in HS code
            await this.setInputValue(
                `#shipment_customs_view_model_shipment_items_attributes_${i}_hs_tariff_code`,
                productMatcher.hsCode,
                `Failed to set product ${i} HS code`
            );

            // Fill in steel and aluminum percentage
            await this.setInputValue(
                `#shipment_customs_view_model_shipment_items_attributes_${i}_additional_tariff_details_steel`,
                '0',
                `Failed to set product ${i} steel percentage`
            );
            await this.setInputValue(
                `#shipment_customs_view_model_shipment_items_attributes_${i}_additional_tariff_details_aluminum`,
                '0',
                `Failed to set product ${i} aluminum percentage`
            );

            // Fill in manufacturer contact
            const manufacturer = settings.manufacturers[productMatcher.manufacturer];
            if (!manufacturer) {
                throw new Error(`Failed to find manufacturer '${productMatcher.manufacturer}'`);
            }
            await this.setInputValue(contactElemSel, manufacturer.contact, `Failed to set product ${i} manufacturer contact`);

            // Fill in manufacturer country
            await this.setInputValue(
                `#shipment_customs_view_model_shipment_items_attributes_${i}_manufacturer_country_code`,
                manufacturer.country,
                `Failed to set product ${i} manufacturer country`
            );

            // Fill in manufacturer address1
            try {
                await setInputValue(`#shipment_customs_view_model_shipment_items_attributes_${i}_manufacturer_street`, manufacturer.address1);
            } catch (err) {
                throw new Error(`Failed to set product ${i} manufacturer address1: ${err}`);
            }

            // Fill in manufacturer address2 if needed
            if (manufacturer.address2) {
                try {
                    await setInputValue(`#shipment_customs_view_model_shipment_items_attributes_${i}_manufacturer_street_2`, manufacturer.address2);
                } catch (err) {
                    throw new Error(`Failed to set product ${i} manufacturer address2: ${err}`);
                }
            }

            // Fill in manufacturer city
            try {
                await setInputValue(`#shipment_customs_view_model_shipment_items_attributes_${i}_manufacturer_city`, manufacturer.city);
            } catch (err) {
                throw new Error(`Failed to set product ${i} manufacturer city: ${err}`);
            }

            // Fill in manufacturer postal code
            try {
                await setInputValue(`#shipment_customs_view_model_shipment_items_attributes_${i}_manufacturer_postal_code`, manufacturer.postalCode);
            } catch (err) {
                throw new Error(`Failed to set product ${i} manufacturer postal code: ${err}`);
            }

            // Fill in manufacturer phone
            try {
                await setInputValue(`#shipment_customs_view_model_shipment_items_attributes_${i}_manufacturer_phone`, manufacturer.phone);
            } catch (err) {
                throw new Error(`Failed to set product ${i} manufacturer phone: ${err}`);
            }

            // Fill in manufacturer email
            const emailElemSel = `#shipment_customs_view_model_shipment_items_attributes_${i}_manufacturer_email`;
            try {
                await setInputValue(emailElemSel, manufacturer.email);
            } catch (err) {
                throw new Error(`Failed to set product ${i} manufacturer email: ${err}`);
            }

            // Select province
            try {
                await selectOptionByValueOrLabel(`select[id="shipment_customs_view_model[shipment_items_attributes][${i}]_province_code_ca"]`, manufacturer.provinceState);
            } catch (err) {
                throw new Error(`Failed to select product ${i} manufacturer province: ${err}`);
            }

            // Scroll down
            try {
                await scrollToElement(emailElemSel, 'start')
            } catch (err) {
                throw new Error(`Scrolling to product '${productName}' (index ${i}) manufacturer email text input failed`);
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
            throw new Error(`Failed to find package type form: ${err}`);
        }

        // Wait for package type 'parcel' to show up.
        const parcelRadioSel = '#shipment_package_view_model_package_category_parcel';
        try {
            await waitForElement(parcelRadioSel);
        } catch (err) {
            throw new Error(`Failed to find package type 'parcel': ${err}`);
        }

        // Check if package type is already selected.
        const isSelected = document.querySelector(
            'input[type="radio"][name="shipment_package_view_model[package_category]"]:checked'
        );
        if (isSelected) {
            // Package already selected.
            console.log(`Package type already selected`);
            await this.submitPackageDetails();
            return;
        }

        // Select package type: parcel
        try {
            await selectRadio(parcelRadioSel);
        } catch (err) {
            throw new Error(`Failed to select package type 'parcel': ${err}`);
        }

        // Fill in package weight

        const weightElem = await waitForElement<HTMLInputElement>(
            'input#shipment_package_view_model_weight_amount'
        );
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
            throw new Error(`No suitable package size found`);
        }

        // Fill in package size
        try {
            await setInputValue('input#shipment_package_view_model_size_x_amount', pkg.length.toString());
        } catch (err) {
            throw new Error(`Failed to set package length: ${err}`);
        }
        try {
            await setInputValue('input#shipment_package_view_model_size_y_amount', pkg.width.toString());
        } catch (err) {
            throw new Error(`Failed to set package width: ${err}`);
        }
        try {
            await setInputValue('input#shipment_package_view_model_size_z_amount', pkg.height.toString());
        } catch (err) {
            throw new Error(`Failed to set package height: ${err}`);
        }

        // Scroll to the bottom
        try {
            await scrollToElement('input#shipment_package_view_model_size_z_amount', 'start');
        } catch (err) {
            throw new Error(`Failed to scroll to the bottom`);
        }

        await this.submitPackageDetails();

        // Sleep for a short period to wait for next step to show up.
        await sleep(300);
    }

    /**
     * Click 'Save and Continue' button to submit package details.
     */
    async submitPackageDetails() {
        const submitBtn = await waitForElement<HTMLInputElement>(
            `form#new_shipment_package_view_model input[type="submit"][name="save"]`
        );
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
            throw new Error(`Failed to find postage details form: ${err}`);
        }

        const isSelected = document.querySelector(
            'input[type="radio"][name="shipment_platform_postage_view_model[postage_rate_id]"]:checked'
        );
        if (isSelected) {
            // Postage already selected.
            console.log(`Postage rate already selected`);
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
                    throw new Error(`Failed to select postage rate '${pos.name}': ${err}`);
                }
                postageSelected = true;
                try {
                    await scrollToElement(radioElemSel, 'start');
                } catch (err) {
                    throw new Error(`Scrolling to postage rate '${pos.name}' failed: ${err}`);
                }
                break;
            } catch (err) {
                // Ignore error and try the next postage rate.
                continue;
            }
        }
        if (!postageSelected) {
            throw new Error(`No suitable postage rate found`);
        }

        // Buy shipping label
        await this.submitPostageDetails();

        // Sleep for a short period to wait for next step to show up.
        await sleep(300);
    }

    async submitPostageDetails() {
        const submitBtn = await waitForElement<HTMLInputElement>(
            `form#new_shipment_platform_postage_view_model input[type="submit"][name="buy"]`
        );
        submitBtn.click();
        submitBtn.dispatchEvent(new Event('change', { bubbles: true }));
    }

    async downloadShippingLabel() {
        const linkSel = '.js-print-rows a[href*=".pdf"]';
        try {
            await waitForElement(linkSel, 10000);
        } catch (err) {
            throw new Error(`Failed to find shipping label download link: ${err}`);
        }

        const links = document.querySelectorAll<HTMLAnchorElement>(linkSel);
        const downloadLink = Array.from(links).find(link => link.textContent?.trim().toLowerCase().includes('download'));
        if (!downloadLink) {
            throw new Error(`Failed to find shipping label download link`);
        }

        try {
            await chrome.runtime.sendMessage({
                action: 'DOWNLOAD_FILE',
                url: downloadLink.href,
                filename: `ChitChatsLabels/${this.orderId}.pdf`,
            });
        } catch (err) {
            throw new Error(`Downloading shipping label failed: ${err}`);
        }

        await sleep(500);

        // Click 'Done' to close the dialog
        const buttons = document.querySelectorAll<HTMLAnchorElement>('.js-modal-close');
        const doneBtn = Array.from(buttons).find(btn => btn.textContent?.trim().toLowerCase().includes('done'));
        if (!doneBtn) {
            throw new Error(`Closing shipment dialog failed`);
        }
        const eventOptions = { bubbles: true, cancelable: true, view: window };
        doneBtn.dispatchEvent(new MouseEvent('mousedown', eventOptions));
        doneBtn.dispatchEvent(new MouseEvent('mouseup', eventOptions));
        doneBtn.click();

        await sleep(500);
    }
}
