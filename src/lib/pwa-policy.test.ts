import { describe, expect, it } from "vitest";
import { shouldDisableAppWorker } from "./pwa-policy";

const published = { production: true, hostname: "dor-cu-drumul-plan.lovable.app", embedded: false, search: "" };
describe("app-shell worker safety", () => {
  it("allows the published app and custom domains", () => {
    expect(shouldDisableAppWorker(published)).toBe(false);
    expect(shouldDisableAppWorker({ ...published, hostname: "preview-v2--shop.example.com" })).toBe(false);
  });
  it("refuses development and embedded previews", () => {
    expect(shouldDisableAppWorker({ ...published, production: false })).toBe(true);
    expect(shouldDisableAppWorker({ ...published, embedded: true })).toBe(true);
  });
  it("refuses every supported preview hostname including built previews", () => {
    for (const hostname of [
      "id-preview--efcddd7c-33c1-4f66-99d8-1651ac9cd48a.lovable.app",
      "PREVIEW-V2--app.gpt-eng.com", "preview--app.gptengineer.run",
      "project--abc-dev.lovable.app", "lovableproject.com",
      "app.lovableproject-dev.com", "app.beta.lovable.dev",
    ]) expect(shouldDisableAppWorker({ ...published, hostname })).toBe(true);
  });
  it("honors the explicit sw=off kill switch", () => {
    expect(shouldDisableAppWorker({ ...published, search: "?sw=off" })).toBe(true);
    expect(shouldDisableAppWorker({ ...published, search: "?sw=on" })).toBe(false);
  });
});