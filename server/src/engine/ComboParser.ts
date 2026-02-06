
export interface ParsedItem {
    item_name: string;
    protein_type: string;
    lbs: number;
}

export class ComboParser {
    // Definition of Combos and their protein breakdown (ratios must sum to 1.0)
    private static COMBO_MAP: Record<string, { protein: string; ratio: number }[]> = {
        "Churrasco Plate": [
            { protein: "Picanha", ratio: 0.4 },
            { protein: "Brazilian Sausage", ratio: 0.3 },
            { protein: "Chicken Breast Wrapped in Bacon", ratio: 0.3 }
        ],
        "Meat Platter": [
            { protein: "Picanha", ratio: 0.3 },
            { protein: "Flank Steak", ratio: 0.3 },
            { protein: "Lamb Chops", ratio: 0.2 },
            { protein: "Brazilian Sausage", ratio: 0.2 }
        ]
    };

    /**
     * protein_type mapping to simplify raw names to categories found in Constants/Engine
     */
    private static PROTEIN_CATEGORY_MAP: Record<string, string> = {
        "Picanha": "Beef",
        "Garlic Picanha": "Beef",
        "Spicy Sirloin": "Beef",
        "Flank Steak": "Beef",
        "Filet Mignon": "Beef",
        "Filet Mignon Wrapped in Bacon": "Beef",
        "Brazilian Sausage": "Pork",
        "Chicken Breast Wrapped in Bacon": "Chicken",
        "Parmesan Drumettes": "Chicken",
        "Lamb Chops": "Lamb",
        "Leg of Lamb": "Lamb",
        "Pork Ribs": "Pork",
        "Parmesan Pork": "Pork",
        "Beef Ribs": "Beef",
        "Braised Beef Ribs": "Beef"
    };

    /**
     * Takes a raw order item and explodes it if it is a combo.
     * Returns an array of atomic items ready for the database.
     */
    static parse(itemName: string, lbs: number): ParsedItem[] {
        const comboDef = this.COMBO_MAP[itemName];

        if (comboDef) {
            // It is a combo! Explode it.
            return comboDef.map(component => ({
                item_name: `${itemName} [${component.protein}]`,
                protein_type: component.protein, // We use the specific meat name here for the Engine to group by
                lbs: lbs * component.ratio
            }));
        }

        // It is a regular item.
        return [{
            item_name: itemName,
            protein_type: itemName, // Default to name, MeatEngine groups by this
            lbs: lbs
        }];
    }
}
