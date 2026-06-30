import { Router, Request, Response } from "express";
import { NotificationService } from "../../notifications/service";
import { requireStellarAuth } from "../../middleware/stellarAuth";

const ADDRESS_PATTERN = /^G[A-Z2-7]{55}$/;
const TOKEN_PATTERN =
  /^ExponentPushToken\[[^\]]+\]$|^ExpoPushToken\[[^\]]+\]$|^[A-Za-z0-9:_\-[\]]{8,256}$|^\{.*\}$/;
const PLATFORMS = new Set(["ios", "android", "web"]);

const DEFAULT_PREFERENCES = {
  browserPushEnabled: false,
  newFollowers: true,
  newLikes: true,
  newComments: true,
  directMessages: true,
  poolActivity: true,
  governanceUpdates: true,
};

export function createNotificationsRouter(service: NotificationService): Router {
  const router = Router();

  router.post("/register", async (req: Request, res: Response): Promise<void> => {
    const { address, token, platform } = req.body as {
      address?: unknown;
      token?: unknown;
      platform?: unknown;
    };

    if (typeof address !== "string" || !ADDRESS_PATTERN.test(address)) {
      res
        .status(400)
        .json({ error: "address must be a Stellar public key", code: "INVALID_ADDRESS" });
      return;
    }

    if (typeof token !== "string" || !TOKEN_PATTERN.test(token)) {
      res.status(400).json({ error: "token is required", code: "INVALID_TOKEN" });
      return;
    }

    if (typeof platform !== "string" || !PLATFORMS.has(platform)) {
      res
        .status(400)
        .json({ error: "platform must be ios, android, or web", code: "INVALID_PLATFORM" });
      return;
    }

    await service.registerDeviceToken(address, token, platform);
    res.status(204).send();
  });

  router.post("/deregister", async (req: Request, res: Response): Promise<void> => {
    const { address } = req.body as { address?: unknown };

    if (typeof address !== "string" || !ADDRESS_PATTERN.test(address)) {
      res
        .status(400)
        .json({ error: "address must be a Stellar public key", code: "INVALID_ADDRESS" });
      return;
    }

    await service.deregisterDeviceToken(address);
    res.status(204).send();
  });

  router.get(
    "/preferences",
    requireStellarAuth,
    async (req: Request, res: Response): Promise<void> => {
      const address = req.context?.stellarAddress;
      if (!address) {
        res.status(401).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
        return;
      }

      try {
        const prefs = await service.getPreferences(address);
        res.json(prefs || { ...DEFAULT_PREFERENCES, address });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch preferences", code: "INTERNAL_ERROR" });
      }
    }
  );

  router.post(
    "/preferences",
    requireStellarAuth,
    async (req: Request, res: Response): Promise<void> => {
      const address = req.context?.stellarAddress;
      if (!address) {
        res.status(401).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
        return;
      }

      const { preferences, subscription } = req.body as {
        preferences?: {
          browserPushEnabled: boolean;
          newFollowers: boolean;
          newLikes: boolean;
          newComments: boolean;
          directMessages: boolean;
          poolActivity: boolean;
          governanceUpdates: boolean;
        };
        subscription?: any;
      };

      if (!preferences || typeof preferences !== "object") {
        res
          .status(400)
          .json({ error: "preferences object is required", code: "INVALID_PREFERENCES" });
        return;
      }

      try {
        await service.savePreferences(address, preferences);

        if (preferences.browserPushEnabled && subscription) {
          const tokenStr =
            typeof subscription === "string" ? subscription : JSON.stringify(subscription);
          await service.registerDeviceToken(address, tokenStr, "web");
        } else {
          await service.deregisterDeviceToken(address);
        }

        res.status(200).json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to save preferences", code: "INTERNAL_ERROR" });
      }
    }
  );

  return router;
}
