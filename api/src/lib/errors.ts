import type { Response } from "express";

export function badRequest(res: Response, message: string): void {
  res.status(400).json({ error: message });
}

export function notFound(res: Response, message: string): void {
  res.status(404).json({ error: message });
}
