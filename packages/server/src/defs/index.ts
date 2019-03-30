import Client from "@handl/client";
import { MaybeRequestResultWithDehydratedCacheMetadata, PlainObjectStringMap } from "@handl/core";
import { Request, Response } from "express";
import WebSocket from "ws";

export interface UserOptions {
  /**
   * The client.
   */
  client: Client;
}

export type ConstructorOptions = UserOptions;

export type RequestHandler = (req: Request, res: Response, ...args: any[]) => void;

export type MessageHandler = (ws: WebSocket) => (message: string) => void;

export interface RequestData {
  batched: boolean;
  request: string | PlainObjectStringMap;
}

export interface ResponseDataWithMaybeDehydratedCacheMetadataBatch {
  [key: string]: MaybeRequestResultWithDehydratedCacheMetadata;
}