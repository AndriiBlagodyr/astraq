import {
  Table,
  TableCaption,
  TableWrap,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from "@astraq/ui";
import { LocalTime } from "@/app/components/LocalTime";
import { attemptText, jobTitle, type QueueJob } from "@/lib/queue";

/**
 * One list of the queue on /admin/queue: what each job is for, when, how
 * often it has been tried, and its last error.
 */
export function QueueJobsTable({
  caption,
  when,
  jobs,
}: {
  caption: string;
  /** The heading of the time column: "Runs", "Started", "Given up". */
  when: string;
  jobs: QueueJob[];
}) {
  return (
    <TableWrap>
      <Table>
        <TableCaption className="sr-only">{caption}</TableCaption>
        <Thead>
          <Tr>
            <Th>Job</Th>
            <Th>{when}</Th>
            <Th>Tries</Th>
            <Th>Last error</Th>
          </Tr>
        </Thead>
        <Tbody>
          {jobs.map((job) => (
            <Tr key={job.id}>
              <Td>
                <span className="grid gap-0.5">
                  <span className="text-foreground">{jobTitle(job)}</span>
                  <code className="text-xs text-muted">{job.id}</code>
                </span>
              </Td>
              <Td className="whitespace-nowrap">
                {job.at ? <LocalTime value={job.at} /> : "—"}
              </Td>
              <Td className="whitespace-nowrap tabular-nums">
                {attemptText(job) ?? "—"}
              </Td>
              <Td>
                {job.error ? (
                  <span className="break-words text-secondary">
                    {job.error}
                  </span>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableWrap>
  );
}
