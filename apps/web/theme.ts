import { createTheme, type MantineColorsTuple } from "@mantine/core";

const signal: MantineColorsTuple = [
  "#e1feff",
  "#cbfbff",
  "#9ff7ff",
  "#71f2ff",
  "#4ceeff",
  "#34e8fb",
  "#26d0e1",
  "#17b4c4",
  "#0097a6",
  "#007a86",
];

const trade: MantineColorsTuple = [
  "#e9efff",
  "#d4ddff",
  "#a8bbff",
  "#7b98ff",
  "#5a7dfb",
  "#466cef",
  "#385cd9",
  "#294cc1",
  "#1f3ea8",
  "#17328b",
];

const market: MantineColorsTuple = [
  "#fff5df",
  "#ffebc6",
  "#ffd38f",
  "#fdbb57",
  "#f7aa30",
  "#f39f17",
  "#d98609",
  "#bc7100",
  "#9b5d00",
  "#7d4b00",
];

const profit: MantineColorsTuple = [
  "#e7fff3",
  "#cffde4",
  "#9ef7c7",
  "#6ff0aa",
  "#49ea8f",
  "#34e27d",
  "#25c56a",
  "#18a758",
  "#0c8847",
  "#006d38",
];

const risk: MantineColorsTuple = [
  "#ffe8eb",
  "#ffd0d6",
  "#ff9eac",
  "#ff6c81",
  "#ff435f",
  "#ff2948",
  "#e71b39",
  "#c80e2d",
  "#a90023",
  "#8a001b",
];

export const theme = createTheme({
  primaryColor: "signal",
  primaryShade: 5,
  defaultRadius: "lg",
  fontFamily: 'var(--font-sans)',
  headings: {
    fontFamily: 'var(--font-display)',
    fontWeight: "700",
  },
  colors: {
    signal,
    trade,
    market,
    profit,
    risk,
    dark: [
      "#c8d0df",
      "#afb8cb",
      "#929db3",
      "#7c8aa3",
      "#66758f",
      "#51627c",
      "#3d4f69",
      "#293c56",
      "#162942",
      "#071625",
    ],
  },
  defaultGradient: {
    from: "signal.4",
    to: "market.4",
    deg: 135,
  },
  components: {
    Button: {
      defaultProps: {
        radius: "xl",
      },
    },
    Card: {
      defaultProps: {
        radius: "xl",
        shadow: "sm",
      },
    },
    Paper: {
      defaultProps: {
        radius: "xl",
      },
    },
  },
});
