/**
 * Unit tests for post event handlers
 */

import { Pool } from "pg";
import {
  handlePostCreated,
  handlePostDeleted,
  createMockPostCreatedEvent,
  createMockPostDeletedEvent,
} from "../post";

// Mock pg Pool
const mockQuery = jest.fn();
const mockPool = {
  query: mockQuery,
} as unknown as Pool;

describe("Post Event Handlers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("handlePostCreated", () => {
    it("should insert a new top-level post", async () => {
      const { event, context } = createMockPostCreatedEvent(1n, "GTEST123");
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      await handlePostCreated(mockPool, event, context);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO posts"),
        expect.arrayContaining(["1", "GTEST123", "Test post content", 0, 0, context.timestamp, null, "1"])
      );
    });

    it("should insert a reply post with parent_id", async () => {
      const { event, context } = createMockPostCreatedEvent(2n, "GTEST456", 1n);
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      await handlePostCreated(mockPool, event, context);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO posts"),
        expect.arrayContaining(["2", "GTEST456", "Test post content", 0, 0, context.timestamp, "1", "1"])
      );
    });

    it("should be idempotent (skip duplicate)", async () => {
      const { event, context } = createMockPostCreatedEvent(1n, "GTEST123");
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      await handlePostCreated(mockPool, event, context);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("ON CONFLICT (id) DO NOTHING"),
        expect.any(Array)
      );
    });

    it("should handle errors gracefully", async () => {
      const { event, context } = createMockPostCreatedEvent();
      mockQuery.mockRejectedValueOnce(new Error("DB error"));

      await expect(handlePostCreated(mockPool, event, context)).rejects.toThrow("DB error");
    });
  });

  describe("handlePostDeleted", () => {
    it("should soft delete a post", async () => {
      const { event, context } = createMockPostDeletedEvent(1n, "GTEST123");
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      await handlePostDeleted(mockPool, event, context);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE posts"),
        expect.arrayContaining([context.timestamp, "1", "GTEST123"])
      );
    });

    it("should be idempotent (skip already deleted)", async () => {
      const { event, context } = createMockPostDeletedEvent(1n, "GTEST123");
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      await handlePostDeleted(mockPool, event, context);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("deleted_at IS NULL"),
        expect.any(Array)
      );
    });

    it("should handle errors gracefully", async () => {
      const { event, context } = createMockPostDeletedEvent();
      mockQuery.mockRejectedValueOnce(new Error("DB error"));

      await expect(handlePostDeleted(mockPool, event, context)).rejects.toThrow("DB error");
    });
  });
});
