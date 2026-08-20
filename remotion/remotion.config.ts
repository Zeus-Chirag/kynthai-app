import { Config } from "remotion";

const config: Config = {
  "$schema": "https://remotion.dev/schemas/config.json",
  entry: "src/index.ts",
  publicDir: "./public",
  output: {
    overwrite: true,
  },
};

export default config;
