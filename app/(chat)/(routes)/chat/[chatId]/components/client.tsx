"use client";

import { useCompletion } from "@ai-sdk/react";
import { FormEvent, useState } from "react";
import { Companion, Message } from "@prisma/client";
import { useRouter } from "next/navigation";

import { ChatHeader } from "@/components/chat-header";
import { ChatForm } from "@/components/chat-form";
import { ChatMessages } from "@/components/chat-messages";
import { ChatMessageProps } from "@/components/chat-message";

interface ChatClientProps {
    companion: Companion & {
        messages: Message[];
        _count: {
            messages: number;
        };
    };
};

// export const ChatClient = ({
//     companion
// }: ChatClientProps) => {
//     const router = useRouter();
//     const [messages, setMessages] = useState<ChatMessageProps[]>(companion.messages);

//     //waiting for the response of out API, store it as system message into array of messages
//     const { input, isLoading, handleInputChange, handleSubmit, setInput,} = useCompletion({
//         api: `/api/chat/${companion.id}`,
//         onFinish(prompt, completion){
//             console.log("🎉 Completion received:", completion); // Add this

//             const systemMessage: ChatMessageProps = {
//                 role: "system",
//                 content: completion,
//             };
//             setMessages((current) => [...current, systemMessage]);
//             setInput("");

//             // router.refresh();
//         },
//         onError(error) {
//         console.error("❌ Completion error:", error); // Add this
//     }
//     });

//     //create a user message
//     const onSubmit = (e: FormEvent<HTMLFormElement>) => {
//         const userMessage: ChatMessageProps = {
//             role: "user",
//             content: input,
//         };

//         setMessages((current) => [...current, userMessage]);

//         handleSubmit(e);
//     }

//     return (
//         <div className="flex flex-col h-full p-4 space-y-2">
//             <ChatHeader companion={companion} />
//             <ChatMessages companion={companion} isLoading={isLoading} messages={messages} />
//             <ChatForm isLoading={isLoading} input={input} handleInputChange={handleInputChange} onSubmit={onSubmit} />
//         </div>
//     );
// }

export const ChatClient = ({
    companion
}: ChatClientProps) => {
    const router = useRouter();
    const [messages, setMessages] = useState<ChatMessageProps[]>(companion.messages);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setInput(e.target.value);
    };

    const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        if (!input.trim() || isLoading) return;

        // Create user message immediately
        const userMessage: ChatMessageProps = {
            role: "user",
            content: input,
        };
        setMessages((current) => [...current, userMessage]);

        const currentInput = input;
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch(`/api/chat/${companion.id}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ prompt: currentInput }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log("🎉 Completion received:", data.completion);

            if (data.completion) {
                const systemMessage: ChatMessageProps = {
                    role: "system",
                    content: data.completion,
                    src: companion.src
                };
                setMessages((current) => [...current, systemMessage]);
            }

        } catch (error) {
            console.error("❌ API error:", error);
            
            // Show error message to user
            const errorMessage: ChatMessageProps = {
                role: "system",
                content: "Sorry, I encountered an error. Please try again.",
                src: companion.src
            };
            setMessages((current) => [...current, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex flex-col h-full p-4 space-y-2">
            <ChatHeader companion={companion} />
            <ChatMessages 
                companion={companion} 
                isLoading={isLoading} 
                messages={messages} 
            />
            <ChatForm 
                isLoading={isLoading} 
                input={input} 
                handleInputChange={handleInputChange} 
                onSubmit={onSubmit} 
            />
        </div>
    );
}
