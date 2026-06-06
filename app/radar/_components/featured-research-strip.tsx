import { BookOpen, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatRelativeTime, type NewsItem } from "@/lib/sosovalue";

import { shortText } from "./radar-utils";

export function FeaturedResearchStrip({ items }: { items: NewsItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Card className="bg-card/80">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="flex items-center gap-2">
              Featured research
              <Badge variant="outline" className="text-[10px] font-normal">
                GET /news/featured
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Curated SoSoValue research alongside the live hot news tape.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.slice(0, 6).map((item) => (
          <a
            key={item.id}
            href={item.sourceLink}
            target="_blank"
            rel="noreferrer"
            className="group rounded-xl border border-border bg-background/50 p-4 transition hover:border-primary/40"
          >
            <p className="text-xs text-muted-foreground">
              {formatRelativeTime(item.releaseTime)}
            </p>
            <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-foreground group-hover:text-primary">
              {item.title}
              <ExternalLink className="ml-1 inline h-3.5 w-3.5 text-muted-foreground" />
            </h3>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
              {shortText(item.content, 120)}
            </p>
          </a>
        ))}
      </CardContent>
    </Card>
  );
}
