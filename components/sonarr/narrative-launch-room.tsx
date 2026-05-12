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
import { Separator } from "@/components/ui/separator";

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

function basketText(weightedAssets: WeightedAsset[]) {
  return weightedAssets
    .map((asset) => `${asset.asset} ${asset.weight}%`)
    .join(", ");
}

function buildThesis({
  narrativeTitle,
  summary,
  signalScore,
  confidence,
  risk,
  topAssets,
  weightedAssets,
}: NarrativeLaunchRoomProps) {
  return `${narrativeTitle} is a SoNarr-generated index thesis built from narrative intelligence and SoSoValue-powered market signals.

The narrative is forming around this read: ${summary}

SoNarr currently scores the signal at ${signalScore}/100 with ${confidence}/100 confidence. The proposed basket focuses on ${topAssets.slice(0, 3).join(", ")} and packages the theme as ${narrativeTitle} Index.

Suggested construction: ${basketText(weightedAssets)}.

Risk view: ${risk}. This thesis is a research workflow and launch kit, not financial advice. No returns are guaranteed and no trades are placed automatically.`;
}

function buildMemo({
  narrativeTitle,
  summary,
  whyNow,
  risk,
  evidenceBullets,
  weightedAssets,
  methodology,
}: NarrativeLaunchRoomProps) {
  return `Market narrative
${narrativeTitle}: ${summary}

Why now
${whyNow}

Index construction
Suggested basket: ${basketText(weightedAssets)}. Assets are weighted by narrative relevance, capped concentration, and suitability for future execution review.

Methodology
${methodology.join(" ")}

Risk view
${risk}. Key checks: ${evidenceBullets.slice(0, 2).join(" ")}

Next step
Review the launch package, confirm methodology, and prepare a public index page. This is not financial advice and no trade is placed.`;
}

function buildThread({
  narrativeTitle,
  summary,
  signalScore,
  confidence,
  risk,
  weightedAssets,
}: NarrativeLaunchRoomProps) {
  return `1/ ${narrativeTitle} is showing enough signal to package as a structured index idea.

2/ SoNarr detected this narrative from SoSoValue-powered feeds and search: ${summary}

3/ Current signal score: ${signalScore}/100. Data confidence: ${confidence}/100.

4/ Suggested basket preview: ${basketText(weightedAssets)}.

5/ Risk note: ${risk}. This is a research workflow, not financial advice.

6/ Public index page placeholder: coming next. No trades are placed automatically.`;
}

function buildRebalancePolicy() {
  return `Review weekly.
Rebalance if signal score changes by 20%+.
Reduce exposure if confidence falls below 60.
Cap any single asset at 30%.
Require execution confirmation before trading.`;
}

function buildExecutionChecklist() {
  return `Confirm index weights.
Check SoDEX orderbook depth.
Estimate slippage.
Confirm supported markets.
Require user approval.
No trade is placed automatically.`;
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

export function NarrativeLaunchRoom(props: NarrativeLaunchRoomProps) {
  const thesis = buildThesis(props);
  const memo = buildMemo(props);
  const thread = buildThread(props);
  const rebalancePolicy = buildRebalancePolicy();
  const executionChecklist = buildExecutionChecklist();

  const launchAssets = [
    {
      title: "Index Thesis",
      description: "Public-facing thesis for the generated narrative index.",
      action: "Copy thesis",
      text: thesis,
    },
    {
      title: "Research Memo",
      description: "Operator memo for research, construction, risk, and next step.",
      action: "Copy memo",
      text: memo,
    },
    {
      title: "X Thread",
      description: "Professional launch thread for explaining the narrative.",
      action: "Copy thread",
      text: thread,
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 pb-10 lg:px-8">
      <Card className="overflow-hidden bg-card/85">
        <CardHeader className="border-b border-border p-6 sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge>Launch kit</Badge>
              <CardTitle className="mt-5 text-3xl sm:text-4xl">
                Narrative Launch Room
              </CardTitle>
              <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
                SoNarr turns narrative intelligence and index construction into
                launch-ready business assets for a one-person finance desk.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/60 p-4">
              <p className="text-sm text-muted-foreground">Workflow</p>
              <p className="mt-2 font-semibold text-foreground">
                Data to narrative to index to launch package
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-6 sm:p-8">
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

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="bg-background/50 shadow-none">
              <CardHeader>
                <CardTitle>Rebalance Policy</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  Rules for keeping the index methodology disciplined.
                </p>
              </CardHeader>
              <CardContent>
                <TextBlock text={rebalancePolicy} />
              </CardContent>
            </Card>

            <Card className="bg-background/50 shadow-none">
              <CardHeader>
                <CardTitle>Execution Checklist</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  Preview-only workflow before any future execution integration.
                </p>
              </CardHeader>
              <CardContent>
                <TextBlock text={executionChecklist} />
              </CardContent>
            </Card>
          </div>

          <Separator />

          <p className="text-sm leading-6 text-muted-foreground">
            This is a launch kit and research workflow, not financial advice. No
            trades are placed.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
