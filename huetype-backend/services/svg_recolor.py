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
from typing import List


# Matches: fill="#hex", fill='#hex', fill="rgb(…)", fill='rgb(…)'
_FILL_ATTR = re.compile(
    r'fill\s*=\s*(?P<q>["\'])(?P<val>#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})|rgba?\([^)]*\))(?P=q)'
)

# Matches inline "fill: <value>" inside a style="..." attribute
_STYLE_FILL = re.compile(
    r'(?P<prefix>fill\s*:\s*)'
    r'(?P<val>#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})|rgba?\([^)]*\))'
)


def _normalise(colour: str) -> str:
    """Normalise hex colours so '#fff' and '#ffffff' are deduped together."""
    c = colour.strip().lower()
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
        if norm not in seen_set:
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

    # First pass: collect unique colours in document order
    seen: List[str] = []
    seen_set = set()

    def _record(val: str) -> None:
        norm = _normalise(val)
        if norm not in seen_set:
            seen_set.add(norm)
            seen.append(norm)

    for m in _FILL_ATTR.finditer(svg_text):
        _record(m.group("val"))
    for m in _STYLE_FILL.finditer(svg_text):
        _record(m.group("val"))

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

    # Second pass: rewrite
    def _replace_attr(m: re.Match) -> str:
        norm = _normalise(m.group("val"))
        new_val = mapping.get(norm, m.group("val"))
        return f'fill={m.group("q")}{new_val}{m.group("q")}'

    def _replace_style(m: re.Match) -> str:
        norm = _normalise(m.group("val"))
        new_val = mapping.get(norm, m.group("val"))
        return f'{m.group("prefix")}{new_val}'

    out = _FILL_ATTR.sub(_replace_attr, svg_text)
    out = _STYLE_FILL.sub(_replace_style, out)
    return out
