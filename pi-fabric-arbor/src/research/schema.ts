// This deliberately small JSON-Schema vocabulary is shared by registration,
// config resolution, actor validation and commands. No permissive second parser.
export type Schema = { type?: "object" | "array" | "string" | "integer" | "boolean" | "null"; properties?: Record<string, Schema>; required?: string[]; additionalProperties?: false; items?: Schema; maxItems?: number; minItems?: number; minLength?: number; maxLength?: number; minimum?: number; maximum?: number; pattern?: string; enum?: readonly unknown[]; oneOf?: Schema[] };
export const str = (maxLength = 256): Schema => ({ type: "string", minLength: 1, maxLength });
export const id: Schema = { ...str(96), pattern: "^[A-Za-z0-9][A-Za-z0-9_.-]*$" };
export const integer = (maximum = 1000000, minimum = 0): Schema => ({ type: "integer", minimum, maximum });
export const enumeration = (...values: string[]): Schema => ({ type: "string", enum: values });
export const array = (items: Schema, maxItems = 32, minItems = 0): Schema => ({ type: "array", items, maxItems, minItems });
export const closed = (properties: Record<string, Schema>, required = Object.keys(properties)): Schema => ({ type: "object", additionalProperties: false, properties, required });
export const nullable = (schema: Schema): Schema => ({ oneOf: [schema, { type: "null" }] });
