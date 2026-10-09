import { describe, expect, test } from "@rstest/core";
import "dotenv/config";
import { Client } from "../src";

describe("aria2", async () => {
  const { ARIA2_DOWNLOAD_DIR: dir, ARIA2_RPC_SECRET: secret } = process.env;
  const client = new Client({ secret });
  await client.connect();

  client.onDownloadStart((e) => console.info("开始下载：", e.detail));
  client.onDownloadComplete((e) => console.info("下载完成：", e.detail));

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
