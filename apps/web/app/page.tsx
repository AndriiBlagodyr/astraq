import { Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { AstraqLogo } from "./components/AstraqLogo";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.copyBlock}>
          <Stack gap="lg">
            <div className={styles.brandRow}>
              <div className={styles.brandBadge}>
                <div className={styles.brandBadgeCore} />
              </div>
              <Text className={styles.kicker}>Astraq</Text>
            </div>
            <Title order={1} className={styles.title}>
              Trading visuals, predictions, and account flows in one frontend.
            </Title>
            <Text size="lg" c="dimmed" maw={680}>
              A sharper identity for the product layer: orbital signal paths, chart-like momentum, and a
              branded mark that feels alive on the front page while staying still in the browser tab.
            </Text>
            <Group>
              <Button size="md" radius="xl">
                Open Dashboard
              </Button>
              <Button size="md" radius="xl" variant="light">
                View Predictions
              </Button>
            </Group>
          </Stack>
        </div>

        <div className={styles.logoPanel}>
          <div className={styles.logoGlow} />
          <AstraqLogo className={styles.logo} />
          <div className={styles.logoMeta}>
            <Text className={styles.metaLabel}>Brand signal</Text>
            <Text className={styles.metaValue}>Animated SVG hero mark</Text>
          </div>
        </div>

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
