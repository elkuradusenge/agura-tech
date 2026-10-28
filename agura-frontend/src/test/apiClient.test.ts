import { describe, expect, it } from "vitest";
import { ApiError } from "../lib/api/client";

describe("ApiError", () => {
  it("keeps the shape of the backend error envelope", () => {
    const error = new ApiError(
      401,
      {
        error: {
          code: "auth.invalid_credentials",
          translation_key: "errors.auth.invalid_credentials",
          message: "Bad password",
        },
      },
      "Unauthorized",
    );

    expect(error.status).toBe(401);
    expect(error.code).toBe("auth.invalid_credentials");
    expect(error.translationKey).toBe("errors.auth.invalid_credentials");
    expect(error.message).toBe("Bad password");
  });

  it("falls back to a generic envelope when there is no body", () => {
    const error = new ApiError(502, null, "Bad Gateway");
    expect(error.code).toBe("unknown");
    expect(error.translationKey).toBe("errors.generic");
    expect(error.message).toBe("Bad Gateway");
  });
});
