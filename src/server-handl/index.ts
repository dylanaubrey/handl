import { NextFunction, Request, RequestHandler, Response } from "express";
import { forAwaitEach, isAsyncIterable } from "iterall";
import { isPlainObject } from "lodash";
import * as WebSocket from "ws";

import {
  DehydratedRequestResultDataObjectMap,
  MessageHandler,
  ServerArgs,
  ServerRequestOptions,
} from "./types";

import { ClientHandl } from "../client-handl";
import { DehydratedRequestResultData, RequestResultData, StringObjectMap } from "../types";

let instance: ServerHandl;

/**
 * A GraphQL server.
 *
 */
export class ServerHandl {
  /**
   * The method creates an instance of `ServerHandl`.
   *
   */
  public static async create(args: ServerArgs): Promise<ServerHandl> {
    if (instance && isPlainObject(args) && !args.newInstance) return instance;

    try {
      const server = new ServerHandl();
      await server._createClient(args);
      instance = server;
      return instance;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  private _client: ClientHandl;

  /**
   * The `ClientHandl` instance used by the server.
   *
   */
  get client(): ClientHandl {
    return this._client;
  }

  /**
   * The method returns an express-compatible middleware to
   * use for responding to GraphQL queries and mutations.
   *
   */
  public request(opts?: ServerRequestOptions): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      this._requestHandler(req, res, opts);
    };
  }

  /**
   * The method returns a function that in turn returns a message handler
   * for responding to GraphQL subscription websocket messages.
   *
   */
  public message(opts?: ServerRequestOptions): MessageHandler {
    return (ws: WebSocket) => {
      return (message: string) => {
        this._messageHandler(ws, message, opts);
      };
    };
  }

  private async _createClient(args: ServerArgs): Promise<void> {
    this._client = await ClientHandl.create({ ...args, mode: "server" });
  }

  private async _messageHandler(ws: WebSocket, message: string, opts: ServerRequestOptions = {}): Promise<void> {
    try {
      const { subscriptionID, subscription } = JSON.parse(message);
      const subscribeResult = await this._client.request(subscription, opts);

      if (isAsyncIterable(subscribeResult)) {
        forAwaitEach(subscribeResult, (result: RequestResultData) => {
          if (ws.readyState === ws.OPEN) {
            const dehydratedResult = {
              ...result,
              cacheMetadata: ClientHandl.dehydrateCacheMetadata(result.cacheMetadata),
            };

            ws.send(JSON.stringify({ result: dehydratedResult, subscriptionID }));
          }
        });
      } else if (ws.readyState === ws.OPEN) {
        const result = subscribeResult as RequestResultData;

        const dehydratedResult = {
          ...result,
          cacheMetadata: ClientHandl.dehydrateCacheMetadata(result.cacheMetadata),
        };

        ws.send(JSON.stringify({ result: dehydratedResult, subscriptionID }));
      }
    } catch (error) {
      ws.send(error);
    }
  }

  private async _requestHandler(
    req: Request,
    res: Response,
    opts: ServerRequestOptions = {},
  ): Promise<void> {
    try {
      const { batched, query } = req.body;
      let dehydratedResult: DehydratedRequestResultData | DehydratedRequestResultDataObjectMap;

      if (batched) {
        const requests = query as StringObjectMap;
        const responses: DehydratedRequestResultDataObjectMap = {};

        await Promise.all(Object.keys(requests).map(async (requestHash) => {
          const request = requests[requestHash];
          const result = await this._client.request(request, opts) as RequestResultData;

          responses[requestHash] = {
            ...result,
            cacheMetadata: ClientHandl.dehydrateCacheMetadata(result.cacheMetadata),
          };
        }));

        dehydratedResult = responses;
      } else {
        const result = await this._client.request(query, opts) as RequestResultData;

        dehydratedResult = {
          ...result,
          cacheMetadata: ClientHandl.dehydrateCacheMetadata(result.cacheMetadata),
        };
      }

      res.status(200).send(dehydratedResult);
    } catch (error) {
      res.status(400).send(error);
    }
  }
}