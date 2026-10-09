import { describe, expect, test } from "@rstest/core";
import "dotenv/config";
import { Client } from "../src";

describe("aria2", async () => {
  const { ARIA2_DOWNLOAD_DIR: dir, ARIA2_RPC_SECRET: secret } = process.env;
  const client = new Client({ secret });
  await client.connect();

  client.on("onDownloadStart", (event) => {
    console.info("开始下载：", event.detail);
  });

  client.on("onDownloadComplete", (event) => {
    console.info("下载完成：", event.detail);
  });

  test("getVersion", async () => {
    const res = await client.getVersion();
    console.info("获取版本信息：", res);
  });

  test("addUri", async () => {
    const uris = "";
    const options = { dir };
    const res = await client.addUri(uris, options);
    console.info("创建任务：", res);
  });
});
