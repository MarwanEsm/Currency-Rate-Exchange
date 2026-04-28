/**
 * POST /api/stripe/create-checkout-session
 *
 * Creates a Stripe Checkout Session (hosted payment page — PCI-safe card capture).
 * Requires STRIPE_SECRET_KEY in env (test: sk_test_..., live: sk_live_...).
 */
import Stripe from "stripe";
import { wholeAmountToStripeMinorUnits } from "@/domain/stripeCheckoutAmount";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Method not allowed" });
    }

    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret || typeof secret !== "string") {
        return res.status(503).json({
            error: "stripe_not_configured",
            message: "Payments are not configured. Add STRIPE_SECRET_KEY to your environment.",
        });
    }

    const stripe = new Stripe(secret);

    let body = req.body;
    if (typeof body === "string") {
        try {
            body = JSON.parse(body);
        } catch {
            return res.status(400).json({ error: "invalid_json", message: "Body must be JSON." });
        }
    }

    const currencyRaw = typeof body.currency === "string" ? body.currency.trim().toUpperCase() : "";
    const amountWhole =
        typeof body.amountWhole === "number"
            ? body.amountWhole
            : typeof body.amountWhole === "string"
              ? Number(body.amountWhole)
              : NaN;

    const pair = typeof body.pairLabel === "string" ? body.pairLabel.trim().slice(0, 180) : "";

    const converted = wholeAmountToStripeMinorUnits(amountWhole, currencyRaw);
    if (!converted.ok) {
        return res.status(400).json({ error: "validation_error", message: converted.message });
    }

    const origin =
        (typeof req.headers.origin === "string" && req.headers.origin) ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        "";

    if (!origin) {
        return res.status(500).json({
            error: "missing_origin",
            message: "Set NEXT_PUBLIC_SITE_URL (e.g. http://localhost:3000) for redirect URLs.",
        });
    }

    const base = origin.replace(/\/$/, "");
    const successUrl = `${base}/currencies?stripe_status=success`;
    const cancelUrl = `${base}/currencies?stripe_status=cancel`;

    try {
        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card"],
            line_items: [
                {
                    quantity: 1,
                    price_data: {
                        currency: currencyRaw.toLowerCase(),
                        unit_amount: converted.minorUnits,
                        product_data: {
                            name: "Wallet funding",
                            description: pair || `Funding (${currencyRaw})`,
                        },
                    },
                },
            ],
            metadata: {
                pairLabel: pair,
                currency: currencyRaw,
            },
            success_url: successUrl,
            cancel_url: cancelUrl,
        });

        if (!session.url) {
            return res.status(502).json({
                error: "stripe_no_url",
                message: "Checkout session did not return a URL.",
            });
        }

        return res.status(200).json({ url: session.url, id: session.id });
    } catch (e) {
        const msg =
            e && typeof e === "object" && "message" in e ? String(e.message) : "Stripe request failed.";
        return res.status(502).json({ error: "stripe_error", message: msg });
    }
}
