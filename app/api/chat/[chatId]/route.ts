import { streamText, generateText } from "ai";
import { auth, currentUser } from "@clerk/nextjs/server";
import { CallbackManager } from "@langchain/core/callbacks/manager";
import { groq } from "@ai-sdk/groq";
import { NextResponse } from "next/server";

import { MemoryManager } from "@/lib/memory";
import { rateLimit } from "@/lib/rate-limit";
import prismadb from "@/lib/prismadb";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ chatId: string }>}
){
    try {
        const { chatId } = await params;
        const { prompt } = await request.json();
        const user = await currentUser();

        console.log("📝 Prompt:", prompt);
        console.log("🆔 Chat ID:", chatId);

        if (!user || !user.firstName || !user.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const identifier = request.url + "-" + user.id;
        const { success } = await rateLimit(identifier);

        if (!success) {
            return new NextResponse("Rate limit exceeded", { status: 429 });
        }

        const companion = await prismadb.companion.update({
            where: {
                id: chatId,
            },
            data: {
                messages: {
                    create: {
                        content: prompt,
                        role: "user",
                        userId: user.id,
                    }
                }
            }
        });

        if (!companion) {
            return new NextResponse("Companion not found", { status: 404 });
        }

        const name = companion.id;
        const companion_file_name = name + ".txt";

        const companionKey = {
            companionName: name,
            userId: user.id,
            modelName: "llama2-13b",
        };

        const memoryManager = await MemoryManager.getInstance();

        const records = await memoryManager.readLatestHistory(companionKey);

        if (records.length === 0) {
            await memoryManager.seedChatHistory(companion.seed, "\n\n", companionKey);
        }


        await memoryManager.writeToHistory("User: " + prompt + "\n", companionKey);

        const recentChatHistory = await memoryManager.readLatestHistory(companionKey);
        //vector search

        const similarDocs = await memoryManager.vectorSearch(
            recentChatHistory,
            companion_file_name,
        );

        let relevantHistory = "";

        if (!!similarDocs && similarDocs.length !== 0) {
            relevantHistory = similarDocs.map((doc) => doc.pageContent).join("\n");
        }

        // Groq model setup - no additional configuration needed

        const modelPrompt = `
            ONLY generate plain sentences without prefix of who is speaking. DO NOT use ${companion.name}: prefix.
            ${companion.instructions}
            Below are the relevant details about ${companion.name}'s past and the conversation you are in.
            ${relevantHistory}
            ${recentChatHistory}\n${companion.name}:
        `;

        // const { handlers } = LangChainStream();

        // const model = new Replicate({
        //     model: "a16z-infra/llama-2-13b-chat:df7690f1994d94e96ad9d568eac121aecf50684a0b0963b25a41cc40061269e5",
        //     input: {
        //         max_length: 2048,
        //     },
        //     apiKey: process.env.REPLICATE_API_TOKEN,
        //     callbackManager: CallbackManager.fromHandlers(handlers),
        // });

        // model.verbose = true;

        //inserting memory into prompt from vector database
        // Create a streaming response that useCompletion can handle
        // Use streamText correctly and return the stream
        // Use streamText and return the proper streaming response for useCompletion
    // Use generateText for non-streaming response
        const { text } = await generateText({
            model: groq('llama-3.1-8b-instant'),
            prompt: modelPrompt,
        });

        console.log("✅ Generated text:", text);

        // Save to database and memory (your existing code)
        if (text && text.trim().length > 1) {
            await memoryManager.writeToHistory(text.trim(), companionKey);
            await prismadb.companion.update({
                where: { id: chatId },
                data: {
                    messages: {
                        create: {
                            content: text.trim(),
                            role: "system",
                            userId: user.id
                        }
                    }
                }
            });
        }

        // Return simple JSON response
        return NextResponse.json({ completion: text });

    } catch (error) {
        console.log("[CHAT_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}