import Image from "next/image"
import Link from "next/link"
import NavItems from "./NavItems"
import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs"

const Navbar = () => {
  return (
    <header>
        <nav className="navbar">
            <Link href="/">
                <div className="flex items-center gap-2.5 cursor-pointer">
                    <Image src="/images/logo.svg" alt="logo" width={50} height={50} />
                </div>
            </Link>

            <div className="flex items-center gap-8">
                <NavItems />
                <Show when="signed-out">
                    <SignInButton >
                        <button className="btn-signin">Sign In</button>
                    </SignInButton>
                </Show>
                <Show when="signed-in">
                    <UserButton />
                </Show>
            </div>
        </nav>
    </header>
  )
}

export default Navbar