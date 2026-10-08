export type Version = "2.0";
export type ID = string | number;

export type Message = {
  jsonrpc: Version;
  id: ID;
};

export type Request<P = any[]> = Message & {
  method: string;
  params: P;
};

export type Response<R = any, E = any> = Message & {
  result?: R;
  error?: Error<E>;
};

export type Error<E> = {
  code: number;
  message: string;
  data: E;
}
