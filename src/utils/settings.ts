import { Manufacturer, ProductMatcher, Package, Postage } from "../types/index.js";

export class Settings {
    public manufacturers: { [contact: string]: Manufacturer } = {};
    public products: { [name: string]: ProductMatcher } = {};
    public packages: Package[] = [];
    public postages: Postage[] = [];
    public isDefaultProductEnabled: boolean = true;
    public chitChatsClientId: string = '';

    private constructor() { }

    public async init() {
        const res = await await chrome.storage.sync.get({
            manufacturers: {},
            products: {},
            packages: [],
            postages: [],
            isDefaultProductEnabled: true,
            chitChatsClientId: "",
        });
        this.manufacturers = res.manufacturers;
        this.products = res.products;
        this.packages = res.packages;
        this.postages = res.postages;
        this.isDefaultProductEnabled = res.isDefaultProductEnabled;
        this.chitChatsClientId = res.chitChatsClientId;

        // Init default product
        if (!this.products.default) {
            this.products.default = {name: 'default'} as ProductMatcher;
            await this.saveProducts();
        }
    }

    public static async create(): Promise<Settings> {
        const instance = new Settings();
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
        await this.saveManufacturers();
    }

    public async updateManufacturer(mfr: Manufacturer) {
        if (!(mfr.contact in this.manufacturers)) {
            throw new Error(`Manufacturer ${mfr.contact} doesn't exist`);
        }
        this.manufacturers[mfr.contact] = mfr;
        await this.saveManufacturers();
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
        await this.saveManufacturers();
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
        await this.saveManufacturers();
    }

    public async createProduct(product: ProductMatcher) {
        if (product.name in this.products) {
            throw new Error(`Product ${product.name} already exists`);
        }
        this.products[product.name] = product;
        await this.saveProducts();
    }

    public async updateProduct(product: ProductMatcher) {
        if (!(product.name in this.products)) {
            throw new Error(`Product ${product.name} doesn't exist`);
        }
        this.products[product.name] = product;
        await this.saveProducts();
    }

    public async deleteProduct(name: string) {
        if (!(name in this.products)) {
            throw new Error(`Product ${name} doesn't exist`);
        }
        delete this.products[name];
        await this.saveProducts();
    }

    public async searchProductMatcher(productName: string): Promise<ProductMatcher | null> {
        for (const matcher of Object.values(this.products)) {
            // Skip default product
            if (matcher.name === 'default') {
                continue;
            }

            if (matcher.isRegex) {
                const flags = matcher.isCaseSensitive ? '' : 'i';
                const regex = new RegExp(matcher.name, flags);
                if (regex.test(productName)) {
                    return matcher;
                }
            } else {
                const name = matcher.isCaseSensitive ? productName : productName.toLowerCase();
                const pattern = matcher.isCaseSensitive ? matcher.name : matcher.name.toLowerCase();
                if (name.includes(pattern)) {
                    return matcher;
                }
            }
        }
        // Return default product if default product is enabled
        if (this.isDefaultProductEnabled) {
            return this.products.default;
        }
        return null;
    }

    public async saveProducts() {
        await chrome.storage.sync.set({ products: this.products });
    }

    public async saveIsDefaultProductEnabled() {
        await chrome.storage.sync.set({ isDefaultProductEnabled: this.isDefaultProductEnabled });
    }

    public async saveChitchatsClientId() {
        await chrome.storage.sync.set({ chitChatsClientId: this.chitChatsClientId });
    }

    public async createPackage(pkg: Package) {
        this.packages.push(pkg);
        await this.savePackages();
    }

    public async updatePackage(index: number, pkg: Package) {
        if (index < 0 || index >= this.packages.length) {
            throw new Error(`Package at index ${index} doesn't exist`);
        }
        this.packages[index] = pkg;
        await this.savePackages();
    }

    public async deletePackage(index: number) {
        if (index < 0 || index >= this.packages.length) {
            throw new Error(`Package at index ${index} doesn't exist`);
        }
        this.packages.splice(index, 1);
        await this.savePackages();
    }

    public async savePackages() {
        await chrome.storage.sync.set({ packages: this.packages });
    }

    public async createPostage(postage: Postage) {
        this.postages.push(postage);
        await this.savePostages();
    }

    public async updatePostage(index: number, postage: Postage) {
        if (index < 0 || index >= this.postages.length) {
            throw new Error(`Postage at index ${index} doesn't exist`);
        }
        this.postages[index] = postage;
        await this.savePostages();
    }

    public async deletePostage(index: number) {
        if (index < 0 || index >= this.postages.length) {
            throw new Error(`Postage at index ${index} doesn't exist`);
        }
        this.postages.splice(index, 1);
        await this.savePostages();
    }

    public async savePostages() {
        await chrome.storage.sync.set({ postages: this.postages });
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

    public getSortedPostageList() {
        return this.postages.slice();
    }
}

// Singleton of OptionsStorage
const settings = Settings.create();

export async function getSettings(): Promise<Settings> {
    return settings;
}
