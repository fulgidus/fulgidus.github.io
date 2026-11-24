---
title: "Cheap Output, Expensive Judgment"
description: "Slides and write-up of my reactjsday 2026 talk: AI made output nearly free, but not judgment. What that does to the people doing the work, to the people receiving it, to our clients, and to the old dream of not needing skilled people."
image: ./cover.jpg
imageAlt: "Title slide of the talk Cheap Output, Expensive Judgment, with Lewis Hine's 1920 photo of a power house mechanic working on a steam pump"
imageSize: md
pubDate: 2026-11-19T19:00:00
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
slides:
  src: /talks/reactjsday26/
  byHeading: [2, 3, 4, 5, 6, 7]
---
This is the written version of the lightning talk I gave at **reactjsday 2026**. Five minutes on stage, and a deck I put together on a split-second decision that same day. So no, it wasn't the best presentation you'll see this year. It's mostly made of my recent observations and opinions, and me being the person I am, you probably won't agree with all of it. That's fine: come and argue with me.

**[Open the slides full screen](/talks/reactjsday26/)**

<iframe src="/talks/reactjsday26/" title="Cheap Output, Expensive Judgment: slides" loading="lazy" style="width:100%;aspect-ratio:16/9;border:0;border-radius:8px;" allowfullscreen></iframe>

We are always talking about AI and the unimaginable advantages we're going to get out of it. And we keep forgetting that the center of the whole process is still us. People. And people have limitations. Not as many as AI, but close.

I'm not anti-AI. I just want to sensitize you about a mindset that is being created and encouraged in companies right now, and about how to react to it.

## Cap the threads: "you'll work less" is a hoax

AI was sold as less work. It has been proven, by more than a few studies, that people work **more**, not less. More than half of senior engineers now work longer hours than before AI; a year earlier it was 28%. Writing became checking, and checking now happens on five threads at once.

This is one of the biggest hoaxes of the decade. So when someone promises you that you'll work less, you can just say no. If you ask me, I'll give you the data.

What to do: don't split your attention too much. Fewer agents in parallel, and review counts as real work.

## Gate the slop: it costs more than its author thinks

Slop is mostly what gets thrown our way. It's expensive to review, fix and manage, way more expensive than the people who produce it realize. Each piece costs the person receiving it about two hours.

The typical case: non-technical people produce pseudo-technical solutions, throw them your way and expect them to scale and perform as advertised. They don't. Not even close.

What to do: the cost goes back to the sender. If you send it, you must be able to explain it, every line.

## Match the effort: slop gets slop

This one is very close to me.

There has always been a feud between middle management and technical folks. Managers wonder why they have to deal with us and our quirks; technical people usually think they could do the manager's job better. It's a long war.

But now enter the client, and the client is not on our side. They'll throw long documents in your face, produced with little effort, and demand your attention to every detail. And they expect things to work the way the AI promised them.

That's why you should **triage every communication you receive**, from management and from clients, if you have the unfortunate fate of having to deal with them:

- **Slop gets slop.** If you throw 80 pages of pure experiment my way, I'll use the same tool to deal with you. That's my god-given right to self-defense.
- **A real question gets a real answer.** If a real person has a real, or at least justified, worry or question, then you start addressing it, with the bare minimum of CPU you can spare.
- **Consequences get you.** When the stakes are real, it's a cost-benefit calculation. Nothing new: you can handle that yourself.

The point is: triage first. And treat these behaviors for what they are, involuntary but malicious, because they will erode your mental health, your ability to stay concentrated, and your ability to stay technically relevant in your role. "With AI it should be easy" is not a deadline.

## Keep the skill: they pay for your judgment

None of this is new. The race to deskill the worker began a long time ago. The problem for them is that the job is still built on the skill.

They are not paying for lines of code (whoever has seen that metric knows). They are paying for your judgment: for how many slaps in the face you've taken from production on a Friday evening over your career, and how many lessons you've learned the hard way.

So keep training, on your own time. In an Anthropic study, people who coded by hand scored **67%** when tested; people who routinely let AI do it scored **50%**. In a short time span. It's very important that you stay trained.

## For Monday

Output is cheap. Judgment is expensive. Four things:

1. **Cap the threads.** Don't split your attention too much.
2. **Gate the slop.** The author explains every line.
3. **Match the effort.** Triage first. Slop gets slop.
4. **Keep the skill.** Practice without AI.

And good luck. It's not going to be pleasant. For me it hasn't been, lately. If you have more practical needs or questions, write to me: I'll give you my two cents.

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
