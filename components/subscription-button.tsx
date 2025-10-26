"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";


interface SubscriptionButtonProps{
    isPro: boolean;
};

export const SubscriptionButton = ({
    isPro = false
}: SubscriptionButtonProps) => {
    const [loading, setLoading] = useState(false);

    const onClick = async () => {
        try {
            setLoading(true);

            const response = await axios.get("/api/stripe")

            window.location.href = response.data.url;
        } catch (error) {
            toast("Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Button onClick={onClick} disabled={loading} className="rounded" size="sm" variant={isPro ? "default" : "premium"}>
            {isPro ? "Manage Subscription" : "Upgrade"}
            {!isPro && <Sparkles className="h-4 w-4 ml-3 fill-white" /> }
        </Button>
)}