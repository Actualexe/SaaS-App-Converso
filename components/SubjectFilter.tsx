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
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { removeKeysFromUrlQuery, formUrlQuery } from "@jsmastery/utils"

const SubjectFilter = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const query = searchParams.get("subject") || "";
    const [subject, setSubject] = useState(query);

    useEffect(() => {
            let newUrl = "";
            if(subject === "all"){
                newUrl = removeKeysFromUrlQuery({
                    params: searchParams.toString(),
                    keysToRemove: ["subject"],
                });
            }else{
                newUrl = formUrlQuery({
                params: searchParams.toString(),
                key: "subject",
                value: subject,
                });
            }
            router.push(newUrl);
    }, [subject]);
    
    return (
        <div>
            <Select onValueChange={(value) => setSubject(value ?? "")} value={subject}>
                <SelectTrigger className="input capitalize">
                    <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                    <SelectItem value="all">
                        All Subjects    
                    </SelectItem>    
                    {subjects.map((item) => (
                        <SelectItem key={item} value={item}>
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