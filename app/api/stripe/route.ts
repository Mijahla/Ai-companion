import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse  } from "next/server";

import prismadb from "@/lib/prismadb";
import { stripe } from "@/lib/stripe";
import { absoluteUrl } from "@/lib/utils";

const settingsUrl = absoluteUrl("/settings");

export async function GET() {
    try {
        const { userId } = await auth();
        const user = await currentUser();

        if (!userId || !user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        //Checking whether the user has subscription
        const userSubscription = await prismadb.userSubscription.findUnique({
            where: {
                userId
            }
        });

        // if the user already has a subscription we want to redirect the user to the billing page instead of the checkout page
        if (userSubscription && userSubscription.stripeCustomerId) {
            const stripeSession = await stripe.billingPortal.sessions.create({
                customer: userSubscription.stripeCustomerId,
                return_url: settingsUrl,
            });

            return new NextResponse(JSON.stringify({ url: stripeSession.url }));
        }

        // Other case where user is first time subscribing and creating checkout session
        const stripeSession = await stripe.checkout.sessions.create({
            success_url: settingsUrl,
            cancel_url: settingsUrl,
            payment_method_types: ["card"],
            mode: "subscription",
            billing_address_collection: "auto",
            customer_email: user.emailAddresses[0].emailAddress,
            line_items: [
                {
                    price_data: {
                        currency: "NPR",
                        product_data: {
                            name: "Companion Pro",
                            description: "Create Custom AI Companions",
                        },
                        unit_amount: 9999,
                        recurring:{
                            interval: "month",
                        }
                    },
                    quantity: 1,
                }
            ],
            //To return the data from stripe webhook in order to keep track of the user who just subscribed
            metadata: {
                userId
            }
        });

        return new NextResponse(JSON.stringify({ url: stripeSession.url }));

    } catch (error) {
        console.log("[STRIPE_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
