# Manim cinematic clips

Build-time video for section 01. Live counterparts already ship in the React
app (Mafs cosine plane, Three.js similarity hills). These clips are
pre-rendered; they are not a runtime dependency.

No TeX. Scenes use `Text` with Unicode math (`cos(θ)`, `‖q‖`) instead of
`MathTex` or `Tex`, so texlive is not required.

## Render

From the repo root, with the same Python that has Manim installed:

```
python -m manim -ql manim/grep_scan.py GrepScan --media_dir manim/media
```

`-ql` is the low-res preview (480p15). Higher quality:

```
python -m manim -qh manim/grep_scan.py GrepScan --media_dir manim/media
```

Output lands under `manim/media/videos/grep_scan/<quality>/GrepScan.mp4`.

ffmpeg is required. Manim Community 0.21 is the version this machine has.

### `srt` stub (only if install fails)

`python -m pip install manim` pulls `srt` for optional subtitle export. On some
Python 3.13 + setuptools combinations that package fails to build. If it does,
drop a two-line stub at `Lib/site-packages/srt.py` so Manim can import:

```
class Subtitle: pass
parse = compose = lambda *a, **k: []
```

Then `python -m pip install manim --no-deps` and install the remaining
dependencies except `srt`. This preview install built `srt` 3.5.3 from source
and did not need the stub.

## Color tokens

Match the page, not a new palette.

| Role | Hex | Use |
|---|---|---|
| Page background | `#08090a` | Scene background |
| Body high | `#f4f6f7` | Titles, scanned characters |
| Body | `#b9c2c7` | Kickers, captions, unread characters |
| Grep teal | `#22a58f` | Match highlight, query chip, cursor |

Vector amber `#e2703a` is reserved for the cosine and hills scenes. Do not
use it on the grep scan.

## Planned scenes

1. **Grep scan** (`grep_scan.py`). A cursor walks
   `the user said the meeting moved to 3pm on thursday` looking for `3pm`,
   highlights the match in grep teal, and stops. Labels only, no voiceover.
   Shipped as `public/clips/grep-scan.mp4`.
2. **Cosine embedding** (`cosine.py`). Query and candidate vectors, the
   angle between them, and `cos(θ) = (q · d) / (‖q‖ ‖d‖)` in `Text`. Live
   counterpart is the Mafs playground in section 01. Shipped as
   `public/clips/cosine.mp4`.
3. **Similarity hills** (`hills.py`). Height is similarity in a toy 2D
   slice of embedding space. The answer is a peak; distractor sessions add
   more peaks and can become the tallest. Live counterpart is the Three.js
   hills in section 01. Shipped as `public/clips/hills.mp4`.

Call scene 3 **similarity hills** or **similarity surface**. Never call it a
landscape.

After a render, copy the mp4 into `public/clips/` and extract a last-frame
poster with ffmpeg:

```
ffmpeg -y -sseof -0.15 -i public/clips/grep-scan.mp4 -frames:v 1 public/clips/grep-scan-poster.png
```

## Cosine render

```
python -m manim -ql manim/cosine.py CosineEmbed --media_dir manim/media
```

## Hills render

```
python -m manim -ql manim/hills.py SimilarityHills --media_dir manim/media
```
