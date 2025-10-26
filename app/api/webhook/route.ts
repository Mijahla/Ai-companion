import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import prismadb from "@/lib/prismadb";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
    console.log("WEBHOOK RECEIVED");

    const body = await req.text();
    const signature = (await headers()).get("Stripe-Signature") as string;

    // To make sure that this is a valid request coming from stripe
    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
        console.log("WEBHOOK VERIFIED!!")
    } catch (error: any) {
        console.log("WEBHOOK VERIFICATION FAILED", error.message)
        return new NextResponse(`Webhook Error: ${error.message}`, { status: 400});
    }

    const session = event.data.object as Stripe.Checkout.Session;

    //Either user is updating the details or subscribing for the first time so checking that
    if (event.type === "checkout.session.completed") {
        console.log("CHECKOUT SESSION COMPLETED")
        const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
        );

        if (!session?.metadata?.userId) {
            console.log("NO USER ID IN METADATA");
            return new NextResponse("User id is required", { status: 400 });
        }
        
        console.log("CREATING SUBSCRIPTION FOR USER",session.metadata.userId);

        const currentPeriodEnd = new Date();
        currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);


        await prismadb.userSubscription.create({
            data:{
                userId: session?.metadata?.userId,
                stripeSubscriptionId: subscription.id,
                stripeCustomerId: subscription.customer as string,
                stripePriceId: subscription.items.data[0].price.id,
                stripeCurrentPeriodEnd: currentPeriodEnd,
            },
        });

        console.log("SUBSCRIPTION UPDATED IN DATABASE")
    }

    //Handling the case where the user updated the details or cancelled the subscription
    if (event.type === "invoice.payment_succeeded") {

        console.log("INVOICE PAYMENT SUCCEEDED")

        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string | undefined;
        
        if (!subscriptionId) {
            console.log("NO VALID SUBSCRIPTION IN INVOICE");
            return new NextResponse(null, { status: 200 });
        }
        
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        

        const nextPeriodEnd = new Date();
        nextPeriodEnd.setDate(nextPeriodEnd.getDate() + 30);

        //updating the details
        await prismadb.userSubscription.update({
            where: {
                stripeSubscriptionId: subscription.id
            },
            data: {
                stripePriceId: subscription.items.data[0].price.id,
                stripeCurrentPeriodEnd: nextPeriodEnd
            },
        });
    }

    return new NextResponse(null, { status:200 });
};