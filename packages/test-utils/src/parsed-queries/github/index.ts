import { ParsedQueryWithFilter } from "../../defs";

export const singleType = `
  query {
    organization(login: "facebook") {
      description
      email
      login
      name
      url
      id
    }
  }
`;

export const singleTypeWithFilter: ParsedQueryWithFilter = {
  full: singleType,
  initial: `
    query {
      organization(login: "facebook") {
        description
        login
        id
      }
    }
  `,
  updated: `
    query {
      organization(login: "facebook") {
        email
        name
        url
        id
      }
    }
  `,
};

export const nestedTypeWithEdges = `
  query {
    organization(login: "facebook") {
      description
      email
      login
      name
      repositories(first: 6) {
        edges {
          node {
            description
            homepageUrl
            name
            id
            owner {
              login
              url
              id
              __typename
            }
          }
        }
      }
      url
      id
    }
  }
`;

export const nestedTypeWithEdgesWithFilter: ParsedQueryWithFilter = {
  full: nestedTypeWithEdges,
  initial: `
    query {
      organization(login: "facebook") {
        login
        name
        repositories(first: 6) {
          edges {
            node {
              name
              id
              owner {
                url
                id
                __typename
              }
            }
          }
        }
        id
      }
    }
  `,
  updated: `
    query {
      organization(login: "facebook") {
        description
        email
        repositories(first: 6) {
          edges {
            node {
              description
              homepageUrl
              id
              owner {
                login
                id
                __typename
              }
            }
          }
        }
        url
        id
      }
    }
  `,
};

export const nestedUnionWithEdges = `
  query {
    search(query: "react", first: 10, type: REPOSITORY) {
      edges {
        node {
          ... on Organization {
            description
            login
            organizationName: name
            id
          }
          ... on Issue {
            bodyText
            number
            title
            id
          }
          ... on MarketplaceListing {
            slug
            shortDescription
            howItWorks
            id
          }
          ... on PullRequest {
            bodyText
            number
            title
            id
          }
          ... on Repository {
            description
            homepageUrl
            name
            id
          }
          __typename
        }
      }
    }
  }
`;

export const nestedUnionWithEdgesWithFilter: ParsedQueryWithFilter = {
  full: nestedUnionWithEdges,
  initial: `
    query {
      search(query: "react", first: 10, type: REPOSITORY) {
        edges {
          node {
            ... on Organization {
              organizationName: name
              id
            }
            ... on Issue {
              title
              id
            }
            ... on MarketplaceListing {
              slug
              shortDescription
              id
            }
            ... on PullRequest {
              title
              id
            }
            ... on Repository {
              name
              id
            }
            __typename
          }
        }
      }
    }
  `,
  updated: `
    query {
      search(query: "react", first: 10, type: REPOSITORY) {
        edges {
          node {
            ... on Organization {
              description
              login
              id
            }
            ... on Issue {
              bodyText
              number
              id
            }
            ... on MarketplaceListing {
              howItWorks
              id
            }
            ... on PullRequest {
              bodyText
              number
              id
            }
            ... on Repository {
              description
              homepageUrl
              id
            }
            __typename
          }
        }
      }
    }
  `,
};
