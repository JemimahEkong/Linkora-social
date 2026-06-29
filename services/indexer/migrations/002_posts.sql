-- Migration: Create posts table
-- Description: Stores on-chain posts with soft delete and threading support

CREATE TABLE IF NOT EXISTS posts (
    id BIGINT PRIMARY KEY,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    tip_total BIGINT NOT NULL DEFAULT 0,
    like_count BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP DEFAULT NULL,

    -- Threading columns (ADR-008)
    parent_id BIGINT DEFAULT NULL REFERENCES posts(id),
    root_id   BIGINT DEFAULT NULL,
    depth     INTEGER DEFAULT 0 CHECK (depth >= 0 AND depth <= 5),

    -- Indexes for common queries
    INDEX idx_posts_author (author),
    INDEX idx_posts_created_at (created_at DESC),
    INDEX idx_posts_deleted_at (deleted_at)
);

-- Index for active posts (not deleted)
CREATE INDEX idx_posts_active ON posts (created_at DESC) WHERE deleted_at IS NULL;

-- Index for fetching replies to a post
CREATE INDEX idx_posts_parent_id ON posts (parent_id) WHERE parent_id IS NOT NULL;

-- Index for fetching thread roots
CREATE INDEX idx_posts_root_id ON posts (root_id) WHERE root_id IS NOT NULL;
