import { Hono } from "hono";
import "../types/hono.d.ts";
import type { Database } from "../database/database.ts";
import { authMiddleware } from "./auth.ts";

export function devicesRoutes(db: Database) {
  const app = new Hono();

  // Apply auth middleware
  app.use("*", authMiddleware);

  // Get all devices
  app.get("/", (c) => {
    try {
      const devices = db.getAllDevices();
      return c.json({ devices });
    } catch (error) {
      console.error("Get devices error:", error);
      return c.json({ error: "Failed to fetch devices" }, 500);
    }
  });

  // Delete a device
  app.delete("/:deviceId", (c) => {
    try {
      const deviceId = c.req.param("deviceId");
      const requestingDeviceId = c.get("deviceId") as string;

      // For now, only allow devices to delete themselves
      // You could add admin logic here if needed
      if (deviceId !== requestingDeviceId) {
        return c.json(
          { error: "You can only delete your own device" },
          403,
        );
      }

      db.deleteDevice(deviceId);
      return c.json({ success: true });
    } catch (error) {
      console.error("Delete device error:", error);
      return c.json({ error: "Failed to delete device" }, 500);
    }
  });

  return app;
}
