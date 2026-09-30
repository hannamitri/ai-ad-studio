import Image from "next/image";

// People who started where the prospect is. Shown under the phone calculator
// (the gap beneath the card) and on the desktop payoff. See PRD §4 Screen 15.

const TESTIMONIALS: {
  name: string;
  since: string;
  deal: string;
  photo: string;
}[] = [
  {
    name: "Nick",
    since: "18 months in",
    deal: "$10k/mo base + 20% of sales",
    photo: "/people/nick.png",
  },
  {
    name: "Rhys",
    since: "6 months in",
    deal: "$6k/mo base + 20% of sales",
    photo: "/people/rhys.png",
  },
  {
    name: "Adam",
    since: "9 months in",
    deal: "$6k/mo base + a share on targets",
    photo: "/people/adam.png",
  },
];

export default function StarterQuotes() {
  return (
    <div className="w-full rounded-[var(--radius-card)] border border-border bg-card px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        People who started where you are
      </p>
      <ul className="mt-2 flex flex-col divide-y divide-border">
        {TESTIMONIALS.map((t) => (
          <li
            key={t.name}
            className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
          >
            <span className="relative size-10 shrink-0 overflow-hidden rounded-full bg-muted">
              <Image
                src={t.photo}
                alt=""
                fill
                sizes="40px"
                className="object-cover"
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                {t.name}
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · {t.since}
                </span>
              </p>
              <p className="text-sm leading-snug text-muted-foreground">{t.deal}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        The best part is, these roles come with a base level of pay, so
        you&apos;re never worried about your next paycheck.
      </p>
    </div>
  );
}
