import { LengthUnit } from "./length-unit.js";
import { PackageType } from "./parcel-type.js";
import { WeightUnit } from "./weight-unit.js";

export interface Package {
    type: PackageType;
    weight: number;
    weightUnit: WeightUnit;
    length: number;
    width: number;
    height: number;
    lengthUnit: LengthUnit;
}
