/// <reference types="vite/client" />
/*
 * Blocks for the Storybook docs pages (src/docs/*.mdx). Everything they show
 * is read from the build's own outputs and inputs: tokens.json, the theme
 * sources, the resolver, and the Tailwind mapping in styles/index.css. So the
 * pages can't drift from what ships.
 */
import { useState, type ReactNode } from "react";
import { Badge } from "../components/badge";
import { Button } from "../components/button";
import { Input } from "../components/input";
import { SegmentedControl, SegmentedControlItem } from "../components/segmented-control";
import { Table, TableWrap, Tbody, Td, Th, Thead, Tr } from "../components/table";
import { cn } from "../lib/cn";
import stylesSource from "../styles/index.css?raw";
import { worstContrast } from "../tokens/contrast";
import tokens from "../tokens/generated/tokens.json";
import { CONTRAST_MINIMUMS, TONE_TINTS, backgroundsFor, resolveTheme } from "../tokens/resolve";
import {
  COLOR_TOKENS,
  DENSITY_TOKENS,
  DENSITY_VALUES,
  MODES,
  SHARED_TOKENS,
  type ColorToken,
  type Mode,
} from "../tokens/schema";
import { THEME_SOURCES } from "../tokens/themes";
import { THEMES, type ThemeName } from "../theme";

type DtcgValue = { $type: string; $value: string };
type ThemeJson = {
  font: Record<"sans" | "display" | "mono", DtcgValue>;
  dimension: Record<string, DtcgValue>;
} & Record<Mode, { color: Record<ColorToken, DtcgValue> }>;

const themeJson = (name: ThemeName) => tokens[name] as ThemeJson;

/** `--color-surface: var(--ds-bg-surface)` -> { "bg-surface": "surface" }, per Tailwind namespace. */
function tailwindNames(namespace: string) {
  const names = new Map<string, string>();
  const pattern = new RegExp(`--${namespace}-([\\w-]+):\\s*var\\(--ds-([\\w-]+)\\)`, "g");
  for (const [, name, token] of stylesSource.matchAll(pattern)) names.set(token, name);
  return names;
}

const COLOR_UTILITIES = tailwindNames("color");
const SPACING_UTILITIES = tailwindNames("spacing");

/** A row header: Th's semantics without the column header's uppercase. */
function RowHead({ children }: { children: ReactNode }) {
  return (
    <Th scope="row" className="text-sm font-medium tracking-normal text-foreground normal-case">
      {children}
    </Th>
  );
}

function Code({ children }: { children: ReactNode }) {
  return <code className="font-mono text-xs text-secondary">{children}</code>;
}

/** A themed panel: its subtree resolves tokens for `theme` and `mode`. */
function Themed({
  theme,
  mode,
  className,
  children,
  ...props
}: {
  theme: ThemeName;
  mode: Mode;
  className?: string;
  children: ReactNode;
  "data-density"?: "comfortable" | "compact";
}) {
  return (
    <div
      {...props}
      data-theme={theme}
      data-mode={mode}
      className={cn("rounded-lg bg-background p-5 font-sans text-foreground", className)}
      style={{ colorScheme: mode }}
    >
      {children}
    </div>
  );
}

function ThemePicker({
  theme,
  mode,
  onTheme,
  onMode,
}: {
  theme: ThemeName;
  mode: Mode;
  onTheme: (theme: ThemeName) => void;
  onMode: (mode: Mode) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <SegmentedControl
        aria-label="Theme"
        size="sm"
        value={theme}
        onValueChange={(value) => onTheme(value as ThemeName)}
      >
        {THEMES.map((option) => (
          <SegmentedControlItem key={option.name} value={option.name}>
            {option.label}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
      <SegmentedControl
        aria-label="Mode"
        size="sm"
        value={mode}
        onValueChange={(value) => onMode(value as Mode)}
      >
        {MODES.map((option) => (
          <SegmentedControlItem key={option} value={option}>
            {option === "dark" ? "Dark" : "Light"}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
    </div>
  );
}

const COLOR_GROUPS: { label: string; match: (token: ColorToken) => boolean }[] = [
  { label: "Backgrounds", match: (token) => token.startsWith("bg-") },
  { label: "Text", match: (token) => token.startsWith("fg-") },
  { label: "Borders and focus", match: (token) => /^(border|focus)-/.test(token) },
  { label: "Brand", match: (token) => token.startsWith("brand") },
  { label: "Status", match: (token) => /^(positive|negative|warning)/.test(token) },
  { label: "Charts", match: (token) => token.startsWith("chart-") },
];

/** Every semantic color of one theme and mode, as tokens.json has it. */
export function ColorSwatches() {
  const [theme, setTheme] = useState<ThemeName>(THEMES[0].name);
  const [mode, setMode] = useState<Mode>("dark");
  const colors = themeJson(theme)[mode].color;

  return (
    <Themed theme={theme} mode={mode} className="grid gap-6">
      <ThemePicker theme={theme} mode={mode} onTheme={setTheme} onMode={setMode} />
      {COLOR_GROUPS.map((group) => (
        <section key={group.label} className="grid gap-3">
          <h3 className="m-0 font-display text-base font-semibold">{group.label}</h3>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(13rem,1fr))]">
            {COLOR_TOKENS.filter(group.match).map((token) => {
              const utility = COLOR_UTILITIES.get(token);
              return (
                <div key={token} className="flex items-center gap-3">
                  {/* Translucent tokens show over the canvas, as they do in use. */}
                  <span
                    aria-hidden
                    className="size-10 shrink-0 rounded-md border border-border-subtle"
                    style={{ background: colors[token].$value }}
                  />
                  <span className="grid min-w-0 gap-0.5">
                    <span className="truncate text-sm font-medium">--ds-{token}</span>
                    <Code>{colors[token].$value}</Code>
                    {utility ? <Code>*-{utility}</Code> : null}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </Themed>
  );
}

const firstFamily = (stack: string) => stack.split(",")[0].replaceAll('"', "");

/** Type and shape per theme. These vary by theme, not by mode. */
export function ThemeTokenTable() {
  const radii = ["radius-sm", "radius-md", "radius-lg", "radius-xl", "radius-pill"];
  return (
    <Themed theme={THEMES[0].name} mode="dark" className="p-3" data-density="compact">
      <TableWrap>
        <Table>
          <Thead>
            <Tr>
              <Th>Theme</Th>
              <Th>Sans</Th>
              <Th>Display</Th>
              <Th>Mono</Th>
              {radii.map((radius) => (
                <Th key={radius} align="end">
                  {radius.replace("radius-", "")}
                </Th>
              ))}
              <Th align="end">Border / focus</Th>
            </Tr>
          </Thead>
          <Tbody>
            {THEMES.map(({ name, label }) => {
              const { font, dimension } = themeJson(name);
              return (
                <Tr key={name}>
                  <RowHead>{label}</RowHead>
                  <Td>{firstFamily(font.sans.$value)}</Td>
                  <Td>{firstFamily(font.display.$value)}</Td>
                  <Td>{firstFamily(font.mono.$value)}</Td>
                  {radii.map((radius) => (
                    <Td key={radius} align="end">
                      <Code>{dimension[radius].$value}</Code>
                    </Td>
                  ))}
                  <Td align="end">
                    <Code>
                      {dimension["border-width"].$value} / {dimension["focus-width"].$value}
                    </Code>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </TableWrap>
    </Themed>
  );
}

/** Sizes that follow `data-density`. */
export function DensityTable() {
  return (
    <Themed theme={THEMES[0].name} mode="dark">
      <TableWrap>
        <Table>
          <Thead>
            <Tr>
              <Th>Token</Th>
              <Th>Utility</Th>
              <Th align="end">Comfortable</Th>
              <Th align="end">Compact</Th>
            </Tr>
          </Thead>
          <Tbody>
            {DENSITY_TOKENS.map((token) => (
              <Tr key={token}>
                <RowHead>
                  <Code>--ds-{token}</Code>
                </RowHead>
                <Td>
                  <Code>*-{SPACING_UTILITIES.get(token) ?? token}</Code>
                </Td>
                <Td align="end">
                  <Code>{DENSITY_VALUES.comfortable[token]}</Code>
                </Td>
                <Td align="end">
                  <Code>{DENSITY_VALUES.compact[token]}</Code>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableWrap>
    </Themed>
  );
}

/** Motion tokens shared by every theme. Durations drop to 0ms under reduced motion. */
export function MotionTable() {
  return (
    <Themed theme={THEMES[0].name} mode="dark">
      <TableWrap>
        <Table>
          <Thead>
            <Tr>
              <Th>Token</Th>
              <Th>Value</Th>
            </Tr>
          </Thead>
          <Tbody>
            {Object.entries(SHARED_TOKENS).map(([token, value]) => (
              <Tr key={token}>
                <RowHead>
                  <Code>--ds-{token}</Code>
                </RowHead>
                <Td>
                  <Code>{value}</Code>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableWrap>
    </Themed>
  );
}

function ThemeSample() {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm">Run backtest</Button>
        <Button size="sm" variant="secondary">
          Save
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge tone="positive">+2.84%</Badge>
        <Badge tone="negative">-1.12%</Badge>
        <Badge tone="warning">Closed</Badge>
      </div>
      <Input aria-label="Symbol" defaultValue="AAPL" />
      <p className="m-0 text-sm text-muted">Fills at the next bar&apos;s open.</p>
    </div>
  );
}

/** One card per registered theme: its seeds' choices, and a sample in both modes. */
export function ThemeGallery() {
  return (
    <Themed theme={THEMES[0].name} mode="dark" className="grid gap-8">
      {THEME_SOURCES.map((source) => (
        <section key={source.name} className="grid gap-3">
          <div className="grid gap-1">
            <h3 className="m-0 text-lg font-semibold">
              {source.label} <Code>data-theme=&quot;{source.name}&quot;</Code>
            </h3>
            <p className="m-0 text-sm text-secondary">{source.description}</p>
            <p className="m-0 text-sm text-secondary">
              Surfaces <b>{source.surfaces}</b> · contrast <b>{source.contrast}</b> · density{" "}
              <b>{source.density}</b> · links <b>{source.links}</b>
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {MODES.map((mode) => (
              <Themed key={mode} theme={source.name} mode={mode}>
                <ThemeSample />
              </Themed>
            ))}
          </div>
        </section>
      ))}
    </Themed>
  );
}

/**
 * The same checks as tokens/contrast.test.ts, shown as numbers: the lowest
 * ratio each group reaches on any surface, against the theme's minimum.
 */
export function ContrastReport() {
  const rows = THEME_SOURCES.map(resolveTheme).flatMap((theme) =>
    MODES.map((mode) => {
      const { text, nonText } = CONTRAST_MINIMUMS[theme.source.contrast];
      const { tokens: t, surfaceGradient } = theme.modes[mode];
      const backgrounds = backgroundsFor(t, surfaceGradient);
      const worst = (colors: string[], min: number) =>
        Math.min(...colors.map((color) => worstContrast(color, { backgrounds, min })));
      const tones = (["brand", "brand-strong", "positive", "negative", "warning"] as const).map(
        (tone) =>
          worstContrast(t[`${tone}-fg`], { backgrounds, min: text, tintColor: t[tone], tints: TONE_TINTS }),
      );
      return {
        key: `${theme.source.name}-${mode}`,
        label: `${theme.source.label} ${mode}`,
        level: theme.source.contrast,
        text,
        nonText,
        body: worst([t["fg-default"], t["fg-muted"], t["fg-subtle"]], text),
        tone: Math.min(...tones),
        focus: worst([t["focus-ring"]], nonText),
        controls: worst([t["bg-checked"], t["border-control"]], nonText),
      };
    }),
  );

  const Ratio = ({ value, min }: { value: number; min: number }) => (
    <Badge tone={value >= min ? "positive" : "negative"}>{value.toFixed(2)}:1</Badge>
  );

  return (
    <Themed theme={THEMES[0].name} mode="dark">
      <TableWrap>
        <Table>
          <Thead>
            <Tr>
              <Th>Theme and mode</Th>
              <Th>Level</Th>
              <Th align="end">Text</Th>
              <Th align="end">Tone text</Th>
              <Th align="end">Focus ring</Th>
              <Th align="end">Control edges</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((row) => (
              <Tr key={row.key}>
                <RowHead>{row.label}</RowHead>
                <Td>
                  {row.level} <Code>({row.text} / {row.nonText})</Code>
                </Td>
                <Td align="end">
                  <Ratio value={row.body} min={row.text} />
                </Td>
                <Td align="end">
                  <Ratio value={row.tone} min={row.text} />
                </Td>
                <Td align="end">
                  <Ratio value={row.focus} min={row.nonText} />
                </Td>
                <Td align="end">
                  <Ratio value={row.controls} min={row.nonText} />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableWrap>
    </Themed>
  );
}
