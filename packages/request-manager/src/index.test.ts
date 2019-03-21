import { MaybeRawResponseData } from "@handl/core";
import {
  getRequestData,
  parsedRequests,
  responses,
} from "@handl/test-utils";
import fetchMock from "fetch-mock";
import { RequestManager } from ".";

const URL = "https://api.github.com/graphql";

describe("@handl/request-manager >>", () => {
  let requestManager: RequestManager;

  describe("no batching >>", () => {
    let response: MaybeRawResponseData;

    beforeAll(async () => {
      requestManager = await RequestManager.init({
        url: URL,
      });

      const body = { data: responses.singleTypeQuery.data };
      const headers = { "cache-control": "public, max-age=5" };
      fetchMock.post("*", { body, headers });
      response = await requestManager.fetch(getRequestData(parsedRequests.singleTypeQuery));
    });

    afterAll(() => {
      fetchMock.restore();
    });

    it("correct request", () => {
      expect(fetchMock.lastCall()).toMatchSnapshot();
    });

    it("correct response data", () => {
      expect(response).toMatchSnapshot();
    });
  });

  describe("batching >>", () => {
    describe("single request >>", () => {
      let response: MaybeRawResponseData;

      beforeAll(async () => {
        jest.useFakeTimers();

        requestManager = await RequestManager.init({
          batch: true,
          fetchTimeout: 10000,
          url: URL,
        });

        const requestData = getRequestData(parsedRequests.singleTypeQuery);

        const body = {
          batch: {
            [requestData.hash]: { data: responses.singleTypeQuery.data },
          },
        };

        const headers = { "cache-control": "public, max-age=5" };
        fetchMock.post("*", { body, headers });
        const promise = requestManager.fetch(requestData);
        jest.runOnlyPendingTimers();
        response = await promise;
      });

      afterAll(() => {
        fetchMock.restore();
      });

      it("correct request", () => {
        expect(fetchMock.lastCall()).toMatchSnapshot();
      });

      it("correct response data", () => {
        expect(response).toMatchSnapshot();
      });
    });

    describe("multiple requests >>", () => {
      let response: MaybeRawResponseData[];

      beforeAll(async () => {
        jest.useFakeTimers();

        requestManager = await RequestManager.init({
          batch: true,
          fetchTimeout: 10000,
          url: URL,
        });

        const initialRequestData = getRequestData(parsedRequests.singleTypeQuerySet.initial);
        const updatedRequestData = getRequestData(parsedRequests.singleTypeQuerySet.updated);

        const body = {
          batch: {
            [initialRequestData.hash]: { data: responses.singleTypeQuerySet.initial.data },
            [updatedRequestData.hash]: { data: responses.singleTypeQuerySet.updated.data },
          },
        };

        const headers = { "cache-control": "public, max-age=5" };
        fetchMock.post("*", { body, headers });

        const promises = [
          requestManager.fetch(initialRequestData),
          requestManager.fetch(updatedRequestData),
        ];

        jest.runOnlyPendingTimers();
        response = await Promise.all(promises);
      });

      afterAll(() => {
        fetchMock.restore();
      });

      it("correct request", () => {
        expect(fetchMock.lastCall()).toMatchSnapshot();
      });

      it("correct response data", () => {
        expect(response[0]).toMatchSnapshot();
        expect(response[1]).toMatchSnapshot();
      });
    });
  });
});
