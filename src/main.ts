import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";

const resourcesDir = "resources";
const tmpDir = "tmp";
const outputDir = "output";

if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

function addSubtitle(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // 请根据系统调整字体路径
    const fontfile = "/System/Library/Fonts/Supplemental/Arial.ttf";

    const subtitles = [
      { text: "subtitle 1", start: 1, end: 3 },
      { text: "subtitle 22", start: 5, end: 10 },
      { text: "subtitle 333", start: 12, end: 18 },
      { text: "subtitle 4444", start: 20, end: 25 },
      { text: "subtitle 55555", start: 28, end: 33 },
      { text: "subtitle 666666", start: 36, end: 40 },
      { text: "subtitle 7777777", start: 45, end: 60 },
      { text: "subtitle 88888888", start: 65, end: 70 },
      { text: "subtitle 999999999", start: 70, end: 75 },
    ];

    const videoFilters = subtitles.map((e) => {
      return {
        filter: "drawtext",
        options: {
          fontfile,
          text: e.text,
          fontsize: 24,
          fontcolor: "white",
          box: 1,
          boxcolor: "black@0.5",
          boxborderw: 8,
          x: "(w-text_w)/2",
          y: "h-80",
          enable: `between(t,${e.start},${e.end})`,
        },
      };
    });

    ffmpeg(inputPath)
      .videoFilters(videoFilters)
      .videoCodec("libx264")
      .outputOptions([
        "-preset veryfast",
        "-crf 18",
        "-pix_fmt yuv420p",
        "-r 25", // 目标帧率
      ])
      .audioCodec("aac")
      .audioBitrate("128k")
      .on("start", (cmd) => {
        console.log("ffmpeg (subtitle) cmd:", cmd);
      })
      .on("stderr", (line) => {
        console.log("[ffmpeg-subtitle err]", line);
      })
      .on("end", () => {
        console.log("生成带字幕文件:", outputPath);
        resolve();
      })
      .on("error", (err, stdout, stderr) => {
        console.error("addSubtitle error:", err.message);
        reject(err);
      })
      .save(outputPath);
  });
}

async function transcodeVideos() {
  const files = fs.readdirSync(resourcesDir).filter((f) => f.endsWith(".mp4"));

  for (const file of files) {
    const inputPath = path.join(resourcesDir, file);
    const outputPath = path.join(tmpDir, file);

    console.log(`▶️ 转码: ${file}`);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          "-c:v libx264",
          "-c:a aac",
          "-ar 44100", // 音频采样率
          "-ac 2", // 音频声道
        ])
        .on("error", (err) => {
          console.error(`❌ 转码失败: ${file}`, err.message);
          reject(err);
        })
        .on("end", () => {
          console.log(`✅ 转码完成: ${file}`);
          resolve();
        })
        .save(outputPath);
    });
  }

  console.log("🎉 所有视频转码完成！");
}

function concatVideosWithFilter(
  inputFiles: string[],
  outputFile: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (inputFiles.length === 0) {
      return reject(new Error("视频文件列表为空"));
    }

    const listFilePath = path.resolve(__dirname, "filelist.txt");
    const fileListContent = inputFiles
      .map((file) => `file '${path.resolve(file)}'`)
      .join("\n");

    fs.writeFileSync(listFilePath, fileListContent);

    ffmpeg()
      .input(listFilePath)
      .inputOptions(["-f concat", "-safe 0"])
      .outputOptions(["-c:v libx264", "-c:a aac"])
      .on("start", (cmd) => console.log("exec cmd：", cmd))
      .on("progress", (progress) => {
        if (progress.percent) {
          process.stdout.write(`\r进度：${progress.percent.toFixed(2)}%`);
        }
      })
      .on("error", (err) => {
        console.error("\n❌ 合并失败：", err.message);
        fs.unlinkSync(listFilePath);
        reject(err);
      })
      .on("end", () => {
        console.log("\n✅ 合并完成:", outputFile);
        fs.unlinkSync(listFilePath);
        resolve();
      })
      .save(outputFile);
  });
}

async function main() {
  try {
    await transcodeVideos();

    console.log("▶️ 开始处理...");

    const resources: string[] = [];

    for (let i = 0; i < new Array(9).fill(null).length; i++) {
      const tempOutput = path.join(tmpDir, `${i + 1}.mp4`);
      resources.push(tempOutput);
    }

    const finalOutput = path.join(outputDir, "final.mp4");

    console.log("开始合并（filter_complex concat）...");
    await concatVideosWithFilter(resources, finalOutput);

    console.log("✅ 完成合并！输出文件:", finalOutput);

    const finalWithSubtitleOutput = path.join(
      outputDir,
      "final_with_subtitle.mp4"
    );
    await addSubtitle(finalOutput, finalWithSubtitleOutput);
    console.log("✅ 完成添加字幕！输出文件:", finalWithSubtitleOutput);
  } catch (err) {
    console.error("❌ Failure: ", err);
  }
}

main();
