"""Similarity hills cinematic: height is similarity; distractors crowd the answer.

2D side-elevation of the toy slice (cairo 3D surfaces fail to sort faces).
Uses Text only (no MathTex/Tex). On-screen labels, no voiceover.
Call this similarity hills or a similarity surface. Never a landscape.
"""

from manim import *
import numpy as np

BG = "#08090a"
FG_HI = "#f4f6f7"
FG = "#b9c2c7"
AMBER = "#e2703a"
FILL = "#3a241c"
FONT = "Consolas"

# Same peak set as the live surface. x is the slice; height is similarity.
PEAKS = [
    {"x": -1.45, "h": 1.00, "s": 0.55, "answer": True},
    {"x": 1.90, "h": 0.50, "s": 0.48, "answer": False},
    {"x": -2.55, "h": 0.66, "s": 0.50, "answer": False},
    {"x": 2.85, "h": 0.82, "s": 0.50, "answer": False},
    {"x": -0.28, "h": 1.18, "s": 0.52, "answer": False},
]

DATA_X_MIN, DATA_X_MAX = -3.55, 3.55
DATA_Y_MAX = 1.32
ORIGIN_S = np.array([-5.55, -1.42, 0.0])
X_SPAN = 11.1
Y_SPAN = 3.05
N_SAMPLES = 220


def to_screen(x, y):
    sx = ORIGIN_S[0] + (x - DATA_X_MIN) / (DATA_X_MAX - DATA_X_MIN) * X_SPAN
    sy = ORIGIN_S[1] + (y / DATA_Y_MAX) * Y_SPAN
    return np.array([sx, sy, 0.0])


def weights_for(trackers):
    return [1.0] + [t.get_value() for t in trackers]


def height_at(x, weights):
    h = 0.0
    for peak, w in zip(PEAKS, weights):
        if w <= 0:
            continue
        dx = x - peak["x"]
        h += w * peak["h"] * np.exp(-(dx * dx) / (2.0 * peak["s"] * peak["s"]))
    return h


def peak_height(peak, weights):
    return height_at(peak["x"], weights)


def make_surface(weights):
    xs = np.linspace(DATA_X_MIN, DATA_X_MAX, N_SAMPLES)
    ys = np.array([height_at(x, weights) for x in xs])
    ridge = [to_screen(x, y) for x, y in zip(xs, ys)]
    left_base = to_screen(xs[0], 0.0)
    right_base = to_screen(xs[-1], 0.0)
    fill = Polygon(
        left_base,
        *ridge,
        right_base,
        fill_color=FILL,
        fill_opacity=0.92,
        stroke_width=0,
    )
    top = VMobject()
    top.set_points_as_corners(ridge)
    top.set_stroke(AMBER, width=3.2, opacity=0.92)
    baseline = Line(left_base, right_base, color=FG, stroke_width=1.4, stroke_opacity=0.35)
    return VGroup(fill, baseline, top)


def make_pin(peak, weights):
    y = peak_height(peak, weights)
    if y < 0.04:
        return VGroup()
    color = FG_HI if peak["answer"] else AMBER
    tip = to_screen(peak["x"], y)
    stem = Line(tip, tip + UP * 0.32, color=color, stroke_width=2.6)
    ball = Dot(tip + UP * 0.32, radius=0.085, color=color)
    return VGroup(stem, ball)


def make_pins(weights):
    group = VGroup()
    for peak, w in zip(PEAKS, weights):
        if w < 0.08:
            continue
        group.add(make_pin(peak, weights))
    return group


class SimilarityHills(Scene):
    def construct(self):
        self.camera.background_color = BG

        kicker = Text("03  /  How it works", font=FONT, font_size=18, color=FG)
        title = Text("Similarity hills", font=FONT, font_size=34, color=FG_HI)
        title.next_to(kicker, DOWN, buff=0.16)
        header = VGroup(kicker, title).to_edge(UP, buff=0.40)

        key_answer = Text("white  answer", font=FONT, font_size=18, color=FG_HI)
        key_dist = Text("amber  distractor", font=FONT, font_size=18, color=AMBER)
        legend = VGroup(key_answer, key_dist).arrange(DOWN, buff=0.10, aligned_edge=LEFT)
        legend.next_to(header, DOWN, buff=0.22).to_edge(LEFT, buff=0.48)

        y_label = Text("similarity", font=FONT, font_size=16, color=FG)
        y_label.rotate(90 * DEGREES)
        y_label.move_to(to_screen(DATA_X_MIN, DATA_Y_MAX * 0.55) + LEFT * 0.42)

        count = Text("Distractor sessions: 0 of 4", font=FONT, font_size=18, color=FG)
        verdict = Text("Tallest hill: the answer.", font=FONT, font_size=20, color=FG_HI)
        caption = Text(
            "Height is similarity on this surface.",
            font=FONT,
            font_size=20,
            color=FG,
        )
        footer = VGroup(count, verdict, caption).arrange(DOWN, buff=0.10)
        footer.to_edge(DOWN, buff=0.32)

        trackers = [ValueTracker(0.0) for _ in range(4)]

        def live_weights():
            return weights_for(trackers)

        hills = always_redraw(lambda: make_surface(live_weights()))
        pins = always_redraw(lambda: make_pins(live_weights()))

        self.play(FadeIn(header, shift=UP * 0.12), FadeIn(legend), run_time=0.7)
        self.play(
            FadeIn(hills),
            FadeIn(pins),
            FadeIn(y_label),
            FadeIn(footer),
            run_time=0.9,
        )
        self.wait(0.85)

        for n, tracker in enumerate(trackers, start=1):
            next_count = Text(
                f"Distractor sessions: {n} of 4",
                font=FONT,
                font_size=18,
                color=FG,
            )
            if n < 4:
                next_verdict = Text(
                    "Tallest hill: the answer.",
                    font=FONT,
                    font_size=20,
                    color=FG_HI,
                )
                next_caption = Text(
                    "Amber peaks are distractor sessions.",
                    font=FONT,
                    font_size=20,
                    color=FG,
                )
            else:
                next_verdict = Text(
                    "Tallest hill: a distractor.",
                    font=FONT,
                    font_size=20,
                    color=AMBER,
                )
                next_caption = Text(
                    "A near match is now the tallest hill.",
                    font=FONT,
                    font_size=20,
                    color=FG_HI,
                )
            next_footer = VGroup(next_count, next_verdict, next_caption).arrange(
                DOWN, buff=0.10
            )
            next_footer.move_to(footer.get_center())

            grow = 2.15 if n == 4 else 1.35
            self.play(
                tracker.animate.set_value(1.0),
                FadeOut(footer),
                FadeIn(next_footer),
                run_time=grow,
                rate_func=smooth,
            )
            footer = next_footer
            self.wait(0.28 if n < 4 else 2.15)

        self.wait(0.35)
