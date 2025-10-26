"use client";

import { useEffect, useState } from "react";
import axios from "axios";

import { useProModal } from "@/hooks/use-pro-modal";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const ProModal = () => {
    const proModal = useProModal();

    const [loading, setLoading] = useState(false);

    //preventing hydration warnings:
    const [isMounted, setisMounted] = useState(false);

    useEffect(() => {
        setisMounted(true);
    }, [])

    const onSubscribe = async () => {
        try {
            setLoading(true);

            const response = await axios.get("/api/stripe");

            window.location.href = response.data.url;
        } catch (error) {
            toast("Something went wrong!")
        } finally {
            setLoading(false);
        }
    }

    if (!isMounted) {
        return null;
    }

    return (
        <Dialog open={proModal.isOpen} onOpenChange={proModal.onClose}>
            <DialogContent>
                <DialogHeader className="space-y-4">
                    <DialogTitle className="text-center">
                        Upgrade to Pro
                    </DialogTitle>
                    <DialogDescription className="text-center space-y-2">
                        Create <span className="text-sky-500 mx-1 font-medium">Custom AI</span> Companions!
                    </DialogDescription>
                </DialogHeader>
                <Separator/>
                <div className="flex justify-between">
                    <p className="text-2xl font-medium">
                        Rs 99<span className="text-sm font-normal">
                            .9 / mo 
                        </span>
                    </p>
                    <Button disabled={loading} onClick={onSubscribe} className="rounded" variant="premium">
                        Subscribe
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};