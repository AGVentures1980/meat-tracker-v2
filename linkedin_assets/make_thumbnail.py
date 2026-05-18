from PIL import Image, ImageEnhance, ImageFilter

bg_path = '/Users/alexandregarcia/Brasa-Meat-Intelligence-BACKUP/agv-website/src/assets/hero-culinary.jpg'
logo_path = '/Users/alexandregarcia/Brasa-Meat-Intelligence-BACKUP/agv-website/public/agv-logo-header.png'
out_path = '/Users/alexandregarcia/Brasa-Meat-Intelligence-BACKUP/linkedin_assets/agv_premium_thumbnail.jpg'

target_size = (1200, 627)

bg = Image.open(bg_path).convert('RGB')
logo = Image.open(logo_path).convert('RGBA')

# Crop and resize background to fill 1200x627
bg_ratio = bg.width / bg.height
target_ratio = target_size[0] / target_size[1]

if bg_ratio > target_ratio:
    # BG is wider, crop width
    new_width = int(target_ratio * bg.height)
    offset = (bg.width - new_width) // 2
    bg = bg.crop((offset, 0, offset + new_width, bg.height))
else:
    # BG is taller, crop height
    new_height = int(bg.width / target_ratio)
    offset = (bg.height - new_height) // 2
    bg = bg.crop((0, offset, bg.width, offset + new_height))

bg = bg.resize(target_size, Image.Resampling.LANCZOS)

# Darken background slightly to make logo pop
enhancer = ImageEnhance.Brightness(bg)
bg = enhancer.enhance(0.4) # Darken to 40%

# Blur slightly for depth of field effect
bg = bg.filter(ImageFilter.GaussianBlur(radius=2))

# Resize logo (make it prominent, say 600px wide max)
logo_width = 800
logo_ratio = logo.width / logo.height
logo_height = int(logo_width / logo_ratio)
logo = logo.resize((logo_width, logo_height), Image.Resampling.LANCZOS)

# Calculate position for center
pos_x = (target_size[0] - logo_width) // 2
pos_y = (target_size[1] - logo_height) // 2

# Paste logo
bg.paste(logo, (pos_x, pos_y), logo)

bg.save(out_path, quality=95)
print("Thumbnail created at:", out_path)
