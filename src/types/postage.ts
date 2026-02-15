import { PostageType } from "./postage-type.js";

export interface Postage {
    type: PostageType;
    insurance: boolean;
}
