import { github } from "../data/graphql";
import { mockGraphqlRequest } from "../helpers";

mockGraphqlRequest(github.requests.singleQuery);
mockGraphqlRequest(github.requests.reducedSingleQuery);
