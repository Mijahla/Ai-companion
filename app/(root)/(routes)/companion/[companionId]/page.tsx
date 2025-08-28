import prismadb from "@/lib/prismadb";


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

    //TODO: Check Subscription


    //Server component that is able to fetch companions and categories
    const companion = await prismadb.companion.findUnique({
        where: {
            id: companionId,
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