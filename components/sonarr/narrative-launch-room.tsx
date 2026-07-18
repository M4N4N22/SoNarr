"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type WeightedAsset = {
  asset: string;
  weight: number;
};

type NarrativeLaunchRoomProps = {
  narrativeTitle: string;
  summary: string;
  whyNow: string;
  signalScore: number;
  confidence: number;
  risk: string;
  evidenceBullets: string[];
  topAssets: string[];
  weightedAssets: WeightedAsset[];
  methodology: string[];
};

function basketLine(weightedAssets: WeightedAsset[]) {
  return weightedAssets.map((asset) => `${asset.asset} ${asset.weight}%`).join(" · ");
}

function basketTable(weightedAssets: WeightedAsset[]) {
  return weightedAssets
    .map((asset) => `${asset.asset.padEnd(6)} ${asset.weight}%`)
    .join("\n");
}

function themeLabel(narrativeTitle: string) {
  return narrativeTitle.replace(/\s+Momentum$/i, "").trim();
}

function latestHeadline(evidenceBullets: string[]) {
  const latest = evidenceBullets.find((bullet) => bullet.startsWith("Latest:"));
  return latest ? latest.replace(/^Latest:\s*/, "").trim() : undefined;
}

function headlineCountLine(evidenceBullets: string[]) {
  const line = evidenceBullets.find((bullet) => bullet.includes("headlines"));
  if (line) {
    return line.replace(/\.$/, "");
  }

  const quiet = evidenceBullets.find((bullet) =>
    bullet.toLowerCase().includes("few supporting headlines"),
  );
  return quiet ?? "Headline flow is still thin — treat this as an early watchlist theme.";
}

function searchActivityLine(evidenceBullets: string[]) {
  const line = evidenceBullets.find((bullet) => bullet.includes("search hits"));
  if (!line) {
    return "News search activity around this theme picked up recently.";
  }

  return line
    .replace(/ search hits for /i, " is showing elevated news search volume for ")
    .replace(/\.$/, "");
}

function convictionPhrase(signalScore: number, confidence: number) {
  if (signalScore >= 84 && confidence >= 70) {
    return "The theme looks crowded in headlines — high attention, not a guarantee of follow-through.";
  }

  if (signalScore >= 68) {
    return "Attention is building, but I'd still treat this as a watchlist until price and flow confirm.";
  }

  if (signalScore >= 50) {
    return "Early-stage narrative heat — interesting setup, not yet a high-conviction basket.";
  }

  return "Still mostly noise in the feed — worth tracking, not worth forcing size.";
}

function buildThesis({
  narrativeTitle,
  summary,
  whyNow,
  risk,
  topAssets,
  weightedAssets,
}: NarrativeLaunchRoomProps) {
  const theme = themeLabel(narrativeTitle);

  return `${theme} Index — draft one-pager

What it is
${summary}

Why we're looking at it now
${whyNow}

How the basket is built
An equal-risk thematic slice across ${topAssets.slice(0, 3).join(", ")}, with weights tilted toward the names most tied to the narrative:
${basketTable(weightedAssets)}

How to use this
Think of it as a research basket for tracking a theme — not a finished product page. Revisit weights when news flow fades or concentration gets too high.

Risk
${risk} thematic exposure. Narrative trades can unwind quickly when headlines rotate. This is research material, not investment advice.`;
}

function buildMemo({
  narrativeTitle,
  summary,
  whyNow,
  risk,
  evidenceBullets,
  weightedAssets,
  methodology,
  signalScore,
  confidence,
}: NarrativeLaunchRoomProps) {
  const theme = themeLabel(narrativeTitle);
  const headline = latestHeadline(evidenceBullets);

  return `${theme} — internal research memo (draft)

Executive summary
${summary}

Catalyst
${whyNow}

What we're seeing in the feed
• ${searchActivityLine(evidenceBullets)}
• ${headlineCountLine(evidenceBullets)}${headline ? `\n• Lead headline: “${headline}”` : ""}

Conviction check
${convictionPhrase(signalScore, confidence)} (tracking score ${signalScore}/100, data confidence ${confidence}/100.)

Proposed basket
Asset    Weight
${basketTable(weightedAssets)}

Construction notes
${methodology
  .map((line) => line.replace(/^Max single asset weight: 30%\.$/, "Cap any single name at 30%."))
  .join("\n")}

Risks
• ${risk} — thematic baskets correlate in drawdowns.
• Headline-driven themes can reverse without warning.
• Liquidity and venue coverage still need a separate execution review.

Next week
Refresh headline evidence, sanity-check weights, and only size up if the story is still showing up in primary sources.

Disclaimer: research workflow only. Not investment advice.`;
}

function buildThread({
  narrativeTitle,
  summary,
  whyNow,
  risk,
  evidenceBullets,
  weightedAssets,
  topAssets,
}: NarrativeLaunchRoomProps) {
  const theme = themeLabel(narrativeTitle);
  const headline = latestHeadline(evidenceBullets);

  return `1/ ${theme} is showing up again in crypto news flows — worth mapping as a basket instead of chasing one ticker.

2/ Quick read: ${summary}

3/ Why now: ${whyNow}

4/ ${searchActivityLine(evidenceBullets)}.${headline ? `\n\nLead story this week: “${headline}”` : ""}

5/ If I wanted thematic exposure without picking a single winner, I'd start here:
${basketLine(weightedAssets)}

6/ Core names: ${topAssets.slice(0, 3).join(", ")}. Weights favor narrative relevance, not market-cap rank.

7/ Risk: ${risk.toLowerCase()} conviction on a headline theme — these moves fade fast when the feed moves on.

8/ This is how I research themes, not a buy call. Full memo + rebalance rules in the doc. NFA 🧵`;
}

function buildIndexRules() {
  return `Index maintenance (draft)

• Review the basket weekly against fresh headlines and price action.
• Rebalance if thematic strength shifts materially (~20% in our tracking score).
• Trim any single name above 30% weight.
• Pause adds if headline evidence dries up or liquidity thins on key venues.
• Keep execution (fills, slippage, venue mapping) separate from publishing copy.`;
}

function CopyButton({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);

  async function copyText() {
    if (!navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Button type="button" variant="outline" onClick={copyText}>
      {copied ? "Copied" : label}
    </Button>
  );
}

function TextBlock({ text }: { text: string }) {
  return (
    <div className="whitespace-pre-line rounded-2xl border border-border bg-background/60 p-4 text-sm leading-7 text-muted-foreground">
      {text}
    </div>
  );
}

function LaunchAssetAccordion({
  title,
  description,
  action,
  text,
  defaultOpen = false,
}: {
  title: string;
  description: string;
  action: string;
  text: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-border bg-background/50">
      <div className="flex items-start justify-between gap-3 p-4">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        </button>
        <CopyButton label={action} text={text} />
      </div>
      {open ? (
        <div className="border-t border-border px-4 pb-4">
          <TextBlock text={text} />
        </div>
      ) : null}
    </div>
  );
}

export function NarrativeLaunchRoom({
  compact = false,
  embedded = false,
  ...props
}: NarrativeLaunchRoomProps & {
  compact?: boolean;
  embedded?: boolean;
}) {
  const thesis = buildThesis(props);
  const memo = buildMemo(props);
  const thread = buildThread(props);
  const indexRules = buildIndexRules();

  const launchAssets = [
    {
      title: "Index one-pager",
      description: "Short public-facing description of the thematic basket.",
      action: "Copy one-pager",
      text: thesis,
    },
    {
      title: "Research memo",
      description: "Internal note with catalyst, evidence, weights, and risks.",
      action: "Copy memo",
      text: memo,
    },
    {
      title: "X thread",
      description: "Thread draft you can edit before posting — reads like analyst research, not product UI.",
      action: "Copy thread",
      text: thread,
    },
  ];

  const body = (
    <>
      {compact ? (
        <div className="space-y-2">
          {launchAssets.map((asset, index) => (
            <LaunchAssetAccordion
              key={asset.title}
              {...asset}
              defaultOpen={index === 0}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-1">
          {launchAssets.map((asset) => (
            <Card key={asset.title} className="bg-background/50 shadow-none">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>{asset.title}</CardTitle>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {asset.description}
                    </p>
                  </div>
                  <CopyButton label={asset.action} text={asset.text} />
                </div>
              </CardHeader>
              <CardContent>
                <TextBlock text={asset.text} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-background/50 shadow-none">
        <CardHeader>
          <CardTitle>Index maintenance rules</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            Operator checklist for keeping the thematic basket disciplined over time.
          </p>
        </CardHeader>
        <CardContent>
          <TextBlock text={indexRules} />
        </CardContent>
      </Card>

      <p className="text-sm leading-6 text-muted-foreground">
        Edit before sharing. Research drafts only — not financial advice and not trade
        instructions.
      </p>
    </>
  );

  if (embedded && compact) {
    return <div className="space-y-4">{body}</div>;
  }

  const content = (
    <Card className="overflow-hidden bg-card/85">
      <CardHeader className={compact ? "border-b border-border p-4 sm:p-5" : "border-b border-border p-6 sm:p-8"}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="outline">Copy kit</Badge>
            <CardTitle className={compact ? "mt-3 text-xl" : "mt-5 text-3xl sm:text-4xl"}>
              Launch room
            </CardTitle>
            <p className={compact ? "mt-2 text-sm text-muted-foreground" : "mt-4 max-w-3xl text-base leading-7 text-muted-foreground"}>
              Drafts for publishing and note-taking. Pulls from this narrative&apos;s headlines
              and basket weights — not from SoDEX order status or fills.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className={compact ? "space-y-4 p-4 sm:p-5" : "space-y-6 p-6 sm:p-8"}>
        {body}
      </CardContent>
    </Card>
  );

  if (embedded) {
    return content;
  }

  return <section className="mx-auto max-w-7xl px-6 pb-10 lg:px-8">{content}</section>;
}
