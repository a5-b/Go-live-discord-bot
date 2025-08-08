// تعريف navigator وهمي لتجنب خطأ "navigator is not defined"
global.navigator = { userAgent: "node.js" };

import { config } from "dotenv";
import fs from "fs";
import https from "https";
import { Client } from "discord.js-selfbot-v13";
import { Streamer, streamLivestreamVideo } from "@dank074/discord-video-stream";
import ffmpegPath from "ffmpeg-static";

config();

const client = new Client({ checkUpdate: false });
const streamer = new Streamer(client);

const GUILD_ID = "1279854199798235197";
const VOICE_CHANNEL_ID = "1330949990142709790";
const VIDEO_URL = "https://shahidha.net/files/1158/%5BAnimeiat.co%5DKobayashi-san_Chi_no_Maid_Dragon_-_EP06%5B360p%5D.mp4";
const LOCAL_FILE = "./video.mp4";

async function downloadVideo(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      console.log("📂 الفيديو موجود محلياً، لن يتم تحميله مجددًا.");
      return resolve();
    }
    console.log("⬇️ جاري تحميل الفيديو...");
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        fs.unlink(dest, () => {});
        return reject(new Error(`فشل تحميل الفيديو، رمز الحالة: ${res.statusCode}`));
      }
      res.pipe(file);
      file.on("finish", () => {
        file.close(resolve);
        console.log("✅ تم تحميل الفيديو بنجاح.");
      });
    }).on("error", (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function start() {
  try {
    await client.login(process.env.bot2_TOKEN);
    console.log(`✅ تم تسجيل الدخول كـ ${client.user.username}`);

    await downloadVideo(VIDEO_URL, LOCAL_FILE);

    await streamer.joinVoice(GUILD_ID, VOICE_CHANNEL_ID);
    console.log("✅ تم الانضمام إلى الروم الصوتي");

    const udp = await streamer.createStream({
      width: 640,
      height: 360,
      fps: 24,
      bitrateKbps: 1500,
      h26xPreset: "ultrafast",
      ffmpegPath,
      minimizeLatency: true,
    });

    udp.mediaConnection.setSpeaking(true);
    udp.mediaConnection.setVideoStatus(true);

    const command = await streamLivestreamVideo(LOCAL_FILE, udp);

    command.on("error", (err) => {
      console.error("❌ خطأ في ffmpeg:", err);
    });

    const res = await command;
    console.log("✅ انتهى البث بنجاح:", res);

    udp.mediaConnection.setSpeaking(false);
    udp.mediaConnection.setVideoStatus(false);

  } catch (error) {
    console.error("❌ حدث خطأ:", error);
  }
}

start();