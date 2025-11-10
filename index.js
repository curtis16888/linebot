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

// ➤ 用來測試 webhook 是否能通
app.get("/webhook", (req, res) => {
  res.status(200).send("OK");
});

// ➤ 處理 LINE webhook 事件
app.post("/webhook", middleware(config), async (req, res) => {
  console.log("[Webhook] events:", req.body?.events?.length ?? 0);

  for (const event of req.body.events || []) {
    if (event.type === "message" && event.message.type === "text") {
      const text = event.message.text.trim();
      const lineId = event.source.userId;

      // ✅ 無論什麼訊息先回覆回音，方便測試
      await client.replyMessage(event.replyToken, {
        type: "text",
        text: `收到：${text}`,
      });

      // ✅ 關鍵字條件（可自行新增更多）
      const normalized = text.toUpperCase();
      if (normalized.startsWith("@@**")) {
        try {
          // 取得使用者基本資料
          let displayName = "";
          if (event.source.type === "user") {
            const profile = await client.getProfile(event.source.userId);
            displayName = profile.displayName || "";
          } else {
            displayName = "(群組成員)";
          }
      
          await fetch(process.env.SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lineId,             // 原始的 userId
              displayName,        // 顯示名稱
              keyword: "@@**",
              message: text,      // 完整訊息
            }),
          });
      
          await client.pushMessage(lineId, {
            type: "text",
            text: `✅ ${displayName}，已登記成功！`,
          });
        } catch (e) {
          console.error("寫入 Google Sheet 失敗：", e);
          await client.pushMessage(lineId, {
            type: "text",
            text: "⚠️ 寫入失敗，請稍後再試。",
          });
        }
      }

  res.sendStatus(200);
});

// ➤ Render / 本地啟動設定
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 LINE Bot executing at port ${PORT}`));
