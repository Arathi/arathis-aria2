import { WebSocket } from "ws";

import type { Request, Response, ID } from "./schema";
import { toHex } from "./utils/bytes";
import { nextBytes } from "./utils/random";

type ClientOptions = {
  address?: string;
  secret?: string;
};

type Resolve<P = Response> = (payload: P) => void;
type Reject<R = any> = (reason: R) => void;
type Timer = ReturnType<typeof setTimeout>;
type PendingRequest<P = Response, R = any> = {
  resolve: Resolve<P>;
  reject: Reject<R>;
  timer: Timer;
};

const DEFAULT_ADDRESS = "ws://localhost:6800/jsonrpc";

export class Client<R = any> extends EventTarget {
  address: string;
  secret?: string;
  pendingRequests: Record<ID, PendingRequest<Response, R>>;
  sequence: number;
  ws?: WebSocket;

  constructor({ address = DEFAULT_ADDRESS, secret }: ClientOptions) {
    super();
    this.address = address;
    this.secret = secret;
    this.pendingRequests = {};
    this.sequence = 0;
  }

  get token() {
    if (this.secret == null) return null;
    return `token:${this.secret}`;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.address);
      ws.on("open", () => {
        this.ws = ws;
        resolve(true);
      });
      ws.on("message", (data) => {
        const json = data.toString();
        const message = JSON.parse(json);
        this.onMessage(message);
      });
    });
  }

  generateGid() {
    const bytes = nextBytes(8);
    return toHex(bytes, '', false);
  }

  onMessage(message: any) {
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

  onRequestMessage(request: Request) {
    const { method, params } = request;
    const event = new CustomEvent(method, { detail: params });
    this.dispatchEvent(event);
  }

  onResponseMessage(response: Response) {
    const pendingRequest = this.pendingRequests[response.id];
    if (pendingRequest == null) {
      return;
    }
    delete this.pendingRequests[response.id];

    const { resolve, timer } = pendingRequest;
    clearTimeout(timer);
    resolve(response);
  }

  call(method: string, inputParams: any[] = [], timeout: number = 30000) {
    return new Promise((resolve, reject) => {
      const params: any[] = [];
      if (this.token != null) {
        params.push(this.token);
      }
      params.push(...inputParams);
  
      const id = ++this.sequence;
      const request = {
        jsonrpc: "2.0",
        id,
        method,
        params,
      } satisfies Request;
      const requestJson = JSON.stringify(request);

      const timer = setTimeout(() => {
        delete this.pendingRequests[id];
      }, timeout);

      const pendingRequest = {
        resolve,
        reject,
        timer,
      } satisfies PendingRequest<Response, R>;
      this.pendingRequests[id] = pendingRequest;

      this.ws.send(requestJson);
    });
  }

  addUri(uris: string[], options: Record<string, any> = {}, position?: number) {
    const params: any[] = [uris, options];
    if (position != null) {
      params.push(position);
    }
    return this.call("aria2.addUri", params);
  }

  tellStatus(gid: string, keys?: string[]) {
    const params: any[] = [gid];
    if (keys != null) {
      params.push(keys);
    }
    return this.call("aria2.tellStatus", params);
  }

  pause(gid: string, force: boolean = false) {
    const method = force ? "aria2.forcePause" : "aria2.pause";
    return this.call(method, [gid]);
  }

  pauseAll(force: boolean = false) {
    const method = force ? "aria2.forcePauseAll" : "aria2.pauseAll";
    return this.call(method);
  }

  unpause(gid: string) {
    return this.call("aria2.unpause", [gid]);
  }

  unpauseAll() {
    return this.call("aria2.unpauseAll");
  }

  getVersion() {
    return this.call("aria2.getVersion");
  }
}