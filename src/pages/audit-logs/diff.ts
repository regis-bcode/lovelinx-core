export type JsonValue = any;

export interface DiffChange {
  path: string;
  before: JsonValue;
  after: JsonValue;
  type: "added" | "removed" | "changed";
}

export function computeDiff(before: JsonValue, after: JsonValue): DiffChange[] {
  const changes: DiffChange[] = [];
  const isObject = (value: JsonValue) =>
    value !== null && typeof value === "object" && !Array.isArray(value);

  function walk(prev: JsonValue, next: JsonValue, path: string[] = []) {
    const prevKeys = prev && typeof prev === "object" ? Object.keys(prev) : [];
    const nextKeys = next && typeof next === "object" ? Object.keys(next) : [];
    const keys = new Set([...prevKeys, ...nextKeys]);

    for (const key of keys) {
      const currentPath = [...path, key];
      const prevValue = prev?.[key as keyof typeof prev];
      const nextValue = next?.[key as keyof typeof next];

      if (prevValue === undefined && nextValue !== undefined) {
        changes.push({
          path: currentPath.join("."),
          before: undefined,
          after: nextValue,
          type: "added",
        });
        continue;
      }

      if (prevValue !== undefined && nextValue === undefined) {
        changes.push({
          path: currentPath.join("."),
          before: prevValue,
          after: undefined,
          type: "removed",
        });
        continue;
      }

      if (isObject(prevValue) && isObject(nextValue)) {
        walk(prevValue, nextValue, currentPath);
        continue;
      }

      if (Array.isArray(prevValue) && Array.isArray(nextValue)) {
        if (JSON.stringify(prevValue) !== JSON.stringify(nextValue)) {
          changes.push({
            path: currentPath.join("."),
            before: prevValue,
            after: nextValue,
            type: "changed",
          });
        }
        continue;
      }

      if (prevValue !== nextValue) {
        changes.push({
          path: currentPath.join("."),
          before: prevValue,
          after: nextValue,
          type: "changed",
        });
      }
    }
  }

  walk(before ?? null, after ?? null);
  return changes;
}
