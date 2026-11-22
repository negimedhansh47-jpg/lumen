export class ApiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/** GET when `body` is omitted, POST JSON otherwise. Throws ApiError with a human-readable message. */
export async function api(path, body) {
  let res;
  try {
    res = await fetch(path, body === undefined ? undefined : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new ApiError("network", "Could not reach the server. Check your connection and try again.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.error?.code ?? "error", data?.error?.message ?? "Something went wrong. Please try again.");
  return data;
}

export async function demo(name) {
  const res = await fetch(`/demo/${name}.json`);
  if (!res.ok) throw new ApiError("demo_missing", "That example is not available right now.");
  return res.json();
}
