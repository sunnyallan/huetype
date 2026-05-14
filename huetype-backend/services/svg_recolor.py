"""
Recolours an SVG's fills to match a global palette.

Algorithm:
  1. Scan the SVG for all `fill="..."` attributes and `fill: ...` style declarations.
  2. Collect unique colour values in document order (the order we encounter them).
  3. Map: source[i] -> palette[i].
  4. Rewrite the SVG, replacing each fill with the palette colour.
  5. If the SVG has more unique fills than palette slots, raise.

This is a pragmatic regex-based pass — it covers the common cases produced by
Figma, Illustrator, and hand-written SVGs without depending on a full XML
parser. For real edge-cases (gradient fills, pattern fills) we'll fall back to
the source colours.
"""

from __future__ import annotations
import re
import xml.etree.ElementTree as ET
from typing import List


_SVG_NS = "http://www.w3.org/2000/svg"
_SHAPE_TAGS = {"path", "rect", "circle", "ellipse", "polygon", "polyline", "line"}


# Permissive matcher — captures any fill value, we filter inside _normalise.
# Catches hex (#fff, #ffffff), rgb()/rgba(), hsl()/hsla(), and CSS named
# colours like "black", "white", "coral", etc.
_FILL_ATTR = re.compile(
    r'fill\s*=\s*(?P<q>["\'])(?P<val>[^"\']+)(?P=q)'
)

# Matches inline "fill: <value>" inside a style="..." attribute or <style> block.
_STYLE_FILL = re.compile(
    r'(?P<prefix>fill\s*:\s*)'
    r'(?P<val>[^;}\s"\']+)'
)

# Tokens that aren't actually colours and shouldn't count as fills.
_NON_COLOURS = {"none", "transparent", "currentcolor", "inherit", "initial", "unset"}


def _normalise(colour: str) -> str | None:
    """
    Normalise a fill value into a comparable form for deduplication.
    Returns None if the value is not a real colour (none, gradient, etc.).
    """
    c = colour.strip().lower().rstrip(";,")
    if not c or c in _NON_COLOURS:
        return None
    if c.startswith("url(") or c.startswith("var("):
        return None
    if c.startswith("#") and len(c) == 4:
        # Expand #rgb to #rrggbb
        return "#" + "".join(ch * 2 for ch in c[1:])
    return c


def unique_fills(svg_text: str) -> list[str]:
    """Return unique fill colour values in the SVG, in document order (normalised)."""
    seen: list[str] = []
    seen_set = set()

    def _record(val: str) -> None:
        norm = _normalise(val)
        if norm is None or norm in seen_set:
            return
        seen_set.add(norm)
        seen.append(norm)

    for m in _FILL_ATTR.finditer(svg_text):
        _record(m.group("val"))
    for m in _STYLE_FILL.finditer(svg_text):
        _record(m.group("val"))

    return seen


# Detect features we don't support recolouring: gradients, patterns, fill="url(#…)"
_UNSUPPORTED_FILL = re.compile(r'fill\s*=\s*["\']url\(', re.IGNORECASE)


def has_unsupported_fills(svg_text: str) -> bool:
    """True if the SVG uses gradient/pattern fills that our recolour pass can't handle."""
    return bool(_UNSUPPORTED_FILL.search(svg_text))


def recolor_svg(svg_text: str, palette: List[str], allow_truncate: bool = False) -> str:
    """
    Replace fills in an SVG with colours from a palette.

    Args:
        svg_text: Source SVG as a string.
        palette: Hex colours in slot order, e.g. ["#ff0000", "#00ff00"].
        allow_truncate: If False, raise when the SVG has more unique fills than
                        palette slots. If True, silently leave the extras alone.

    Returns:
        The recoloured SVG.

    Raises:
        ValueError: if the palette is empty or the SVG has too many distinct fills.
    """
    if not palette:
        raise ValueError("Palette must contain at least one colour")

    seen = unique_fills(svg_text)

    if not seen:
        raise ValueError(
            "SVG has no recognisable fill colours. Add a fill='#…' to each path."
        )

    if len(seen) > len(palette) and not allow_truncate:
        raise ValueError(
            f"SVG has {len(seen)} distinct fill colours but the project palette "
            f"only has {len(palette)} slot(s). Reduce the colours in the SVG or "
            f"switch to a font type with more palette slots."
        )

    # Build the mapping
    mapping = {seen[i]: palette[i] for i in range(min(len(seen), len(palette)))}

    # Second pass: rewrite (keep originals untouched if they aren't real colours)
    def _replace_attr(m: re.Match) -> str:
        norm = _normalise(m.group("val"))
        if norm is None or norm not in mapping:
            return m.group(0)
        return f'fill={m.group("q")}{mapping[norm]}{m.group("q")}'

    def _replace_style(m: re.Match) -> str:
        norm = _normalise(m.group("val"))
        if norm is None or norm not in mapping:
            return m.group(0)
        return f'{m.group("prefix")}{mapping[norm]}'

    out = _FILL_ATTR.sub(_replace_attr, svg_text)
    out = _STYLE_FILL.sub(_replace_style, out)
    return out


def recolor_svg_by_shape(svg_text: str, palette: List[str]) -> str:
    """
    Recolour an SVG by ASSIGNING EACH SHAPE to a palette slot in document order
    (shape i → palette[i % len(palette)]). Two shapes with the same source
    colour will receive different palette colours when their indexes differ.

    This is the right strategy for duo/tri-tone fonts where every fillable
    shape is meant to be an independent layer the user can tint.
    """
    if not palette:
        raise ValueError("Palette must contain at least one colour")

    # Register the default namespace so output stays clean
    ET.register_namespace("", _SVG_NS)

    try:
        root = ET.fromstring(svg_text)
    except ET.ParseError as exc:
        raise ValueError(f"Invalid SVG: {exc}")

    shape_idx = 0
    for el in root.iter():
        tag = el.tag.split("}")[-1].lower()
        if tag not in _SHAPE_TAGS:
            continue
        new_fill = palette[shape_idx % len(palette)]
        shape_idx += 1

        # Strip any conflicting fill from the inline style attribute so the
        # presentation attribute wins.
        style = el.get("style")
        if style:
            cleaned = re.sub(r"fill\s*:\s*[^;]+;?", "", style).strip().rstrip(";")
            if cleaned:
                el.set("style", cleaned)
            else:
                el.attrib.pop("style", None)

        el.set("fill", new_fill)
        # Remove a CSS-class-based fill reference if the element had one;
        # the inline fill attribute takes precedence anyway, but stripping the
        # class avoids stale references in viewer tools.
        if "class" in el.attrib:
            el.attrib.pop("class")

    if shape_idx == 0:
        raise ValueError(
            "SVG has no fillable shapes. Add at least one <path>/<circle>/<rect> etc."
        )

    return ET.tostring(root, encoding="unicode")
