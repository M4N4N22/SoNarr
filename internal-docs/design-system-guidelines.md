# SoNarr Design System Guidelines

## Goal

Use a dark-first, premium SaaS design system for SoNarr.

The UI should feel like:
- Linear
- Vercel
- Stripe
- modern fintech dashboards
- polished crypto infrastructure products

The design should be clean, mature, and judge-ready.

## Color Strategy

Use Tailwind’s built-in neutral scale directly.

Do not redefine Tailwind neutral colors in globals.css.

Tailwind already provides classes like:
- neutral-50
- neutral-100
- neutral-200
- neutral-300
- neutral-400
- neutral-500
- neutral-600
- neutral-700
- neutral-800
- neutral-900
- neutral-950

Use these classes directly when needed:
- bg-neutral-950
- bg-neutral-900
- bg-neutral-800
- text-neutral-100
- text-neutral-300
- text-neutral-400
- border-neutral-800

## Brand Color

The only brand/primary color is:

#2b44e7

Use this through the semantic token:

bg-primary
text-primary
border-primary
ring-ring

Do not hardcode #2b44e7 repeatedly inside components.

## Use Semantic Theme Tokens

Prefer semantic tokens from globals.css for reusable UI.

Use:
- bg-background
- text-foreground
- bg-card
- text-card-foreground
- bg-muted
- text-muted-foreground
- border-border
- bg-primary
- text-primary-foreground
- ring-ring
- bg-secondary
- text-secondary-foreground
- bg-accent
- text-accent-foreground

Examples:

```tsx
className="bg-background text-foreground"
className="rounded-2xl border border-border bg-card text-card-foreground"
className="bg-primary text-primary-foreground hover:bg-primary/90"
className="bg-muted text-muted-foreground"
Avoid Hardcoded Colors

Avoid this:

className="bg-[#0a0a0a] text-[#f5f5f5] border-[#262626]"

Prefer this:

className="bg-background text-foreground border-border"

Hardcoded colors are only acceptable for rare one-off visual effects, such as subtle gradients, and should still usually reference the brand color through rgba if needed.

## Component Library Rule

Use shadcn/ui components as the default UI building blocks.

Prefer shadcn/ui for:
- Button
- Card
- Badge
- Input
- Textarea
- Tabs
- Dialog
- DropdownMenu
- Separator
- Skeleton
- Tooltip
- Alert
- Table

Do not manually recreate common UI primitives if a shadcn/ui component exists.

For example, use:

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

Instead of creating custom button/card/badge components manually.

Manual custom components are allowed only for:

page-specific layout sections
dashboard mockups
product-specific cards
composed components that wrap shadcn primitives
visual effects not covered by shadcn

When styling shadcn components, use the semantic theme tokens from globals.css:

bg-background
text-foreground
bg-card
border-border
text-muted-foreground
bg-primary
text-primary-foreground
ring-ring

Do not hardcode colors repeatedly.

shadcn Styling Preference

Use shadcn variants first.

Good:

<Button>Open narrative radar</Button>
<Button variant="outline">View example index</Button>
<Card>
  <CardHeader>
    <CardTitle>Narrative Radar</CardTitle>
  </CardHeader>
  <CardContent>...</CardContent>
</Card>

Only add custom className when needed for layout, spacing, or premium polish.

Good:

<Button className="rounded-full px-5">
  Open narrative radar
</Button>

Avoid building buttons like this:

<a className="rounded-full bg-primary px-5 py-3 text-primary-foreground">
  Open narrative radar
</a>

Use shadcn Button instead.