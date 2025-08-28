import { Categories } from "@/components/categories";
import { SearchInput } from "@/components/search-input";
import { Companions } from "@/components/ui/companions";
import prismadb from "@/lib/prismadb";

//to fetch the searched companions if any also every server component has searchparams in nextjs
interface RootPageProps {
    searchParams: Promise<{
        categoryId: string;
        name: string;
    }>;
}

const RootPage = async ({
    searchParams
}: RootPageProps) => {
    const params = await searchParams;

    const data = await prismadb.companion.findMany({
        where: {
            categoryId: params.categoryId,
            name: {
                search: params.name
            }
        },
        orderBy: {
            createdAt: "desc",
        },
        include: {
            _count: {
                select: {
                    messages: true
                }
            }
        }
    });

 
    const categories = await prismadb.category.findMany();


    return (
        <div className="h-full p-4 space-y-2">
            <SearchInput />
            <Categories data={categories} />
            <Companions data={data} />
        </div>
    );
}

export default RootPage;