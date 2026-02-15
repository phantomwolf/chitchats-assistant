import { Manufacturer } from "./types/index.js";

class OptionsStorage {
    public manufacturers: { [contact: string]: Manufacturer } = {};

    private constructor() { }

    public async init() {
        const res = await await chrome.storage.sync.get({
            manufacturers: {},
        });
        this.manufacturers = res.manufacturers;
    }

    public static async create(): Promise<OptionsStorage> {
        const instance = new OptionsStorage();
        await instance.init();
        return instance;
    }

    public getManufacturerList() {
        const mfrs = Object.values(this.manufacturers);
        mfrs.sort((a, b) => {
            const diff = Number(b.isDefault) - Number(a.isDefault);
            if (diff != 0) {
                return diff;
            }
            if (a.contact <= b.contact) {
                return -1;
            } else {
                return 1;
            }
        });
        return mfrs;
    }

    public async createManufacturer(mfr: Manufacturer) {
        if (mfr.contact in this.manufacturers) {
            throw new Error(`Manufacturer ${mfr.contact} already exists`);
        }
        this.manufacturers[mfr.contact] = mfr;
        this.saveManufacturers();
    }

    public async updateManufacturer(mfr: Manufacturer) {
        if (!(mfr.contact in this.manufacturers)) {
            throw new Error(`Manufacturer ${mfr.contact} doesn't exist`);
        }
        this.manufacturers[mfr.contact] = mfr;
        this.saveManufacturers();
    }

    public async deleteManufacturer(contact: string) {
        if (!(contact in this.manufacturers)) {
            throw new Error(`Manufacturer ${contact} doesn't exist`);
        }

        // Can't delete default manufacturer
        if (this.manufacturers[contact].isDefault) {
            throw new Error(`Unable to delete default manufacturer ${contact}`);
        }

        delete this.manufacturers[contact];
        this.saveManufacturers();
    }

    public async saveManufacturers() {
        await chrome.storage.sync.set({ manufacturers: this.manufacturers });
    }

    public async setDefaultManufacturer(contact: string) {
        if (!(contact in this.manufacturers)) {
            throw new Error(`Manufacturer ${contact} doesn't exist`);
        }

        // Cancel previous default manufacturers
        Object.entries(this.manufacturers).forEach(([key, data]) => {
            data.isDefault = false;
        });

        // Set manufacturer as default
        this.manufacturers[contact].isDefault = true;
        this.saveManufacturers();
    }
}

// Singleton of OptionsStorage
const optionsProm = OptionsStorage.create();

export async function getStorage(): Promise<OptionsStorage> {
    return optionsProm;
}
