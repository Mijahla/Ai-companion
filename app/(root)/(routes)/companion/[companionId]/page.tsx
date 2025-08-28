import prismadb from "@/lib/prismadb";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";


import { CompanionForm } from "./components/companion-form";

interface CompanionIdPageProps {
    params: {
        companionId: string;
    };
};



const CompanionIdPage = async ({
    params
}: CompanionIdPageProps ) => {
    const { companionId } = await params;
    const { userId } = await auth();

    //TODO: Check Subscription

    if (!userId){
        return redirect("/sign-in");
    }

    //Server component that is able to fetch companions and categories
    const companion = await prismadb.companion.findUnique({
        where: {
            id: companionId,
            userId,
        },
    });


    const categories = await prismadb.category.findMany();

    //use categories and pass it to clientcomponent category form
    return (
        <CompanionForm
        initialData={companion}
        categories={categories}
        />
    );
}

export default CompanionIdPage;