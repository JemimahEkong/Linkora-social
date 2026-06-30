import { describe, expect, it, jest, beforeEach } from "@jest/globals";

const mockFetch = jest.fn(() => Promise.resolve({ ok: true }));
global.fetch = mockFetch;

process.env.EXPO_PUBLIC_INDEXER_URL = "https://indexer.example.com";

import { deregisterTokenFromIndexer } from "../notifications/registerForPushNotifications";

describe("deregisterTokenFromIndexer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls POST /api/notifications/deregister with the address", async () => {
    await deregisterTokenFromIndexer("GCKFBEIYTKP6RCZNVPH73XL7XFWTEOAO4MKONX7HOILHDVBMW5EVPOPZ");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://indexer.example.com/api/notifications/deregister",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: "GCKFBEIYTKP6RCZNVPH73XL7XFWTEOAO4MKONX7HOILHDVBMW5EVPOPZ",
        }),
      }
    );
  });

  it("silently handles fetch failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    await expect(
      deregisterTokenFromIndexer("GCKFBEIYTKP6RCZNVPH73XL7XFWTEOAO4MKONX7HOILHDVBMW5EVPOPZ")
    ).resolves.toBeUndefined();
  });

  it("does nothing when address is empty", async () => {
    await deregisterTokenFromIndexer("");

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("does nothing when EXPO_PUBLIC_INDEXER_URL is not set", async () => {
    const original = process.env.EXPO_PUBLIC_INDEXER_URL;
    delete process.env.EXPO_PUBLIC_INDEXER_URL;

    await deregisterTokenFromIndexer("GCKFBEIYTKP6RCZNVPH73XL7XFWTEOAO4MKONX7HOILHDVBMW5EVPOPZ");

    expect(mockFetch).not.toHaveBeenCalled();

    process.env.EXPO_PUBLIC_INDEXER_URL = original;
  });
});
