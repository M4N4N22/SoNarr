import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ExecutionPreviewSection({
  indexHref,
}: {
  indexHref?: string;
}) {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-16 lg:px-8">
      <Card className="overflow-hidden bg-card/85">
        <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="border-b border-border p-6 lg:border-b-0 lg:border-r">
            <Badge variant="outline">Status: Preview only</Badge>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-foreground">
              SoDEX execution preview
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              No real trade is placed. The future step is to check SoDEX
              orderbook depth, slippage, and basket execution route before any
              execution integration exists.
            </p>
            <Button className="mt-6" variant="outline" disabled>
              Preview execution route
            </Button>
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-3">
            {["Orderbook depth", "Slippage estimate", "Basket route"].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-border bg-background/60 p-4"
              >
                <p className="text-sm text-muted-foreground">{item}</p>
                <p className="mt-3 font-semibold text-foreground">Pending</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card/85 p-6 sm:flex-row">
        <div>
          <p className="text-xl font-semibold text-foreground">
            Ready for the next build step.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Public index pages can publish this packaged narrative when that
            product surface is implemented.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          {indexHref ? (
            <Link href={indexHref} className={buttonVariants()}>
              Preview public index page
            </Link>
          ) : (
            <Button disabled>Preview public index page</Button>
          )}
          <Link
            href="/radar"
            className={buttonVariants({ variant: "outline", className: "px-5" })}
          >
            Back to radar
          </Link>
        </div>
      </div>
    </section>
  );
}
