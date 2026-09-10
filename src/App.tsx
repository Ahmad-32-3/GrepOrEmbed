import { lazy, Suspense } from 'react'
import { Hero } from './components/Hero'
import { Section } from './components/Section'
import { GrepScanDemo } from './components/GrepScanDemo'
import { CosineVectorPlayground } from './components/visuals/CosineVectorPlayground'
import { MechanismClip } from './components/visuals/MechanismClip'
import { Heatmap } from './components/charts/Heatmap'
import { Dumbbell } from './components/charts/Dumbbell'
import { NoiseChart } from './components/charts/NoiseChart'
import { CategoryBars } from './components/charts/CategoryBars'
import { DciTiles } from './components/charts/DciTiles'
import { Playground } from './components/playground/Playground'
import sources from './data/sources.json'
import './app.css'

const CLIP_BASE = `${import.meta.env.BASE_URL}clips/`

const SimilarityHills = lazy(() =>
  import('./components/SimilarityHills').then((m) => ({ default: m.SimilarityHills })),
)

const TAKEAWAYS = [
  'Test your retriever inside the agent loop you plan to ship. For Claude Opus 4.6 the wrapper swung 16.4 points, larger than switching retrievers on that pair (9.5). Two other models on this page swing more on the retriever than on the wrapper.',
  'For small or medium corpora where the query is an exact string, like an identifier or a date, give grep a trial before reaching for a vector database.',
  'Watch how results get delivered to the model. Inline versus file changed the ranking in half the pairs tested here.',
  'Embeddings are still the right call for plenty of corpora. Test both on your own before you pick.',
]

function App() {
  return (
    <div className="page">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>

      <nav className="page-nav mono" aria-label="Primary">
        <span className="page-nav-mark"><b>GrepOrEmbed</b></span>
        <a href="#how-it-works">How it works</a>
        <a href="#comparison">Comparison</a>
        <a href="#finding">The finding</a>
        <a href="#stress-test">Under stress</a>
        <a href="#playground">Try it</a>
        <a href="#zoom-out">Zoom out</a>
        <a href="#honesty">The other side</a>
        <a href="#takeaways">Takeaways</a>
      </nav>

      <main id="main">
        <Hero />

        <Section id="how-it-works" kicker="01 / How it works" title="Before the numbers">
          <p>
            Grep looks for the exact words. An embedding turns a sentence into a point in space
            and looks for the nearest ones. Both work on their own. The trouble starts when the
            space around the answer gets crowded with near matches that sit almost as close.
            That crowding is the whole story behind the noise results further down this page.
          </p>
          <div className="mechanism-row">
            <MechanismClip
              src={`${CLIP_BASE}grep-scan.mp4`}
              poster={`${CLIP_BASE}grep-scan-poster.png`}
              captionsSrc={`${CLIP_BASE}grep-scan.vtt`}
              title="Grep scan"
              description="A cursor scans a sentence left to right and stops when it finds 3pm."
              caption="Grep walks the haystack character by character and stops on an exact match. The live card below is the same scan, and Replay shows a miss."
            />
            <MechanismClip
              src={`${CLIP_BASE}cosine.mp4`}
              poster={`${CLIP_BASE}cosine-poster.png`}
              captionsSrc={`${CLIP_BASE}cosine.vtt`}
              title="Cosine"
              description="A query vector rotates toward a candidate while cosine similarity rises toward 1."
              caption="Ranking follows the angle between vectors. Drag the query on the live card below to change that angle yourself."
            />
          </div>
          <div className="mechanism-row">
            <GrepScanDemo />
            <CosineVectorPlayground />
          </div>
          <p className="chart-caption mono" style={{ marginTop: 'var(--space-4)' }}>
            The clips are pre-rendered Manim scenes. The cards under them are live: grep on
            the left, a Mafs cosine plane on the right. The hills below show how extra sessions
            crowd that ranking.
          </p>
          <MechanismClip
            src={`${CLIP_BASE}hills.mp4`}
            poster={`${CLIP_BASE}hills-poster.png`}
            captionsSrc={`${CLIP_BASE}hills.vtt`}
            title="Similarity hills"
            description="A side view of similarity hills. Distractors grow in until a near match is taller than the answer."
            caption="A side view of the same peaks. White is the answer. Amber is a distractor. The live surface below is the 3D version you can rotate and add noise to."
          />
          <Suspense fallback={<p className="chart-caption">Loading the similarity surface.</p>}>
            <SimilarityHills />
          </Suspense>
        </Section>

        <Section id="comparison" kicker="02 / The data" title="Grep vs. vector, across every harness">
          <p>
            Ten harness and model pairs, two retrieval methods, run the same way on the same
            questions. Teal means grep won that cell. Amber means vector won it. Left column is
            inline delivery. Right column is file delivery. Both columns share one color scale, so
            a +12.9 file cell is paler than a +23.3 inline cell.
          </p>
          <Heatmap />
        </Section>

        <Section id="finding" kicker="03 / The real finding" title="The wrapper can swing as much as the retriever">
          <p>
            Same backbone, same retriever. Two harnesses: Claude Opus 4.6 scores 93.1 under
            Chronos and 76.7 under Claude Code. That's a 16.4 point swing from the harness alone,
            larger than switching from grep to vector search on that pair (9.5 points). Two other
            models on this page swing more on the retriever than on the wrapper. In the chart
            below, harness swing is the gap in inline grep accuracy between a model's two
            harnesses, and retriever swing is that model's larger inline gap between grep and
            vector.
          </p>
          <Dumbbell />
        </Section>

        <Section id="stress-test" kicker="04 / Under stress" title="Does it hold up as noise increases?">
          <p>
            The paper reran the same questions with more unrelated sessions mixed into the
            context, from five sessions up to the full haystack. Grep stays within half a point
            of its five-session score at the full haystack in six of the nine harness pairs.
            Vector search drops in six of the nine, by up to 7.7 points, as near matches crowd
            the results and push the real answer down the list. Two Gemini CLI pairs move the
            other way.
          </p>
          <NoiseChart />
          <div className="category-block">
            <h3 className="category-heading">Where the questions get hard</h3>
            <p>
              Chronos harness, grep only, full haystack. Multi-Session is the lowest category
              for four of the five models. GPT-5.4&rsquo;s soft spot is Temporal-Reasoning at
              67.7.
            </p>
            <CategoryBars />
          </div>
        </Section>

        <Section id="playground" kicker="05 / Try it yourself" title="Run the search yourself">
          <p>
            Pick a question built in the shape of the paper's benchmark. Grep and an embedding
            model, both running in your browser, search the same transcript. Watch which one
            finds the answer and how long each one takes.
          </p>
          <Playground />
          <div className="honesty-note">
            The paper's numbers come from a full agent loop that decides when to search and when
            to stop across many turns. What runs here is the retrieval step on its own, one query
            at a time.
          </div>
        </Section>

        <Section id="zoom-out" kicker="06 / Zoom out" title="Another paper, same pattern">
          <p>
            A second May 2026 paper, &ldquo;Beyond Semantic Similarity&rdquo; (arXiv:2605.05242),
            tested agents with direct command line access against similarity search, on different
            benchmarks entirely. Direct access won there too. BrowseComp-Plus was 80 percent versus
            roughly 70. Multi-hop QA was 83 versus 52.3, at lower cost. The abstract reports
            that the approach starts to degrade somewhere past 200,000 documents, well above the
            116-question benchmark in the first paper.
          </p>
          <DciTiles />
        </Section>

        <Section id="honesty" kicker="07 / The other side" title="Where vector search still wins">
          <p>
            Vector search comes out ahead in 5 of the 10 harness and model pairs once results are
            delivered as files instead of inline text. Claude Opus 4.6 loses the file column under
            both of its harnesses, and GPT-5.4 loses it under Codex CLI. Both Gemini CLI pairs
            lose it as well. Look at the file column in section 02. Those cells are amber. Grep
            wins under the conditions tested here, and the paper claims nothing past that.
            Switching from inline to file flipped the winner in half the pairs tested here.
          </p>
        </Section>

        <Section id="takeaways" kicker="08 / Takeaways" title="What this means if you are building">
          <ol className="takeaway-list">
            {TAKEAWAYS.map((t, i) => (
              <li key={t} data-index={`0${i + 1}`}>
                {t}
              </li>
            ))}
          </ol>
        </Section>
      </main>

      <footer className="page-footer">
        <h2 className="page-footer-heading">How the numbers were built</h2>
        <p className="page-footer-body">
          Every number in the charts is computed in your browser from the JSON files in src/data.
          Those files were transcribed by hand from the arXiv HTML tables of &ldquo;Is Grep All You
          Need?&rdquo; (arXiv:2605.15184) and rechecked against the source on 2026-08-17.
        </p>
        <p className="page-footer-body">
          The five zoom-out tiles sit on weaker ground: the second paper (arXiv:2605.05242) gives
          those figures in its abstract, so I could not check them against a numbered table the way
          I checked the first paper&rsquo;s.
        </p>
        <p className="page-footer-body">
          The playground questions and transcripts were written for this demo to match the shape of
          a LongMemEval instance. None of them are copied from the benchmark itself. Grep there is
          a case-insensitive literal or regex scan over that text, and vector search embeds the
          same text with all-MiniLM-L6-v2 and ranks by cosine similarity, both in your browser.
          Both cover the retrieval step alone. A full Chronos or Claude Code run wraps that step in
          an agent loop that decides when to search again and when to stop, and this page
          reproduces none of that loop.
        </p>
        <p className="page-footer-verified mono">Data last verified 2026-08-17.</p>
        <ul className="page-footer-sources">
          {sources.map((s) => (
            <li key={s.id}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </footer>
    </div>
  )
}

export default App
