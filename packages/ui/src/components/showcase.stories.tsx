import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogTrigger,
  Feedback,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Table,
  TableWrap,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Td,
  Th,
  Tooltip,
} from "../index";

const meta = {
  title: "Design System/Component Gallery",
  parameters: {
    layout: "padded",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const ActionsAndStatus: Story = {
  render: () => (
    <div className="grid max-w-3xl gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>
            Variants expose hierarchy without hard-coded colors.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-3">
          <Button>Run backtest</Button>
          <Button variant="secondary">Save draft</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="danger">Delete strategy</Button>
          <Button disabled>Unavailable</Button>
        </div>
      </Card>
      <div className="flex flex-wrap gap-3">
        <Badge tone="brand">AAPL</Badge>
        <Badge tone="positive">+2.84%</Badge>
        <Badge tone="negative">-1.12%</Badge>
        <Badge tone="warning">Market closed</Badge>
        <Badge>Draft</Badge>
      </div>
      <div className="grid gap-3">
        <Feedback title="Market data connected" tone="success" />
        <Feedback
          title="Delayed quote"
          description="The latest price is 15 minutes old."
          tone="warning"
        />
        <Feedback
          title="Order rejected"
          description="Insufficient buying power."
          tone="danger"
        />
      </div>
    </div>
  ),
};

export const FormsAndSelection: Story = {
  render: () => (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Create alert</CardTitle>
        <CardDescription>
          Labels, help text, validation, and selection states.
        </CardDescription>
      </CardHeader>
      <div className="grid gap-5">
        <FormField
          htmlFor="symbol"
          label="Symbol"
          hint="US equities and crypto pairs are supported."
        >
          <Input id="symbol" placeholder="AAPL" />
        </FormField>
        <FormField
          htmlFor="price"
          label="Target price"
          error="Enter a price greater than zero."
        >
          <Input id="price" inputMode="decimal" defaultValue="0" invalid />
        </FormField>
        <FormField htmlFor="direction" label="Direction">
          <Select defaultValue="above">
            <SelectTrigger id="direction" placeholder="Choose direction" />
            <SelectContent>
              <SelectItem value="above">Moves above</SelectItem>
              <SelectItem value="below">Moves below</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <Button>Create alert</Button>
      </div>
    </Card>
  ),
};

export const NavigationAndOverlays: Story = {
  render: () => (
    <div className="grid max-w-2xl gap-8">
      <Tabs defaultValue="overview">
        <TabsList aria-label="Symbol detail sections">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="signals">Signals</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Feedback
            title="Overview selected"
            description="Tabs support arrow-key navigation."
          />
        </TabsContent>
        <TabsContent value="signals">Signal content</TabsContent>
        <TabsContent value="risk">Risk content</TabsContent>
      </Tabs>
      <div className="flex gap-3">
        <Dialog>
          <DialogTrigger asChild>
            <Button>Review order</Button>
          </DialogTrigger>
          <DialogContent
            title="Review paper order"
            description="Confirm the simulated order before submission."
          >
            <Feedback
              title="10 shares of AAPL"
              description="Estimated value: $2,140.50"
            />
            <div className="flex justify-end gap-3">
              <Button variant="secondary">Back</Button>
              <Button>Confirm</Button>
            </div>
          </DialogContent>
        </Dialog>
        <Tooltip label="Uses delayed market data">
          <Button variant="ghost">Why delayed?</Button>
        </Tooltip>
      </div>
    </div>
  ),
};

export const DataTable: Story = {
  render: () => (
    <TableWrap>
      <Table>
        <thead>
          <tr>
            <Th>Symbol</Th>
            <Th>Price</Th>
            <Th>Change</Th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <Td>AAPL</Td>
            <Td>$214.05</Td>
            <Td>
              <Badge tone="positive">+2.84%</Badge>
            </Td>
          </tr>
          <tr>
            <Td>NVDA</Td>
            <Td>$181.32</Td>
            <Td>
              <Badge tone="negative">-1.12%</Badge>
            </Td>
          </tr>
        </tbody>
      </Table>
    </TableWrap>
  ),
};
