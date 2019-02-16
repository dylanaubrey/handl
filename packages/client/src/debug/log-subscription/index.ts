import { DebugManagerDef } from "@handl/debug-manager";
import { SUBSCRIPTION_EXECUTED } from "../../consts";

export default function logSubscription(debugManager?: DebugManagerDef) {
  return (
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<(...args: any[]) => Promise<any>>,
  ): void => {
    const method = descriptor.value;
    if (!method || !debugManager) return;

    descriptor.value = async function (...args: any[]): Promise<any> {
      try {
        return new Promise(async (resolve) => {
          const startTime = debugManager.now();
          const result = await method.apply(this, args);
          const endTime = debugManager.now();
          const duration = endTime - startTime;
          resolve(result);

          debugManager.emit(SUBSCRIPTION_EXECUTED, {
            context: args[3],
            options: args[2],
            rawResponseData: args[1],
            requestData: args[0],
            result,
            stats: { duration, endTime, startTime },
          });
        });
      } catch (error) {
        return Promise.reject(error);
      }
    };
  };
}
