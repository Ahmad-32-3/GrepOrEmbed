"""Grep scan cinematic: a cursor walks a haystack and stops on an exact match.

Uses Text only (no MathTex/Tex). On-screen labels, no voiceover.
"""

from manim import *

BG = "#08090a"
FG_HI = "#f4f6f7"
FG = "#b9c2c7"
GREP = "#22a58f"

HAYSTACK = "the user said the meeting moved to 3pm on thursday"
NEEDLE = "3pm"
FONT = "Consolas"


class GrepScan(Scene):
    def construct(self):
        self.camera.background_color = BG

        match_start = HAYSTACK.index(NEEDLE)
        match_end = match_start + len(NEEDLE)

        kicker = Text("01  /  How it works", font=FONT, font_size=18, color=FG)
        title = Text("How grep works", font=FONT, font_size=34, color=FG_HI)
        title.next_to(kicker, DOWN, buff=0.16)
        header = VGroup(kicker, title).to_edge(UP, buff=0.42)

        query_label = Text("Looking for", font=FONT, font_size=20, color=FG)
        query_word = Text(NEEDLE, font=FONT, font_size=22, color=BG)
        chip_bg = RoundedRectangle(
            corner_radius=0.08,
            width=query_word.width + 0.38,
            height=query_word.height + 0.22,
            fill_color=GREP,
            fill_opacity=1,
            stroke_width=0,
        )
        query_word.move_to(chip_bg.get_center())
        chip = VGroup(chip_bg, query_word)
        query_row = VGroup(query_label, chip).arrange(RIGHT, buff=0.22)
        query_row.next_to(header, DOWN, buff=0.48)

        hay = Text(HAYSTACK, font=FONT, font_size=26, color=FG)
        hay.scale_to_fit_width(12.4)
        hay.next_to(query_row, DOWN, buff=0.72)

        # Text drops space glyphs; map string index -> submobject index.
        sub_of = {}
        sub_i = 0
        for i, ch in enumerate(HAYSTACK):
            if ch != " ":
                sub_of[i] = sub_i
                sub_i += 1

        cursor = Rectangle(
            width=0.055,
            height=hay.height + 0.22,
            fill_color=GREP,
            fill_opacity=1,
            stroke_width=0,
        )
        cursor.move_to([hay.get_left()[0] - 0.04, hay.get_y(), 0])

        caption = Text(
            "Scanning left to right for an exact match.",
            font=FONT,
            font_size=20,
            color=FG,
        )
        caption.to_edge(DOWN, buff=0.52)

        self.play(
            FadeIn(header, shift=UP * 0.12),
            FadeIn(query_row),
            run_time=0.8,
        )
        self.play(
            FadeIn(hay),
            FadeIn(cursor),
            FadeIn(caption),
            run_time=0.55,
        )

        left = hay.get_left()[0]
        char_w = hay.width / len(HAYSTACK)
        scan_seconds = 5.2
        step = scan_seconds / match_end
        for i in range(match_end):
            x = left + (i + 1) * char_w
            anims = [
                cursor.animate.move_to([x, hay.get_y(), 0]),
            ]
            if i in sub_of:
                anims.append(hay[sub_of[i]].animate.set_color(FG_HI))
            self.play(*anims, run_time=step, rate_func=linear)

        start_sub = sub_of[match_start]
        match_group = VGroup(*hay.submobjects[start_sub : start_sub + len(NEEDLE)])
        highlight = RoundedRectangle(
            corner_radius=0.07,
            width=match_group.width + 0.2,
            height=match_group.height + 0.18,
            fill_color=GREP,
            fill_opacity=1,
            stroke_width=0,
        )
        highlight.move_to(match_group.get_center())
        highlight.set_z_index(0)
        for glyph in match_group:
            glyph.set_z_index(1)

        found = Text(
            "Match found. Grep stops here.",
            font=FONT,
            font_size=20,
            color=GREP,
        )
        found.move_to(caption.get_center())

        self.play(
            FadeIn(highlight),
            *[glyph.animate.set_color(BG) for glyph in match_group],
            FadeOut(caption),
            FadeIn(found),
            FadeOut(cursor),
            run_time=0.7,
        )
        self.wait(2.2)
