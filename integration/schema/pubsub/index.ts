import { MaybeRequestResult } from "@handl/core";
import { EventAsyncIterator } from "@handl/helpers";
import EventEmitter from "eventemitter3";

const eventEmitter = new EventEmitter();

export function publish(eventName: string, payload: any): void {
  eventEmitter.emit(eventName, payload);
}

export function subscribe(eventName: string): AsyncIterator<MaybeRequestResult | undefined> {
  const eventAsyncIterator = new EventAsyncIterator(eventEmitter, eventName);
  return eventAsyncIterator.getIterator();
}
