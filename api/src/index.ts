import express, { type ErrorRequestHandler } from "express";
import { httpServerHandler } from "cloudflare:node";
import { journeyRouter } from "./routes/journey.js";
import { daysRouter } from "./routes/days.js";
import { peopleRouter } from "./routes/people.js";
import { momentsRouter } from "./routes/moments.js";
import { sceneryRouter } from "./routes/scenery.js";
import { unlockRouter } from "./routes/unlock.js";
import { downloadRouter } from "./routes/download.js";
import { configRouter } from "./routes/config.js";
import { i18nRouter } from "./routes/i18n.js";

const PORT = 3000;

const app = express();

// Pre-launch: keep the whole site out of search indexes. Pair with
// web/public/_headers (static assets) and web/public/robots.txt.
// Remove once the group has seen the finished site.
app.use((_req, res, next) => {
  res.set("X-Robots-Tag", "noindex, nofollow");
  next();
});

// Small limit: the only bodies this API ever accepts are an unlock code and
// a caption, both well under 1 KB.
app.use(express.json({ limit: "10kb" }));

app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "public, max-age=300");
  next();
});

app.use("/api", journeyRouter);
app.use("/api", daysRouter);
app.use("/api", peopleRouter);
app.use("/api", momentsRouter);
app.use("/api", sceneryRouter);
app.use("/api", unlockRouter);
app.use("/api", downloadRouter);
app.use("/api", configRouter);

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
