import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  COLOR_MODES,
  FormField,
  Input,
  SegmentedControl,
  SegmentedControlItem,
  Switch,
  Table,
  TableWrap,
  Tabs,
  TabsList,
  TabsTrigger,
  Td,
  Th,
  THEMES,
  type ColorMode,
  type ThemeName,
} from "../index";

const meta = {
  title: "Overview/Theme matrix",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "One composition in every theme × mode. Each cell sets its own `data-theme` and `data-mode`, so tokens resolve per cell. The density toolbar applies to the page; cells use each theme's default density.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Sample({ theme, mode }: { theme: ThemeName; mode: ColorMode }) {
  return (
    <div
      data-theme={theme}
      data-mode={mode}
      className="grid gap-4 p-5 font-sans text-foreground"
      style={{ background: "var(--ds-gradient-page)" }}
    >
      <Card className="p-5">
        <CardHeader className="mb-4">
          <CardTitle>AAPL momentum</CardTitle>
          <CardDescription>Crosses the 50-day average with rising volume.</CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-2">
          <Button size="sm">Run backtest</Button>
          <Button size="sm" variant="secondary">
            Save
          </Button>
          <Button size="sm" variant="danger">
            Delete
          </Button>
        </div>
      </Card>
      <div className="flex flex-wrap gap-2">
        <Badge tone="brand">AAPL</Badge>
        <Badge tone="positive">+2.84%</Badge>
        <Badge tone="negative">-1.12%</Badge>
        <Badge tone="warning">Closed</Badge>
      </div>
      <FormField label="Quantity" description="Whole shares only.">
        <Input defaultValue="10" inputMode="numeric" />
      </FormField>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <Checkbox defaultChecked />
          Extended hours
        </label>
        <label className="flex items-center gap-2">
          <Checkbox />
          Dividends
        </label>
        <Switch defaultChecked aria-label={`Live data, ${theme} ${mode}`} />
        <Switch aria-label={`Alerts, ${theme} ${mode}`} />
        <SegmentedControl aria-label={`Timeframe, ${theme} ${mode}`} defaultValue="1M" size="sm">
          <SegmentedControlItem value="1D">1D</SegmentedControlItem>
          <SegmentedControlItem value="1M">1M</SegmentedControlItem>
          <SegmentedControlItem value="1Y">1Y</SegmentedControlItem>
        </SegmentedControl>
      </div>
      <Tabs defaultValue="overview">
        <TabsList aria-label={`Sections, ${theme} ${mode}`}>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="signals">Signals</TabsTrigger>
        </TabsList>
      </Tabs>
      <TableWrap className="p-4">
        <Table>
          <thead>
            <tr>
              <Th>Symbol</Th>
              <Th>Close</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td>MSFT</Td>
              <Td>$412.30</Td>
            </tr>
            <tr>
              <Td>NVDA</Td>
              <Td>$118.07</Td>
            </tr>
          </tbody>
        </Table>
      </TableWrap>
      <p className="m-0 text-sm text-secondary">
        Read the <a href="#methodology">methodology</a> before trading.
      </p>
    </div>
  );
}

export const AllThemes: Story = {
  render: () => (
    <div className="grid gap-px bg-border">
      {THEMES.map((theme) => (
        <section key={theme.name} aria-label={theme.label} className="grid bg-background">
          <header className="px-5 pt-5">
            <h2 className="m-0 font-display text-lg font-bold">{theme.label}</h2>
            <p className="m-0 text-sm text-secondary">
              {theme.description} Default density: {theme.density}.
            </p>
          </header>
          <div className="grid md:grid-cols-2">
            {COLOR_MODES.map((mode) => (
              <Sample key={mode} theme={theme.name} mode={mode} />
            ))}
          </div>
        </section>
      ))}
    </div>
  ),
};
