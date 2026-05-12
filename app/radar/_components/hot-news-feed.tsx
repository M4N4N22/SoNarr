import { ExternalLink, Flame, Newspaper } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatRelativeTime, type NewsItem } from "@/lib/sosovalue";

import { shortText } from "./radar-utils";

export function HotNewsFeed({ hotNews }: { hotNews: NewsItem[] }) {
  const loopNews = [...hotNews, ...hotNews];

  return (
    <Card id="hot-feed" className="overflow-hidden bg-card/80">
      <CardHeader className="">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className=" flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Flame className="h-5 w-5" />
            </div>

            <div>
              <CardTitle className="flex items-center gap-2">
                Live hot news tape
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
              </CardTitle>

              <p className="text-sm text-muted-foreground">
                A continuous market feed powered by SoSoValue.
              </p>
            </div>
          </div>

        </div>
      </CardHeader>

      <CardContent className="relative h-[560px] overflow-hidden p-0">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-card to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-card to-transparent" />

        <div className="group h-full overflow-hidden">
          <div className="animate-news-tape divide-y divide-border group-hover:[animation-play-state:paused]">
            {loopNews.map((item, index) => (
              <NewsTapeItem
                key={`${item.id}-${index}`}
                item={item}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NewsTapeItem({ item }: { item: NewsItem }) {
  return (
    <article className="relative p-4 transition hover:bg-muted/35 sm:p-5">
      <div className="flex gap-4">
        <div className="mt-1 hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground sm:flex">
          <Newspaper className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                {formatRelativeTime(item.releaseTime)}
                {item.author ? ` / ${item.author}` : ""}
              </p>

              <h2 className="mt-1 line-clamp-2 text-base font-semibold leading-6 text-foreground">
                <a
                  href={item.sourceLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-start gap-1.5 transition hover:text-primary"
                >
                  {item.title}
                  <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </a>
              </h2>
            </div>

            {item.currencies.length > 0 ? (
              <div className="flex shrink-0 flex-wrap gap-1.5 sm:max-w-44 sm:justify-end">
                {item.currencies.slice(0, 3).map((currency) => (
                  <Badge
                    key={currency}
                    variant="muted"
                    className="rounded-full text-[11px]"
                  >
                    {currency}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>

          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {shortText(item.content, 150)}
          </p>

          {item.tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
              {item.tags.slice(0, 4).map((tag) => (
                <span key={tag} className="text-xs text-muted-foreground">
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
