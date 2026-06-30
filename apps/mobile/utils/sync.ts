import { LinkoraClient } from "linkora-sdk";
import {
  confirmPendingPost,
  getCachedPostById,
  getPendingPosts,
  markPendingPostFailed,
  reconcilePosts,
} from "./db";
import { Post } from "../components/PostCard";

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Fetches posts from the indexer, resolves their content/username from the blockchain if not cached,
 * and reconciles them with the local SQLite cache.
 */
export async function fetchAndCachePosts(
  limit: number,
  offset: number,
  contractId: string,
  rpcUrl: string
): Promise<Post[]> {
  const indexerUrl = process.env.EXPO_PUBLIC_INDEXER_URL || "http://localhost:3001";
  const client = new LinkoraClient({ contractId, rpcUrl });

  // 1. Fetch posts from the indexer
  const res = await fetch(
    `${indexerUrl.replace(/\/$/, "")}/api/posts?limit=${limit}&offset=${offset}`
  );
  if (!res.ok) {
    throw new Error("Failed to fetch posts from indexer");
  }

  const data = await res.json();
  const indexerPosts = data.posts || [];
  const finalPosts: Post[] = [];

  // 2. Fetch content/profile details for each post, using local cache as much as possible
  for (const ip of indexerPosts) {
    const cached = await getCachedPostById(String(ip.id));
    let content = cached?.content;
    let username = cached?.username || "stellar_user";

    if (!content) {
      try {
        const onChainPost = await client.getPost(BigInt(ip.id));
        content = onChainPost?.content || "No content available";

        const profile = await client.getProfile(ip.author);
        username = profile?.username || shortAddress(ip.author);
      } catch (err) {
        console.warn(`Failed to fetch on-chain details for post ${ip.id}:`, err);
        content = "Content unavailable offline";
      }
    }

    finalPosts.push({
      id: String(ip.id),
      author: ip.author,
      username,
      content,
      tip_total: Number(ip.tip_total || 0),
      timestamp: ip.created_ledger || Math.floor(Date.now() / 1000),
      like_count: Number(ip.like_count || 0),
      has_liked: ip.has_liked || false,
    });
  }

  // 3. Reconcile with SQLite cache
  await reconcilePosts(finalPosts);

  return finalPosts;
}

/**
 * Syncs any pending/failed optimistic posts to the blockchain.
 */
export async function syncPendingPosts(contractId: string, rpcUrl: string): Promise<void> {
  const pending = await getPendingPosts();
  if (pending.length === 0) return;

  const kit = (
    globalThis as unknown as {
      __LINKORA_WALLET_KIT__?: {
        signAndSubmitTransaction?: (opts: {
          txXdr: string;
          rpcUrl?: string;
        }) => Promise<{ hash?: string; txHash?: string }>;
        signTransaction?: (opts: {
          txXdr: string;
        }) => Promise<{ signedTxXdr?: string; signedXdr?: string; signed?: string }>;
      };
    }
  ).__LINKORA_WALLET_KIT__;

  if (!kit) {
    console.warn("Wallet kit not available; postponing background sync");
    return;
  }

  const client = new LinkoraClient({ contractId, rpcUrl });

  for (const post of pending) {
    try {
      // 1. Build create_post transaction XDR
      const txXdr = client.createPost(post.author, post.content);

      // 2. Sign and submit
      let txHash = "";
      if (typeof kit.signAndSubmitTransaction === "function") {
        const submitRes = await kit.signAndSubmitTransaction({ txXdr, rpcUrl });
        txHash = submitRes?.hash || submitRes?.txHash || "";
      } else if (typeof kit.signTransaction === "function") {
        const signed = await kit.signTransaction({ txXdr });
        const signedXdr = signed?.signedTxXdr || signed?.signedXdr || signed?.signed;
        if (!signedXdr) throw new Error("Wallet did not return signed transaction");

        const { Rpc, SubmitTransactionResponse: _SubmitTransactionResponse } =
          await import("@stellar/stellar-sdk");
        const server = new Rpc.Server(rpcUrl);
        const submitRes = await server.submitTransaction(signedXdr);
        txHash = submitRes?.hash || "";
      } else {
        throw new Error("No available wallet signing method");
      }

      if (!txHash) {
        throw new Error("Failed to get transaction hash");
      }

      // 3. Resolve the new post ID by scanning the latest on-chain posts from this author
      const postCount = await client.getPostCount();
      let realId = String(postCount);
      let found = false;

      // Scan the last 5 posts to find the one matching author and content
      for (let i = 0; i < 5; i++) {
        const checkId = postCount - BigInt(i);
        if (checkId <= 0n) break;

        const p = await client.getPost(checkId);
        if (p && p.author === post.author && p.content === post.content) {
          realId = String(checkId);
          found = true;
          break;
        }
      }

      if (!found) {
        console.warn("Could not find matching post ID on-chain; falling back to count");
      }

      // 4. Update the local SQLite cache to replace the optimistic ID with the real ID
      await confirmPendingPost(String(post.id), realId);
    } catch (err) {
      console.error(`Failed to sync optimistic post ${post.id}:`, err);
      // Mark as failed so the UI can display a retry option
      await markPendingPostFailed(String(post.id));
    }
  }
}
