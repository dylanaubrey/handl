import Cacheability from "cacheability";
import { CachemapArgs } from "cachemap";

import {
  GraphQLFieldResolver,
  GraphQLSchema,
  IntrospectionQuery,
} from "graphql";

import { CacheabilityObjectMap, CacheMetadata, ObjectMap } from "../types";

export interface CachemapOptions {
  dataObjects?: CachemapArgs;
  responses?: CachemapArgs;
}

export interface ClientArgs {
  cachemapOptions?: CachemapOptions;
  defaultCacheControls?: DefaultCacheControls;
  fieldResolver?: GraphQLFieldResolver<any, any>;
  headers?: ObjectMap;
  introspection?: IntrospectionQuery;
  mode: "internal" | "external";
  newInstance?: boolean;
  resourceKey?: string;
  rootValue?: any;
  schema?: GraphQLSchema;
  url?: string;
}

export interface ClientRequests {
  active: Map<string, string>;
  pending: Map<string, PendingRequestActions[]>;
}

export interface ClientResult {
  cacheMetadata: CacheMetadata;
  data: ObjectMap;
}

export interface CreateCacheMetadataArgs {
  cacheMetadata?: CacheabilityObjectMap;
  headers?: Headers;
}

export interface DefaultCacheControls {
  mutation: string;
  query: string;
}

export interface FetchResult {
  cacheMetadata?: ObjectMap;
  data: ObjectMap;
  headers?: Headers;
}

export interface PendingRequestActions {
  reject: PendingRequestRejection;
  resolve: PendingRequestResolver;
}

export type PendingRequestRejection = (value: Error | Error[]) => void;
export type PendingRequestResolver = (value: ClientResult) => void;

export interface RequestOptions {
  context?: any;
  fieldResolver?: GraphQLFieldResolver<any, any>;
  forceFetch?: boolean;
  fragments?: string[];
  headers?: ObjectMap;
  rootValue?: any;
  operationName?: string;
  variables?: ObjectMap;
}

export type RequestResult = ClientResult | ClientResult[] | Error | Error[];

export interface ResolveArgs {
  cacheMetadata: CacheMetadata;
  data?: ObjectMap;
  error?: Error | Error[];
  hash?: string;
  operation: ValidOperation;
}

export type ValidOperation = "query" | "mutation";
