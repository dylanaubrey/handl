import { coreDefs } from "@handl/core";
import { DirectiveNode, FieldNode, ValueNode } from "graphql";
import { LIST_VALUE, OBJECT_VALUE, VALUE } from "../../consts";
import * as defs from "../../defs";

type ParseValueResult = string | boolean | null | coreDefs.PlainObjectMap | any[];

function parseValue(valueNode: ValueNode): ParseValueResult {
  let output: ParseValueResult;

  if (valueNode.hasOwnProperty(VALUE)) {
    const scalarValueNode = valueNode as defs.ScalarValueNode;
    output = scalarValueNode.value;
  } else if (valueNode.kind === OBJECT_VALUE) {
    const objectValueNode = valueNode;
    const obj: coreDefs.PlainObjectMap = {};

    objectValueNode.fields.forEach(({ name, value }) => {
      obj[name.value] = parseValue(value);
    });

    output = obj;
  } else if (valueNode.kind === LIST_VALUE) {
    const listValueNode = valueNode;
    const arr: any[] = [];

    listValueNode.values.forEach((value) => {
      arr.push(parseValue(value));
    });

    output = arr;
  } else {
    output = null;
  }

  return output;
}

export function getArguments(field: FieldNode | DirectiveNode): coreDefs.PlainObjectMap | undefined {
  if (!field.arguments || !field.arguments.length) return undefined;
  const args: coreDefs.PlainObjectMap = {};

  field.arguments.forEach(({ name, value }) => {
    args[name.value] = parseValue(value);
  });

  return args;
}
