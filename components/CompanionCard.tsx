import { Button } from "@base-ui/react";
import Image from "next/image";
import Link from "next/link";

interface CompanionCardProps {
    id: string;
    name: string;
    topic: string;
    subject: string;
    duration: number;
    color: string;
}

const CompanionCard = ({ id, name, topic, subject, duration, color }: CompanionCardProps) => {
  return (
    <article className="companion-card" style={{background: color}}>
        <div className="flex justify-between items-center">
            <div className="subject-badge">{subject}</div>
            <button className="companion-bookmark">
                <Image src="/icons/bookmark.svg" alt="bookmark" width={10} height={10} />
            </button>
        </div>

        <h2 className="text-2xl font-bold">{name}</h2>
        <p>Topic: {topic}</p>

        <div className="flex items-center gap-2">
            <Image src="/icons/clock.svg" alt="clock" width={15} height={15} />
            <p>{duration} mins duration</p>
        </div>

        <Link href="/" className="w-full">
            <button className="btn-primary w-full justify-center">
                Launch Lesson
            </button>
        </Link>
    </article>
  )
}

export default CompanionCard