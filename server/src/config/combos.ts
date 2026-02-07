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
            { protein: "Picanha", weight: 0.4 },
            { protein: "Chicken Wrapped", weight: 0.2 },
            { protein: "Sausage", weight: 0.2 }
        ]
    },
    "picanha sandwich": {
        name: "Picanha Sandwich",
        components: [
            { protein: "Picanha", weight: 0.3 }
        ]
    },
    "family platter": {
        name: "Family Platter",
        components: [
            { protein: "Picanha", weight: 1.0 },
            { protein: "Chicken Wrapped", weight: 1.0 },
            { protein: "Lamb Chops", weight: 0.5 }
        ]
    }
};
