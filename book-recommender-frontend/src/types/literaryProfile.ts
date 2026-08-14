import type { Dimension } from "./dimension";

export interface LiteraryProfile {
    id: string;
    name: string;
    description: string;
    dimensions: Record<Dimension, number>;
}