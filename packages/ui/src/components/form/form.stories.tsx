import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { Field, FieldDescription, FieldItem, FieldLabel, FormField } from "../field";
import { Fieldset, FieldsetLegend } from "../fieldset";
import { Input } from "../input";
import { NumberField } from "../number-field";
import { Radio, RadioGroup } from "../radio-group";
import { SegmentedControl, SegmentedControlItem } from "../segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger } from "../select";
import { Switch } from "../switch";
import { Textarea } from "../textarea";
import { Form } from "./form";

const meta = {
  title: "Components/Form",
  parameters: {
    docs: {
      description: {
        component:
          "A native form that runs its Fields' validation on submit, focuses the first invalid control, and shows server errors from `errors` (keyed by each Field's `name`) until that value changes. `onFormSubmit` hands you the values of Base UI controls as an object; read `FormData` in `onSubmit` to include every named input (SegmentedControl submits that way).",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const directions = { above: "Moves above", below: "Moves below" };

export const PriceAlert: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Submit empty to see client validation. Submit with symbol `ZZZZ` to see a server error on that field.",
      },
    },
  },
  render: function Render() {
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitted, setSubmitted] = useState<Record<string, unknown> | null>(null);

    return (
      <div className="grid max-w-md gap-6">
        <Form
          errors={errors}
          onSubmit={(event) => {
            event.preventDefault();
            const values = Object.fromEntries(new FormData(event.currentTarget));
            if (values.symbol === "ZZZZ") {
              setErrors({ symbol: "No listing found for ZZZZ." });
              setSubmitted(null);
              return;
            }
            setErrors({});
            setSubmitted(values);
          }}
        >
          <FormField name="symbol" label="Symbol" required>
            <Input placeholder="AAPL" autoComplete="off" />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField name="direction" label="When price">
              <Select items={directions} defaultValue="above">
                <SelectTrigger />
                <SelectContent>
                  <SelectItem value="above">Moves above</SelectItem>
                  <SelectItem value="below">Moves below</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField name="price" label="Price" required>
              <NumberField min={0.01} step={0.01} format={{ style: "currency", currency: "USD" }} />
            </FormField>
          </div>

          <div className="grid gap-2">
            <span id="alert-window" className="text-sm font-semibold text-foreground">
              Check every
            </span>
            <SegmentedControl
              name="window"
              defaultValue="1m"
              aria-labelledby="alert-window"
              size="sm"
              className="justify-self-start"
            >
              <SegmentedControlItem value="1m">1 min</SegmentedControlItem>
              <SegmentedControlItem value="5m">5 min</SegmentedControlItem>
              <SegmentedControlItem value="1h">1 hour</SegmentedControlItem>
            </SegmentedControl>
          </div>

          <Field name="channel">
            <Fieldset render={<RadioGroup defaultValue="app" orientation="horizontal" />}>
              <FieldsetLegend>Notify by</FieldsetLegend>
              <FieldItem>
                <Radio value="app" />
                <FieldLabel className="font-normal">In app</FieldLabel>
              </FieldItem>
              <FieldItem>
                <Radio value="email" />
                <FieldLabel className="font-normal">Email</FieldLabel>
              </FieldItem>
            </Fieldset>
          </Field>

          <FormField name="note" label="Note" description="Only you see this.">
            <Textarea autoResize placeholder="Breakout above the 50-day high" />
          </FormField>

          <Field name="repeat">
            <FieldLabel className="flex items-center justify-between gap-6">
              Repeat after firing
              <Switch />
            </FieldLabel>
          </Field>

          <Field name="terms" required>
            <FieldLabel className="flex items-center gap-3 font-normal">
              <Checkbox />
              Alerts are informational, not trade instructions.
            </FieldLabel>
            <FieldDescription className="pl-8">Required to create alerts.</FieldDescription>
          </Field>

          <div className="flex gap-3">
            <Button type="submit">Create alert</Button>
            <Button type="reset" variant="ghost">
              Reset
            </Button>
          </div>
        </Form>

        {submitted ? (
          <pre className="m-0 overflow-auto rounded-md bg-surface-muted p-4 font-mono text-xs text-secondary">
            {JSON.stringify(submitted, null, 2)}
          </pre>
        ) : null}
      </div>
    );
  },
};
