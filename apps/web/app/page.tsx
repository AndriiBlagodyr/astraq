import { Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Stack gap="lg">
          <Text className={styles.kicker}>Astraq</Text>
          <Title order={1} className={styles.title}>
            Trading visuals, predictions, and account flows in one frontend.
          </Title>
          <Text size="lg" c="dimmed" maw={680}>
            Mantine is wired in for product UI components, while the app styling stays in CSS Modules without
            Tailwind.
          </Text>
          <Group>
            <Button size="md" radius="xl">Open Dashboard</Button>
            <Button size="md" radius="xl" variant="light">View Predictions</Button>
          </Group>
        </Stack>

        <div className={styles.grid}>
          <Card className={styles.card} radius="xl" padding="xl">
            <Text fw={700}>Authentication</Text>
            <Text c="dimmed">Sign up, sign in, and secure account flows.</Text>
          </Card>
          <Card className={styles.card} radius="xl" padding="xl">
            <Text fw={700}>Charting</Text>
            <Text c="dimmed">Use lightweight-charts for price action and D3 for custom visuals.</Text>
          </Card>
          <Card className={styles.card} radius="xl" padding="xl">
            <Text fw={700}>Predictions</Text>
            <Text c="dimmed">Connect the API and ML service into analysis dashboards.</Text>
          </Card>
        </div>
      </section>
    </main>
  );
}
