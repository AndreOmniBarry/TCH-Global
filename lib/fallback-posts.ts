import type { Post } from './sanity';

// Seeded content so /blog works immediately, with no Sanity project
// required. Once NEXT_PUBLIC_SANITY_PROJECT_ID is set and real posts
// exist in the Studio, getAllPosts()/getPostBySlug() return real data
// and this file stops being used automatically.
export const fallbackPosts: Post[] = [
  {
    _id: 'fallback-walking-in-faith',
    title: "Walking in Faith When You Can't See the Way",
    slug: 'walking-in-faith',
    excerpt:
      "Faith was never meant to require full visibility. This week we look at what it means to take the next step when the whole path hasn't been shown to you yet.",
    category: 'Faith',
    publishedAt: '2026-09-27',
    readTime: '6 min read',
    coverImage: '/images/pastor-teaching.webp',
    authorName: 'Pastor Uzor Echiejile',
    authorImage: '/images/pastor-portrait.webp',
    body: `
      <p>There's a particular kind of fear that shows up not when we're lost, but when we can only see one step ahead. We tell ourselves that faith would be easier if God simply showed us the whole map — the job offer before we quit the old one, the healing before we stop treatment, the "yes" before we ask the question. But that has never been how faith works, and it was never meant to.</p>
      <p><span class="bible-ref" data-ref="Hebrews 11:1">Hebrews 11:1</span> gives us the clearest definition in Scripture: faith is the substance of things hoped for, the evidence of things not seen. Not things partially seen. Not things seen from a distance. Things <em>not seen</em>. If you could see it clearly, it wouldn't require faith to walk toward it — it would only require good eyesight.</p>
      <h2>The Illusion of the Full Map</h2>
      <p>We often imagine that spiritually mature people have somehow graduated out of uncertainty — that the further along you get, the more of the road ahead becomes visible. In practice, it's almost the opposite. The deeper the assignment, the less of it you tend to see in advance. Abraham left his country not knowing where he was going. David was anointed king years before he sat on a throne, and spent most of those years running for his life.</p>
      <blockquote class="pull-quote">Faith is not the absence of the unknown. It is trust that operates inside the unknown.</blockquote>
      <figure class="post-image"><img src="/images/gallery-4.webp" alt="TCH Global congregation in worship"><figcaption>The congregation in worship at TCH Global</figcaption></figure>
      <p>What made each of these figures faithful wasn't clarity — it was obedience to the next instruction, even when the instruction only covered a single step.</p>
      <h2>What This Looks Like Practically</h2>
      <p>If you're in a season right now where you genuinely do not know what's next, I want to relieve you of a pressure you may not even realize you're carrying: you are not failing at faith because you can't see the outcome.</p>
      <ul>
        <li><strong>Obey what you do know</strong>, even if it's small.</li>
        <li><strong>Resist the urge to manufacture clarity</strong> through anxiety or over-planning.</li>
        <li><strong>Remember your own history.</strong> If God has been faithful before, that's evidence he won't abandon you now.</li>
      </ul>
      <p><span class="bible-ref" data-ref="Romans 8:28">Romans 8:28</span> tells us that all things work together for good for those who love God. So this week, don't wait for the whole path to be lit before you take the next step. Take the step you can see.</p>
    `,
  },
  {
    _id: 'fallback-anchored-in-hope',
    title: 'Anchored in Hope: A Word for Weary Seasons',
    slug: 'anchored-in-hope',
    excerpt:
      "When the waiting feels longer than the promise, hope isn't a feeling to chase — it's an anchor to hold.",
    category: 'Hope',
    publishedAt: '2026-09-20',
    readTime: '5 min read',
    coverImage: '/images/gallery-3.webp',
    authorName: 'Pastor Uzor Echiejile',
    authorImage: '/images/pastor-portrait.webp',
    body: `
      <p>Somewhere between the promise and its fulfillment, there is almost always a long stretch of ordinary days where nothing appears to be moving. This is where most people lose hope.</p>
      <p><span class="bible-ref" data-ref="Hebrews 6:19">Hebrews 6:19</span> describes hope as an anchor for the soul — sure and steadfast. An anchor doesn't move the ship forward. It holds a vessel in place so the current doesn't carry it somewhere it was never meant to go.</p>
      <h2>Hope Is Not a Mood</h2>
      <p>We tend to treat hope like an emotion. But Scripture never presents it that way. Hope is a settled confidence in who God is, independent of how circumstances currently look.</p>
      <blockquote class="pull-quote">An anchor doesn't need the storm to stop working. It was built for the storm.</blockquote>
      <h2>What Weariness Actually Signals</h2>
      <p><span class="bible-ref" data-ref="Galatians 6:9">Galatians 6:9</span> tells us not to grow weary in doing good, for in due season we shall reap if we do not give up. The verse assumes weariness will come — it promises that giving up is the only thing that forfeits the harvest.</p>
      <ul>
        <li><strong>Say the promise out loud</strong>, even when it feels far away.</li>
        <li><strong>Find your people.</strong> Isolation makes every season feel longer.</li>
        <li><strong>Mark the small movements.</strong> Seasons rarely change all at once.</li>
      </ul>
      <p>Your hope was never meant to depend on how the season feels. It was built to hold regardless. Hold on.</p>
    `,
  },
  {
    _id: 'fallback-the-comforters-house',
    title: "The Comforter's House: Why We Gather",
    slug: 'the-comforters-house',
    excerpt:
      "TCH Global didn't start as a building. It started as a promise — that no one would carry their burden alone.",
    category: 'Community',
    publishedAt: '2026-09-13',
    readTime: '7 min read',
    coverImage: '/images/gallery-6.webp',
    authorName: 'Pastor Uzor Echiejile',
    authorImage: '/images/pastor-portrait.webp',
    body: `
      <p>Every name carries an intention, and ours is not an accident. We are The Comforter's House — comfort was chosen deliberately, because comfort is what most people are actually looking for when they walk through a church door for the first time.</p>
      <p><span class="bible-ref" data-ref="John 14:26">John 14:26</span> calls the Holy Spirit "the Comforter" — one who comes alongside, who sits with you in what you're carrying.</p>
      <h2>What Comfort Is Not</h2>
      <p>Comfort, biblically, is not the absence of challenge — it's the presence of someone who won't leave while you face it.</p>
      <blockquote class="pull-quote">A house of comfort is not a house without struggle. It is a house where no one struggles alone.</blockquote>
      <p><span class="bible-ref" data-ref="2 Corinthians 1:3-4">2 Corinthians 1:3-4</span> tells us God comforts us in all our troubles, so we can comfort others with the same comfort we ourselves received.</p>
      <h2>Why Gathering Still Matters</h2>
      <p>Comfort is very hard to receive at a distance. A hand on your shoulder, a prayer said over you by someone who knows your name — that requires proximity. It requires gathering.</p>
      <p>If you're reading this and you've never been part of a church family: you are welcome here. Not welcome once you've cleaned yourself up. Welcome now, as you are.</p>
    `,
  },
  {
    _id: 'fallback-grace-for-today',
    title: 'Grace for Today: Letting Go of Yesterday',
    slug: 'grace-for-today',
    excerpt:
      'Yesterday\'s failure is not today\'s assignment. A short study on why grace only ever arrives dated "today."',
    category: 'Grace',
    publishedAt: '2026-09-06',
    readTime: '5 min read',
    coverImage: '/images/gallery-1.webp',
    authorName: 'Pastor Uzor Echiejile',
    authorImage: '/images/pastor-portrait.webp',
    body: `
      <p>One of the more quietly devastating habits many believers carry is treating today as if it still owes a debt to yesterday.</p>
      <p>Lamentations 3:22-23 tells us the Lord's compassions fail not, and are new every morning. <span class="bible-ref" data-ref="Lamentations 3:23">Lamentations 3:23</span> ends with "great is thy faithfulness" — the newness of God's mercy each day isn't inconsistency. It's faithfulness.</p>
      <h2>Why We Resist Receiving It</h2>
      <p>If grace is this freely available, why do so many of us still walk around carrying weight we were never asked to carry? Usually because receiving grace too easily feels like cheating.</p>
      <blockquote class="pull-quote">Grace was never slow to arrive. We were simply slow to stop paying for what had already been settled.</blockquote>
      <p><span class="bible-ref" data-ref="2 Corinthians 5:17">2 Corinthians 5:17</span> says if anyone is in Christ, they are a new creation — old things have passed away.</p>
      <h2>What This Looks Like This Week</h2>
      <ul>
        <li><strong>Stop rehearsing the failure</strong> as if it's still active.</li>
        <li><strong>Refuse the comparison trap.</strong> Grace isn't measured by how far you fell.</li>
        <li><strong>Let today be its own day.</strong></li>
      </ul>
      <p>Grace arrived fresh this morning, dated today, with your name already on it. Receive it as such.</p>
    `,
  },
];

export function getFallbackPostBySlug(slug: string): Post | undefined {
  return fallbackPosts.find((p) => p.slug === slug);
}
