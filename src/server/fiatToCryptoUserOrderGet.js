import { getOrderProgressNotificationEventsForOrder } from "@/domain/fiatToCryptoOrderProgress";
import { getFiatToCryptoOrderById } from "@/server/inMemoryFiatToCryptoOrders";

/**
 * GET /api/fiat-to-crypto/orders/[id] — owner order snapshot + notification log (FCX-46).
 * Demo: `x-user-id` header must match `order.userId`.
 */
export function handleGetFiatToCryptoOrderForUser(req, res) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ error: "Method not allowed" });
    }

    const userId = typeof req.headers["x-user-id"] === "string" ? req.headers["x-user-id"].trim() : "";
    const rawId = typeof req.query?.id === "string" ? req.query.id : Array.isArray(req.query?.id) ? req.query.id[0] : "";
    const id = rawId.trim();
    if (!id) {
        return res.status(400).json({ error: "order id is required" });
    }

    const order = getFiatToCryptoOrderById(id);
    if (!order) {
        return res.status(404).json({ error: "order_not_found" });
    }
    if (!userId || userId !== order.userId) {
        return res.status(403).json({ error: "forbidden" });
    }

    const notifications = getOrderProgressNotificationEventsForOrder(id);
    return res.status(200).json({ order, notifications });
}
