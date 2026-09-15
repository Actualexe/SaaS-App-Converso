'use client'
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formUrlQuery, removeKeysFromUrlQuery } from "@jsmastery/utils"

const SearchInput = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const query = searchParams.get('topic') || '';
    // Seeded from the URL so a shared/reloaded link keeps its search term.
    const [searchQuery, setSearchQuery] = useState(query);

    // Follow external URL changes (Back/Forward) so the box matches the results.
    const [syncedQuery, setSyncedQuery] = useState(query);
    if (query !== syncedQuery) {
        setSyncedQuery(query);
        setSearchQuery(query);
    }

    // Read the latest params without re-running the debounce on URL changes;
    // otherwise Back/Forward would re-push the stale search term.
    const paramsRef = useRef(searchParams);
    useEffect(() => {
        paramsRef.current = searchParams;
    }, [searchParams]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            const params = paramsRef.current;
            const current = params.get('topic') || '';
            if (searchQuery === current) return;

            if (searchQuery) {
                router.push(formUrlQuery({
                    params: params.toString(),
                    key: "topic",
                    value: searchQuery,
                }));
            } else if (pathname === '/companions') {
                router.push(removeKeysFromUrlQuery({
                    params: params.toString(),
                    keysToRemove: ["topic"],
                }));
            }
        }, 500);

        return () => clearTimeout(timeout);
    }, [searchQuery, pathname, router])

    return (
        <div className="relative border border-black rounded-lg items-center flex gap-2 px-2 py-1 h-fit">
            <label htmlFor="companion-search" className="sr-only">Search companions</label>
            <Image src="/icons/search.svg" alt="" width={15} height={15} />
            <input
                id="companion-search"
                type="search"
                placeholder="Search companions..."
                className="input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
    )
}

export default SearchInput
