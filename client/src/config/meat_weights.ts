
// Average weight in LBS per "Piece" or "Unit"
// This is used to convert "Total Lbs Needed" into "How many pieces to fire"

export const MEAT_UNIT_WEIGHTS: Record<string, number> = {
    "Picanha": 3.5,          // Whole Picanha
    "Fraldinha/Flank Steak": 2.5, // Whole Flank
    "Tri-Tip": 2.5,          // Whole Tri-Tip
    "Filet Mignon": 5.0,     // Whole Tenderloin (before trimming)
    "Beef Ribs": 5.0,        // Slab of Ribs
    "Pork Ribs": 3.0,        // Slab
    "Pork Loin": 8.0,        // Whole Loin
    "Chicken Drumstick": 0.25, // Per leg (approx)
    "Chicken Breast": 0.25,  // Per wrapped breast (bacon wrapped)
    "Lamb Chops": 0.2,       // Per chop
    "Leg of Lamb": 6.0,      // Whole Leg
    "Lamb Picanha": 1.5,     // Smaller Picanha
    "Sausage": 0.2           // Per link
};
