import { ServerArgs, ServerRequestOptions } from "./server-client/types";
import { ClientArgs, RequestOptions, RequestResult } from "./types";
export type HandlClientArgs = ClientArgs;
export type HandlClientRequestOptions = RequestOptions;
export type HandlClientRequestResult = RequestResult;
export type HandlServerArgs = ServerArgs;
export type HandlServerRequestOptions = ServerRequestOptions;
export { DefaultClient as DefaultHandl } from "./default-client";
export { ServerClient as ServerHandl } from "./server-client";
export { WorkerClient as WorkerHandl } from "./worker-client";
export { Client as Handl } from "./client";
export { MetadataType } from "./metadata-type";
