import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="grid h-full place-items-center bg-sunken p-6">
      <SignIn />
    </div>
  );
}
