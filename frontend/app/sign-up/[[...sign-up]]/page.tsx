import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
      <SignUp />
    </div>
  );
}
