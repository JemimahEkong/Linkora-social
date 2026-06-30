import { createNotificationsRouter } from "../notifications";
import { NotificationService } from "../../../notifications/service";

function createMockResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };

  return res;
}

async function postRegister(body: Record<string, unknown>, service: NotificationService) {
  const router = createNotificationsRouter(service);
  const layer = router.stack.find((item) => item.route?.path === "/register");
  const handler = layer?.route?.stack[0].handle;
  if (!handler) {
    throw new Error("register route handler not found");
  }

  const req = { body };
  const res = createMockResponse();
  await handler(req as never, res as never, jest.fn());
  return res;
}

async function postDeregister(body: Record<string, unknown>, service: NotificationService) {
  const router = createNotificationsRouter(service);
  const layer = router.stack.find((item) => item.route?.path === "/deregister");
  const handler = layer?.route?.stack[0].handle;
  if (!handler) {
    throw new Error("deregister route handler not found");
  }

  const req = { body };
  const res = createMockResponse();
  await handler(req as never, res as never, jest.fn());
  return res;
}

describe("notifications API", () => {
  const address = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

  it("registers a device token", async () => {
    const service = new NotificationService();

    const res = await postRegister(
      { address, token: "ExpoPushToken[token-123]", platform: "ios" },
      service
    );

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
    await expect(service.getDeviceToken(address)).resolves.toBe("ExpoPushToken[token-123]");
  });

  it("rejects malformed registration requests", async () => {
    const service = new NotificationService();

    const res = await postRegister(
      { address: "bad", token: "ExpoPushToken[token-123]", platform: "ios" },
      service
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "INVALID_ADDRESS" }));
  });

  it("deregisters a device token", async () => {
    const service = new NotificationService();
    await service.registerDeviceToken(address, "ExpoPushToken[token-456]", "ios");

    const res = await postDeregister({ address }, service);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
    await expect(service.getDeviceToken(address)).resolves.toBeNull();
  });

  it("rejects deregistration with invalid address", async () => {
    const service = new NotificationService();

    const res = await postDeregister({ address: "bad" }, service);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "INVALID_ADDRESS" }));
  });
});
