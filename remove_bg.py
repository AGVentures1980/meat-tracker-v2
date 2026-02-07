from PIL import Image

def remove_background(input_path, output_path):
    img = Image.open(input_path)
    img = img.convert("RGBA")
    datas = img.getdata()

    newData = []
    # Tolerance for dark/black background removal
    for item in datas:
        # Check if the pixel is dark gray/black or the checkerboard pattern
        # Adjust these values based on the specific artifact
        if item[0] < 50 and item[1] < 50 and item[2] < 50:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)

    img.putdata(newData)
    img.save(output_path, "PNG")
    print(f"Processed image saved to {output_path}")

if __name__ == "__main__":
    remove_background('/Users/alexandregarcia/.gemini/antigravity/scratch/meat-tracker/client/public/brasa-logo-v2.png', '/Users/alexandregarcia/.gemini/antigravity/scratch/meat-tracker/client/public/brasa-logo-v3.png')
