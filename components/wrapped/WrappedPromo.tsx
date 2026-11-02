'use client';

import { useMember } from '@/components/members/useMember';

// Days until the yearly story (15 December, Lagos). After it, point at next year.
function daysLeft(now = new Date()) {
  const y = now.getUTCFullYear();
  let drop = Date.UTC(y, 11, 15, 7); // 08:00 WAT
  if (+now > drop + 86400000 * 16) drop = Date.UTC(y + 1, 11, 15, 7);
  return Math.max(0, Math.ceil((drop - +now) / 86400000));
}

const BARS = [2, 3, 1, 4, 3, 4, 2, 3, 4, 4, 3, 2, 4, 3];

/** Home-page banner selling "My Year in the Word": the reason to sign up. */
export default function WrappedPromo() {
  const { member } = useMember();
  const d = daysLeft();
  const live = d === 0;
  return (
    <section className="wp pop-stage" aria-labelledby="wp-title">
      <div className="container">
        <div className="wp-card pop">
          <div className="wp-copy">
            <span className="wp-kicker">{live ? 'Out now' : `${d} ${d === 1 ? 'day' : 'days'} to 15 December`}</span>
            <h2 id="wp-title">My Year in&nbsp;the&nbsp;Word</h2>
            {member ? (
              <>
                <p>Your story is building, {member.name.split(' ')[0]}. Every message, post and prayer you take part in while signed in counts{member.kids?.length ? ', and so do your children’s stars' : ''}.</p>
                <div className="wp-actions"><a className="wp-cta" href="/wrapped">See my story so far</a></div>
              </>
            ) : (
              <>
                <p>Your own private story of the year: minutes in the Word, your top messages, your streak, your listening personality, and a word from Pastor Uzor. Only signed-in listening counts, so start now.</p>
                <div className="wp-actions">
                  <a className="wp-cta" href="/account?mode=signup&next=/wrapped">Start my Year in the Word</a>
                  <a className="wp-ghost" href="/wrapped/demo">See a demo</a>
                </div>
              </>
            )}
          </div>
          <div className="wp-art" aria-hidden="true">
            <div className="wp-phone">
              <span className="wp-p-k">TCH Global</span>
              <b className="wp-p-n">2,346</b>
              <span className="wp-p-u">minutes in the Word</span>
              <div className="wp-bars">{BARS.map((v, i) => <i key={i} style={{ height: `${v * 22}%`, animationDelay: `${i * 60}ms` }} />)}</div>
              <span className="wp-p-c">The Early Riser</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
