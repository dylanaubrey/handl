import {
  ListTypeNode,
  NamedTypeNode,
  NonNullTypeNode,
  OperationDefinitionNode,
  TypeNode,
  VariableDefinitionNode,
} from "graphql";
import { isBoolean } from "lodash";
import { TYPE } from "../../consts";
import { getName } from "../name";

export function deleteVariableDefinitions(operationDefinition: OperationDefinitionNode): OperationDefinitionNode {
  return {
    ...operationDefinition,
    variableDefinitions: undefined,
  };
}

export function hasVariableDefinitions({ variableDefinitions }: OperationDefinitionNode): boolean {
  return !!variableDefinitions && !!variableDefinitions.length;
}

function variableDefinitionTypeVisitor(node: TypeNode): NamedTypeNode {
  if (node.hasOwnProperty(TYPE)) {
    const typeNode = node as ListTypeNode | NonNullTypeNode;
    return variableDefinitionTypeVisitor(typeNode.type);
  }

  return node as NamedTypeNode;
}

export function getVariableDefinitionDefaultValue({ defaultValue }: VariableDefinitionNode) {
  if (!defaultValue) {
    return undefined;
  }

  if (!("value" in defaultValue)) {
    return undefined;
  }

  const { value } = defaultValue;

  if (isBoolean(value)) {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function getVariableDefinitionType({ type }: VariableDefinitionNode): string {
  return getName(variableDefinitionTypeVisitor(type)) as string;
}
