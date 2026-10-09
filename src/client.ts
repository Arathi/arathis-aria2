import pino from "pino";
import { WebSocket } from "ws";
import { v4 as nextUUID } from "uuid";

import type {
  ID,
  Options,
  Request,
  Response,
  CallbackParameters,
  GetSessionInfoResult,
  GetVersionResult,
  AddUriResult,
  StatusKey,
  Status,
  GetGlobalStatResult,
} from "./schema";

type ClientOptions = {
  ssl?: boolean;
  host?: string;
  port?: number;
  path?: string;
  secret?: string;
  idType?: IDType;
};

type Resolve<RST = any> = (response: Response<RST>) => void;

type Reject<RSN = any> = (reason: RSN) => void;

type Timer = ReturnType<typeof setTimeout>;

type PendingRequest<RST = any, RSN = any> = {
  method: string;
  resolve: Resolve<RST>;
  reject: Reject<RSN>;
  timer: Timer;
};

type ChangePositionHow = "POS_SET" | "POS_CUR" | "POS_END";
type IDType = "sequence" | "uuid";

type DownloadEvent = CustomEvent<CallbackParameters>;
type DownloadEventHandler = (event: DownloadEvent) => void;
type EventHandler = (event: Event) => void;
type EventType =
  | "aria2.onDownloadStart"
  | "aria2.onDownloadPause"
  | "aria2.onDownloadStop"
  | "aria2.onDownloadComplete"
  | "aria2.onDownloadError"
  | "onDownloadStart"
  | "onDownloadPause"
  | "onDownloadStop"
  | "onDownloadComplete"
  | "onDownloadError";

const DEFAULT_HOST = "localhost";
const DEFAULT_PORT = 6800;
const DEFAULT_PATH = "jsonrpc";
const DEFAULT_ID_TYPE: IDType = "sequence";

const log = pino({
  level: "info",
});

export class Client extends EventTarget {
  ssl: boolean;
  host: string;
  port: number;
  path: string;
  secret?: string;
  idType: IDType;

  pendingRequests: Record<ID, PendingRequest>;
  sequence: number;
  ws?: WebSocket;
  sessionId?: string;

  constructor({
    ssl = false,
    host = DEFAULT_HOST,
    port = DEFAULT_PORT,
    path = DEFAULT_PATH,
    secret,
    idType = DEFAULT_ID_TYPE,
  }: ClientOptions = {}) {
    super();
    this.ssl = ssl;
    this.host = host;
    this.port = port;
    this.path = path;
    this.secret = secret;
    this.idType = idType;

    this.pendingRequests = {};
    this.sequence = 0;
  }

  get address() {
    const protocol = this.ssl ? "wss" : "ws";
    const host = this.host ?? DEFAULT_HOST;
    const port = this.port ?? DEFAULT_PORT;
    const path = this.path ?? DEFAULT_PATH;
    return `${protocol}://${host}:${port}/${path}`;
  }

  get token() {
    if (this.secret == null) return null;
    return `token:${this.secret}`;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.address);

      ws.on("open", () => {
        this.getSessionInfo(ws).then((res) => {
          const { result, error } = res;
          if (result != null) {
            const sessionId = result.sessionId;
            log.info(`连接成功，会话ID: ${sessionId}`);
            this.ws = ws;
            this.sessionId = sessionId;
            resolve(sessionId);
          }
          if (error != null) {
            const reason = new Error(`WebSocket 连接失败：${error.message}`);
            log.error(reason);
            reject(reason);
          }
        });
      });

      ws.on("close", () => {
        log.info(`连接断开: ${this.sessionId}`);
        this.ws = undefined;
        this.sessionId = undefined;
      });

      ws.on("error", () => {
        log.error(`连接出错: ${this.sessionId}`);
        this.ws = undefined;
        this.sessionId = undefined;
      });

      ws.on("message", (data) => {
        const json = data.toString();
        log.debug(`接收到报文：${json}`);
        try {
          const message = JSON.parse(json);
          this.onMessage(message);
        } catch (ex) {
          log.error(ex, "报文解析失败！");
        }
      });
    });
  }

  private nextId(): ID {
    if (this.idType == "sequence") return this.nextSequence();
    return nextUUID();
  }

  private nextSequence() {
    return ++this.sequence;
  }

  private onMessage(message: any) {
    const { method, result, error } = message;
    if (method != null) {
      this.onRequestMessage(message as Request);
      return;
    }
    if (result != null || error != null) {
      this.onResponseMessage(message as Response);
      return;
    }
  }

  private onRequestMessage(request: Request) {
    const { method, params } = request;
    switch (method) {
      case "aria2.onDownloadStart":
      case "aria2.onDownloadPause":
      case "aria2.onDownloadStop":
      case "aria2.onDownloadComplete":
      case "aria2.onDownloadError":
        const event = new CustomEvent(method, { detail: params });
        this.dispatchEvent(event);
        break;
    }
  }

  private onResponseMessage(response: Response) {
    const pendingRequest = this.pendingRequests[response.id];
    if (pendingRequest == null) {
      return;
    }
    delete this.pendingRequests[response.id];

    const { resolve, timer } = pendingRequest;
    clearTimeout(timer);
    resolve(response);
  }

  // #region event
  on(type: EventType, handler: EventHandler) {
    let eventName = type;
    switch (type) {
      case "onDownloadStart":
      case "onDownloadPause":
      case "onDownloadStop":
      case "onDownloadComplete":
      case "onDownloadError":
        eventName = `aria2.${type}`;
        break;
    }
    this.addEventListener(eventName, handler);
  }

  onDownloadStart(handler: DownloadEventHandler) {
    this.on("onDownloadStart", handler as EventHandler);
  }

  onDownloadPause(handler: DownloadEventHandler) {
    this.on("onDownloadPause", handler as EventHandler);
  }

  onDownloadStop(handler: DownloadEventHandler) {
    this.on("onDownloadStop", handler as EventHandler);
  }

  onDownloadComplete(handler: DownloadEventHandler) {
    this.on("onDownloadComplete", handler as EventHandler);
  }

  onDownloadError(handler: DownloadEventHandler) {
    this.on("onDownloadError", handler as EventHandler);
  }
  // #endregion

  call<RST = any>(
    method: string,
    inputParams: any[] = [],
    timeout: number = 30000,
    webSocket?: WebSocket,
  ): Promise<Response<RST>> {
    return new Promise((resolve, reject) => {
      const ws = webSocket ?? this.ws;

      if (ws == null) {
        reject(new Error("WebSocket 连接未创建"));
        return;
      }

      const params: any[] = [];
      if (this.token != null) {
        params.push(this.token);
      }
      params.push(...inputParams);

      const jsonrpc = "2.0";
      const id = this.nextId();
      const request = {
        jsonrpc,
        id,
        method,
        params,
      } satisfies Request;
      const data = JSON.stringify(request);

      const timer = setTimeout(() => {
        delete this.pendingRequests[id];
        reject(new Error("请求超时"));
      }, timeout);

      const pendingRequest = {
        method,
        resolve,
        reject,
        timer,
      } satisfies PendingRequest;
      this.pendingRequests[id] = pendingRequest;

      ws.send(data);
    });
  }

  // #region methods
  addUri(uris: string | string[], options: Options = {}, position?: number) {
    const uriArray: string[] = [];
    if (typeof uris == "string") {
      uriArray.push(uris);
    } else {
      uriArray.push(...uris);
    }

    const params: any[] = [uriArray, options];
    if (position != null) {
      params.push(position);
    }

    return this.call<AddUriResult>("aria2.addUri", params);
  }

  pause(gid: string, force: boolean = false) {
    const method = force ? "aria2.forcePause" : "aria2.pause";
    return this.call(method, [gid]);
  }

  forcePause(gid: string) {
    return this.pause(gid, true);
  }

  pauseAll(force: boolean = false) {
    const method = force ? "aria2.forcePauseAll" : "aria2.pauseAll";
    return this.call(method);
  }

  forcePauseAll() {
    return this.pauseAll(true);
  }

  unpause(gid: string) {
    return this.call("aria2.unpause", [gid]);
  }

  unpauseAll() {
    return this.call("aria2.unpauseAll");
  }

  tellStatus(gid: string, keys?: StatusKey[]) {
    const params: any[] = [gid];
    if (keys != null) {
      params.push(keys);
    }
    return this.call<Status>("aria2.tellStatus", params);
  }

  tellActive(keys?: StatusKey[]) {
    const params: any[] = [];
    if (keys != null) {
      params.push(keys);
    }
    return this.call<Status[]>("aria2.tellActive", params);
  }

  tellWaiting(offset: number, num: number, keys?: StatusKey[]) {
    const params: any[] = [offset, num];
    if (keys != null) {
      params.push(keys);
    }
    return this.call<Status[]>("aria2.tellWaiting", params);
  }

  tellStopped(offset: number, num: number, keys?: StatusKey[]) {
    const params: any[] = [offset, num];
    if (keys != null) {
      params.push(keys);
    }
    return this.call<Status[]>("aria2.tellStopped", params);
  }

  changePosition(gid: string, pos: number, how: ChangePositionHow) {
    const params: any[] = [gid, pos, how];
    return this.call("aria2.changePosition", params);
  }

  getOption(gid: string) {
    return this.call<Options>("aria2.getOption", [gid]);
  }

  changeOption(gid: string, options: Options) {
    return this.call("aria2.changeOption", [gid, options]);
  }

  getGlobalOption() {
    return this.call<Options>("aria2.getGlobalOption");
  }

  changeGlobalOption(options: Options) {
    return this.call("aria2.changeGlobalOption", [options]);
  }

  getGlobalStat() {
    return this.call<GetGlobalStatResult>("aria2.getGlobalStat");
  }

  getVersion() {
    return this.call<GetVersionResult>("aria2.getVersion");
  }

  getSessionInfo(ws?: WebSocket) {
    return this.call<GetSessionInfoResult>(
      "aria2.getSessionInfo",
      [],
      1000,
      ws,
    );
  }

  listMethods() {
    return this.call<string[]>("system.listMethods");
  }

  listNotifications() {
    return this.call<string[]>("system.listNotifications");
  }
  // #endregion
}
