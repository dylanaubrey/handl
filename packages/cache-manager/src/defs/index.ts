import Cachemap, { coreDefs as cachemapDefs } from "@cachemap/core";
import { coreDefs } from "@handl/core";
import { debugDefs } from "@handl/debug-manager";
import Cacheability, { Metadata as CacheabilityMetadata } from "cacheability";
import { FieldNode } from "graphql";

export interface UserOptions {
  /**
   * The cache to use for storing query responses, data entities,
   * and request field paths.
   */
  cache: Cachemap;

  /**
   * The debug manager.
   */
  debugManager?: debugDefs.DebugManager;

  /**
   * An object map of GraphQL schema types to cache-control
   * directives used for caching object types.
   */
  typeCacheDirectives?: coreDefs.PlainObjectStringMap;
}

export interface ClientOptions {
  typeIDKey: string;
}

export interface InitOptions {
  cache: Cachemap;
  debugManager?: debugDefs.DebugManager;
  typeCacheDirectives?: coreDefs.PlainObjectStringMap;
  typeIDKey: string;
}

export interface ConstructorOptions {
  cache: Cachemap;
  typeCacheDirectives?: coreDefs.PlainObjectStringMap;
  typeIDKey: string;
}

export type CacheMetadata = Map<string, Cacheability>;

export interface DehydratedCacheMetadata {
  [key: string]: CacheabilityMetadata;
}

export interface PartialQueryResponse {
  data: coreDefs.PlainObjectMap;
  cacheMetadata: CacheMetadata;
}

export interface FieldCount {
  missing: number;
  total: number;
}

export type FieldPathChecklist = Map<string, boolean>;

export interface CachedRequestData {
  cacheMetadata: CacheMetadata;
  data: coreDefs.PlainObjectMap;
  fieldCount: FieldCount;
  fieldPathChecklist: FieldPathChecklist;
}

export interface CachedFieldData {
  cacheability?: Cacheability;
  dataEntityData?: any;
  requestFieldPathData?: any;
  requestFieldCacheKey?: string;
  requestFieldPath?: string;
  index?: number;
}

export interface KeysAndPathsOptions {
  index?: number;
  requestFieldCacheKey?: string;
  requestFieldPath?: string;
  responseDataPath?: string;
}

export interface KeysAndPaths {
  hashedRequestFieldCacheKey: string;
  name: string;
  propNameOrIndex: string | number;
  requestFieldCacheKey: string;
  requestFieldPath: string;
  responseDataPath: string;
}

export interface ExportCacheResult {
  entries: Array<[string, any]>;
  metadata: cachemapDefs.Metadata[];
}

export interface AnalyzeQueryResult {
  response?: coreDefs.ResponseData;
  updated?: coreDefs.RequestData;
}

export interface CheckResult {
  cacheability: Cacheability;
  data: coreDefs.PlainObjectMap | any[];
}

export interface CacheManager {
  cache: Cachemap;
  analyzeQuery(
    requestData: coreDefs.RequestData,
    options: coreDefs.RequestOptions,
    context: coreDefs.RequestContext,
  ): Promise<AnalyzeQueryResult>;
  check(
    cacheType: coreDefs.CacheTypes,
    hash: string,
    options: coreDefs.RequestOptions,
    context: coreDefs.RequestContext,
  ): Promise<CheckResult | false>;
  export(): Promise<ExportCacheResult>;
  import(options: ExportCacheResult): Promise<void>;
  resolve(
    requestData: coreDefs.RequestData,
    rawResponseData: coreDefs.RawResponseData,
    options: coreDefs.RequestOptions,
    context: coreDefs.RequestContext,
  ): Promise<coreDefs.ResponseData>;
  resolveQuery(
    requestData: coreDefs.RequestData,
    updatedRequestData: coreDefs.RequestData,
    rawResponseData: coreDefs.RawResponseData,
    options: coreDefs.RequestOptions,
    context: coreDefs.RequestContext,
  ): Promise<coreDefs.ResponseData>;
  set(
    cacheType: coreDefs.CacheTypes,
    responseData: coreDefs.ResponseData,
    options: coreDefs.RequestOptions,
    context: coreDefs.RequestContext,
  ): Promise<void>;
}

export type CacheManagerInit = (options: ClientOptions) => Promise<CacheManager>;
