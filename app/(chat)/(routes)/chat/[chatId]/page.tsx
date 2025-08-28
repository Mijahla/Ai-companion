import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import prismadb from "@/lib/prismadb";
import { ChatClient } from "./components/client";

interface ChatIdPageProps {
    params: {
        chatId: string;
    }
}



const ChatIdPage = async ({
    params
}: ChatIdPageProps) => {

    const awaitedParams = await params;

    const { userId } = await auth();

    if (!userId) {
        redirect("/sign-in");
    }

    const companion = await prismadb.companion.findUnique({
        where: {
            id: awaitedParams.chatId
        },
        include: {
            messages: {
                orderBy: {
                    createdAt: "asc",
                },
                //To load only the messages with current userid
                where: {
                    userId,
                }
            },
            _count: {
                select: {
                    messages: true
                }
            }
        }
    });

    if (!companion) {
        return redirect("/");
    }

    return (
        <ChatClient companion={companion} />
    );
}

export default ChatIdPage;