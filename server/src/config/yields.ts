// System-wide Yield Percentages for Raw to Trimmed Meat
// Used to calculate true edible weight and cost allocations.

export const MEAT_YIELDS: Record<string, number> = {
    // Calculated from 23lbs gross -> 3lbs loss (20lbs net) = 86.96%
    "Picanha": 0.8696,
    "Garlic Picanha": 0.8696,
    "Lamb Picanha": 1.00, // No trim loss, just cut, skewered and served

    // Baseline Defaults (can be expanded later)
    "Fraldinha/Flank Steak": 0.85,
    "Tri-Tip": 0.85,
    "Spicy Sirloin": 0.85,
    "Filet Mignon": 0.65, // Heavily trimmed
    "Filet Bacon": 0.65,
    "Beef Ribs": 0.74, // Based on baseline_yield_ribs
    "Pork Ribs": 0.75,
    "Pork Loin": 0.80,
    "Chicken Drumstick": 0.95,
    "Chicken Breast": 0.95,
    "Lamb Chops": 0.80,
    "Leg of Lamb": 0.75,
    "Sausage": 1.00 // No trim loss
};
