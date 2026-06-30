import { useCallback, useState, useMemo } from "react";
import { LinkoraClient } from "linkora-sdk";

import { useToast } from "../context/ToastContext";
import { useWallet } from "./useWallet";
import { useNetwork } from "./useNetwork";
import { useSubmitTx } from "./useSubmitTx";

export const useFollow = (targetAddress: string) => {
  const { address, connected } = useWallet();
  const { showError } = useToast();
  const { contractId, rpcUrl } = useNetwork();
  const submitTx = useSubmitTx();

  const client = useMemo(() => new LinkoraClient({ contractId, rpcUrl }), [contractId, rpcUrl]);

  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const toggleFollow = useCallback(async () => {
    if (!connected || !address) {
      const message = "Connect your wallet to follow users.";
      showError(message);
      setError(new Error(message));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const txXdr = isFollowing
        ? client.unfollow(address, targetAddress)
        : client.follow(address, targetAddress);

      await submitTx(txXdr);
      setIsFollowing((prev) => !prev);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Follow action failed"));
    } finally {
      setIsLoading(false);
    }
  }, [address, connected, isFollowing, targetAddress, client, submitTx, showError]);

  return { isFollowing, isLoading, toggleFollow, error };
};
