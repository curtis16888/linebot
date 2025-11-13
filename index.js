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

// ➤ LINE 顯示名稱對照表（你在這裡填真實名字）
const displayNameMap = {
  "U5732372307f3bf9ce8274a8fa8f29e28": "思揚",
  "U10091b695d5dee103bed9965b714715d": "文菱",
  "Uxxxx1234567890aaaaaa": "小明",
  "Uyyyy111122223333bbbb": "Curtis",
  "Czzzz88889999aaaa5555": "活動群組",
  // 繼續加...
};

// ➤ 健康檢查
app.get("/webhook", (req, res) => res.status(200).send("OK"));

// ➤ 主 Webhook 處理邏輯
app.post("/webhook", middleware(config), async (req, res) => {
  for (const event of req.body.events || []) {
    if (event.type !== "message" || event.message.type !== "text") continue;

    const text = event.message.text.trim();
    const upper = text.toUpperCase();

    // ➤ 必須符合關鍵字 @@**
    if (!upper.startsWith("@@**")) continue;

    let lineId = "";
    let displayName = "";
    const src = event.source;

    try {
      // -----------------------------
      // 來源在「私訊」
      // -----------------------------
      if (src.type === "user") {
        lineId = src.userId;
        displayName = displayNameMap[lineId] || "NA";
      }

      // -----------------------------
      // 來源在「群組」
      // -----------------------------
      else if (src.type === "group") {
        if (src.userId) {
          // 成員有加好友 → 取得 userId（個人）
          lineId = src.userId;
          displayName = displayNameMap[lineId] || "NAGROUP";
        } else {
          // 成員沒加好友 → 只能存群組 ID
          lineId = src.groupId;
          displayName = displayNameMap[lineId] || "(群組訊息)";
        }
      }

      // -----------------------------
      // 來源在「多人聊天室」
      // -----------------------------
      else if (src.type === "room") {
        if (src.userId) {
          lineId = src.userId;
          displayName = displayNameMap[lineId] || "NAROOM";
        } else {
          lineId = src.roomId;
          displayName = displayNameMap[lineId] || "(聊天室訊息)";
        }
      }

      // -----------------------------
      // 寫入 Google Sheet
      // -----------------------------
      await fetch(process.env.SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineId,
          displayName,
          message: text
        })
      });

      console.log(`Saved => ${displayName} (${lineId}) : ${text}`);

    } catch (err) {
      console.error("寫入失敗：", err);
    }
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Keyword Bot running at ${PORT}`));
