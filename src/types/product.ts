import { WeightUnit } from "./weight-unit.js";

export interface Product {
    name: string;
    description: string;
    weight: number;
    weightUnit: WeightUnit;
    originCountry: string;
    hsCode: string;
    steel: number;
    aluminum: number;
}
