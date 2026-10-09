import type {
  Error,
  ID,
  Message,
  Request as JsonRpcRequest,
  Response as JsonRpcResponse,
} from "./json-rpc";

type Parameters = any[];

export type Request<P extends Parameters = Parameters> = JsonRpcRequest<P>;
export type Response<R = any, D = any> = JsonRpcResponse<R, D>;

export type GidObject = {
  gid: string;
};

export type CallbackParameters = [GidObject];

export type URIs = string[];
export type Options = Record<string, any> & {
  dir?: string;
  continue?: boolean;
  "all-proxy"?: string;
  "http-proxy"?: string;
  "https-proxy"?: string;
  "ftp-proxy"?: string;
  "ftp-user"?: string;
  "ftp-passwd"?: string;
  "ftp-pasv"?: boolean;
  "ftp-type"?: "binary" | "ascii";
  checksum?: string;
  split?: number;
  timeout?: number;
  header?: string[];
  "user-agent"?: string;
  out?: string;
  "allow-override"?: boolean;
  "auto-file-renaming"?: boolean;
  "max-overall-download-limit"?: string;
  "max-download-limit"?: string;
  gid?: string;
};

export type Status = {
  gid?: string;
  status?: "active" | "waiting" | "paused" | "error" | "complete" | "removed";
  totalLength?: number;
  completedLength?: number;
  uploadLength?: number;
  bitfield?: any;
  downloadSpeed?: any;
  uploadSpeed?: any;
  infoHash?: string;
  numSeeders?: number;
  seeder?: boolean;
  pieceLength?: number;
  numPieces?: number;
  connections?: number;
  errorCode?: any;
  errorMessage?: string;
  followedBy?: any;
  following?: any;
  belongsTo?: any;
  dir?: string;
  out?: string;
  files?: any;
  bittorrent?: any;
  verifiedLength?: number;
  verifyIntegrityPending?: boolean;
};
export type StatusKey = keyof Status;

export type AddUriParameters = [URIs, Options, number?];
export type AddUriResult = GidObject;
export type ChangeOptionParameters = [Options];
export type GetOptionResult = Options;
export type GetGlobalStatResult = {
  downloadSpeed: number;
  uploadSpeed: number;
  numActive: number;
  numWaiting: number;
  numStopped: number;
  numStoppedTotal: number;
};
export type GetSessionInfoResult = {
  sessionId: string;
};

export type GetVersionResult = {
  version: string;
  enabledFeatures: string[];
};

export type ListMethodsResult = string[];

export type { Error, ID, Message };
