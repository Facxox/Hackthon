"""Generador de sprites 8-bit utilizando Pillow.
Los assets se crean con colores controlados y formas simples para mantener
un estilo coherente dentro del juego.
"""
from __future__ import annotations

from pathlib import Path
from typing import Dict, Iterable, Tuple

from PIL import Image, ImageDraw

# Paleta basica reutilizable
PALETTE: Dict[str, Tuple[int, int, int, int]] = {
    'ink': (20, 18, 28, 255),
    'coal': (34, 32, 46, 255),
    'midnight': (12, 10, 18, 255),
    'cinder': (54, 54, 76, 255),
    'moon': (218, 214, 210, 255),
    'mist': (170, 174, 188, 255),
    'fog': (126, 132, 152, 255),
    'skin_light': (224, 184, 150, 255),
    'skin_mid': (198, 160, 126, 255),
    'skin_shadow': (156, 120, 92, 255),
    'scarlet': (150, 40, 54, 255),
    'scarlet_light': (182, 74, 82, 255),
    'coat_dark': (58, 28, 86, 255),
    'coat_mid': (88, 52, 120, 255),
    'coat_high': (132, 88, 162, 255),
    'coat_trim': (200, 122, 180, 255),
    'denim_dark': (36, 48, 72, 255),
    'denim_mid': (58, 78, 110, 255),
    'boot_dark': (24, 24, 32, 255),
    'boot_high': (74, 74, 94, 255),
    'glow_gold': (247, 214, 92, 255),
    'glow_soft': (244, 232, 160, 180),
    'dress_light': (246, 215, 112, 255),
    'dress_mid': (214, 180, 78, 255),
    'dress_shadow': (172, 136, 60, 255),
    'hair_dark': (40, 38, 60, 255),
    'hair_soft': (72, 68, 92, 255),
    'hair_high': (114, 108, 140, 255),
    'shadow_void': (16, 12, 28, 255),
    'shadow_core': (8, 6, 18, 255),
    'shadow_high': (40, 32, 66, 255),
    'red_eye': (212, 32, 32, 255),
    'red_eye_glow': (252, 86, 60, 255),
    'clinic_white': (236, 238, 246, 255),
    'clinic_shade': (208, 208, 220, 255),
    'clinic_shadow': (156, 158, 178, 255),
    'clipboard': (132, 96, 70, 255),
    'clipboard_paper': (230, 226, 214, 255),
    'anchor_core': (252, 200, 88, 255),
    'anchor_high': (255, 238, 140, 255),
    'anchor_shadow': (190, 128, 54, 255),
    'tile_base': (24, 26, 36, 255),
    'tile_light': (42, 46, 58, 255),
    'tile_mid': (32, 34, 48, 255),
    'tile_high': (66, 70, 94, 255),
    'crack': (74, 38, 64, 255),
    'void': (6, 4, 14, 255),
    'haze': (98, 72, 140, 255),
    'echo_core': (120, 140, 208, 200),
    'echo_ring': (164, 182, 236, 160),
    'echo_halo': (84, 104, 180, 220),
}

OUTPUT_DIR = Path(__file__).resolve().parents[1] / 'assets' / 'sprites'


def save_sprite(name: str, image: Image.Image) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    target = OUTPUT_DIR / name
    image.save(target)
    print(f"Sprite guardado: {target.relative_to(Path.cwd())}")


def create_arturo() -> Image.Image:
    canvas = Image.new('RGBA', (24, 34), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    # Cabello
    draw.rectangle((6, 1, 17, 5), PALETTE['hair_dark'])
    draw.rectangle((7, 2, 16, 4), PALETTE['hair_soft'])
    draw.rectangle((5, 5, 18, 7), PALETTE['hair_dark'])
    draw.rectangle((6, 6, 17, 7), PALETTE['hair_high'])
    draw.rectangle((5, 7, 6, 12), PALETTE['hair_dark'])
    draw.rectangle((17, 7, 18, 12), PALETTE['hair_dark'])

    # Rostro
    draw.rectangle((8, 8, 15, 15), PALETTE['skin_mid'])
    draw.rectangle((9, 9, 14, 13), PALETTE['skin_light'])
    draw.rectangle((9, 13, 14, 13), PALETTE['skin_shadow'])
    draw.point((10, 11), PALETTE['ink'])
    draw.point((13, 11), PALETTE['ink'])
    draw.point((11, 12), PALETTE['skin_shadow'])
    draw.point((12, 12), PALETTE['skin_shadow'])
    draw.line((10, 14, 13, 14), fill=PALETTE['scarlet_light'])

    # Bufanda
    draw.rectangle((8, 15, 15, 17), PALETTE['scarlet'])
    draw.rectangle((10, 15, 13, 17), PALETTE['scarlet_light'])
    draw.rectangle((11, 17, 14, 21), PALETTE['scarlet'])

    # Abrigo principal
    draw.polygon([(4, 18), (19, 18), (21, 32), (2, 32)], fill=PALETTE['coat_dark'])
    draw.polygon([(5, 19), (18, 19), (19, 31), (4, 31)], fill=PALETTE['coat_mid'])
    draw.polygon([(7, 20), (16, 20), (15, 30), (8, 30)], fill=PALETTE['coat_high'])
    draw.rectangle((10, 20, 12, 29), PALETTE['coat_trim'])

    # Brazos
    draw.rectangle((2, 20, 5, 29), PALETTE['coat_dark'])
    draw.rectangle((18, 20, 21, 29), PALETTE['coat_dark'])
    draw.rectangle((3, 21, 4, 28), PALETTE['coat_mid'])
    draw.rectangle((19, 21, 20, 28), PALETTE['coat_mid'])

    # Manos enguantadas
    draw.rectangle((3, 28, 4, 30), PALETTE['scarlet'])
    draw.rectangle((19, 28, 20, 30), PALETTE['scarlet'])

    # Cinturon / corte
    draw.rectangle((7, 24, 17, 25), PALETTE['scarlet_light'])
    draw.line((7, 26, 17, 26), fill=PALETTE['coat_trim'])

    # Pantalon y botas
    draw.rectangle((8, 30, 11, 33), PALETTE['denim_dark'])
    draw.rectangle((12, 30, 15, 33), PALETTE['denim_dark'])
    draw.rectangle((9, 30, 10, 33), PALETTE['denim_mid'])
    draw.rectangle((13, 30, 14, 33), PALETTE['denim_mid'])
    draw.rectangle((7, 32, 11, 33), PALETTE['boot_dark'])
    draw.rectangle((12, 32, 16, 33), PALETTE['boot_dark'])
    draw.rectangle((8, 32, 10, 33), PALETTE['boot_high'])
    draw.rectangle((13, 32, 15, 33), PALETTE['boot_high'])

    return canvas


def create_la_nina() -> Image.Image:
    canvas = Image.new('RGBA', (18, 28), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    # Halo dorado
    for i in range(3):
        alpha = 60 - i * 15
        draw.rectangle((1 + i, 3 + i, 16 - i, 26 - i), fill=(247, 230, 120, alpha))

    # Cabello y cabeza
    draw.rectangle((5, 4, 12, 8), PALETTE['hair_dark'])
    draw.rectangle((6, 5, 11, 7), PALETTE['hair_high'])
    draw.rectangle((6, 8, 11, 14), PALETTE['skin_light'])
    draw.rectangle((6, 13, 11, 13), PALETTE['skin_shadow'])
    draw.point((7, 10), PALETTE['hair_dark'])
    draw.point((10, 10), PALETTE['hair_dark'])
    draw.point((8, 11), PALETTE['hair_dark'])

    # Vestido
    draw.rectangle((5, 14, 12, 18), PALETTE['dress_mid'])
    draw.polygon([(3, 18), (14, 18), (16, 25), (2, 25)], fill=PALETTE['dress_mid'])
    draw.polygon([(5, 18), (12, 18), (13, 24), (4, 24)], fill=PALETTE['dress_light'])
    draw.polygon([(3, 18), (6, 18), (5, 25), (2, 25)], fill=PALETTE['dress_shadow'])

    # Lazos brillantes
    draw.rectangle((7, 14, 9, 15), PALETTE['dress_light'])
    draw.rectangle((6, 15, 8, 16), PALETTE['dress_shadow'])

    # Piernas y pies
    draw.rectangle((6, 25, 7, 27), PALETTE['skin_light'])
    draw.rectangle((9, 25, 10, 27), PALETTE['skin_light'])
    draw.rectangle((5, 27, 7, 27), PALETTE['scarlet'])
    draw.rectangle((9, 27, 11, 27), PALETTE['scarlet'])

    return canvas


def create_el_critico() -> Image.Image:
    canvas = Image.new('RGBA', (24, 36), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    # Sombra principal
    draw.polygon([(6, 4), (17, 4), (22, 34), (2, 34)], fill=PALETTE['shadow_void'])
    draw.polygon([(7, 6), (16, 6), (20, 33), (4, 33)], fill=PALETTE['shadow_core'])
    draw.polygon([(9, 10), (14, 10), (17, 32), (6, 32)], fill=PALETTE['shadow_high'])

    # Rostro sin forma
    draw.rectangle((9, 9, 15, 15), PALETTE['shadow_void'])
    draw.rectangle((10, 11, 14, 13), PALETTE['shadow_high'])

    # Ojos
    draw.rectangle((10, 13, 11, 14), PALETTE['red_eye'])
    draw.rectangle((13, 13, 14, 14), PALETTE['red_eye'])
    draw.point((11, 13), PALETTE['red_eye_glow'])
    draw.point((13, 13), PALETTE['red_eye_glow'])

    # Surcos en el torso
    for offset in range(4):
        draw.line((8 + offset * 3, 16, 5 + offset * 3, 32), fill=PALETTE['shadow_void'])

    # Garras
    draw.rectangle((5, 30, 7, 33), PALETTE['scarlet'])
    draw.rectangle((16, 30, 18, 33), PALETTE['scarlet'])

    return canvas


def create_burocrata() -> Image.Image:
    canvas = Image.new('RGBA', (20, 28), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    draw.rectangle((6, 4, 13, 24), PALETTE['clinic_white'])
    draw.rectangle((7, 6, 12, 10), PALETTE['clinic_shade'])
    draw.rectangle((7, 10, 12, 22), PALETTE['clinic_white'])
    draw.rectangle((6, 22, 13, 24), PALETTE['clinic_shadow'])

    # Cabeza sin rasgos
    draw.rectangle((7, 0, 12, 6), PALETTE['clinic_shade'])
    draw.rectangle((8, 1, 11, 5), PALETTE['clinic_white'])

    # Brazos cruzados
    draw.rectangle((4, 12, 6, 24), PALETTE['clinic_shade'])
    draw.rectangle((13, 12, 15, 24), PALETTE['clinic_shade'])

    # Portapapeles
    draw.rectangle((1, 13, 6, 22), PALETTE['clipboard'])
    draw.rectangle((2, 14, 5, 21), PALETTE['clipboard_paper'])
    draw.line((2, 16, 5, 16), fill=PALETTE['ink'])

    return canvas


def create_enemy_echo() -> Image.Image:
    canvas = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    draw.ellipse((2, 2, 13, 13), fill=PALETTE['echo_halo'])
    draw.ellipse((4, 4, 11, 11), fill=PALETTE['echo_ring'])
    draw.ellipse((6, 6, 9, 9), fill=PALETTE['echo_core'])
    draw.point((7, 7), PALETTE['shadow_core'])
    draw.point((8, 7), PALETTE['shadow_core'])

    return canvas


def create_anchor() -> Image.Image:
    canvas = Image.new('RGBA', (14, 20), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    # Halo externo
    draw.ellipse((0, 2, 13, 19), fill=PALETTE['glow_soft'])
    draw.ellipse((2, 4, 11, 17), fill=PALETTE['anchor_shadow'])
    draw.rectangle((5, 6, 8, 15), PALETTE['anchor_core'])
    draw.rectangle((4, 8, 9, 13), PALETTE['anchor_high'])
    draw.point((6, 7), PALETTE['clinic_white'])
    draw.point((7, 9), PALETTE['clinic_white'])

    return canvas


def create_tile_ground() -> Image.Image:
    img = Image.new('RGBA', (16, 16), PALETTE['tile_base'])
    pixels = img.load()

    pattern: Iterable[Tuple[int, int]] = (
        (0, 0), (5, 1), (10, 2), (3, 4), (12, 5), (7, 7), (1, 9), (9, 10), (14, 12)
    )
    for x, y in pattern:
        pixels[x, y] = PALETTE['tile_light']
    for y in range(16):
        for x in range(16):
            if (x + y) % 5 == 0:
                pixels[x, y] = PALETTE['tile_mid']
            if (x * 3 + y * 5) % 19 == 0:
                pixels[x, y] = PALETTE['tile_high']
    return img


def create_tile_fracture() -> Image.Image:
    img = Image.new('RGBA', (16, 16), PALETTE['void'])
    draw = ImageDraw.Draw(img)
    draw.rectangle((2, 2, 13, 13), PALETTE['haze'])
    draw.line((0, 8, 16, 8), fill=PALETTE['crack'])
    draw.line((8, 0, 8, 16), fill=PALETTE['crack'])
    draw.line((2, 2, 14, 14), fill=PALETTE['anchor_high'])
    draw.line((2, 14, 14, 2), fill=PALETTE['anchor_high'])
    return img


def create_tile_ruin() -> Image.Image:
    img = Image.new('RGBA', (16, 16), PALETTE['tile_mid'])
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 8, 15, 15), PALETTE['tile_base'])
    draw.rectangle((2, 10, 13, 13), PALETTE['tile_light'])
    draw.line((2, 12, 13, 12), fill=PALETTE['crack'])
    draw.line((7, 10, 5, 14), fill=PALETTE['crack'])
    return img


def main() -> None:
    sprites = {
        'arturo.png': create_arturo(),
        'la_nina.png': create_la_nina(),
        'el_critico.png': create_el_critico(),
        'burocrata.png': create_burocrata(),
        'enemy_echo.png': create_enemy_echo(),
        'anchor_fragmento.png': create_anchor(),
        'tile_ground.png': create_tile_ground(),
        'tile_fracture.png': create_tile_fracture(),
        'tile_ruin.png': create_tile_ruin(),
    }

    for name, image in sprites.items():
        save_sprite(name, image)


if __name__ == '__main__':
    main()
