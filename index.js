import express from "express";
import { Client, middleware } from "@line/bot-sdk";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const app = express();

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};
const client = new Client(config);

// 👉 新增：GET /webhook 用來讓 Verify/健康檢查快速回 200
app.get("/webhook", (req, res) => {
  res.status(200).send("OK");
});

// 你原本的 webhook（保持 POST，並用 LINE middleware）
app.post("/webhook", middleware(config), async (req, res) => {
  console.log("[Webhook] events:", req.body?.events?.length ?? 0);

  for (const event of req.body.events || []) {
    if (event.type === "message" && event.message.type === "text") {
      const text = (event.message.text || "").trim();
      const lineId = event.source.userId;

      // 先做個回音，驗證 webhook 有通
      await client.replyMessage(event.replyToken, { type: "text", text: `收到：${text}` });

      // 你的關鍵字
      if (text.toUpperCase() === "@@**") {
        try {
          await fetch(process.env.SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lineId, keyword: text }),
          });
          await client.pushMessage(lineId, { type: "text", text: "success！" });
        } catch (e) {
          console.error("寫入 Google Sheet 失敗：", e);
          await client.pushMessage(lineId, { type: "text", text: "寫入失敗，稍後重試。" });
        }
      }
    }
  }
  res.sendStatus(200); // 一定回 200
});

const PORT = process.env.PORT || 3000; // Render 會設定 PORT
app.listen(PORT, () => console.log(`LINE Bot executing at port ${PORT}`));
