import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

function isMainSection(line: string): boolean {
  return /^\d+\.\s+/.test(line) && !/^\d+\.\d+/.test(line);
}

function isSubSection(line: string): boolean {
  return /^\d+\.\d+(\.\d+)?\s+/.test(line);
}

function isListItem(line: string): boolean {
  if (!line || line.length > 120) return false;
  if (isMainSection(line) || isSubSection(line)) return false;
  if (line.startsWith("Nota:") || line.startsWith("http")) return false;
  if (/^[A-ZÁÉÍÓÚÑ][^.!?]*[.!?]$/.test(line) && line.length > 40) return false;
  return true;
}

type Block =
  | { type: "hero"; lines: string[] }
  | { type: "section"; title: string; body: Block[] }
  | { type: "subsection"; title: string; items: string[]; paragraphs: string[] }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

function parseLegalBlocks(raw: string): Block[] {
  const paragraphs = raw
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);

  const blocks: Block[] = [];
  let i = 0;

  const heroLines: string[] = [];
  while (i < paragraphs.length && !isMainSection(paragraphs[i]!)) {
    heroLines.push(paragraphs[i]!);
    i++;
  }
  if (heroLines.length > 0) blocks.push({ type: "hero", lines: heroLines });

  while (i < paragraphs.length) {
    const line = paragraphs[i]!;
    if (isMainSection(line)) {
      const sectionTitle = line;
      i++;
      const body: Block[] = [];
      while (i < paragraphs.length && !isMainSection(paragraphs[i]!)) {
        const current = paragraphs[i]!;
        if (isSubSection(current)) {
          const subTitle = current;
          i++;
          const items: string[] = [];
          const subParagraphs: string[] = [];
          while (i < paragraphs.length && !isMainSection(paragraphs[i]!) && !isSubSection(paragraphs[i]!)) {
            const row = paragraphs[i]!;
            if (isListItem(row)) {
              items.push(row);
              i++;
            } else {
              subParagraphs.push(row);
              i++;
            }
          }
          body.push({ type: "subsection", title: subTitle, items, paragraphs: subParagraphs });
        } else if (isListItem(current)) {
          const items: string[] = [];
          while (i < paragraphs.length && isListItem(paragraphs[i]!) && !isSubSection(paragraphs[i]!)) {
            items.push(paragraphs[i]!);
            i++;
          }
          body.push({ type: "list", items });
        } else {
          body.push({ type: "paragraph", text: current });
          i++;
        }
      }
      blocks.push({ type: "section", title: sectionTitle, body });
    } else {
      blocks.push({ type: "paragraph", text: line });
      i++;
    }
  }

  return blocks;
}

function renderBlocks(blocks: Block[], depth = 0) {
  return blocks.map((block, idx) => {
    if (block.type === "hero") {
      const [brand, site, title, ...rest] = block.lines;
      return (
        <header key={`hero-${idx}`} className="mb-10 space-y-2">
          {brand && <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{brand}</p>}
          {site && <p className="text-sm text-primary font-medium">{site}</p>}
          {title && <h1 className="font-serif text-3xl sm:text-4xl text-foreground">{title}</h1>}
          {rest.map((line) => (
            <p key={line} className="text-sm text-muted-foreground leading-relaxed">
              {line}
            </p>
          ))}
        </header>
      );
    }

    if (block.type === "section") {
      return (
        <section key={`${block.title}-${idx}`} className={cn(depth === 0 ? "mt-10" : "mt-6")}>
          <h2 className="font-serif text-xl sm:text-2xl mb-4 text-foreground">{block.title}</h2>
          <div className="space-y-4">{renderBlocks(block.body, depth + 1)}</div>
        </section>
      );
    }

    if (block.type === "subsection") {
      return (
        <div key={`${block.title}-${idx}`} className="space-y-3">
          <h3 className="font-medium text-base text-foreground">{block.title}</h3>
          {block.paragraphs.map((p) => (
            <p key={p} className="text-foreground/90 leading-relaxed text-sm sm:text-base">
              {p}
            </p>
          ))}
          {block.items.length > 0 && (
            <ul className="list-disc pl-6 space-y-1 text-foreground/90 text-sm sm:text-base">
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    if (block.type === "list") {
      return (
        <ul key={`list-${idx}`} className="list-disc pl-6 space-y-1 text-foreground/90 text-sm sm:text-base">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    }

    return (
      <p key={`p-${idx}`} className="text-foreground/90 leading-relaxed text-sm sm:text-base">
        {block.text}
      </p>
    );
  });
}

type LegalTextDocumentProps = {
  content: string;
  backHref?: string;
  backLabel?: string;
};

export function LegalTextDocument({
  content,
  backHref = "/shop",
  backLabel = "← Volver a la tienda",
}: LegalTextDocumentProps) {
  const blocks = parseLegalBlocks(content);

  return (
    <article className="flex-1 pt-28 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          {renderBlocks(blocks)}
        </div>
        <p className="mt-12">
          <Link href={backHref} className="text-primary hover:underline text-sm font-medium">
            {backLabel}
          </Link>
        </p>
      </div>
    </article>
  );
}
