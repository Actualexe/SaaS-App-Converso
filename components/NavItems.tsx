'use client';
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NavItems = () => {
    const NavItems = [
        {label: "Home", href: "/"},
        {label: "Learning Companions", href: "/companions"},
        {label: "My Journey", href:"/my-journey"}
    ]
    const pathname = usePathname();
    return (
    <nav className="flex items-center gap-4">
        {NavItems.map(({label, href}) => (
            <Link href={href} key={label} className={cn(pathname === href && 'text-primary font-semibold')}>
                {label}
            </Link>
        ))}
    </nav>
    )
}

export default NavItems