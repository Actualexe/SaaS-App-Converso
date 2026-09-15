'use client'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { subjects } from "@/constants"
import { useRouter, useSearchParams } from "next/navigation"
import { removeKeysFromUrlQuery, formUrlQuery } from "@jsmastery/utils"

const SubjectFilter = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    // The URL is the source of truth, so Back/Forward stay in sync and never
    // trigger a re-push of a stale selection.
    const subject = searchParams.get("subject") || "all";

    const handleChange = (value: unknown) => {
        const next = !value || value === "all" ? "" : (value as string);
        if (next === (searchParams.get("subject") || "")) return;

        router.push(next
            ? formUrlQuery({
                params: searchParams.toString(),
                key: "subject",
                value: next,
              })
            : removeKeysFromUrlQuery({
                params: searchParams.toString(),
                keysToRemove: ["subject"],
              })
        );
    };

    return (
        <div>
            <Select onValueChange={handleChange} value={subject}>
                <SelectTrigger className="input capitalize">
                    <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                    <SelectItem value="all">
                        All Subjects
                    </SelectItem>
                    {subjects.map((item) => (
                        <SelectItem key={item} value={item} className="capitalize">
                        {item}
                        </SelectItem>
                    ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
        </div>
    )
}

export default SubjectFilter
