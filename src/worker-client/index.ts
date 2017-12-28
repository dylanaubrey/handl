import { castArray, isArray } from "lodash";
import PromiseWorker from "promise-worker";
import createCacheMetadata from "../helpers/create-cache-metadata";

import {
  ClientArgs,
  PostMessageArgs,
  PostMessageResult,
  RequestOptions,
  RequestResult,
} from "../types";

export default class WorkerClient {
  public static async create(args: ClientArgs): Promise<WorkerClient> {
    const webpackWorker = require("worker-loader?inline=true&fallback=false!../worker"); // tslint:disable-line
    const workerCachemap = new WorkerClient();
    workerCachemap._worker = new webpackWorker();
    workerCachemap._promiseWorker = new PromiseWorker(workerCachemap._worker);
    await workerCachemap._postMessage({ args, type: "create" });
    return workerCachemap;
  }

  private static _convertCacheabilityObjectMap(
    result: PostMessageResult | PostMessageResult[],
  ): RequestResult | RequestResult[] {
    const postMessageResults = castArray(result);
    const requestResults: RequestResult[] = [];

    postMessageResults.forEach(({ cacheMetadata, ...otherProps }) => {
      requestResults.push({ cacheMetadata: createCacheMetadata({ cacheMetadata }), ...otherProps });
    });

    return isArray(result) ? requestResults : requestResults[0];
  }

  private _promiseWorker: PromiseWorker;
  private _worker: Worker;

  public async clearCache(): Promise<void> {
    await this._postMessage({ type: "clearCache" });
  }

  public async request(query: string, opts: RequestOptions = {}): Promise<RequestResult | RequestResult[]> {
    let result: RequestResult | RequestResult[];

    try {
      const args = { query, opts, type: "request" };
      const postMessageResult = await this._postMessage(args) as PostMessageResult | PostMessageResult[];
      result = WorkerClient._convertCacheabilityObjectMap(postMessageResult);
    } catch (error) {
      return Promise.reject(error);
    }

    return result;
  }

  public terminate(): void {
    this._worker.terminate();
  }

  private async _postMessage(args: PostMessageArgs): Promise<any> {
    let message;

    try {
      message = await this._promiseWorker.postMessage(args);
    } catch (error) {
      return Promise.reject(error);
    }

    return message;
  }
}
