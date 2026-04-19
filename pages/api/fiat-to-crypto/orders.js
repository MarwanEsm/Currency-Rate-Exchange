import { randomUUID } from "crypto";
import { buildSubmittedFiatToCryptoOrder, validateFiatToCryptoIntakePayload } from "@/domain/fiatToCryptoIntake";
import { saveSubmittedFiatToCryptoOrder } from "@/server/inMemoryFiatToCryptoOrders";

/**
 * POST /api/fiat-to-crypto/orders — create a fiat-to-crypto order in `submitted` (FCX-25).
 * Body: { userId, fiatCurrency, fiatAmount, targetAssetCode, walletAddress, network?, kycVerificationStatus }
 *
 * Production: resolve `kycVerificationStatus` (and `userId`) from the authenticated session and a
 * KYC vendor — do not trust client-supplied verification flags alone.
 */
export default function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Method not allowed" });
    }

    const body = req.body;
    if (body === undefined || body === null || typeof body !== "object") {
        return res.status(400).json({ errors: ["JSON body is required."] });
    }

    const validation = validateFiatToCryptoIntakePayload(body);
    if (!validation.ok) {
        return res.status(400).json({ errors: validation.errors });
    }

    const id = randomUUID();
    const order = buildSubmittedFiatToCryptoOrder(validation.normalized, id);
    saveSubmittedFiatToCryptoOrder(order);

    return res.status(201).json({ order });
}
