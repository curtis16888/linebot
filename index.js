import express from "express";
import { Client, middleware } from "@line/bot-sdk";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

const client = new Client(config);

app.post("/webhook", middleware(config), async (req, res) => {
  const events = req.body.events;

  for (const event of events) {
    if (event.type === "message" && event.message.type === "text") {
      const text = event.message.text.trim();
      const lineId = event.source.userId;

      if (text === "@@**") {
        await fetch(process.env.SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lineId, keyword: text })
        });

        await client.replyMessage(event.replyToken, {
          type: "text",
          text: "success！"
        });
      }
    }
  }

  res.sendStatus(200);
});

app.listen(3000, () => console.log("LINE Bot executing at port 3000"));
