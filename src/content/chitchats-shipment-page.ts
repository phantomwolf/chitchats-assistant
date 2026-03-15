export class ChitChatsPendingShipmentPage {
    /**
     * Get shipment row IDs in ChitChats pending shipment page.
     * @param isSelected Only return selected shipment row IDs.
     * @returns An array of shipment row IDs.
     */
    public getShipmentRowIds(isSelected: boolean): string[] {
        let selector: string;
        if (isSelected) {
            selector = `.js-shipments-table tr.table__tr--selected[class*="js-shipment-row-"]`;
        } else {
            selector = `.js-shipments-table tr[class*="js-shipment-row-"]`;
        }
        const shipmentRowElems = document.querySelectorAll<HTMLTableRowElement>(selector);
        const shipmentRowIds = Array.from(shipmentRowElems).map(elem => {
            const className = Array.from(elem.classList)
                .find(cls => cls.includes('js-shipment-row-'));
            return className;
        });
        return shipmentRowIds.filter(cls => typeof cls === 'string') as string[];
    }
}