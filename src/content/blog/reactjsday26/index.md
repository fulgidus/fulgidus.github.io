---
title: "Cheap Output, Expensive Judgment"
description: "Slides and write-up of my reactjsday 2026 talk: AI made output nearly free, but not judgment. What that does to the people doing the work, to the people receiving it, to our clients, and to the old dream of not needing skilled people."
image: ./cover.jpg
imageAlt: "Lewis Hine, Power house mechanic working on steam pump, 1920. Public domain."
imageSize: md
pubDate: 2026-11-23T19:00:00
tags:
  - made-with-ai
  - talks
  - reactjsday
  - generative-ai
  - ai-tools
  - burnout
  - code-review
  - professional-development
  - best-practices
draft: false
lang: en
redirect: ""
unlisted: false
video: false
---
This is the written version of the lightning talk I gave at **reactjsday 2026**. Five minutes, four problems, four things to try on Monday.

**[Open the slides full screen](/talks/reactjsday26/)**

<iframe src="/talks/reactjsday26/" title="Cheap Output, Expensive Judgment: slides" loading="lazy" style="width:100%;aspect-ratio:16/9;border:0;border-radius:8px;" allowfullscreen></iframe>

The whole talk fits in one sentence: **AI made output nearly free. It did not make judgment free.** Everything else follows from that.

## 1. AI burnout: we work more, not less

AI was sold as less work. What we got is more work, of a different kind. Writing turned into checking, and checking now happens on five threads at once, like the switchboard operators of the fifties.

One number is enough: according to the LeadDev Engineering Leadership Report 2026, **53% of senior engineers work longer hours than before AI**. A year earlier it was 28%. Research from UC Berkeley, BCG ("AI brain fry") and Oregon State University points the same way: more parallel streams, more context switching, more fatigue.

**What to do:** run fewer agents at once, and count review as real work, in estimates and in planning. If checking is the job, it has to show up on the board.

## 2. Slop: work that looks finished and isn't

Slop is output that looks done and isn't. Making it costs nothing. Checking it costs a lot. So the cost doesn't disappear: it moves to whoever receives it.

BetterUp Labs and the Stanford Social Media Lab put a number on it: **about two hours** lost for every piece of "workslop" received, to verify it, fix it or redo it. In open source the effect is even more visible: maintainers are closing contributions because they can't keep up with generated PRs and reports (Linux Foundation Research, October 2026).

**What to do:** the sender pays. *If you send it, you must be able to explain it.* Every line. Proof comes before review, not during it.

## 3. Effort stratification: give back the effort you were given

The third point is about clients, and about protecting yourself. Sort before you answer, like a mail room:

- **Slop**: eight pages of generated rambling that nobody read. Claude writes the reply.
- **Ask**: a real question from a real person. A person answers.
- **Risk**: a decision with consequences. It gets your full attention.

Your attention, and your mental health, are the scarce resource. And push back on "with AI it should be easy, why isn't it ready yet?". Generating was never the slow part. **"With AI it should be easy" is not a deadline.**

## 4. Deskilling: the job keeps its skill, the person can lose it

COBOL, low-code, now AI: every time the promise was "no more programmers". Every time the easy part got automated and the hard part stayed: knowing what to build, and checking that it's right. Lisanne Bainbridge described it in 1983 in *Ironies of Automation*: the more you automate, the more what's left for humans is the hard part.

But one risk is real. In an Anthropic test on learning a new library, **engineers who coded by hand scored 67% on the follow-up test; those who let AI write the code scored 50%**. Medicine shows the same pattern: endoscopists who got used to AI assistance performed worse once it was taken away (*The Lancet Gastroenterology & Hepatology*, 2025).

The job stays skilled. The person can lose the skill. **What to do:** practice without AI, on purpose. Juniors debug by hand first.

## For Monday

Output is cheap. Verification is the job.

1. **Cap the threads.** Limit parallel agents. Count review as work.
2. **Gate the slop.** The author explains every line. Proof before review.
3. **Match the effort.** Triage first. Slop gets slop. Attention goes to people.
4. **Keep the skill.** AI-off practice. Juniors debug by hand first.

The skill is what does the verifying. Protect it.

## Sources

- UC Berkeley researchers, eight-month study of 200 employees at a US tech company, February 2026
- BCG, "AI brain fry" survey of 1,488 workers, March 2026
- LeadDev, Engineering Leadership Report 2026
- Oregon State University, generative AI and burnout, 442 developers in 56 organizations, 2026
- BetterUp Labs and Stanford Social Media Lab, workslop survey of 1,150 US workers, Harvard Business Review, September 2025
- Linux Foundation Research, maintainer survey on AI slop, October 2026
- Anthropic, "How AI assistance impacts the formation of coding skills", January 2026
- Budzyń et al., endoscopist deskilling after AI exposure, *The Lancet Gastroenterology & Hepatology*, 2025
- Bainbridge, "Ironies of Automation", *Automatica*, 1983

Photographs in the slides are public domain, CC BY or without known copyright restrictions, credited on each slide, via Wikimedia Commons.
