import {
  DehydratedCacheMetadata,
  MaybeRawResponseData,
  PlainObjectMap,
  PlainObjectStringMap,
  RequestContext,
  RequestDataWithMaybeAST,
  RequestOptions,
} from "@handl/core";

export interface UserOptions {
  /**
   * Whether a client should batch query and mutation
   * requests.
   */
  batch?: boolean;

  /**
   * How long handl should wait to batch requests
   * before making a request.
   */
  batchInterval?: number;

  /**
   * How long handl should wait for a server to
   * respond before timing out.
   */
  fetchTimeout?: number;

  /**
   * Additional headers to be sent with every request.
   */
  headers?: PlainObjectStringMap;

  /**
   * The endpoint that handl will use to communicate with the
   * GraphQL server for queries and mutations.
   */
  url: string;
}

export type InitOptions = UserOptions;

export type ConstructorOptions = UserOptions;

export interface FetchOptions {
  batch: boolean;
}

export type ActiveBatch = Map<string, ActiveBatchValue>;

export interface ActiveBatchValue {
  actions: BatchResultActions;
  request: string;
}

export interface BatchResultActions {
  reject: (reason: Error | Error[]) => void;
  resolve: (value: MaybeRawResponseData) => void;
}

export interface BatchActionsObjectMap {
  [key: string]: BatchResultActions;
}

export interface MaybeRawFetchData {
  cacheMetadata?: DehydratedCacheMetadata;
  data?: PlainObjectMap;
  errors?: Error | Error[];
  headers: Headers;
}

export interface MaybeRawFetchDataObjectMap {
  [key: string]: MaybeRawFetchData;
}

export interface BatchedMaybeFetchData {
  batch: MaybeRawFetchDataObjectMap;
  headers: Headers;
}

export interface RequestManagerDef {
  execute(
    requestData: RequestDataWithMaybeAST,
    options: RequestOptions,
    context: RequestContext,
  ): Promise<MaybeRawResponseData>;
}

export type RequestManagerInit = () => Promise<RequestManagerDef>;
