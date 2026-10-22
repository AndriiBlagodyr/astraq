import Link from "next/link";
import { buttonVariants } from "@astraq/ui";
import { StatusPanel } from "@/app/components/StatusPanel";

export default function NotFound() {
  return (
    <StatusPanel
      eyebrow="404"
      title="Page not found"
      description="This page doesn't exist. Veracand adds pages as each one gets real data, so an old link may point to one that was removed."
    >
      <Link href="/" className={buttonVariants()}>
        Back to Today
      </Link>
    </StatusPanel>
  );
}
