import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.chu1503.invisiblepatient",
  appName: "Invizy",
  webDir: ".capacitor-build/out",
  backgroundColor: "#F9FAF7",
  loggingBehavior: "debug",
  appendUserAgent: " Invizy/1.0",
  android: {
    allowMixedContent: false,
    backgroundColor: "#F9FAF7",
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SystemBars: {
      insetsHandling: "css",
      style: "DARK",
    },
  },
};

export default config;
