global.navigator = { userAgent: "node.js" };

import { config } from "dotenv";
config();

import fs from "fs";
import util from "util";
import { Client } from "discord.js-selfbot-v13";
import { Streamer, streamLivestreamVideo } from "@dank074/discord-video-stream";

import { exec } from "child_process";
const execPromise = util.promisify(exec);

const client = new Client({ checkUpdate: false });

const GUILD_ID = "1227932764117143642";
const VOICE_CHANNEL_ID = "1259208320187760726";


process.env.FFMPEG_PATH = "/usr/bin/ffmpeg";

const STREAM_URL_MODE = true; 
// if you put true here, it will stream the stream url and if you put false, it will stream the video url after downloading it
const STREAM_URL = "";
// if you put a stream url here, it will stream it directly
const VIDEO_URL = "";
// if you put a video url here, it will download the video and stream it
const LOCAL_FILE = "./video.mp4";

async function downloadVideo(url, dest) {
  if (fs.existsSync(dest)) {
    console.log("Video is available locally");
    return;
  }
  console.log("Video is loading");
  try {
    await execPromise(`wget -O "${dest}" "${url}"`);
    console.log("Downloaded");
  } catch (error) {
    console.error("Video loading failed:", error);
    throw error;
  }
}

async function start() {
  try {
    await client.login(process.env.bot2_TOKEN);
    console.log(`logged in: ${client.user.tag}`);

    let inputSource = "";

    if (STREAM_URL_MODE) {
      console.log("✅ STREAM_URL");
      inputSource = STREAM_URL;
    } else {
      console.log("Download video After streaming it");
      await downloadVideo(VIDEO_URL, LOCAL_FILE);
      inputSource = LOCAL_FILE;
    }

    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) {
      console.error("did not find the server");
      return;
    }

    const channel = guild.channels.cache.get(VOICE_CHANNEL_ID);
    if (!channel) {
      console.error("did not find the voice channel");
      return;
    }

    const streamer = new Streamer(client);
    await streamer.joinVoice(GUILD_ID, VOICE_CHANNEL_ID);
    console.log("joined to voice channel");

    

    const udp = await streamer.createStream({
      width: 1280,
      height: 720,
      fps: 30,
      bitrateKbps: 2500,
      h26xPreset: "ultrafast",
      ffmpegPath: process.env.FFMPEG_PATH,
      minimizeLatency: true,
    });

    udp.mediaConnection.setVideoStatus(true);
    udp.mediaConnection.setSpeaking(true);
    console.log("streaming started");

    await new Promise(resolve => setTimeout(resolve, 3000));

    const result = await streamLivestreamVideo(inputSource, udp, {
      ffmpegPath: process.env.FFMPEG_PATH,
      ffmpegArgs: [
        "-fflags", "+genpts",
        "-re",
        "-i", inputSource,
        "-async", "1",
        "-vsync", "1",
        "-flush_packets", "1",
        "-max_interleave_delta", "0",
        "-preset", "ultrafast",
        "-g", "60",
        "-r", "30",
        "-pix_fmt", "yuv420p",
        "-f", "mpegts",
        "-codec:v", "libx264",
        "-b:v", "2500k",
        "-bufsize", "2500k",
        "-maxrate", "2500k",
        "-codec:a", "aac",
        "-ar", "44100",
        "-ac", "2",
        "-b:a", "128k",
        "pipe:1"
      ]
    });

    console.log("streaming ended:", result);

    udp.mediaConnection.setSpeaking(false);
    udp.mediaConnection.setVideoStatus(false);
    console.log("streaming stopped");

  } catch (error) {
    console.error("mistake:", error);
  }
}

start();