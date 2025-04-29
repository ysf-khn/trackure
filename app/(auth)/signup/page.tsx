"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, ControllerRenderProps } from "react-hook-form";
import * as z from "zod";

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

// Add password confirmation later if needed
const formSchema = z.object({
  firstName: z.string().min(1, {
    message: "First name is required.",
  }),
  lastName: z.string().min(1, {
    message: "Last name is required.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
  // confirmPassword: z.string(), // Uncomment when adding confirmation
});
// .refine((data) => data.password === data.confirmPassword, {
//   message: "Passwords don't match",
//   path: ["confirmPassword"], // path of error
// });

type SignupFormValues = z.infer<typeof formSchema>;

export default function SignupPage() {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      // confirmPassword: "", // Uncomment when adding confirmation
    },
  });

  async function onSubmit(values: SignupFormValues) {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          first_name: values.firstName,
          last_name: values.lastName,
        },
        // Ensure this matches the redirect configured in your Supabase dashboard
        emailRedirectTo: `${location.origin}/api/auth/callback`,
      },
    });

    setIsLoading(false);

    if (error) {
      console.error("Signup error:", error.message);
      setErrorMessage(
        error.message || "Could not create account. Please try again."
      );
    } else {
      setSuccessMessage(
        "Account created! Please check your email for the confirmation link."
      );
      form.reset(); // Clear form on success
    }
  }

  async function handleSignInWithGoogle() {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
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
  }

  type FieldRenderProps = ControllerRenderProps<
    SignupFormValues,
    keyof SignupFormValues
  >;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-4">
      {/* Text Badge */}
      <div className="absolute left-4 top-4 rounded-xl bg-muted px-3 py-4 text-sm font-medium text-white shadow-sm">
        Control Complex Workflows
      </div>

      <div className="w-full max-w-sm space-y-6">
        {/* Logo Badge */}
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
            Create your Trackure Account.
          </h1>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login" // Link to login page
              className="font-medium text-primary underline underline-offset-4 hover:text-primary/90"
            >
              Sign in.
            </Link>
          </p>
        </div>

        {/* Signup Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }: { field: FieldRenderProps }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John"
                        {...field}
                        autoComplete="given-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }: { field: FieldRenderProps }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Doe"
                        {...field}
                        autoComplete="family-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }: { field: FieldRenderProps }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="you@example.com"
                      {...field}
                      type="email"
                      autoComplete="email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }: { field: FieldRenderProps }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Create a password"
                      {...field}
                      autoComplete="new-password"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Add password confirmation field here if needed */}
            {/* <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }: { field: FieldRenderProps }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Confirm password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            /> */}

            {errorMessage && (
              <Alert variant="destructive">
                <InfoIcon className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            {successMessage && (
              <Alert variant="default">
                {" "}
                {/* Use default or success variant */}
                <InfoIcon className="h-4 w-4" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>
        </Form>

        {/* SSO Placeholder */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={handleSignInWithGoogle}
          disabled={isLoading || isGoogleLoading}
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
              Sign up with Google
            </>
          )}
        </Button>

        {/* <Button variant="outline" className="w-full" disabled>
          Single sign-on (SSO)
        </Button> */}

        {/* Terms and Privacy */}
        <p className="px-8 text-center text-sm text-muted-foreground">
          By clicking continue, you agree to our{" "}
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
