from PIL import Image

def remove_background(input_path, output_path):
    img = Image.open(input_path)
    img = img.convert("RGBA")
    datas = img.getdata()

    newData = []
    # The checkerboard pattern usually consists of gray and lighter gray/white pixels.
    # We will treat anything that is not the gold color as transparent.
    # Gold color range approx: R>100, G>80, B<100 (very rough estimation)
    # Better approach: The logo is gold/yellow. The background is gray/black checkers.
    
    for item in datas:
        # If the pixel is grayish (R, G, B are similar) and not very bright (to keep highlights), make it transparent.
        # Check tolerance: if absolute difference between R, G, B is small, it's likely grayscale background.
        r, g, b, a = item
        
        # Calculate max difference between channels to detect color
        max_diff = max(abs(r-g), abs(r-b), abs(g-b))
        
        # Enhanced heuristic: 
        # 1. Dark background pixels: Low RGB values
        # 2. Checkerboard: Grayscale pixels (low max_diff)
        
        # Conservation strategy: keep pixels that look "Gold" (high Red/Green, lower Blue, significant difference)
        is_gold = (r > g - 50) and (r > b + 30) and (max_diff > 20)
        
        if not is_gold and max_diff < 30: # Likely gray/black/white background
             newData.append((255, 255, 255, 0))
        else:
             newData.append(item)

    img.putdata(newData)
    img.save(output_path, "PNG")
    print(f"Processed image saved to {output_path}")

if __name__ == "__main__":
    remove_background('/Users/alexandregarcia/.gemini/antigravity/scratch/meat-tracker/client/public/brasa-logo-v2.png', '/Users/alexandregarcia/.gemini/antigravity/scratch/meat-tracker/client/public/brasa-logo-v3.png')
