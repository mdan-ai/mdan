import type { MdanHandler, MdanPageHandler } from "./types.js";

export class MdanRouter {
  private readonly getHandlers = new Map<string, MdanHandler>();
  private readonly postHandlers = new Map<string, MdanHandler>();
  private readonly pageHandlers = new Map<string, MdanPageHandler>();

  get(path: string, handler: MdanHandler): void {
    this.getHandlers.set(path, handler);
  }

  post(path: string, handler: MdanHandler): void {
    this.postHandlers.set(path, handler);
  }

  page(path: string, handler: MdanPageHandler): void {
    this.pageHandlers.set(path, handler);
  }

  resolve(method: "GET" | "POST", path: string): MdanHandler | undefined {
    if (method === "GET") {
      return this.getHandlers.get(path);
    }
    return this.postHandlers.get(path);
  }

  resolvePage(path: string): MdanPageHandler | undefined {
    return this.pageHandlers.get(path);
  }
}
