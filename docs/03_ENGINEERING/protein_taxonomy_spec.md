# BRASA Meat Intelligence™ — Canonical Protein Taxonomy Specification

## 1. Governing Taxonomy Invariant

$$\text{PHYSICAL RECEIVING IDENTITY} \longrightarrow \text{CANONICAL COMPANYPRODUCT} \longrightarrow \text{SUBPRODUCT / PREPARATION}$$

Canonical physical protein identity is governed strictly by the **PHYSICAL PRODUCT / CUT / SKU RECEIVED** into inventory. It MUST NOT be determined merely by species, menu category, or culinary preparation.

## 2. Mandatory Taxonomy Separations

1. **RIBEYE vs. BEEF RIBS:**
   * `Ribeye` (Export Ribeye, $\sim \$9.19$/lb) = Canonical Physical Product (`protein_group: 'Ribeye'`). Preparation: *Cajun Ribeye*.
   * `Beef Ribs` (Short Ribs / Costela, $\sim \$6.89$/lb) = **Separate Canonical Physical Product** (`protein_group: 'Beef Ribs'`). Preparation: *Beef Ribs / Costela*.
   * Rule: *Cajun Ribeye* MUST NEVER map to *Beef Ribs*.

2. **RACK OF LAMB vs. LAMB PICANHA:**
   * `Rack of Lamb` ($\sim \$11.99$/lb) = Canonical Physical Product (`protein_group: 'Lamb'`). Preparation: *Lamb Chops*.
   * `Lamb Picanha` ($\sim \$4.06$/lb) = **Separate Canonical Physical Product** (`protein_group: 'Lamb'`). Preparation: *Lamb Picanha*.
   * Rule: *Lamb Picanha* physical mass and cost MUST NOT be consolidated into *Rack of Lamb*.

3. **CHICKEN THIGHS vs. CHICKEN DRUMSTICKS:**
   * `Chicken Thighs` ($\sim \$1.86$/lb) = Canonical Physical Product (`protein_group: 'Chicken'`). Preparation: *Aji Chicken Thighs*.
   * `Chicken Drumsticks` ($\sim \$0.99$/lb) = **Separate Canonical Physical Product** (`protein_group: 'Chicken'`). Preparation: *Beer-Marinated Drumsticks*.

4. **BRAZILIAN SAUSAGE vs. CHEDDAR SAUSAGE:**
   * `Brazilian Sausage` ($\sim \$3.66$/lb) = Canonical Physical Product (`protein_group: 'Sausage'`).
   * `Cheddar Sausage` = **Separate Canonical Physical Product** (`protein_group: 'Sausage'`).

## 3. Product Group vs. Canonical Product vs. Subproduct

* **Product Group:** Analytical reporting filter (`Sirloin`, `Filet`, `Ribeye`, `Beef Ribs`, `Lamb`, `Chicken`, `Sausage`).
* **Canonical Product:** Physical receiving, inventory, yield, and cost identity (`CompanyProduct`).
* **Subproduct / Preparation:** Internal operational presentation derived from the parent cut (`ProductAlias`).
* **Rule:** `ProductAlias` resolves menu names to parent cuts. It MUST NOT collapse distinct physical cuts.
