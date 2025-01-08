"use client";
// useNavigate
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
// import { api } from "@/lib/api";
// import { useMutation } from "@tanstack/react-query";

export const Route = createFileRoute("/create-users")({
  component: RouteComponent,
});

const userCreationSchema = z.object({
  username: z.string().regex(/[A-Za-z]+/i, "Username must be a string"),
  email: z.string().email("Email must be a valid email"),
});

// async function postUser() {
//   const res = await api.users.create.post({
//     email: "email@email",
//     username: "shadcn",
//   });
// }

function RouteComponent() {
  // const navigate = useNavigate();

  const form = useForm<z.infer<typeof userCreationSchema>>({
    resolver: zodResolver(userCreationSchema),
    defaultValues: {
      username: "",
      email: "",
    },
  });

  // const mutation = useMutation({
  //   mutationFn: postUser,
  // });

  async function onSubmit(data: z.infer<typeof userCreationSchema>) {
    // const res = await api.users.create.post(data);
    // if (!res.response.ok) {
    //   throw new Error("Server error");
    // }
    // navigate({ to: "/" });
    console.log(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Username" {...field} />
              </FormControl>
              <FormDescription>
                This is your public display name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="email@email.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Loading..." : "Submit"}
        </Button> */}
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
