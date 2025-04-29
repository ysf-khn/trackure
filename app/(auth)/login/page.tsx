"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, ControllerRenderProps } from "react-hook-form";
import * as z from "zod";
// import { BoltIcon, InfoCircledIcon } from "@radix-ui/react-icons"; // Example icon
// --- Import Google icon (assuming you have a suitable icon component or library) ---
// import { GoogleIcon } from "@/components/icons/google"; // Example import
// Or use a generic icon or text if you don't have one readily available

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";
import { InfoIcon } from "lucide-react";

// Updated Schema: Password is required
const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
});

type LoginFormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false); // Add state for Google button

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema), // Use the updated schema directly
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true);
    setErrorMessage(null);

    // Only Password Login logic remains
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    setIsLoading(false);
    if (error) {
      console.error("Login error:", error.message);
      setErrorMessage(error.message || "Invalid login credentials.");
    } else {
      router.push("/dashboard");
    }
  }

  // --- Add Google Sign In handler ---
  async function handleSignInWithGoogle() {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Ensure this matches your Supabase and Google Cloud setup
        redirectTo: `${location.origin}/api/auth/callback`,
      },
    });
    setIsGoogleLoading(false);
    if (error) {
      console.error("Google Sign In error:", error.message);
      setErrorMessage(error.message || "Could not sign in with Google.");
    }
    // Redirect happens automatically on success via Supabase
  }

  type FieldRenderProps = ControllerRenderProps<
    LoginFormValues,
    keyof LoginFormValues
  >;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-4">
      {/* Text Badge */}
      <div className="absolute left-4 top-4 rounded-xl bg-muted px-3 py-4 text-sm font-medium text-white shadow-sm">
        Control Complex Workflows
      </div>

      {/* Optional Back Button */}
      {/* <Button variant="ghost" asChild className="absolute top-4 left-4">
        <Link href="/">Back to Home</Link>
      </Button> */}

      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="rounded-lg bg-black p-3 shadow-md">
            <Image
              src="/logo.svg"
              alt="Trackure Logo"
              width={40}
              height={40}
              className="h-10 w-10"
            />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight bg-gradient-to-b from-white to-gray-800 text-transparent bg-clip-text">
            Welcome back to Trackure.
          </h1>
          <p className="text-sm text-muted-foreground">
            First time here?{" "}
            <Link
              href="/signup" // Link to signup page
              className="font-medium text-primary underline underline-offset-4 hover:text-primary/90"
            >
              Sign up for free.
            </Link>
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }: { field: FieldRenderProps }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Your work e-mail"
                      {...field}
                      type="email"
                      autoComplete="email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password field is always visible */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }: { field: FieldRenderProps }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="********"
                      {...field}
                      autoComplete="current-password"
                    />
                  </FormControl>
                  <FormMessage />
                  {/* Optional: Add forgot password link here */}
                  {/* <div className="text-right text-sm">
                    <Link href="/forgot-password" className="text-muted-foreground hover:underline">
                      Forgot password?
                    </Link>
                  </div> */}
                </FormItem>
              )}
            />

            {errorMessage && (
              <Alert variant="destructive">
                <InfoIcon className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </Form>

        {/* Placeholder for SSO */}
        {/* --- Divider --- */}
        <div className="relative my-4">
          {" "}
          {/* Added margin */}
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

        {/* --- Google Sign In Button --- */}
        <Button
          variant="outline"
          className="w-full"
          onClick={handleSignInWithGoogle}
          disabled={isLoading || isGoogleLoading} // Disable if either form or Google is loading
        >
          {/* Add Google Icon here if available */}
          {/* <GoogleIcon className="mr-2 h-4 w-4" /> */}
          {isGoogleLoading ? (
            "Redirecting..."
          ) : (
            <>
              <Image
                src="/googlelogo.png" // Path relative to public folder
                alt="Google logo"
                width={16} // Adjust size as needed
                height={16}
                className="mr-2 h-4 w-4" // Add margin-right
              />
              Sign in with Google
            </>
          )}
        </Button>

        <p className="px-8 text-center text-sm text-muted-foreground">
          You acknowledge that you read, and agree to our{" "}
          <Link
            href="/terms" // Replace with actual link
            className="underline underline-offset-4 hover:text-primary"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy" // Replace with actual link
            className="underline underline-offset-4 hover:text-primary"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
