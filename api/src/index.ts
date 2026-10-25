import express, { type ErrorRequestHandler } from "express";
import { httpServerHandler } from "cloudflare:node";
import { journeyRouter } from "./routes/journey.js";
import { daysRouter } from "./routes/days.js";
import { peopleRouter } from "./routes/people.js";
import { momentsRouter } from "./routes/moments.js";
import { i18nRouter } from "./routes/i18n.js";

const PORT = 3000;

const app = express();

app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "public, max-age=300");
  next();
});

app.use("/api", journeyRouter);
app.use("/api", daysRouter);
app.use("/api", peopleRouter);
app.use("/api", momentsRouter);

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "not found" });
});

app.use(i18nRouter);

const onError: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "internal error" });
};
app.use(onError);

app.listen(PORT);
export default httpServerHandler({ port: PORT });
