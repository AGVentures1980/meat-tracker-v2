export interface ComboDefinition {
    name: string; // The item name as it appears in OLO/POS
    components: {
        protein: string; // "Picanha", "Chicken", etc.
        weight: number; // lbs
    }[];
}

export const COMBO_DEFINITIONS: Record<string, ComboDefinition> = {
    // Exact match keys (lowercase for normalization)
    "churrasco plate": {
        name: "Churrasco Plate",
        components: [
            { protein: "Choice 1", weight: 0.5 },
            { protein: "Choice 2", weight: 0.5 }
        ]
    },
    "churrasco feast": {
        name: "Churrasco Feast",
        components: [
            { protein: "Choice 1", weight: 1.0 },
            { protein: "Choice 2", weight: 1.0 }
        ]
    },
    "picanha sandwich": {
        name: "Picanha Sandwich",
        components: [
            { protein: "Picanha", weight: 0.5 } // Assuming 1/2 lb for sandwich unless specified
        ]
    },
    "family platter": { // Keeping legacy just in case, or mapping to Feast
        name: "Family Platter",
        components: [
            { protein: "Choice 1", weight: 1.0 },
            { protein: "Choice 2", weight: 1.0 }
        ]
    }
};
