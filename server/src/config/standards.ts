
export const MEAT_STANDARDS: Record<string, number> = {
    "Picanha (Top Sirloin)": 0.39,
    "Alcatra (Top Sirloin)": 0.22,
    "Fraldinha (Bottom Sirloin)": 0.24,
    "Lamb Chops": 0.07, // Mapping Lamb Rack
    "Filet Mignon": 0.10, // Beef Tenderloin
    "Bacon Wrapped Chicken": 0.12, // Using Chicken Leg as proxy or generic
    "Chicken Legs": 0.13,
    "Parmesan Pork": 0.06, // Pork Loin
    "Pork Ribs": 0.00,
    "Sausage": 0.06,
    "Beef Ribs": 0.08, // Short Ribs
    "Flank Steak": 0.00,
    "Lamb Leg": 0.00,
    "Chicken Heart": 0.00,
    // Add variations if names don't match exactly, we'll need a robust mapper or normalize inputs.
    // Based on user's specific table names mapped to our likely V2 inputs:
    "Beef Picanha": 0.39,
    "Beef Flap Meat": 0.24,
    "Beef Top Butt Sirloin": 0.22,
    "Beef Short Ribs": 0.08,
    "Chicken Leg": 0.13,
    "Beef Tenderloin": 0.10,
    "Beef Bone-in-Ribeye": 0.09,
    "Chicken Breast": 0.14,
    "Lamb Rack": 0.07,
    "Pork Sausage": 0.06,
    "Lamb Top Sirloin Caps": 0.10,
    "Pork Loin": 0.06,
    "Pork Belly": 0.04,
    "Pork Crown": 0.04
};

export const GLOBAL_TARGET_PER_GUEST = 1.76;
