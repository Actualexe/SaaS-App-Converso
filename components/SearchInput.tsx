'use client'
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { Input } from "./ui/input";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {formUrlQuery, removeKeysFromUrlQuery} from "@jsmastery/utils"
// import { setTimeout } from "timers/promises";

const SearchInput = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const query = searchParams.get('topic') || '';
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const delayDebouncefn = setTimeout(() => {
            let newUrl = "";
            if(searchQuery){
                newUrl = formUrlQuery({
                    params: searchParams.toString(),
                    key: "topic",
                    value: searchQuery,
                });

                router.push(newUrl);
            }else{
                if(pathname === '/companions'){
                    newUrl = removeKeysFromUrlQuery({
                        params: searchParams.toString(),
                        keysToRemove: ["topic"],
                        });

                    router.push(newUrl);
                }
            }
        }, 500);
        return () => clearTimeout(delayDebouncefn);
    }, [searchQuery, pathname])

    return (
        <div className="relative border border-black rounded-lg items-center flex gap-2 px-2 py-1 h-fit">
            <Image src="/icons/search.svg" alt="search" width={15} height={15} />
            <input 
                placeholder="Search companions..."
                className="input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
    )
}

export default SearchInput

