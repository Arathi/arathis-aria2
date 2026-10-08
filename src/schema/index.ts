import type { Request as JsonRpcRequest, Response as JsonRpcResponse, Error, ID, Message } from "./json-rpc";

type Parameters = any[];

export type Request<P extends Parameters = Parameters> = JsonRpcRequest<P>;
export type Response<R = any, E = any> = JsonRpcResponse<R, E>;
export type { Error, ID, Message };
