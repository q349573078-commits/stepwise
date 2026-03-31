import { Router } from "express";
import { z } from "zod";
import { streamAgentRun, streamResumeAgentRun } from "../graph/graph";

const router = Router();

const StartSchema = z.object({
  input: z.string().min(1, "Input is needed"),
});

const ApproveSchema = z.object({
  threadId: z.string().min(1, "threadId is required"),
  approve: z.boolean(),
});

router.post("/", async (req, res) => {
  const parsed = StartSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      status: "error",
      error: "Error while parsing input",
    });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const stream = await streamAgentRun(parsed.data.input);
    for await (const chunk of stream) {
      res.write(`event: chunk\n`);
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }
  } catch (e) {
    console.error("Error in agent stream:", e);
    const errorPayload = {
      event: "error",
      data: JSON.stringify({
        error: "An error occurred during agent execution.",
      }),
    };
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify(errorPayload)}\n\n`);
  } finally {
    res.end();
  }
});

router.post("/approve", async (req, res) => {
  const parsed = ApproveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      status: "error",
      error: "Error while parsing input",
    });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const { threadId, approve } = parsed.data;
    const stream = await streamResumeAgentRun({ threadId, approve });
    for await (const chunk of stream) {
      res.write(`event: chunk\n`);
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }
  } catch (e) {
    console.error("Error in agent resume stream:", e);
    const errorPayload = {
      event: "error",
      data: JSON.stringify({
        error: "An error occurred during agent execution.",
      }),
    };
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify(errorPayload)}\n\n`);
  } finally {
    res.end();
  }
});

export default router;
