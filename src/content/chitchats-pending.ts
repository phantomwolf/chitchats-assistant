import { ChitChatsShipment } from "./chitchats-shipment";

export class ChitChatsPendingPage {
    /**
     * Get a list of ChitChatsShipment.
     */
    getPendingShipments(): ChitChatsShipment[] {
        const shipmentRowElems = document.querySelectorAll<HTMLTableRowElement>(
            `.js-shipments-table tr[class*="js-shipment-row-"]`
        );
        console.log('Getting all the pending shipments');
        const shipments: ChitChatsShipment[] = [];
        for (const shipmentRowElem of Array.from(shipmentRowElems)) {
            const statusElem = shipmentRowElem.querySelector(`td.table__td--shrink span.text-muted`);
            if (!statusElem) {
                throw new Error(`Failed to find shipment status: ${shipmentRowElem.className}`);
            }
            const status = statusElem.textContent;
            if (status !== 'Incomplete') {
                // Skip shiments already processed
                continue;
            }

            const orderElem = shipmentRowElem.querySelector(`a[href^="https://admin.shopify.com"]`);
            if (!orderElem) {
                throw new Error(`Failed to find shopify order ID: ${shipmentRowElem.className}`);
            }
            const orderId = orderElem.textContent;
            shipments.push(new ChitChatsShipment(orderId, shipmentRowElem));
        }
        return shipments;
    }
}