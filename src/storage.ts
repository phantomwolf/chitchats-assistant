import { Manufacturer, Product, Package } from "./types/index.js";

class OptionsStorage {
    public manufacturers: { [contact: string]: Manufacturer } = {};
    public products: { [name: string]: Product } = {};
    public packages: Package[] = [];
    public isDefaultProductEnabled: boolean = true;

    private constructor() { }

    public async init() {
        const res = await await chrome.storage.sync.get({
            manufacturers: {},
            products: {},
            packages: [],
            isDefaultProductEnabled: true,
        });
        this.manufacturers = res.manufacturers;
        this.products = res.products;
        this.packages = res.packages;
        this.isDefaultProductEnabled = res.isDefaultProductEnabled;

        // Init default product
        if (!this.products.default) {
            this.products.default = {name: 'default'} as Product;
            await this.saveProducts();
        }
    }

    public static async create(): Promise<OptionsStorage> {
        const instance = new OptionsStorage();
        await instance.init();
        return instance;
    }

    public getSortedManufacturerList() {
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

    public async createProduct(product: Product) {
        if (product.name in this.products) {
            throw new Error(`Product ${product.name} already exists`);
        }
        this.products[product.name] = product;
        this.saveProducts();
    }

    public async updateProduct(product: Product) {
        if (!(product.name in this.products)) {
            throw new Error(`Product ${product.name} doesn't exist`);
        }
        this.products[product.name] = product;
        this.saveProducts();
    }

    public async deleteProduct(name: string) {
        if (!(name in this.products)) {
            throw new Error(`Product ${name} doesn't exist`);
        }
        delete this.products[name];
        this.saveProducts();
    }

    public async saveProducts() {
        await chrome.storage.sync.set({ products: this.products });
    }

    public async saveIsDefaultProductEnabled() {
        await chrome.storage.sync.set({ isDefaultProductEnabled: this.isDefaultProductEnabled });
    }

    public async createPackage(pkg: Package) {
        this.packages.push(pkg);
        this.savePackages();
    }

    public async updatePackage(index: number, pkg: Package) {
        if (index < 0 || index >= this.packages.length) {
            throw new Error(`Package at index ${index} doesn't exist`);
        }
        this.packages[index] = pkg;
        this.savePackages();
    }

    public async deletePackage(index: number) {
        if (index < 0 || index >= this.packages.length) {
            throw new Error(`Package at index ${index} doesn't exist`);
        }
        this.packages.splice(index, 1);
        this.savePackages();
    }

    public async savePackages() {
        await chrome.storage.sync.set({ packages: this.packages });
    }

    public getSortedProductList() {
        const prds = Object.values(this.products);
        prds.sort((a, b) => {
            if (a.name === 'default') {
                return -1;
            } else if (b.name === 'default') {
                return 1;
            }
            if (a.name <= b.name) {
                return -1;
            } else {
                return 1;
            }
        });
        return prds;
    }

    public getSortedPackageList() {
        const pkgs = this.packages.slice();
        pkgs.sort((a, b) => {
            if (a.type === b.type) {
                return a.fromWeight - b.fromWeight;
            }
            if (a.type <= b.type) {
                return -1;
            } else {
                return 1;
            }
        });
        return pkgs;
    }
}

// Singleton of OptionsStorage
const optionsProm = OptionsStorage.create();

export async function getStorage(): Promise<OptionsStorage> {
    return optionsProm;
}
