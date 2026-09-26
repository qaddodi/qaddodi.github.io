#!/usr/bin/env python3
"""Draws the homepage illustrations into _includes/art/.

Each tool gets a "plate": a small scientific figure of what the tool does,
drawn at 400 x 240. The hero gets the hepatic lobule. Colors are not set here;
the stylesheet colors everything through these classes:

  ax   axis / grid lines          c    accent stroke        cf   accent fill
  c2   lighter accent stroke      cs   soft accent fill     tx   label text
  draw strokes that draw in (pathLength=1)                  flow moving dashes

Run from the repo root:  python3 _scripts/make-art.py
"""
import math
import os
import random

OUT = os.path.join(os.path.dirname(__file__), "..", "_includes", "art")
W, H = 400, 240


def f(x):
    return f"{x:.1f}".rstrip("0").rstrip(".")


def poly(points):
    return "M" + " L".join(f"{f(x)} {f(y)}" for x, y in points)


def smooth(points):
    """Catmull-Rom through points, as cubic Béziers."""
    d = f"M{f(points[0][0])} {f(points[0][1])}"
    for i in range(len(points) - 1):
        p0 = points[i - 1] if i else points[i]
        p1, p2 = points[i], points[i + 1]
        p3 = points[i + 2] if i + 2 < len(points) else p2
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f" C{f(c1[0])} {f(c1[1])} {f(c2[0])} {f(c2[1])} {f(p2[0])} {f(p2[1])}"
    return d


def svg(body, label, vb=f"0 0 {W} {H}", halo=True):
    cls = "art art-halo" if halo else "art"
    return (f'<svg class="{cls}" viewBox="{vb}" role="img" aria-label="{label}" '
            f'preserveAspectRatio="xMidYMid meet">\n{body}\n</svg>\n')


def axes(x0=40, y0=200, x1=372, y1=28, xt=(), yt=()):
    s = f'<path class="ax" d="M{x0} {y1}V{y0}H{x1}"/>\n'
    for x, lab in xt:
        s += f'<path class="ax" d="M{f(x)} {y0}v5"/><text class="tx" x="{f(x)}" y="{y0 + 18}" text-anchor="middle">{lab}</text>\n'
    for y, lab in yt:
        s += f'<path class="ax ax-grid" d="M{x0} {f(y)}H{x1}"/><text class="tx" x="{x0 - 8}" y="{f(y + 3.5)}" text-anchor="end">{lab}</text>\n'
    return s


# ---------------------------------------------------------------- calculators

def hcc():
    # cumulative HCC incidence by risk stratum: stepped curves rising over 5 years
    x0, y0, x1 = 48, 196, 330
    random.seed(4)
    body = axes(x0, y0, x1 + 30, 30,
                xt=[(x0 + i * (x1 - x0) / 5, f"{i}y") for i in range(6)],
                yt=[(y0 - 150, "")])
    for k, (end, cls, lab) in enumerate([(150, "c", "High"), (70, "c c2", "Int"), (22, "c c3", "Low")]):
        pts, x, y = [(x0, y0)], x0, y0
        steps = 16
        for i in range(steps):
            nx = x0 + (i + 1) * (x1 - x0) / steps
            pts.append((nx, y))
            y = y0 - end * ((i + 1) / steps) ** (0.8 + 0.2 * k) - random.uniform(-2, 2) * (k == 0)
            y = min(y, pts[-1][1])
            pts.append((nx, y))
        body += f'<path class="{cls} draw d{k + 1}" pathLength="1" d="{poly(pts)}"/>\n'
        body += f'<circle class="cf dot d{k + 1}" cx="{f(pts[-1][0])}" cy="{f(pts[-1][1])}" r="3.4"/>'
        body += f'<text class="tx tx-c" x="{f(pts[-1][0] + 9)}" y="{f(pts[-1][1] + 4)}">{lab}</text>\n'
    body += '<text class="tx" x="48" y="20">Cumulative HCC risk</text>\n'
    return svg(body, "Stepped cumulative HCC risk curves for low, intermediate, and high risk groups over five years")


def portal_htn():
    # logistic probability curve with the CSPH decision threshold
    x0, y0, x1, y1 = 48, 184, 364, 34
    body = axes(x0, y0, x1, y1, yt=[(y1, "1.0"), ((y0 + y1) / 2, "0.5"), (y0, "0")])
    pts = []
    for i in range(61):
        t = i / 60
        z = (t - 0.52) * 11
        p = 1 / (1 + math.exp(-z))
        pts.append((x0 + t * (x1 - x0), y0 - p * (y0 - y1)))
    d = smooth(pts)
    body += f'<path class="cs area" d="{d} L{x1} {y0} L{x0} {y0}Z"/>\n'
    body += f'<path class="c draw" pathLength="1" d="{d}"/>\n'
    tx = x0 + 0.62 * (x1 - x0)
    body += f'<path class="c2 dash" d="M{f(tx)} {y0}V{y1 - 6}"/><text class="tx tx-c" x="{f(tx + 6)}" y="{y1 + 2}">HVPG ≥ 10</text>\n'
    body += f'<circle class="cf rider" r="6" style="offset-path: path(\'{d}\')"/>\n'
    for i, lab in enumerate(["PLT", "BILI", "INR"]):
        x = 70 + i * 104
        body += (f'<text class="tx" x="{x}" y="222">{lab}</text>'
                 f'<path class="ax" d="M{x + 34} 218h52"/>'
                 f'<circle class="cf knob k{i + 1}" cx="{x + 34 + [34, 16, 40][i]}" cy="218" r="4"/>\n')
    return svg(body, "Logistic probability curve of clinically significant portal hypertension with the HVPG 10 mmHg threshold")


def backtrack():
    # enzyme values extrapolated back in time with their half-lives
    x0, y0, x1, y1 = 48, 190, 356, 30
    hours = 48
    body = axes(x0, y0, x1, y1, xt=[(x1 - i * (x1 - x0) / 4, "now" if i == 0 else f"−{i * 12}h") for i in range(5)])
    ymax = 7.6
    for k, (name, t_half, cls) in enumerate([("AST", 17, "c"), ("LDH", 24, "c c2"), ("ALT", 72, "c c3")]):
        pts = []
        for i in range(49):
            h = i
            v = 2 ** (h / t_half)
            pts.append((x1 - h / hours * (x1 - x0), y0 - (v / ymax) * (y0 - y1) + 0))
        d = smooth(pts[::4] + ([pts[-1]] if len(pts) % 4 != 1 else []))
        body += f'<path class="{cls} draw d{k + 1} dashline" pathLength="1" d="{d}"/>\n'
        end = pts[-1]
        body += f'<text class="tx tx-c" x="{f(end[0] + 4)}" y="{f(end[1] - 8)}">{name} t½ {t_half}h</text>\n'
    body += f'<circle class="cf" cx="{x1}" cy="{f(y0 - (1 / ymax) * (y0 - y1))}" r="5"/>\n'
    body += f'<path class="c2 dash" d="M{x1} {y1}V{y0}"/>\n'
    return svg(body, "AST, LDH, and ALT extrapolated back 48 hours from the current value using their half-lives")


# ---------------------------------------------------------------- cases

def panel():
    # a lab report with the tells flagged
    names = ["AST", "ALT", "ALP", "GGT", "LDH", "TBili", "Alb", "INR", "PLT", "MCV", "TP", "?"]
    tells = {0, 1, 4}
    body = ""
    cw, ch, gx, gy = 104, 40, 12, 12
    ox, oy = 26, 22
    for i, n in enumerate(names):
        r, c = divmod(i, 3)
        x, y = ox + c * (cw + gx), oy + r * (ch + gy)
        if n == "?":
            body += (f'<rect class="cs ask" x="{x}" y="{y}" width="{cw}" height="{ch}" rx="8"/>'
                     f'<text class="tx tx-big tx-c" x="{x + cw / 2}" y="{y + 27}" text-anchor="middle">Dx ?</text>\n')
            continue
        tell = i in tells
        body += (f'<rect class="{"cf tell t" + str(len([t for t in tells if t <= i])) if tell else "cell"}" x="{x}" y="{y}" width="{cw}" height="{ch}" rx="8"/>'
                 f'<text class="tx {"tx-on" if tell else ""}" x="{x + 12}" y="{y + 16}">{n}</text>'
                 f'<rect class="{"bar-on" if tell else "bar"}" x="{x + 12}" y="{y + 24}" width="{[62, 70, 30, 26, 58, 22, 34, 20, 44, 30, 36][i]}" height="5" rx="2.5"/>\n')
    body += '<rect x="352" y="22" width="30" height="196" rx="8" class="cs"/>'
    for i in range(6):
        body += f'<circle class="cf seq s{i + 1}" cx="367" cy="{40 + i * 32}" r="4"/>'
    return svg(body, "A lab report grid with the diagnostic clues highlighted and the diagnosis still hidden", halo=False)


def cirrhosis():
    # one patient's path through the case
    stops = [("Clinic", 40, 176), ("Ascites", 104, 128), ("SBP", 156, 170), ("Bleed", 214, 108),
             ("HE", 262, 150), ("HRS-AKI", 312, 96), ("Transplant", 360, 56)]
    pts = [(x, y) for _, x, y in stops]
    d = smooth(pts)
    body = f'<path class="ax ax-thick" d="{d}"/>\n<path class="c draw journey" pathLength="1" d="{d}"/>\n'
    for i, (lab, x, y) in enumerate(stops):
        big = i in (0, len(stops) - 1)
        body += f'<circle class="{"cf" if big else "stop"} st{i + 1}" cx="{x}" cy="{y}" r="{7 if big else 5.5}"/>'
        above = i in (1, 3, 6)
        body += f'<text class="tx" x="{x}" y="{y - 14 if above else y + 22}" text-anchor="middle">{lab}</text>\n'
    body += f'<circle class="cf walker" r="5" style="offset-path: path(\'{d}\')"/>\n'
    for i, lab in enumerate(["Recognize", "Interpret", "Stabilize", "Escalate"]):
        body += f'<text class="tx tx-dim" x="{40 + i * 96}" y="222">{i + 1} {lab}</text>'
    return svg(body, "A winding path through the case from the first clinic visit to the transplant decision")


# ---------------------------------------------------------------- simulators

def pressure():
    # gut → portal vein → liver (resistance) → hepatic vein → IVC, with a TIPS bypass
    body = ""
    body += '<rect class="cs" x="16" y="94" width="58" height="52" rx="10"/><text class="tx" x="45" y="124" text-anchor="middle">Gut</text>\n'
    body += '<rect class="cs" x="326" y="94" width="58" height="52" rx="10"/><text class="tx" x="355" y="124" text-anchor="middle">IVC</text>\n'
    body += '<path class="pipe" d="M74 120H150"/><path class="pipe" d="M250 120H326"/>\n'
    body += '<path class="c flow f1" d="M74 120H150"/><path class="c flow f3" d="M250 120H326"/>\n'
    # liver resistance zig-zag
    zz = [(150, 120)] + [(158 + i * 10, 104 if i % 2 == 0 else 136) for i in range(9)] + [(250, 120)]
    body += f'<path class="c resist" d="{poly(zz)}"/>\n'
    body += '<text class="tx" x="200" y="160" text-anchor="middle">Liver · resistance</text>\n'
    # TIPS arc
    body += '<path class="c2 tips" d="M140 120C150 40 250 40 260 120"/><path class="c flow f2 tips-flow" d="M140 120C150 40 250 40 260 120"/>\n'
    body += '<text class="tx tx-c" x="200" y="46" text-anchor="middle">TIPS</text>\n'
    body += '<circle class="cf" cx="140" cy="120" r="6"/><text class="tx" x="112" y="104">PV</text>\n'
    body += '<circle class="cf" cx="260" cy="120" r="6"/><text class="tx" x="268" y="104">HV</text>\n'
    # HVPG gauge
    body += '<path class="ax ax-thick" d="M150 214a50 50 0 0 1 100 0"/>'
    body += '<path class="c gauge" pathLength="1" d="M150 214a50 50 0 0 1 100 0"/>'
    body += '<path class="c needle" d="M200 214L226 190"/><circle class="cf" cx="200" cy="214" r="4"/>'
    body += '<text class="tx" x="262" y="214">HVPG</text>\n'
    return svg(body, "Schematic of portal circulation from gut through the liver to the IVC, with a TIPS bypass and an HVPG gauge")


def liver_sim():
    # lab trajectories reacting to an injury and a treatment
    x0, y0, x1, y1 = 40, 196, 372, 30
    body = axes(x0, y0, x1, y1)
    inj, tx = 104, 232
    body += f'<path class="c2 dash" d="M{inj} {y1}V{y0}"/><text class="tx tx-c" x="{inj + 5}" y="{y1 + 8}">Injury</text>\n'
    body += f'<path class="c2 dash" d="M{tx} {y1}V{y0}"/><text class="tx tx-c" x="{tx + 5}" y="{y1 + 8}">NAC</text>\n'
    series = [("AST", 150, 10, 0.9), ("ALT", 130, 18, 0.55), ("INR", 70, 30, 0.35), ("TBili", 50, 44, 0.25), ("ALP", 28, 22, 0.2)]
    for k, (name, peak, lag, decay) in enumerate(series):
        pts = []
        for i in range(34):
            x = x0 + i * (x1 - x0) / 33
            v = 0
            if x > inj:
                rise = 1 - math.exp(-(x - inj) / (lag + 8))
                v = peak * rise
                if x > tx:
                    v *= math.exp(-(x - tx) / (60 / decay)) ** 1.0
            pts.append((x, y0 - 8 - v))
        cls = ["c", "c c2", "c c3", "c c2", "c c3"][k]
        body += f'<path class="{cls} draw d{k + 1}" pathLength="1" d="{smooth(pts)}"/>\n'
        lx = 150 + k * 46
        body += f'<path class="{cls}" d="M{lx} 222h12"/><text class="tx" x="{lx + 16}" y="226">{name}</text>\n'
    return svg(body, "Lab trajectories rising after a liver injury and falling after treatment")


# ---------------------------------------------------------------- research

def abstract():
    body = '<rect class="page" x="24" y="18" width="210" height="206" rx="10"/>\n'
    lines = [(40, 150), (40, 170), (40, 120), (40, 164), (40, 138), (40, 172), (40, 100), (40, 156), (40, 130)]
    chips = {1: (150, 1), 4: (118, 2), 7: (104, 3)}
    for i, (x, w) in enumerate(lines):
        y = 40 + i * 20
        body += f'<rect class="line" x="{x}" y="{y}" width="{w}" height="6" rx="3"/>'
        if i in chips:
            cx, n = chips[i]
            body += f'<rect class="cf chip ch{n}" x="{cx + 8}" y="{y - 4}" width="44" height="14" rx="7"/><text class="tx tx-on tx-s" x="{cx + 30}" y="{y + 6}" text-anchor="middle">PMID</text>'
        body += "\n"
    for n, (cy, (ci, (cx, _))) in enumerate(zip([34, 102, 170], chips.items())):
        y = 40 + ci * 20 + 3
        body += f'<path class="c2 draw link d{n + 1}" pathLength="1" d="M{cx + 52} {y}C{cx + 110} {y} 250 {cy + 24} 274 {cy + 24}"/>\n'
        body += (f'<rect class="card cd{n + 1}" x="274" y="{cy}" width="104" height="50" rx="8"/>'
                 f'<rect class="cf" x="284" y="{cy + 10}" width="30" height="6" rx="3"/>'
                 f'<rect class="line" x="284" y="{cy + 22}" width="80" height="5" rx="2.5"/>'
                 f'<rect class="line" x="284" y="{cy + 32}" width="62" height="5" rx="2.5"/>\n')
    return svg(body, "A draft with inline PubMed IDs linked to citation cards", halo=False)


def auris():
    random.seed(11)
    body = ""
    rows = 5
    for r in range(rows):
        y = 34 + r * 34
        pts = []
        # whole-number cycles per 300 px, so the trace tiles seamlessly when it scrolls
        k = 2 * math.pi / 300
        comps = [(k * random.randint(2, 4), random.uniform(3, 7), random.uniform(0, 6)),
                 (k * random.randint(8, 13), random.uniform(1.5, 3), random.uniform(0, 6)),
                 (k * random.randint(22, 34), random.uniform(0.6, 1.6), random.uniform(0, 6))]
        for i in range(0, 601, 3):
            x = i
            v = sum(a * math.sin(fq * x + ph) for fq, a, ph in comps)
            if r == 2 and 240 < (i % 300) < 262:
                v += 13 * math.sin((i % 300 - 240) / 22 * math.pi) * (1 if i % 300 < 251 else -1)
            pts.append((x, y + v))
        d = poly(pts)
        body += f'<g class="trace-row"><text class="tx" x="6" y="{y + 4}">{["Fp1", "F3", "Fz", "C3", "P3"][r]}</text>'
        body += f'<svg x="36" y="{y - 17}" width="250" height="34" viewBox="0 {y - 17} 300 34" preserveAspectRatio="none" overflow="hidden">'
        body += f'<path class="{"c" if r == 2 else "c c3"} trace" d="{d}"/></svg></g>\n'
    # spectrum bars
    for i in range(12):
        hgt = 20 + 110 * math.exp(-((i - 3.5) ** 2) / 8) + random.uniform(0, 18)
        body += f'<rect class="cf bar-eq b{i % 6 + 1}" x="{300 + i * 8}" y="{200 - hgt}" width="5" height="{f(hgt)}" rx="2.5"/>'
    body += '\n<text class="tx" x="300" y="222">spectrum</text>\n'
    return svg(body, "Five EEG channels scrolling past, with a spectrum of the signal beside them")


# ---------------------------------------------------------------- the lobule

def lobule():
    R = 190
    cx = cy = 0
    corners = [(R * math.cos(math.radians(a)), R * math.sin(math.radians(a))) for a in range(0, 360, 60)]
    body = '<defs><radialGradient id="lob-fade" r=".62"><stop offset=".55" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'
    body += '<mask id="lob-mask"><rect x="-300" y="-300" width="600" height="600" fill="url(#lob-fade)"/></mask></defs>\n'
    # neighboring lobules, faded
    body += '<g class="lob-tissue" mask="url(#lob-mask)">'
    for q in range(6):
        a = math.radians(30 + q * 60)
        ox, oy = R * math.sqrt(3) * math.cos(a), R * math.sqrt(3) * math.sin(a)
        hexp = [(ox + R * math.cos(math.radians(t)), oy + R * math.sin(math.radians(t))) for t in range(0, 360, 60)]
        body += f'<path class="lob-edge lob-far" d="{poly(hexp)}Z"/>'
    body += '</g>\n'
    # hepatocyte cords: beaded radial plates
    body += '<g class="lob-cords">'
    for a in range(0, 360, 8):
        t = math.radians(a)
        # distance to hex edge along this angle
        sector = math.radians(((a + 30) % 60) - 30)
        r_edge = (R * math.sqrt(3) / 2) / math.cos(sector)
        x0, y0 = 26 * math.cos(t), 26 * math.sin(t)
        x1, y1 = (r_edge - 14) * math.cos(t), (r_edge - 14) * math.sin(t)
        body += f'<path class="cord" d="M{f(x0)} {f(y0)}L{f(x1)} {f(y1)}"/>'
    body += '</g>\n'
    # the three acinar zones as hexagonal bands, lit by the daily panel after a reveal:
    # zone 1 periportal (outer), zone 2 midzonal, zone 3 pericentral (inner)
    def ring(r0, r1):
        outer = [(r1 * math.cos(math.radians(a)), r1 * math.sin(math.radians(a))) for a in range(0, 360, 60)]
        inner = [(r0 * math.cos(math.radians(a)), r0 * math.sin(math.radians(a))) for a in range(0, 360, 60)]
        return poly(outer) + "Z" + (poly(inner[::-1]) + "Z" if r0 else "")
    body += '<g class="lob-zones">'
    for z, (r0, r1) in ((1, (R * .68, R)), (2, (R * .38, R * .68)), (3, (0, R * .38))):
        body += f'<path class="zone z{z}" fill-rule="evenodd" d="{ring(r0, r1)}"/>'
    body += '</g>\n'
    body += f'<path class="lob-edge" d="{poly(corners)}Z"/>\n'
    # sinusoidal blood flow: triads → central vein
    body += '<g class="lob-flow">'
    for i, (x, y) in enumerate(corners):
        body += f'<path class="blood b{i % 3 + 1}" d="M{f(x * .92)} {f(y * .92)}L{f(x * .14)} {f(y * .14)}"/>'
        # neighbors of the corner: two sinusoids per edge midpoint
        mx, my = (x + corners[(i + 1) % 6][0]) / 2, (y + corners[(i + 1) % 6][1]) / 2
        body += f'<path class="blood b{(i + 1) % 3 + 1}" d="M{f(mx * .9)} {f(my * .9)}L{f(mx * .16)} {f(my * .16)}"/>'
    # bile canaliculi: center → triads (outward)
    for i, (x, y) in enumerate(corners):
        a = math.atan2(y, x) + math.radians(9)
        body += f'<path class="bile" d="M{f(34 * math.cos(a))} {f(34 * math.sin(a))}L{f(R * .86 * math.cos(a))} {f(R * .86 * math.sin(a))}"/>'
    body += '</g>\n'
    # portal triads at the corners
    for i, (x, y) in enumerate(corners):
        a = math.atan2(y, x)
        px, py = x - 10 * math.cos(a), y - 10 * math.sin(a)
        body += (f'<g class="triad tr{i + 1}"><circle class="pv" cx="{f(px)}" cy="{f(py)}" r="10"/>'
                 f'<circle class="ha" cx="{f(px + 13 * math.cos(a + 1.9))}" cy="{f(py + 13 * math.sin(a + 1.9))}" r="4.6"/>'
                 f'<circle class="bd" cx="{f(px + 13 * math.cos(a - 1.9))}" cy="{f(py + 13 * math.sin(a - 1.9))}" r="4.6"/></g>')
    body += '\n<circle class="cv-ring" r="24"/><circle class="cv" r="17"/>\n'
    # callouts
    tx, ty = corners[5]
    body += (f'<g class="callout"><path d="M{f(tx + 16)} {f(ty - 14)}L{f(tx + 40)} {f(ty - 44)}H{f(tx + 60)}"/>'
             f'<text x="{f(tx + 64)}" y="{f(ty - 40)}">Portal triad</text></g>')
    body += ('<g class="callout"><path d="M14 20L60 70H92"/>'
             '<text x="96" y="74">Central vein</text></g>\n')
    return svg(body, "A hepatic lobule: blood flows from the portal triads at each corner toward the central vein, while bile flows outward", vb="-280 -250 560 500", halo=False)


ART = {
    "hcc": hcc, "portal-htn": portal_htn, "backtrack": backtrack,
    "panel": panel, "cirrhosis": cirrhosis,
    "pressure": pressure, "liver-sim": liver_sim,
    "abstract": abstract, "auris": auris,
    "lobule": lobule,
}

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for name, fn in ART.items():
        with open(os.path.join(OUT, f"{name}.svg"), "w") as fh:
            fh.write(fn())
    print("wrote", len(ART), "files to", os.path.normpath(OUT))
