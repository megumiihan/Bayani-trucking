# Study Plan: Learning to Read and Write the Code in This Project

## The diagnosis

You understand architecture (what calls what, where data comes from) because you've been
*reviewing* code. You don't understand syntax because reading code and writing code are
different skills, and so far you have only been doing the first one.

Reading gives you **recognition** ("yes, that looks right"). Writing from scratch requires
**recall** ("what were the characters again?"). Accepting a suggestion feels like learning
but produces almost no recall. This plan is built to force recall.

The good news is that the syntax surface of this project is small. A scan of `app/`,
`components/`, `lib/`, and `context/` found roughly fifteen constructs doing nearly all the
work. Learn those fifteen and you can read every file here.

---

## Part 1: The syntax inventory

These are the actual constructs in your codebase, with real lines from your files. This is
your vocabulary list. Everything else is a combination of these.

### 1. Union types — "the set of allowed values"

This is your `RoleContext` question. In `context/RoleContext.tsx`:

```ts
export type ViewRole = "employee" | "admin";
```

Read it right to left. `"employee" | "admin"` is a type made of two exact strings, joined by
`|` meaning "or". `type ViewRole =` gives that type a name. `export` lets other files import
it.

The key idea that trips up most beginners: in TypeScript, **a specific string can be a type**.
`"employee"` here is not a value, it's a type whose only permitted value is the text
`employee`. So `ViewRole` means "a string that is exactly `employee` or exactly `admin`, and
nothing else." That is how the roles set gets defined — there is no list, no array, no enum.
The set *is* the type.

This is why `role !== "admin"` in `AdminEmployeesOverview.tsx` is safe: TypeScript knows the
only other option is `"employee"`.

You have 9 of these in the project. Also in `lib/mockData.ts` (`EmployeeRole`, tenure status).

### 2. `interface` — the shape of an object

```ts
interface BadgeProps {
  label: string;
  className?: string;
}
```

`label: string` means required. `className?: string` — the `?` means optional. You have 28
interfaces and 41 optional properties.

### 3. Function types

In `RoleContext.tsx`:

```ts
login: (role: ViewRole) => void;
```

This describes a function without writing one: "takes a `ViewRole`, returns nothing."
`void` means no return value. Compare with `AdminEmployeesOverview.tsx`:

```ts
onSaveRemarks: (remarks: string) => Promise<UpdateEmployeeRemarksResult>;
```

Same shape, but returns a Promise (an async result).

### 4. Arrow functions

```ts
const handleSave = async () => { ... };
```

`=>` appears 186 times in your project. `(a, b) => a + b` is shorthand for a function. With
braces `{}` you need an explicit `return`; without braces the expression is returned
automatically. That is why this works in `AdminEmployeesOverview.tsx`:

```ts
const sortedEmployees = useMemo(() => [...employees].sort(...), [employees]);
```

No `return` keyword, because there are no braces.

### 5. Destructuring

```tsx
export default function AdminEmployeesOverview({
  initialEmployees,
  initialShipments,
}: AdminEmployeesOverviewProps) {
```

The `{ }` on the left of `:` pulls named fields out of a single object argument. The part
after `:` is the type of that whole object. Also used on state:

```ts
const [employees, setEmployees] = useState(initialEmployees);
```

`useState` returns an array of two things; `[a, b]` names them positionally. The names are
yours to choose — `setEmployees` is a convention, not a rule.

Default values go inline: `accent = false` in `StatPill`, `className = "bg-gray-100..."` in
`Badge`.

### 6. Spread `...`

```ts
[...employees].sort(...)
```

Makes a copy of the array before sorting, because `.sort()` mutates in place and React state
must never be mutated. 30 uses in the project. This one is a *correctness* idiom, not just
syntax.

### 7. Generics `<T>`

```ts
const RoleContext = createContext<RoleContextValue | null>(null);
const [saveError, setSaveError] = useState<string | null>(null);
```

The `<...>` tells a reusable function what type it's working with this time. You need it when
TypeScript can't infer from the argument — `useState(null)` alone would infer "always null",
so you spell out `<string | null>`.

### 8. Nullish coalescing `??` and optional chaining `?.`

```ts
remarks: record.remarks ?? "",
```

"Use `record.remarks`, but if it's `null` or `undefined`, use `""`." 37 uses of `??`, 18 of
`?.` (which means "read this property only if the thing isn't null").

### 9. Ternary `? :`

```tsx
position: role === "Driver" ? "Delivery Driver" : "Cargo Handler",
{isSaving ? "Saving…" : "Save Remarks"}
```

`condition ? valueIfTrue : valueIfFalse`. An `if` statement that produces a value. 40 uses.
You need it inside JSX because you can't put an `if` statement there.

### 10. Conditional rendering with `&&`

```tsx
{saveError && <p className="...">{saveError}</p>}
```

"If `saveError` is truthy, render the paragraph." Used when there's no else branch.

### 11. Array methods: `.map`, `.filter`, `.reduce`

51 `.map`, 19 `.filter`, 5 `.reduce`. `.map` is the most important — it transforms every item
and is how lists get rendered:

```ts
return records.map(mapEmployeeToUi);   // lib/queries/employees.ts
```

```tsx
{sortedEmployees.map((employee) => { ... return <EmployeeCard key={employee.id} ... /> })}
```

Same method, two contexts. Note `key={employee.id}` — React requires it on mapped elements.

Chained in `AdminEmployeesOverview.tsx` to build initials:

```ts
employee.name.split(" ").map((part) => part[0]).slice(0, 2).join("")
```

### 12. `async` / `await`

16 `async function`, 30 `await`. `await` pauses until a Promise resolves; it's only legal
inside an `async` function.

```ts
const result = await updateEmployeeRemarks(id, remarks);
```

### 13. Template literals

```tsx
href={`/admin/employees/${employee.id}`}
className={`... ${accent ? "text-green-700" : "text-gray-900"}`}
```

Backticks, with `${}` for interpolation. Note the second one nests a ternary inside.

### 14. Imports

```ts
import Badge from "@/components/ui/Badge";              // default export
import { useEffect, useMemo, useState } from "react";   // named exports
import type { Employee } from "@/lib/mockData";         // types only, erased at build
```

Three forms. `@/` is an alias for the project root, configured in `tsconfig.json`.

### 15. State updater functions

```ts
setEmployees((current) => current.map((entry) => (entry.id === id ? result.employee : entry)));
```

Passing a function to a setter gives you the current value safely. Worth studying closely —
it combines a callback, `.map`, and a ternary in one line, which is exactly the kind of
density that makes code feel unreadable until you can decompose it.

### Advanced (don't worry about these yet)

```ts
type UpdateEmployeeRemarksResult = Awaited<ReturnType<typeof updateEmployeeRemarks>>;
```

Type-level programming: "whatever `updateEmployeeRemarks` returns, unwrapped from its
Promise." Useful, but skip it until Week 5.

---

## Part 2: Change how you use Cursor

The tool isn't the problem, but your current mode of using it optimizes for shipping, not
learning. Adopt these rules.

**Rule 1 — Separate learning sessions from shipping sessions.**
Decide before you start which one you're in. Shipping sessions: use Agent freely, your
business needs the features. Learning sessions: the rules below apply. Aim for roughly
2 learning sessions a week, 45 minutes each. That's enough.

**Rule 2 — In learning sessions, never accept code you can't narrate.**
Before pressing Tab or accepting a diff, say out loud what each line does. If you stall on a
line, that's the lesson. Ask about it before accepting.

**Rule 3 — Use Ask mode for explanations, not Agent mode.**
Ask mode is read-only, so it can't "helpfully" fix the thing you were about to learn. Use
`@filename` to point it at a file. Good prompts:

- "Explain line 34-41 of @AdminEmployeesOverview.tsx token by token. Don't summarize what it
  achieves, tell me what each symbol means."
- "Why `useMemo` here instead of a plain `const`? What breaks without it?"
- "Rewrite this line in the most verbose, beginner-friendly way possible, then show me the
  steps that compress it back to the original."

That last prompt is the highest-value one you can ask. Use it constantly.

**Rule 4 — Type it yourself, then compare.**
The core drill. Described in Part 3.

**Rule 5 — Use Tab completion as a quiz, not an oracle.**
Start typing a line you intend to write. When the grey suggestion appears, *predict what it
will say before you look*. If you predicted right, you knew it. If not, you just found a gap.

**Rule 6 — Make Cursor teach in your style.**
Already set up: `.cursor/rules/tutor.mdc` tells Cursor to explain syntax token by token and
to assume you know what the code accomplishes but not what the symbols mean. It's scoped to
learning questions, so it stays out of the way during shipping sessions. You never have to
re-type that framing.

**Rule 7 — Keep an error journal.**
When something breaks, write down the error message, your guess at the cause, and the actual
cause, before you ask for a fix. Three lines. This is where the deepest learning is, and it's
the thing people skip most.

---

## Part 3: The three core drills

### Drill A — Blank page reconstruction (the main one, do it weekly)

1. Pick a small file. Start with `components/ui/Badge.tsx` (14 lines).
2. Read it until you believe you understand every character.
3. Close it. Open a scratch file. Retype it from memory. **Turn Tab completion off** — Cursor's
   settings have a toggle, or work in a scratch file outside the project.
4. Diff yours against the original.
5. Every difference is a precise, personal to-do item. Look up only those.

Progression: `Badge.tsx` → `PageHeader.tsx` → `lib/mappers/employee.ts` →
`lib/queries/employees.ts` → `StatPill` in `AdminEmployeesOverview.tsx` → `EmployeeCard` →
`context/RoleContext.tsx`.

You will fail badly the first two times. That's the drill working. Recall failure is what
builds recall.

### Drill B — Explain it back

Pick a file. Write a comment above each line explaining it in your own words. Then ask Cursor
in Ask mode: "Check my comments in this file for accuracy. Which are wrong or vague?"

This catches false confidence, which is the main risk when learning by reading. Delete the
comments afterward — don't commit them.

### Drill C — Deliberate small features

Build something tiny with Agent mode turned **off**. Use only Tab and Cmd+K on single lines.
It'll take 4x longer. That's the price of recall.

Candidate features in your project, in increasing difficulty:

1. Add a `phone` field to the employee card display (uses: optional property, `??`, JSX).
2. Add a "Driver / Helper / All" filter to the employees overview (uses: union type,
   `useState`, `.filter`, ternary).
3. Sort the employee grid by total payout instead of name (uses: `.sort`, spread, `useMemo`).
4. Add a "clear remarks" button that resets state (uses: event handler, state updater).
5. Add a new `tenureStatus` value end to end — type, colors map, seed data, UI (uses: union
   types, Prisma schema, mappers; touches every layer).

---

## Part 4: Six-week schedule

Two 45-minute learning sessions per week. Ship features separately, however you like.

| Week | Syntax focus | Drill A file | Build (Agent off) |
|---|---|---|---|
| 1 | Imports, interfaces, union types, optional props | `Badge.tsx`, `PageHeader.tsx` | Feature 1 |
| 2 | Arrow functions, destructuring, defaults, template literals | `lib/mappers/employee.ts` | Feature 1 finish |
| 3 | `.map` / `.filter` / `.sort`, spread, `key` | `lib/queries/employees.ts` | Feature 2 |
| 4 | `useState`, `useEffect`, generics, updater functions | `StatPill`, then `EmployeeCard` | Feature 3 + 4 |
| 5 | `async` / `await`, Promises, server actions, `??` and `?.` | `lib/actions/employee.ts` | Read `lib/actions/shipment.ts` closely |
| 6 | Context: `createContext`, provider, custom hook | `context/RoleContext.tsx` | Feature 5 |

Week 6 is the payoff: by then `RoleContext.tsx` will be assembled entirely from constructs
you already drilled, and it should read as ordinary rather than cryptic.

---

## Part 5: Checking progress

You're on track when you can do these without help:

- **Week 2:** Write an interface for an object you invent, with one optional field, and a
  union type with three options.
- **Week 3:** Render a list from an array in JSX, with a filter, from memory.
- **Week 4:** Add a piece of `useState` to a component and wire an input to it, from memory.
- **Week 5:** Explain why `await` needs `async`, and what a Promise is, in your own words.
- **Week 6:** Reconstruct `RoleContext.tsx` from memory with fewer than 10 diffs, and explain
  why `useRole` throws when there's no provider.

If a check fails, repeat that week. The schedule is a suggestion; the checks are the actual
targets.

---

## Part 6: Outside reading (small, targeted)

Don't take a broad course — you'd spend weeks on material this project doesn't use. Read
these specific pages instead, one per week:

1. TypeScript Handbook, "Everyday Types" — covers unions, interfaces, optional properties.
2. MDN, "Destructuring assignment."
3. MDN, "Array.prototype.map" and "filter."
4. React docs, "State: A Component's Memory" and "Synchronizing with Effects."
5. MDN, "Using Promises."
6. React docs, "Passing Data Deeply with Context."

The React docs at react.dev are unusually good and have runnable challenges at the end of each
page. Do the challenges — they're recall practice, which is the whole point.

---

## What to avoid

- **Tutorial hopping.** You have a real project. It beats any tutorial app.
- **Learning what you don't use.** Skip classes, Redux, `useReducer`, generics beyond `<T>`
  for now. None appear here.
- **Turning off Cursor entirely.** It's a good tutor and an infinitely patient one. Just make
  it explain rather than do, during learning sessions.
- **Measuring progress by features shipped.** During learning sessions, measure by lines
  written unaided.
