import express from "express";
import cors from "cors";
import AgentRouter from "./routes/graph";
import { env } from "./utils/env";

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    credentials: false,
  })
);

app.use("/agent", AgentRouter);

app.listen(env.PORT, () => {
  console.log(`Server is now running on port: ${env.PORT}`);
});
