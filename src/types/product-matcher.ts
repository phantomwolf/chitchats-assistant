import { WeightUnit } from "./weight-unit.js";

export interface ProductMatcher {
    name: string;
    isRegex: boolean;
    isCaseSensitive: boolean;
    manufacturer: string;
    description: string;
    weight: number;
    weightUnit: WeightUnit;
    originCountry: string;
    hsCode: string;
    steel: number;
    aluminum: number;
    lowestPrice?: number;
    highestPrice?: number;
    defaultPrice?: number;
}