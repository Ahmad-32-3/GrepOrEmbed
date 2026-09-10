"""Cosine embedding cinematic: a query vector rotates toward a candidate.

Uses Text only (no MathTex/Tex). On-screen labels, no voiceover.
"""

from manim import *
import numpy as np

BG = "#08090a"
FG_HI = "#f4f6f7"
FG = "#b9c2c7"
CAND = "#8a9499"
AMBER = "#e2703a"
FONT = "Consolas"

VEC_LEN = 3.05
CAND_ANGLE = 28 * DEGREES
START_ANGLE = CAND_ANGLE + 90 * DEGREES
END_ANGLE = CAND_ANGLE + 8 * DEGREES
ORIGIN_PT = np.array([-0.55, -1.42, 0.0])
ARC_R = 0.82


def tip_at(theta):
    return ORIGIN_PT + VEC_LEN * np.array([np.cos(theta), np.sin(theta), 0.0])


def unit_at(theta):
    return np.array([np.cos(theta), np.sin(theta), 0.0])


def perp_at(theta):
    return np.array([-np.sin(theta), np.cos(theta), 0.0])


def make_arrow(theta, color):
    return Arrow(
        ORIGIN_PT,
        tip_at(theta),
        buff=0,
        color=color,
        stroke_width=7,
        max_tip_length_to_length_ratio=0.085,
        max_stroke_width_to_length_ratio=10,
    )


class CosineEmbed(Scene):
    def construct(self):
        self.camera.background_color = BG

        kicker = Text("02  /  How it works", font=FONT, font_size=18, color=FG)
        title = Text("How cosine similarity works", font=FONT, font_size=32, color=FG_HI)
        title.next_to(kicker, DOWN, buff=0.16)
        header = VGroup(kicker, title).to_edge(UP, buff=0.42)

        formula = Text(
            "cos(θ) = (q · d) / (‖q‖ ‖d‖)",
            font=FONT,
            font_size=22,
            color=FG,
        )
        formula.to_edge(DOWN, buff=0.52)

        axis_x = Line(
            ORIGIN_PT + LEFT * 0.35,
            ORIGIN_PT + RIGHT * 3.85,
            color=FG,
            stroke_width=1.5,
            stroke_opacity=0.28,
        )
        axis_y = Line(
            ORIGIN_PT + DOWN * 0.35,
            ORIGIN_PT + UP * 3.55,
            color=FG,
            stroke_width=1.5,
            stroke_opacity=0.28,
        )
        origin_dot = Dot(ORIGIN_PT, radius=0.055, color=FG_HI)

        cand_arrow = make_arrow(CAND_ANGLE, CAND)
        cand_label = Text("candidate", font=FONT, font_size=20, color=FG)
        cand_label.move_to(
            tip_at(CAND_ANGLE) + 0.48 * unit_at(CAND_ANGLE) - 0.32 * perp_at(CAND_ANGLE)
        )

        q_tracker = ValueTracker(START_ANGLE)

        def query_arrow():
            return make_arrow(q_tracker.get_value(), FG_HI)

        def query_label():
            q = q_tracker.get_value()
            lbl = Text("query", font=FONT, font_size=20, color=FG_HI)
            lbl.move_to(tip_at(q) + 0.42 * unit_at(q) + 0.30 * perp_at(q))
            return lbl

        def angle_group():
            q = q_tracker.get_value()
            sector = Sector(
                radius=ARC_R,
                start_angle=CAND_ANGLE,
                angle=q - CAND_ANGLE,
                arc_center=ORIGIN_PT,
                color=FG,
                fill_opacity=0.14,
                stroke_width=0,
            )
            line_c = Line(ORIGIN_PT, tip_at(CAND_ANGLE))
            line_q = Line(ORIGIN_PT, tip_at(q))
            arc = Angle(
                line_c,
                line_q,
                radius=ARC_R,
                color=FG,
                stroke_width=2.4,
            )
            mid = 0.5 * (q + CAND_ANGLE)
            theta = Text("θ", font=FONT, font_size=22, color=FG)
            theta.move_to(ORIGIN_PT + (ARC_R + 0.28) * unit_at(mid))
            return VGroup(sector, arc, theta)

        def cosine_readout():
            q = q_tracker.get_value()
            val = float(np.cos(q - CAND_ANGLE))
            name = Text("cosine", font=FONT, font_size=18, color=FG)
            num = Text(f"{val:.2f}", font=FONT, font_size=40, color=AMBER)
            group = VGroup(name, num).arrange(DOWN, buff=0.08, aligned_edge=LEFT)
            group.move_to(np.array([5.15, 0.55, 0.0]))
            return group

        q_static = query_arrow()
        q_lbl_static = query_label()
        ang_static = angle_group()
        cos_static = cosine_readout()

        self.play(FadeIn(header, shift=UP * 0.12), run_time=0.7)
        self.play(FadeIn(formula), run_time=0.45)
        self.play(
            FadeIn(axis_x),
            FadeIn(axis_y),
            FadeIn(origin_dot),
            FadeIn(cand_arrow),
            FadeIn(cand_label),
            FadeIn(q_static),
            FadeIn(q_lbl_static),
            run_time=0.7,
        )
        self.play(
            FadeIn(ang_static),
            FadeIn(cos_static),
            run_time=0.45,
        )
        self.wait(0.45)

        q_live = always_redraw(query_arrow)
        q_lbl_live = always_redraw(query_label)
        ang_live = always_redraw(angle_group)
        cos_live = always_redraw(cosine_readout)
        self.remove(q_static, q_lbl_static, ang_static, cos_static)
        self.add(q_live, q_lbl_live, ang_live, cos_live)

        self.play(
            q_tracker.animate.set_value(END_ANGLE),
            run_time=8.2,
            rate_func=smooth,
        )
        self.wait(2.0)
