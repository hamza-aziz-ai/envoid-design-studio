# Documentation

Written so that any customer-facing part of this site can be explained and defended without reading the code first. Nothing here is published: `tools/stage.sh` strips `docs/` out of the deployed directory, and a documentation-only push skips the pipeline entirely.

## Start here

| If you are... | Read |
| --- | --- |
| Picking this project up cold | [HANDOVER](HANDOVER.md), then [ARCHITECTURE](ARCHITECTURE.md) |
| About to change something | [CONSTRAINTS](CONSTRAINTS.md), then [FLOW](FLOW.md) |
| About to ship something | [TESTING](TESTING.md), then the [pre-ship gate](#pre-ship-gate) |
| Asked to explain the system | [defense/envoid-design-studio](defense/envoid-design-studio.md) |
| Fixing something that broke | [FAILURE](FAILURE.md), then [ROLLBACK](ROLLBACK.md) |

## The files

| File | Answers |
| --- | --- |
| [HANDOVER](HANDOVER.md) | Where things stand right now |
| [ARCHITECTURE](ARCHITECTURE.md) | What the modules are and where the trust boundaries sit |
| [FLOW](FLOW.md) | How execution actually travels, call by call |
| [DATA](DATA.md) | Which structures exist and what each trade-off buys |
| [CONSTRAINTS](CONSTRAINTS.md) | What must never happen, and what needs asking first |
| [THREAT](THREAT.md) | Who could abuse this and what stops them |
| [FAILURE](FAILURE.md) | Where it breaks, and how anyone would notice |
| [TESTING](TESTING.md) | What to run, and what a pass looks like |
| [ROLLBACK](ROLLBACK.md) | The way back out, including DNS and Pages settings |
| [DECISIONS](DECISIONS.md) | Why X instead of Y, dated, with the model that reasoned it |
| [ALTERNATIVES](ALTERNATIVES.md) | What was rejected and the condition that would change the answer |
| [ASSUMPTIONS](ASSUMPTIONS.md) | What is believed but not proven |
| [DEPENDENCIES](DEPENDENCIES.md) | Every third party, why it is here, and what it can see |
| [email-templates/](email-templates/) | The two EmailJS emails, their dashboard settings and the client quirks they work around |
| [defense/](defense/) | One brief per shipped system, in plain words |
| [features/](features/), [bugs/](bugs/) | One file per feature or bug, traced from start to verification |

## Pre-ship gate

Run this before anything customer-facing goes live. A box that cannot be ticked honestly means it is not ready.

- [ ] I can explain how this works at a high level, without notes.
- [ ] The defense brief is in my own words and current.
- [ ] I know why this approach was chosen over at least one alternative.
- [ ] I can name who could abuse it and what stops them.
- [ ] I know the first place it will fail and how I would notice.
- [ ] I know the main data structures and why they fit.
- [ ] I read the full diff, not a summary of it.
- [ ] The checks ran and I saw the real output.
- [ ] A customer path was tried by hand, end to end.
- [ ] No secrets, keys or tokens landed in the code.
- [ ] New dependencies are justified and logged.
- [ ] Rollback steps are written and the last good commit is known.
- [ ] Unverified assumptions are cleared or consciously accepted.
- [ ] HANDOVER and DECISIONS are updated.

## Keeping it honest

Documentation that is not maintained is worse than none, because it is believed. Two rules keep this set from rotting:

- **Update [HANDOVER](HANDOVER.md) at the end of every session**, even a short one. Five lines: done, in progress, broken, next, do not touch.
- **Write the [DECISIONS](DECISIONS.md) entry before making the change**, not after. An entry written afterwards is a justification; one written before is a decision.
