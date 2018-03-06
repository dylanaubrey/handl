import { Cacheability } from "cacheability";
import { expect } from "chai";
import * as fetchMock from "fetch-mock";
import { github } from "../../../data/graphql";
import { mockGraphqlRequest } from "../../../helpers";
import { ClientHandl, Handl, WorkerHandl } from "../../../../src";
import { ClientArgs, RequestResultData } from "../../../../src/types";

export default function testMutationOperation(args: ClientArgs, opts: { suppressWorkers?: boolean } = {}): void {
  describe(`the handl client on the browser ${!opts.suppressWorkers ? "with web workers" : ""}`, () => {
    let worker: Worker;
    let client: ClientHandl | WorkerHandl;

    before(async () => {
      if (opts.suppressWorkers) {
        worker = self.Worker;
        delete self.Worker;
      }

      client = await Handl.create(args) as ClientHandl | WorkerHandl;
    });

    after(() => {
      if (worker) self.Worker = worker;
    });

    describe("the request method", () => {
      context("when a add mutation is requested", () => {
        before(() => {
          if (opts.suppressWorkers) {
            mockGraphqlRequest(github.requests.updatedAddMutation);
          }
        });

        after(() => {
          if (opts.suppressWorkers) fetchMock.restore();
        });

        context("when the mutation was successfully executed", () => {
          let result: RequestResultData;
          const input = { clientMutationId: "1", starrableId: "MDEwOlJlcG9zaXRvcnkzODMwNzQyOA==" };

          beforeEach(async () => {
            try {
              result = await client.request(
                github.requests.addMutation,
                { awaitDataCached: true, variables: { input } },
              ) as RequestResultData;
            } catch (error) {
              console.log(error); // tslint:disable-line
            }
          });

          afterEach(async () => {
            await client.clearCache();
            if (opts.suppressWorkers) fetchMock.reset();
          });

          it("then the method should return the requested data", () => {
            expect(result.data).to.deep.equal(github.responses.addMutation.data);
            const cacheMetadata = result.cacheMetadata;
            expect(cacheMetadata.size).to.equal(1);
            const queryCacheability = cacheMetadata.get("query") as Cacheability;
            expect(queryCacheability.metadata.cacheControl.maxAge).to.equal(300000);
          });

          if (opts.suppressWorkers) {
            it("then the client should have made a fetch request", () => {
              expect(fetchMock.calls().matched).to.have.lengthOf(1);
            });
          }

          it("then the client should not have cached the response against the query", async () => {
            const cacheSize = await client.getResponseCacheSize();
            expect(cacheSize).to.equal(1);
          });

          it("then the client should not have stored any data in the in the data path cache", async () => {
            const cacheSize = await client.getDataPathCacheSize();
            expect(cacheSize).to.eql(1);
          });

          it("then the client should cache each data entity in the response against its identifier", async () => {
            const cacheSize = await client.getDataEntityCacheSize();
            expect(cacheSize).to.eql(2);
          });
        });
      });
    });
  });
}
