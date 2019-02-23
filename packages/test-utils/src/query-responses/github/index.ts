import { RawResponseDataWithMaybeCacheMetadata } from "@handl/core";

/* tslint:disable max-line-length */

export const singleType: RawResponseDataWithMaybeCacheMetadata = {
  data: {
    organization: {
      description: "We are working to build community through open source technology. NB: members must have two-factor auth.",
      email: "",
      id: "MDEyOk9yZ2FuaXphdGlvbjY5NjMx",
      login: "facebook",
      name: "Facebook",
      url: "https://github.com/facebook",
    },
  },
  headers: new Headers({ "Cache-Control": "public, max-age=5" }),
};

export const nestedTypeWithEdges: RawResponseDataWithMaybeCacheMetadata = {
  data: {
    organization: {
      description: "We are working to build community through open source technology. NB: members must have two-factor auth.",
      email: "",
      id: "MDEyOk9yZ2FuaXphdGlvbjY5NjMx",
      login: "facebook",
      name: "Facebook",
      repositories: {
        edges: [
          {
            node: {
              description: "Codemod is a tool/library to assist you with large-scale codebase refactors that can be partially automated but still require human oversight and occasional intervention. Codemod was developed at Facebook and released as open source.",
              homepageUrl: "",
              id: "MDEwOlJlcG9zaXRvcnkxNjU4ODM=",
              name: "codemod",
            },
          },
          {
            node: {
              description: "A virtual machine for executing programs written in Hack.",
              homepageUrl: "https://hhvm.com",
              id: "MDEwOlJlcG9zaXRvcnk0NTU2MDA=",
              name: "hhvm",
            },
          },
          {
            node: {
              description: "Python wrapper for RE2",
              homepageUrl: "",
              id: "MDEwOlJlcG9zaXRvcnk1NjU0MjY=",
              name: "pyre2",
            },
          },
          {
            node: {
              description: null,
              homepageUrl: "http://ogp.me",
              id: "MDEwOlJlcG9zaXRvcnk2MTkyNDA=",
              name: "open-graph-protocol",
            },
          },
          {
            node: {
              description: "Used to integrate Android apps with Facebook Platform.",
              homepageUrl: "https://developers.facebook.com/docs/android",
              id: "MDEwOlJlcG9zaXRvcnk2NTkzNDE=",
              name: "facebook-android-sdk",
            },
          },
          {
            node: {
              description: "Used to integrate the Facebook Platform with your iOS & tvOS apps.",
              homepageUrl: "https://developers.facebook.com/docs/ios",
              id: "MDEwOlJlcG9zaXRvcnk3Mzg0OTE=",
              name: "facebook-objc-sdk",
            },
          },
        ],
      },
      url: "https://github.com/facebook",
    },
  },
  headers: new Headers({ "Cache-Control": "public, max-age=5" }),
};

export const nestedUnionWithEdges: RawResponseDataWithMaybeCacheMetadata = {
  data: {
    search: {
      edges: [
        {
          node: {
            description: "A declarative, efficient, and flexible JavaScript library for building user interfaces.",
            homepageUrl: "https://reactjs.org",
            id: "MDEwOlJlcG9zaXRvcnkxMDI3MDI1MA==",
            name: "react",
          },
        },
        {
          node: {
            description: "Event-driven, non-blocking I/O with PHP.",
            homepageUrl: "https://reactphp.org",
            id: "MDEwOlJlcG9zaXRvcnk0Mjg3OTIx",
            name: "react",
          },
        },
        {
          node: {
            description: "React background management framework | React全家桶后台管理框架",
            homepageUrl: "",
            id: "MDEwOlJlcG9zaXRvcnk3NTM5NjU3NQ==",
            name: "react",
          },
        },
        {
          node: {
            description: "React docs in Chinese | React 中文文档翻译",
            homepageUrl: "https://react.docschina.org/",
            id: "MDEwOlJlcG9zaXRvcnk5MDc1OTkzMA==",
            name: "react",
          },
        },
        {
          node: {
            description: "京东首页构建",
            homepageUrl: null,
            id: "MDEwOlJlcG9zaXRvcnk3MjYyODI4NQ==",
            name: "react",
          },
        },
        {
          node: {
            description: "基于react的企业后台管理开发框架",
            homepageUrl: "",
            id: "MDEwOlJlcG9zaXRvcnk3NzUxMzQxOQ==",
            name: "react",
          },
        },
        {
          node: {
            description: "Streams of values over time",
            homepageUrl: "",
            id: "MDEwOlJlcG9zaXRvcnkzNjA2NjI0",
            name: "ReactiveCocoa",
          },
        },
        {
          node: {
            description: "A framework for building native apps with React.",
            homepageUrl: "https://facebook.github.io/react-native/",
            id: "MDEwOlJlcG9zaXRvcnkyOTAyODc3NQ==",
            name: "react-native",
          },
        },
        {
          node: {
            description: "Declarative routing for React",
            homepageUrl: "https://reacttraining.com/react-router/",
            id: "MDEwOlJlcG9zaXRvcnkxOTg3MjQ1Ng==",
            name: "react-router",
          },
        },
        {
          node: {
            description: "Set up a modern web app by running one command.",
            homepageUrl: "https://facebook.github.io/create-react-app/",
            id: "MDEwOlJlcG9zaXRvcnk2MzUzNzI0OQ==",
            name: "create-react-app",
          },
        },
      ],
    },
  },
  headers: new Headers({ "Cache-Control": "public, max-age=5" }),
};
