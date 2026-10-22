import { Spinner } from "@astraq/ui";
import { StatusPanel } from "@/app/components/StatusPanel";

export default function Loading() {
  return (
    <StatusPanel eyebrow="Loading" title="Loading Veracand">
      <Spinner size="lg" label="Loading" className="text-brand" />
    </StatusPanel>
  );
}
