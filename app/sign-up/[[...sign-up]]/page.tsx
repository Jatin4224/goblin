import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="grid h-full place-items-center bg-sunken p-6">
      <SignUp />
    </div>
  );
}
