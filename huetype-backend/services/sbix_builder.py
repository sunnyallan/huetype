"""
SBIX font builder — adds a bitmap strike table to an existing COLR TTF
so Safari and iOS can render the glyphs.

Why SBIX?
---------
COLRv1 (what nanoemoji builds) isn't supported in Safari or iOS as of 2026.
Apple's SBIX format stores PNG bitmaps per glyph per pixel size and is
natively rendered on all Apple platforms via CoreText.

Strategy: add SBIX strikes to the existing COLR TTF so the same .ttf file
works everywhere:
  - Chrome / Firefox / Edge  →  use COLRv1 (vector, colour-palette aware)
  - Safari / iOS / macOS Figma  →  use SBIX (bitmap, still full-colour)

File size trade-off: COLR ~4 KB, COLR+SBIX ~200–600 KB.
We keep the original COLR-only TTF as well — users download whichever fits.

Sizes generated: 20 / 40 / 80 / 160 px (covers 1×–4× retina).
"""

import io
from pathlib import Path

import cairosvg
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._s_b_i_x import table__s_b_i_x
from fontTools.ttLib.tables.sbixStrike import Strike
from fontTools.ttLib.tables.sbixGlyph import Glyph

# Strike sizes in pixels (ppem). Covers normal and retina displays.
SBIX_SIZES = [20, 40, 80, 160]


def build_sbix_ttf(
    colr_ttf_path: Path,
    glyph_data: list[dict],
) -> bytes:
    """
    Add SBIX bitmap strikes to an existing COLR TTF.

    Parameters
    ----------
    colr_ttf_path : Path
        Path to the nanoemoji-built TTF (COLRv1).
    glyph_data : list[dict]
        Each dict must have:
          "codepoint"  – hex string, e.g. "E001"
          "local_path" – absolute path to the SVG that was fed to nanoemoji
                         (already recoloured for duo/tri-tone projects).

    Returns
    -------
    bytes
        The modified TTF with both COLR and SBIX tables.
    """
    font = TTFont(str(colr_ttf_path))

    # cmap: codepoint int → glyph name (e.g. 0xE001 → "uniE001")
    cmap: dict[int, str] = font.getBestCmap() or {}

    # Build glyph_name → SVG path mapping
    glyph_svg_map: dict[str, Path] = {}
    for g in glyph_data:
        try:
            cp_int = int(g["codepoint"], 16)
        except (ValueError, KeyError):
            continue
        glyph_name = cmap.get(cp_int)
        if glyph_name and g.get("local_path"):
            glyph_svg_map[glyph_name] = Path(g["local_path"])

    if not glyph_svg_map:
        raise ValueError(
            "SBIX build: no glyphs could be matched in the COLR font's cmap. "
            "Check that codepoints align between the glyph data and the built font."
        )

    # Build the SBIX table
    sbix = table__s_b_i_x()
    sbix.version = 1
    sbix.flags = 1          # bit 0 must always be 1 per OpenType spec
    sbix.strikes = {}       # keyed by ppem int

    for ppem in SBIX_SIZES:
        strike = Strike(ppem=ppem, resolution=72)
        strike.glyphs = {}

        for glyph_name, svg_path in glyph_svg_map.items():
            try:
                png_bytes = cairosvg.svg2png(
                    url=str(svg_path),
                    output_width=ppem,
                    output_height=ppem,
                )
            except Exception:
                # Skip individual glyph at this size — non-fatal
                continue

            if not png_bytes:
                continue

            glyph_obj = Glyph(
                glyphName=glyph_name,
                originOffsetX=0,
                originOffsetY=0,
                graphicType="png",   # auto-padded to "png " by fontTools
                imageData=png_bytes,
            )
            strike.glyphs[glyph_name] = glyph_obj

        if strike.glyphs:
            sbix.strikes[ppem] = strike

    if not sbix.strikes:
        raise RuntimeError("SBIX build produced no valid strikes")

    font["sbix"] = sbix

    buf = io.BytesIO()
    font.save(buf)
    return buf.getvalue()
