import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createApp, type AppActionJsonManifest, type AppBrowserShellOptions } from "../../src/index.js";
import { weatherFormRenderer } from "./form-renderer.js";

const root = dirname(fileURLToPath(import.meta.url));
const template = readFileSync(join(root, "app", "index.md"), "utf8");
const actionJson = JSON.parse(readFileSync(join(root, "app", "index.action.json"), "utf8")) as AppActionJsonManifest;

interface WeatherQuery {
  location?: string;
  units?: "metric" | "imperial";
  include_alerts?: boolean;
}

function renderForecast(query: WeatherQuery) {
  const location = String(query.location ?? "Hangzhou");
  const units = query.units === "imperial" ? "imperial" : "metric";
  const includeAlerts = query.include_alerts === true;
  const temperature = units === "imperial" ? "72F" : "22C";
  const wind = units === "imperial" ? "9 mph" : "14 km/h";
  const advisory = includeAlerts ? "\n- Advisory: Light coastal gusts after 18:00." : "";

  return `## Forecast
- Location: ${location}
- Temperature: ${temperature}
- Wind: ${wind}${advisory}`;
}

export function createFormCustomizationServer(
  browserShell: AppBrowserShellOptions = {
    title: "MDAN Form Customization"
  }
) {
  const app = createApp({
    appId: "form-customization",
    browserShell,
    rendering: {
      form: weatherFormRenderer
    }
  });

  const home = app.page("/", {
    markdown: template,
    actionJson,
    render(query: WeatherQuery = {}) {
      return {
        main: renderForecast(query)
      };
    }
  });

  app.route(home.bind({ location: "Hangzhou", units: "metric", include_alerts: false }));

  app.read("/", ({ inputs }) => {
    return home.bind({
      location: typeof inputs.location === "string" ? inputs.location : "Hangzhou",
      units: inputs.units === "imperial" ? "imperial" : "metric",
      include_alerts: inputs.include_alerts === true
    }).render();
  });

  return app;
}
