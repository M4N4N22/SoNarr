import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EndpointStatus } from "@/lib/types/data-source";

export function EndpointDiagnostics({
  endpoints,
  title = "Endpoint diagnostics",
}: {
  endpoints: EndpointStatus[];
  title?: string;
}) {
  if (endpoints.length === 0) {
    return null;
  }

  return (
    <Card className="bg-card/80">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          SoNarr is live-data-only. Endpoint issues are shown here instead of
          replacing missing responses with generated fallback data.
        </p>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {endpoints.map((endpoint, index) => (
          <div
            key={`${endpoint.name}-${endpoint.endpoint}-${index}`}
            className="rounded-2xl border border-border bg-background/60 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">{endpoint.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {endpoint.endpoint}
                </p>
              </div>
              <Badge variant={endpoint.ok ? "default" : "outline"}>
                {endpoint.ok ? "OK" : endpoint.errorType}
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {endpoint.message}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {endpoint.status ? (
                <span className="rounded-full border border-border px-2 py-1">
                  HTTP {endpoint.status}
                </span>
              ) : null}
              {endpoint.durationMs !== undefined ? (
                <span className="rounded-full border border-border px-2 py-1">
                  {endpoint.durationMs}ms
                </span>
              ) : null}
              {endpoint.itemCount !== undefined ? (
                <span className="rounded-full border border-border px-2 py-1">
                  {endpoint.itemCount} items
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
